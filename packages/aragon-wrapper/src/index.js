import Web3 from 'web3'
import { Observable } from 'rxjs/Rx'
import apm from './apm'
import { makeProxy } from './utils'
import dotprop from 'dot-prop'
import Messenger from './rpc/Messenger'
import PostMessage from './rpc/providers/PostMessage'
import handlers from './rpc/handlers'

export default class Aragon {
  constructor (daoAddress, options = {}) {
    const defaultOptions = {
      provider: new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
    }
    options = Object.assign(defaultOptions, options)

    // Set up Web3
    this.web3 = new Web3(options.provider)

    // Set up APM
    this.apm = apm(this.web3, {
      provider: options.provider,
      registryAddress: options.ensRegistryAddress
    })

    // Set up the kernel proxy
    this.kernelProxy = makeProxy(daoAddress, 'Kernel', this.web3)
  }

  async init () {
    await this.initAcl()
    this.initApps()
    this.initForwarders()
  }

  async initAcl () {
    // Set up ACL proxy
    const aclAddress = await this.kernelProxy.call('acl')
    this.aclProxy = makeProxy(aclAddress, 'ACL', this.web3)

    // Set up permissions observable
    this.permissions = this.aclProxy.events('SetPermission')
      .pluck('returnValues')
      .scan((permissions, event) => {
        const currentPermissionsForRole = dotprop.get(
          permissions,
          `${event.app}.${event.role}`,
          []
        )

        const newPermissionsForRole = event.allowed
          ? currentPermissionsForRole.concat(event.role)
          : currentPermissionsForRole.filter((entity) => entity !== event.entity)

        return dotprop.set(
          permissions,
          `${event.app}.${event.role}`,
          newPermissionsForRole
        )
      }, {})
      .publishReplay(1)
    this.permissions.connect()
  }

  getAppProxyValues (proxyAddress) {
    const appProxy = makeProxy(proxyAddress, 'AppProxy', this.web3)

    return Promise.all([
      appProxy.call('kernel'),
      appProxy.call('appId'),
      appProxy.call('getCode'),
      appProxy.call('isForwarder').catch(() => false)
    ]).then((values) => ({
      proxyAddress,
      kernelAddress: values[0],
      appId: values[1],
      codeAddress: values[2],
      isForwarder: values[3]
    })).catch(() => ({ kernelAddress: null }))
  }

  isApp (app) {
    return app.kernelAddress &&
      app.kernelAddress.toLowerCase() === this.kernelProxy.address.toLowerCase()
  }

  initApps () {
    // TODO: Only includes apps in the namespace `keccak256("app")`
    this.apps = this.permissions
      .map(Object.keys)
      .switchMap(
        (appAddresses) => Promise.all(
          appAddresses.map((app) => this.getAppProxyValues(app))
        )
      )
      .map(
        (appMetadata) => appMetadata.filter((app) => this.isApp(app))
      )
      .flatMap(
        (apps) => Promise.all(
          apps.map(async (app) => Object.assign(
            app,
            await this.apm.getLatestVersionForContract(app.appId, app.codeAddress)
              .catch(() => ({}))
          ))
        )
      )
  }

  initForwarders () {
    this.forwarders = this.apps
      .map(
        (apps) => apps.filter((app) => app.isForwarder)
      )
  }

  registerSandbox (sandbox, proxyAddress) {
    // Set up messenger
    const messenger = new Messenger(
      new PostMessage(sandbox)
    )

    // Get the application proxy
    const proxy = this.apps
      .map((apps) => apps.find(
        (app) => app.codeAddress === proxyAddress)
      )
      .map(
        (app) => makeProxy(app.codeAddress, app.abi, this.web3)
      )

    // Wrap requests with the application proxy
    const request$ = Observable.combineLatest(
      messenger.requests(),
      proxy,
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

  // TODO: Transaction pathing
  // TODO: Cache
}
