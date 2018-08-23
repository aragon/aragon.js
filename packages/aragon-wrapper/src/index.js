// Externals
import { ReplaySubject, Subject, BehaviorSubject, Observable } from 'rxjs/Rx'
import { isBefore } from 'date-fns'
import uuidv4 from 'uuid/v4'
import Web3 from 'web3'
import dotprop from 'dot-prop'
import radspec from 'radspec'

// APM
import { keccak256 } from 'js-sha3'
import apm from '@aragon/apm'

// RPC
import Messenger from '@aragon/messenger'
import * as handlers from './rpc/handlers'

// Utilities
import { CALLSCRIPT_ID, encodeCallScript } from './evmscript'
import { addressesEqual, makeProxy, makeProxyFromABI } from './utils'

// Templates
import Templates from './templates'

// Cache
import Cache from './cache'

// Try to get an injected web3 provider, return a public one otherwise.
export const detectProvider = () =>
  typeof web3 !== 'undefined'
    ? web3.currentProvider // eslint-disable-line
    : 'ws://rinkeby.aragon.network:8546'

// Returns a template creator instance that can be used independently.
export const setupTemplates = (
  provider,
  registryAddress,
  from
) => {
  const web3 = new Web3(provider)
  return Templates(web3, apm(web3, { provider, ensRegistryAddress: registryAddress }), from)
}

/**
 * An Aragon wrapper.
 *
 * @param {string} daoAddress
 *        The address of the DAO.
 * @param {Object} options
 *        Wrapper options.
 * @param {*} [options.provider=ws://rinkeby.aragon.network:8546]
 *        The Web3 provider to use for blockchain communication
 * @param {String} [options.ensRegistryAddress=null]
 *        The address of the ENS registry
 * @example
 * const aragon = new Aragon('0xdeadbeef')
 *
 * // Initialises the wrapper
 * await aragon.init(["0xbeefdead", "0xbeefbeef"], {withAccounts: false}})
 */
export default class Aragon {
  constructor (daoAddress, options = {}) {
    const defaultOptions = {
      provider: detectProvider()
    }
    options = Object.assign(defaultOptions, options)

    // Set up Web3
    this.web3 = new Web3(options.provider)

    // Set up APM
    this.apm = apm(this.web3, Object.assign(options.apm, {
      ensRegistryAddress: options.ensRegistryAddress,
      provider: options.provider
    }))

    // Set up the kernel proxy
    this.kernelProxy = makeProxy(daoAddress, 'Kernel', this.web3)

    // Set up cache
    this.cache = new Cache(daoAddress)
  }

  /**
   * Initialise the wrapper.
   *
   * @param {Array<string>} [accounts=null] An optional array of accounts that the user controls
   * @param {Object} [options={withAccounts: false}] An optional options object
   * @param {boolean} options.withAccounts Boolean value that specifies whether or not we should fetch accounts from the Web3 instance
   * @return {Promise<void>}
   */
  async init (accounts = null, options = {withAccounts: false}) {
    await this.initAccounts(accounts, options.withAccounts)
    await this.kernelProxy.updateInitializationBlock()
    await this.initAcl()
    this.initApps()
    this.initForwarders()
    this.initNotifications()
    this.transactions = new Subject()
  }

  /**
   * Initialise the accounts observable.
   *
   * @param {?Array<string>} accounts An array of accounts that the user controls
   * @param {boolean} withAccounts An optionnal boolean value that specifies whether or not we should fetch accounts from the Web3 instance
   * @return {Promise<void>}
   */
  async initAccounts (accounts, withAccounts) {
    this.accounts = new ReplaySubject(1)

    if (accounts === null && withAccounts === true) {
      accounts = await this.web3.eth.getAccounts()
    }

    this.setAccounts(accounts)
  }

