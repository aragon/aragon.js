import Web3 from 'web3'
import { Observable, Subject } from 'rxjs/Rx'
import Messenger from '../rpc/Messenger'
import PostMessage from '../rpc/providers/PostMessage'
import Proxy from '../core/Proxy'
import ACL from '../core/ACL'
import apm from '../apm'

export default class Aragon {
  constructor (daoAddress, provider) {
    // Set up Web3
    this.web3 = new Web3(provider)

    // Set up the kernel proxy (which is located at the "DAO address")
    this.kernelProxy = new Proxy(
      daoAddress, require('../../abi/aragon/Kernel.json'), this
    )

    // Set up ACL
    this._acl = new ACL(this.kernelProxy, this)

    // Set up transaction queue
    this.transactions = new Subject()
  }

  kernel () {
    return this.kernelProxy
  }

  apps () {
    if (this._apps) return this._apps

    // TODO: Optimize. A lot.
    const appCodes = this.kernel().events()
      .filter(
        ({ event }) => event === 'SetAppCode'
      )
      .mergeMap(
        ({ returnValues: values }) => {
          return Observable.fromPromise(
            apm(this.web3).getLatestVersionForContract(values.appId, values.newAppCode)
          )
            .catch(() => Observable.empty())
            .map((app) => ({
              [values.appId]: app
            }))
        }
      )
      .scan((appCodes, appCode) => {
        return {
          ...appCodes,
          ...appCode
        }
      }, {})

    const aclEvents = this.kernel().events()
      .filter(
        ({ event }) => event === 'SetPermission'
      )
    const aclState = aclEvents
      .scan((state, { returnValues: values }) => {
        const currentNumberOfPermissions = state[values.app] || 0

        return {
          ...state,
          [values.app]: values.allowed
            ? currentNumberOfPermissions + 1
            : currentNumberOfPermissions - 1
        }
      }, {})

    // Reduces ACL events to an object of `{ proxyAddress: appId }`
    const proxies = aclEvents
      .withLatestFrom(aclState)
      .mergeScan(
        (proxies, [ event, state ]) => {
          // Check if the proxy is "live", i.e. if there are any permissions set for it
          const isProxyLive = state[event.returnValues.app] > 0

          // If the proxy is not live then we remove it
          if (!isProxyLive) {
            const { [event.returnValues.app]: _, newProxies } = proxies

            return Observable.of(newProxies)
          }

          // If it is live then we get the app ID for the proxy
          const appProxy = new this.web3.eth.Contract(
            require('../../abi/aragon/AppProxy.json'),
            event.returnValues.app
          )

          return Observable.fromPromise(
            appProxy.methods.appId().call()
          )
            .catch(() => Observable.empty())
            .map((appId) => ({
              ...proxies,
              [event.returnValues.app]: appId
            }))
        }, {}, 1
      )

    const apps = Observable
      .combineLatest(
        proxies,
        appCodes,
        (proxies, appCodes) =>
          Object.keys(proxies).reduce((result, proxyAddress) => {
            result[proxyAddress] = appCodes[proxies[proxyAddress]]

            return result
          }, {})
      ).publishReplay(1)

    this._apps = apps

    // Pull data immediately
    apps.connect()

    return this._apps
  }

  acl () {
    return this._acl
  }

  registerSandbox (sandbox, proxyAddress) {
    // TODO: Is there a more elegant way? Refactor this
    // Set up messenger
    const messenger = new Messenger(
      new PostMessage(sandbox)
    )

    // Get the application proxy
    const proxy = this.apps()
      .map(
        (apps) => {
          const application = apps[proxyAddress]

          if (!application) {
            throw new Error(`There is no known JSON interface for ${proxyAddress}`)
          }

          return new Proxy(
            proxyAddress, application.abi, this
          )
        }
      )

    // Request handlers
    const registerHandler = (observable) => {
      return observable
        .subscribe(
          (result) => messenger.sendResponse(result.id, result.payload),
          (result) => messenger.sendResponse(result.id, result.payload)
        )
    }

    // Cache
    const disposeCacheHandler = registerHandler(
      messenger.ofType('cache')
        .map((request) => ({
          id: request.id,
          payload: null
        }))
    )

    // Events
    const disposeEventsHandler = registerHandler(
      messenger.ofType('events')
        .withLatestFrom(proxy)
        .switchMap(
          ([ request, proxy ]) => {
            return proxy.events()
              .map((payload) => ({
                id: request.id,
                payload
              }))
          }
        )
    )

    // TODO: intent

    // Calls
    const disposeCallsHandler = registerHandler(
      messenger.ofType('call')
        .withLatestFrom(proxy)
        .mergeMap(
          ([ request, proxy ]) => {
            const method = request.params[0]

            return proxy.call(method, ...request.params.slice(1))
              .catch((err) => Observable.of({
                id: request.id,
                payload: err.message
              }))
              .map((payload) => ({
                id: request.id,
                payload
              }))
          }
        )
    )

    return () => {
      disposeCacheHandler()
      disposeEventsHandler()
      disposeCallsHandler()
    }
  }
}
