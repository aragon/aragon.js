import Web3 from 'web3'
import { Observable, Subject } from 'rxjs/Rx'
import Messenger from '../rpc/Messenger'
import PostMessage from '../rpc/providers/PostMessage'
import handlers from '../rpc/handlers'
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
            let newProxies = Object.assign({}, proxies)
            delete newProxies[event.returnValues.app]

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
    // Set up messenger
    const messenger = new Messenger(
      new PostMessage(sandbox)
    )

    // Get the application proxy
    const proxy = this.apps()
      .first((apps) => apps.hasOwnProperty(proxyAddress))
      .map(
        (apps) => new Proxy(
          proxyAddress, apps[proxyAddress].abi, this
        )
      )

    // Wrap requests with the application proxy
    const request$ = Observable.combineLatest(
      messenger.requests(), proxy,
      function wrapRequest (request, proxy) {
        return { request, proxy }
      }
    )

    // Register request handlers and return dispose function
    return handlers.combineRequestHandlers(
      handlers.createRequestHandler(request$, 'cache', handlers.cache),
      handlers.createRequestHandler(request$, 'events', handlers.events),
      handlers.createRequestHandler(request$, 'intent', handlers.intent),
      handlers.createRequestHandler(request$, 'call', handlers.call)
    ).subscribe(
      (response) => messenger.sendResponse(response.id, response.payload)
    )
  }
}