  /**
   * Initialise the ACL.
   *
   * @return {Promise<void>}
   */
  async initAcl () {
    // Set up ACL proxy
    const aclAddress = await this.kernelProxy.call('acl')
    this.aclProxy = makeProxy(aclAddress, 'ACL', this.web3, this.kernelProxy.initializationBlock)

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

  /**
   * Get proxy metadata (`appId`, address of the kernel, ...).
   *
   * @param  {string} proxyAddress
   *         The address of the proxy to get metadata from
   * @return {Promise<Object>}
   */
  getAppProxyValues (proxyAddress) {
    const appProxy = makeProxy(proxyAddress, 'AppProxy', this.web3, this.kernelProxy.initializationBlock)

    return Promise.all([
      appProxy.call('kernel').catch(() => null),
      appProxy.call('appId').catch(() => null),
      appProxy
        .call('implementation')
        .catch(() => appProxy
          // Fallback to old non-ERC897 proxy implementation
          .call('getCode')
          .catch(() => null)
        ),
      appProxy.call('isForwarder').catch(() => false)
    ]).then((values) => ({
      proxyAddress,
      kernelAddress: values[0],
      appId: values[1],
      codeAddress: values[2],
      isForwarder: values[3]
    }))
  }

  /**
   * Check if an object is an app.
   *
   * @param  {Object}  app
   * @return {boolean}
   */
  isApp (app) {
    return app.kernelAddress &&
      addressesEqual(app.kernelAddress, this.kernelProxy.address)
  }

  /**
   * Initialise apps observable.
   *
   * @return {void}
   */
  initApps () {
    // TODO: Only includes apps in the namespace `keccak256("app")`
    // TODO: Refactor this a bit because it's pretty much an eye sore
    this.identifiers = new Subject()
    this.appsWithoutIdentifiers = this.permissions
      .map(Object.keys)
      .map((addresses) =>
        addresses.filter((address) => !addressesEqual(address, this.kernelProxy.address))
      )
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
      // Replaying the last emitted value is necessary for this.apps' combineLatest to not rerun
      // this entire operator chain on identifier emits (doing so causes unnecessary apm fetches)
      .publishReplay(1)
    this.appsWithoutIdentifiers.connect()

    this.apps = this.appsWithoutIdentifiers
      .combineLatest(
        this.identifiers.scan(
          (identifiers, { address, identifier }) =>
            Object.assign(identifiers, { [address]: identifier }),
          {}
        ).startWith({}),
        function attachIdentifiers (apps, identifiers) {
          return apps.map(
            (app) => {
              if (identifiers[app.proxyAddress]) {
                return Object.assign(app, { identifier: identifiers[app.proxyAddress] })
              }

              return app
            }
          )
        }
      )
      .publishReplay(1)
    this.apps.connect()
  }

  /**
   * Set the identifier of an app.
   *
   * @param {string} address The proxy address of the app
   * @param {string} identifier The identifier of the app
   * @return {void}
   */
  setAppIdentifier (address, identifier) {
    this.identifiers.next({
      address,
      identifier
    })
  }

  /**
   * Initialise forwarder observable.
   *
   * @return {void}
   */
  initForwarders () {
    this.forwarders = this.apps
      .map(
        (apps) => apps.filter((app) => app.isForwarder)
      )
      .publishReplay(1)
    this.forwarders.connect()
  }

  /**
   * Initialise the notifications observable.
   *
   * @return {void}
   */
  initNotifications () {
    // If the cached notifications doesn't exist or isn't an array, set it to an empty one
    let cached = this.cache.get('notifications')
    if (!Array.isArray(cached)) {
      cached = []
    } else {
      // Set up acknowledge for unread notifications
      cached.forEach(notification => {
        if (notification && !notification.read) {
          notification.acknowledge = () => this.acknowledgeNotification(notification.id)
        }
      })
    }

    this.notifications = new BehaviorSubject(cached)
      .scan((notifications, { modifier, notification }) => modifier(notifications, notification))
      .do((notifications) => this.cache.set('notifications', notifications))
      .publishReplay(1)
    this.notifications.connect()
  }

  /**
   * Send a notification.
   *
   * @param {string} app   The address of the app sending the notification
   * @param {string} title The notification title
   * @param {string} body  The notification body
   * @param {object} [context={}] The application context to send back if the notification is clicked
   * @param  {Date}  [date=new Date()] The date the notification was sent
   * @return {void}
   */
  sendNotification (app, title, body, context = {}, date = new Date()) {
    const id = uuidv4()
    const notification = {
      app,
      body,
      context,
      date,
      id,
      title,
      read: false
    }
    this.notifications.next({
      modifier: (notifications, notification) => {
        // Find the first notification that's not before this new one
        // and insert ahead of it if it exists
        const newNotificationIndex = notifications.findIndex(
          notification => !isBefore(new Date(notification.date), date)
        )
        return newNotificationIndex === -1
          ? [...notifications, notification]
          : [
            ...notifications.slice(0, newNotificationIndex),
            notification,
            ...notifications.slice(newNotificationIndex)
          ]
      },
      notification: {
        ...notification,
        acknowledge: () => this.acknowledgeNotification(id)
      }
    })
  }

  /**
   * Acknowledge a notification.
   *
   * @param {string} id The notification's id
   * @return {void}
   */
  acknowledgeNotification (id) {
    this.notifications.next({
      modifier: (notifications) => {
        const notificationIndex = notifications.findIndex(notification => notification.id === id)
        // Copy the old notifications and replace the old notification with a read version
        const newNotifications = [...notifications]
        newNotifications[notificationIndex] = {
          ...notifications[notificationIndex],
          read: true,
          acknowledge: () => {}
        }
        return newNotifications
      }
    })
  }

  /**
   * Clears a notification.
   *
   * @param {string} id The notification's id
   * @return {void}
   */
  clearNotification (id) {
    this.notifications.next({
      modifier: (notifications) => {
        return notifications.filter(notification => notification.id !== id)
      }
    })
  }

  /**
   * Clears all notifications.
   *
   * @return {void}
   */
  clearNotifications () {
    this.notifications.next({
      modifier: (notifications) => {
        return []
      }
    })
  }

  /**
   * Run an app.
   *
   * @param  {Object} sandboxMessengerProvider
   *         An object that can communicate with the app sandbox via Aragon RPC.
   * @param  {string} proxyAddress
   *         The address of the app proxy.
   * @return {Object}
   */
  runApp (sandboxMessengerProvider, proxyAddress) {
    // Set up messenger
    const messenger = new Messenger(
      sandboxMessengerProvider
    )

    // Get the application proxy
    // NOTE: we **CANNOT** use this.apps here, as it'll trigger an endless spiral of infinite streams
    const proxy = this.appsWithoutIdentifiers
      .map((apps) => apps.find(
        (app) => addressesEqual(app.proxyAddress, proxyAddress))
      )
      .map(
        (app) => makeProxyFromABI(app.proxyAddress, app.abi, this.web3, this.kernelProxy.initializationBlock)
      )

    // Wrap requests with the application proxy
    const request$ = Observable.combineLatest(
      messenger.requests(),
      proxy,
      (request, proxy) => ({ request, proxy, wrapper: this })
    )

    // Register request handlers
    const shutdown = handlers.combineRequestHandlers(
      handlers.createRequestHandler(request$, 'cache', handlers.cache),
      handlers.createRequestHandler(request$, 'events', handlers.events),
      handlers.createRequestHandler(request$, 'intent', handlers.intent),
      handlers.createRequestHandler(request$, 'call', handlers.call),
      handlers.createRequestHandler(request$, 'notification', handlers.notifications),
      handlers.createRequestHandler(request$, 'external_call', handlers.externalCall),
      handlers.createRequestHandler(request$, 'external_events', handlers.externalEvents),
      handlers.createRequestHandler(request$, 'identify', handlers.identifier),
      handlers.createRequestHandler(request$, 'accounts', handlers.accounts),
      handlers.createRequestHandler(request$, 'describe_script', handlers.describeScript),
      handlers.createRequestHandler(request$, 'web3_eth', handlers.web3Eth)
    ).subscribe(
      (response) => messenger.sendResponse(response.id, response.payload)
    )

    // App context helper function
    function setContext (context) {
      return messenger.send('context', [context])
    }

    return {
      shutdown,
      setContext
    }
  }

  /**
   * Set the available accounts for the current user.
   *
   * @param {Array<string>} accounts
   * @return {void}
   */
  setAccounts (accounts) {
    this.accounts.next(accounts)
  }

  /**
   * Get the available accounts for the current user.
   *
   * @return {Promise<Array<string>>} An array of addresses
   */
  getAccounts () {
    return this.accounts
      .take(1)
      .toPromise()
  }

  /**
   * Decodes an EVM callscript and returns the transaction path it describes.
   *
   * @param  {string} script
   * @return {Array<Object>} An array of Ethereum transactions that describe each step in the path
   */
  decodeTransactionPath (script) {
    // TODO: Support callscripts with multiple transactions in one (i.e. one ID, multiple destinations)
    function decodePathSegment (script) {
      // Remove script identifier
      script = script.substr(10)

      // Get address
      const destination = `0x${script.substr(0, 40)}`
      script = script.substr(40)

      // Get data
      const dataLength = parseInt(`0x${script.substr(0, 8)}`) * 2
      script = script.substr(8)
      const data = `0x${script.substr(0, dataLength)}`
      script = script.substr(dataLength)

      return {
        to: destination,
        data
      }
    }

    let scriptId = script.substr(0, 10)
    if (scriptId !== CALLSCRIPT_ID) {
      throw new Error(`Unknown script ID ${scriptId}`)
    }

    let path = []
    while (script.startsWith(CALLSCRIPT_ID)) {
      const segment = decodePathSegment(script)

      // Set script
      script = segment.data

      // Push segment
      path.push(segment)
    }

    return path
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

      if (path.length > 0) {
        return this.describeTransactionPath(path)
      }
    }

    return []
  }

