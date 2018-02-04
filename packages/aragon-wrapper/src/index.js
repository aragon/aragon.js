// TODO: Clean up imports
import Web3 from 'web3'
import { Observable } from 'rxjs/Rx'
import apm from './apm'
import { makeProxy } from './utils'
import dotprop from 'dot-prop'
import Messenger from './rpc/Messenger'
import PostMessage from './rpc/providers/PostMessage'
import handlers from './rpc/handlers'
import { encodeCallScript } from './evmscript'

export default class Aragon {
  constructor (daoAddress, options = {}) {
    const defaultOptions = {
      provider: new Web3.providers.WebsocketProvider('ws://rinkeby.aragon.network:8546')
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
          ? currentPermissionsForRole.concat(event.entity)
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
      .publishReplay(1)
    this.apps.connect()
  }

  initForwarders () {
    this.forwarders = this.apps
      .map(
        (apps) => apps.filter((app) => app.isForwarder)
      )
      .publishReplay(1)
    this.forwarders.connect()
  }

  runApp (sandbox, proxyAddress) {
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

    // Register request handlers
    const shutdown = handlers.combineRequestHandlers(
      handlers.createRequestHandler(request$, 'cache', handlers.cache),
      handlers.createRequestHandler(request$, 'events', handlers.events),
      handlers.createRequestHandler(request$, 'intent', handlers.intent),
      handlers.createRequestHandler(request$, 'call', handlers.call)
    ).subscribe(
      (response) => messenger.sendResponse(response.id, response.payload)
    )

    return {
      shutdown
    }
  }

  async getAccounts () {
    // return this.web3.eth.getAccounts()
    return ['0x692c16ef3D640b8f5dCEC895023B4fC294D85aB3']
  }

  /**
   * Calculate the transaction path for a transaction to `destination`
   * that invokes `methodName` with `params`.
   *
   * @param  {string} destination
   * @param  {string} methodName
   * @param  {Array<*>} params
   * @return {Array<Object>} An array of Ethereum transactions that describe each step in the path
   */
  async getTransactionPath (destination, methodName, params) {
    const accounts = await this.getAccounts()

    for (let account of accounts) {
      const path = await this.calculateTransactionPath(
        account,
        destination,
        methodName,
        params
      )

      if (path.length > 0) return path
    }

    return []
  }

  /**
   * Calculate the transaction path for a transaction to `destination`
   * that invokes `methodName` with `params`.
   *
   * @param  {string} sender
   * @param  {string} destination
   * @param  {string} methodName
   * @param  {Array<*>} params
   * @return {Array<Object>} An array of Ethereum transactions that describe each step in the path
   */
  async calculateTransactionPath (sender, destination, methodName, params) {
    const permissions = await this.permissions.take(1).toPromise()
    const app = await this.apps.map(
      (apps) => apps.find((app) => app.proxyAddress === destination)
    ).take(1).toPromise()
    let forwarders = await this.forwarders.take(1).toPromise().then(
      (forwarders) => forwarders.map(
        (forwarder) => forwarder.proxyAddress
      )
    )

    if (!app) {
      throw new Error(`No artifact found for ${destination}`)
    }

    const jsonInterface = app.abi
    if (!jsonInterface) {
      throw new Error(`No ABI specified in artifact for ${destination}`)
    }

    const methods = app.functions
    if (!methods) {
      throw new Error(`No functions specified in artifact for ${destination}`)
    }

    // Find method description from the function signatures
    const method = methods.find(
      (method) => method.sig.split('(')[0] === methodName
    )
    if (!method) {
      throw new Error(`No method named ${methodName} on ${destination}`)
    }

    // TODO: Support multiple needed roles?
    const roleSig = app.roles.find(
      (role) => role.id === method.roles[0]
    ).bytes

    const permissionsForMethod = dotprop.get(
      permissions,
      `${destination}.${roleSig}`,
      []
    )

    // No one has access
    if (permissionsForMethod.length === 0) {
      return []
    }

    const directTransaction = {
      from: sender,
      to: destination,
      data: this.web3.eth.abi.encodeFunctionCall(
        app.abi.find(
          (method) => method.name === methodName
        ),
        params
      )
    }

    // Check if we have direct access
    try {
      await this.web3.eth.call(directTransaction)

      return [directTransaction]
    } finally {}

    // Find forwarders with permission to perform the action
    const forwardersWithPermission = forwarders
      .filter(
        (forwarder) => permissionsForMethod.includes(forwarder)
      )

    // No forwarders can perform the requested action
    if (forwardersWithPermission.length === 0) {
      return []
    }

    // TODO: No need for contract?
    // A helper method to create a transaction that calls `forward` on a forwarder with `script`
    const forwardMethod = new this.web3.eth.Contract(
      require('../abi/aragon/Forwarder.json')
    ).methods['forward']
    const createForwarderTransaction = (forwarderAddress, script) => ({
      from: sender,
      to: forwarderAddress,
      data: forwardMethod(script).encodeABI()
    })

    // Check if one of the forwarders that has permission to perform an action
    // with `sig` on `address` can forward for us directly
    for (const forwarder of forwardersWithPermission) {
      let script = encodeCallScript(directTransaction)
      if (await this.canForward(forwarder, sender, script)) {
        return [createForwarderTransaction(forwarder, script), directTransaction]
      }
    }

    // Get a list of all forwarders (excluding the forwarders with direct permission)
    forwarders = forwarders
      .filter(
        (forwarder) => !forwardersWithPermission.includes(forwarder)
      )

    // Set up the path finding queue
    // The queue takes the form of Array<[Array<EthereumTransaction>, Array<String>]>
    // In other words: it is an array of tuples, where the first index of the tuple
    // is the current path and the second index of the tuple is the
    // queue (a list of unexplored forwarder addresses) for that path
    const queue = forwardersWithPermission.map(
      (forwarderWithPermission) => [
        [createForwarderTransaction(
          forwarderWithPermission, encodeCallScript(directTransaction)
        ), directTransaction], forwarders
      ]
    )

    // Find the shortest path
    // TODO(onbjerg): Should we find and return multiple paths?
    do {
      const [path, [forwarder, ...nextQueue]] = queue.shift()

      // Skip paths longer than 10
      if (path.length > 10) continue

      // Get the previous forwarder address
      const previousForwarder = path[0].to

      // Encode the previous transaction into an EVM callscript
      let script = encodeCallScript(path[0])

      if (await this.canForward(previousForwarder, forwarder, script)) {
        if (await this.canForward(forwarder, sender, script)) {
          // The previous forwarder can forward a transaction for this forwarder,
          // and this forwarder can forward for our address, so we have found a path
          return [createForwarderTransaction(forwarder, script), ...path]
        } else {
          // The previous forwarder can forward a transaction for this forwarder,
          // but this forwarder can not forward for our address, so we add it as a
          // possible path in the queue for later exploration.
          // TODO(onbjerg): Should `forwarders` be filtered to exclude forwarders in the path already?
          queue.push([[createForwarderTransaction(forwarder, script), ...path], forwarders])
        }
      }

      // We add the current path on the back of the queue again, but we shorten
      // the list of possible forwarders.
      queue.push([path, nextQueue])
    } while (queue.length)

    return []
  }

  // TODO: Cache
}