  async describeTransactionPath (path) {
    return Promise.all(path.map(async (step) => {
      const app = await this.apps.map(
        (apps) => apps.find((app) => addressesEqual(app.proxyAddress, step.to))
      ).take(1).toPromise()

      // No app artifact
      if (!app) return step

      // Missing methods in artifact
      if (!app.functions) return step

      // Find the method
      const methodId = step.data.substr(2, 8)
      const method = app.functions.find(
        (method) => keccak256(method.sig).substr(0, 8) === methodId
      )

      // Method does not exist in artifact
      if (!method) return step

      const expression = method.notice

      // No expression
      if (!expression) return step
      return Object.assign(step, {
        description: await radspec.evaluate(expression, {
          abi: app.abi,
          transaction: step
        }, this.web3.currentProvider),
        name: app.name,
        identifier: app.identifier
      })
    }))
  }

  async canForward (forwarder, sender, script) {
    const canForward = new this.web3.eth.Contract(
      require('../abi/aragon/Forwarder.json'),
      forwarder
    ).methods['canForward']

    return canForward(sender, script).call().catch(() => false)
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
    const minGasPrice = this.web3.utils.toWei('20', 'gwei')

    const permissions = await this.permissions.take(1).toPromise()
    const app = await this.apps.map(
      (apps) => apps.find((app) => addressesEqual(app.proxyAddress, destination))
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

    // The direct transaction we eventually want to perform
    const directTransaction = {
      from: sender,
      to: destination,
      data: this.web3.eth.abi.encodeFunctionCall(
        app.abi.find(
          (method) => method.name === methodName
        ),
        params
      ),
      gasPrice: minGasPrice
    }

    // If the method has no ACL requirements, we assume we
    // can perform the action directly
    if (method.roles.length === 0) {
      return [directTransaction]
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

    // Check if we have direct access
    try {
      // NOTE: estimateGas mutates the argument object and transforms the address to lowercase
      // so this is a hack to make sure checksums are not destroyed
      // Also, at the same time it's a hack for checking if the call will revert,
      // since `eth_call` returns `0x` if the call fails and if the call returns nothing.
      // So yeah...
      await this.web3.eth.estimateGas(
        Object.assign({}, directTransaction)
      )

      return [directTransaction]
    } catch (_) {}

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
      data: forwardMethod(script).encodeABI(),
      gasPrice: minGasPrice
    })

    // Check if one of the forwarders that has permission to perform an action
    // with `sig` on `address` can forward for us directly
    for (const forwarder of forwardersWithPermission) {
      let script = encodeCallScript([directTransaction])
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
          forwarderWithPermission, encodeCallScript([directTransaction])
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
      let script = encodeCallScript([path[0]])

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
}

export { isNameUsed } from './templates'
export { resolve as ensResolve } from './ens'

// Re-export the Aragon RPC providers
export { providers } from '@aragon/messenger'
