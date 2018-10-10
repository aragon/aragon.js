// Externals
import { ReplaySubject, Subject, BehaviorSubject, Observable } from 'rxjs/Rx'
import { isBefore } from 'date-fns'
import uuidv4 from 'uuid/v4'
import Web3 from 'web3'
import { isAddress, toWei } from 'web3-utils'
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
import { addressesEqual, makeAddressLookupProxy, makeProxy, makeProxyFromABI, getRecommendedGasLimit } from './utils'

import { getAragonOsInternalAppInfo } from './core/aragonOS'

// Templates
import Templates from './templates'

// Cache
import Cache from './cache'

// Interfaces
import { getAbi } from './interfaces'

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
 * @param {Function} [options.defaultGasPriceFn=function]
 *        A factory function to provide the default gas price for transactions.
 *        It can return a promise of number string or a number string. The function
 *        has access to a recommended gas limit which can be used for custom
 *        calculations. This function can also be used to get a good gas price
 *        estimation from a 3rd party resource.
 * @example
 * const aragon = new Aragon('0xdeadbeef')
 *
 * // Initialises the wrapper and logs the installed apps
 * aragon.init(() => {
 *   aragon.apps.subscribe(
 *     (apps) => console.log(apps)
 *   )
 * })
 */
export default class Aragon {
  constructor (daoAddress, options = {}) {
    const defaultOptions = {
      provider: detectProvider(),
      apm: {},
      defaultGasPriceFn: () => {
        return toWei('20', 'gwei')
      }
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

    this.defaultGasPriceFn = options.defaultGasPriceFn
  }

  /**
   * Initialise the wrapper.
   *
   * @param {?Array<string>} [accounts=null] An optional array of accounts that the user controls
   * @return {Promise<void>}
   */
  async init (accounts = null) {
    await this.initAccounts(accounts)
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
   * @param {?Array<string>} [accounts=null] An optional array of accounts that the user controls
   * @return {Promise<void>}
   */
  async initAccounts (accounts) {
    this.accounts = new ReplaySubject(1)

    if (accounts === null) {
      accounts = await this.web3.eth.getAccounts()
    }

    this.setAccounts(accounts)
  }

  /**
   * Initialise the ACL (Access Control List).
   *
   * @return {Promise<void>}
   */
  async initAcl () {
    // Set up ACL proxy
    const aclAddress = await this.kernelProxy.call('acl')
    this.aclProxy = makeProxy(aclAddress, 'ACL', this.web3, this.kernelProxy.initializationBlock)

    const SET_PERMISSION_EVENT = 'SetPermission'
    const CHANGE_PERMISSION_MANAGER_EVENT = 'ChangePermissionManager'

    const aclObservables = [
      SET_PERMISSION_EVENT,
      CHANGE_PERMISSION_MANAGER_EVENT
    ].map(event =>
      this.aclProxy.events(event)
    )

    // Set up permissions observable

    // Permissions Object:
    // app -> role -> { manager, allowedEntities -> [ entities with permission ] }
    this.permissions = Observable.merge(...aclObservables)
      .scan((permissions, event) => {
        const eventData = event.returnValues
        const baseKey = `${eventData.app}.${eventData.role}`

        if (event.event === SET_PERMISSION_EVENT) {
          const key = `${baseKey}.allowedEntities`

          // Converts to and from a set to avoid duplicated entities
          const permissionsForRole = new Set(dotprop.get(permissions, key, []))

          if (eventData.allowed) {
            permissionsForRole.add(eventData.entity)
          } else {
            permissionsForRole.delete(eventData.entity)
          }

          return dotprop.set(permissions, key, Array.from(permissionsForRole))
        }

        if (event.event === CHANGE_PERMISSION_MANAGER_EVENT) {
          return dotprop.set(permissions, `${baseKey}.manager`, eventData.manager)
        }
      }, makeAddressLookupProxy({}))
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
              .catch(() => getAragonOsInternalAppInfo(app.appId)) // for internal apps we check local mapping
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
          acknowledge: () => { }
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
    const proxy$ = this.appsWithoutIdentifiers
      .map((apps) => apps.find(
        (app) => addressesEqual(app.proxyAddress, proxyAddress))
      )
      // TODO: handle undefined (no proxy found), otherwise when calling app.proxyAddress next, it will throw
      .map(
        (app) => makeProxyFromABI(app.proxyAddress, app.abi, this.web3, this.kernelProxy.initializationBlock)
      )

    // Wrap requests with the application proxy
    const request$ = Observable.combineLatest(
      messenger.requests(),
      proxy$,
      (request, proxy) => ({ request, proxy, wrapper: this })
    )
      // Use the same request$ result in each handler
      // Turns request$ into a subject
      .publishReplay(1)
    request$.connect()

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
   * @param {Array<Object>} An array of Ethereum transactions that describe each step in the path
   * @return {Promise<string>} transaction hash
   */
  performTransactionPath (transactionPath) {
    return new Promise((resolve, reject) => {
      this.transactions.next({
        transaction: transactionPath[0],
        path: transactionPath,
        accept (transactionHash) {
          resolve(transactionHash)
        },
        reject (err) {
          reject(err || new Error('The transaction was not signed'))
        }
      })
    })
  }

  /**
   * Performs an action on the ACL using transaction pathing
   *
   * @param {string} method
   * @param {Array<*>} params
   * @return {Promise<string>} transaction hash
   */
  async performACLIntent (method, params) {
    const path = await this.getACLTransactionPath(method, params)
    return this.performTransactionPath(path)
  }

  /**
   * Looks for app with the provided proxyAddress and returns its app object if found
   *
   * @param {string} proxyAddress
   * @return {Promise<Object>} The app object
   */
  getApp (proxyAddress) {
    return this.apps.map(
      (apps) => apps.find((app) => addressesEqual(app.proxyAddress, proxyAddress))
    ).take(1).toPromise()
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
   * @param  {string} [finalForwarder] Address of the final forwarder that can perfom the action
   * @return {Promise<Array<Object>>} An array of Ethereum transactions that describe each step in the path
   */
  async getTransactionPath (destination, methodName, params, finalForwarder) {
    const accounts = await this.getAccounts()

    for (let account of accounts) {
      const path = await this.calculateTransactionPath(
        account,
        destination,
        methodName,
        params,
        finalForwarder
      )

      if (path.length > 0) {
        return this.describeTransactionPath(path)
      }
    }

    return []
  }

  /**
   * Get the permission manager for an `app`'s and `role`.
   *
   * @param {string} appAddress
   * @param {string} roleHash
   * @return {Promise<string>} The permission manager
   */
  async getPermissionManager (appAddress, roleHash) {
    const permissions = await this.permissions.take(1).toPromise()

    return dotprop.get(permissions, `${appAddress}.${roleHash}.manager`)
  }

  /**
   * Calculates transaction path for performing a method on the ACL
   *
   * @param {string} method
   * @param {Array<*>} params
   * @return {Promise<Array<Object>>} An array of Ethereum transactions that describe each step in the path
   */
  async getACLTransactionPath (method, params) {
    const aclAddr = this.aclProxy.address

    const acl = await this.getApp(aclAddr)

    const functionArtifact = acl.functions.find(
      ({ sig }) => sig.split('(')[0] === method
    )

    if (!functionArtifact) {
      throw new Error(`Method ${method} not found on ACL artifact`)
    }

    if (functionArtifact.roles && functionArtifact.roles.length !== 0) {
      // createPermission can be done with regular transaction pathing (it has a regular ACL role)
      return this.getTransactionPath(aclAddr, method, params)
    } else {
      // All other ACL functions don't have a role, the manager needs to be provided to aid transaction pathing

      // Inspect ABI to find the position of the 'app' and 'role' parameters needed to get the permission manager
      const methodABI = acl.abi.find(
        (item) => item.name === method && item.type === 'function'
      )

      if (!methodABI) {
        throw new Error(`Method ${method} not found on ACL ABI`)
      }

      const inputNames = methodABI.inputs.map((input) => input.name)
      const appIndex = inputNames.indexOf('_app')
      const roleIndex = inputNames.indexOf('_role')

      if (appIndex === -1 || roleIndex === -1) {
        throw new Error(`Method ${method} doesn't take _app and _role as input. Permission manager cannot be found.`)
      }

      const manager = await this.getPermissionManager(params[appIndex], params[roleIndex])

      return this.getTransactionPath(aclAddr, method, params, manager)
    }
  }

  /**
   * Use radspec to create a human-readable description for each transaction in the given `path`
   *
   * @param  {Array<object>} path
   * @return {Promise<Array<Object>>} The given `path`, with descriptions included at each step
   */
  describeTransactionPath (path) {
    return Promise.all(path.map(async (step) => {
      const app = await this.getApp(step.to)

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

  /**
   * Whether the `sender` can use the `forwarder` to invoke `script`.
   *
   * @param  {string} forwarder
   * @param  {string} sender
   * @param  {string} script
   * @return {Promise<bool>}
   */
  canForward (forwarder, sender, script) {
    const canForward = new this.web3.eth.Contract(
      getAbi('aragon/Forwarder'),
      forwarder
    ).methods['canForward']

    return canForward(sender, script).call().catch(() => false)
  }

  getDefaultGasPrice (gasLimit) {
    return this.defaultGasPriceFn(gasLimit)
  }

  /**
   * Calculates and applies the gas limit and gas price for a transaction
   *
   * @param  {Object} transaction
   * @param  {bool} isForwarding
   * @return {Promise<Object>} The transaction with the gas limit and gas price added.
   *                           If the transaction fails from the estimateGas check, the promise will
   *                           be rejected with the error.
   */
  async applyTransactionGas (transaction, isForwarding = false) {
    // NOTE: estimateGas mutates the argument object and transforms the address to lowercase
    // so this is a hack to make sure checksums are not destroyed
    // Also, at the same time it's a hack for checking if the call will revert,
    // since `eth_call` returns `0x` if the call fails and if the call returns nothing.
    // So yeah...
    const estimatedGasLimit = await this.web3.eth.estimateGas({ ...transaction, gas: null })
    const recommendedGasLimit = await getRecommendedGasLimit(this.web3, estimatedGasLimit)

    // If the gas provided in the intent is lower than the estimated gas, use the estimation
    // when forwarding as it requires more gas and otherwise the transaction would go out of gas
    if (!transaction.gas || (isForwarding && transaction.gas < recommendedGasLimit)) {
      transaction.gas = recommendedGasLimit
    }

    if (!transaction.gasPrice) {
      transaction.gasPrice = await this.getDefaultGasPrice(transaction.gas)
    }

    return transaction
  }

  /**
   * Calculate the transaction path for a transaction to `destination`
   * that invokes `methodName` with `params`.
   *
   * @param  {string} sender
   * @param  {string} destination
   * @param  {string} methodName
   * @param  {Array<*>} params
   * @param  {string} [finalForwarder] Address of the final forwarder that can perfom the action.
   *                  Needed for actions that aren't in the ACL but whose execution depends on other factors
   * @return {Promise<Array<Object>>} An array of Ethereum transactions that describe each step in the path
   */
  async calculateTransactionPath (sender, destination, methodName, params, finalForwarder) {
    const finalForwarderProvided = isAddress(finalForwarder)

    const permissions = await this.permissions.take(1).toPromise()
    const app = await this.getApp(destination)
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

    const methodABI = app.abi.find(
      (method) => method.name === methodName
    )
    if (!methodABI) {
      throw new Error(`${methodName} not found on ABI for ${destination}`)
    }

    let transactionOptions = {}

    // If an extra parameter has been provided, it is the transaction options if it is an object
    if (methodABI.inputs.length + 1 === params.length && typeof params[params.length - 1] === 'object') {
      const options = params.pop()
      transactionOptions = { ...transactionOptions, ...options }
    }

    // The direct transaction we eventually want to perform
    const directTransaction = {
      ...transactionOptions, // Options are overwriten by the values below
      from: sender,
      to: destination,
      data: this.web3.eth.abi.encodeFunctionCall(methodABI, params)
    }

    let permissionsForMethod = []

    // Only try to perform direct transaction if no final forwarder is provided or
    // if the final forwarder is the sender
    if (!finalForwarderProvided || finalForwarder === sender) {
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

      // If the method has no ACL requirements, we assume we
      // can perform the action directly
      if (method.roles.length === 0) {
        return [directTransaction]
      }

      // TODO: Support multiple needed roles?
      const roleSig = app.roles.find(
        (role) => role.id === method.roles[0]
      ).bytes

      permissionsForMethod = dotprop.get(
        permissions,
        `${destination}.${roleSig}.allowedEntities`,
        []
      )

      // No one has access
      if (permissionsForMethod.length === 0) {
        return []
      }

      try {
        // `applyTransactionGas` can throw if the transaction will fail
        // if that happens, we will try to find a transaction path through a forwarder
        return [await this.applyTransactionGas(directTransaction)]
      } catch (_) { }
    }

    let forwardersWithPermission

    if (finalForwarderProvided) {
      if (!forwarders.includes(finalForwarder)) {
        return []
      }

      forwardersWithPermission = [finalForwarder]
    } else {
      // Find forwarders with permission to perform the action
      forwardersWithPermission = forwarders
        .filter(
          (forwarder) => permissionsForMethod.includes(forwarder)
        )
    }

    // No forwarders can perform the requested action
    if (forwardersWithPermission.length === 0) {
      return []
    }

    // TODO: No need for contract?
    // A helper method to create a transaction that calls `forward` on a forwarder with `script`
    const forwardMethod = new this.web3.eth.Contract(
      getAbi('aragon/Forwarder')
    ).methods['forward']

    const createForwarderTransaction = (forwarderAddress, script) => (
      {
        ...transactionOptions, // Options are overwriten by the values below
        from: sender,
        to: forwarderAddress,
        data: forwardMethod(script).encodeABI()
      }
    )

    // Check if one of the forwarders that has permission to perform an action
    // with `sig` on `address` can forward for us directly
    for (const forwarder of forwardersWithPermission) {
      let script = encodeCallScript([directTransaction])
      if (await this.canForward(forwarder, sender, script)) {
        const transaction = createForwarderTransaction(forwarder, script)
        // TODO: recover if applying gas fails here
        return [await this.applyTransactionGas(transaction, true), directTransaction]
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
    const queue = forwardersWithPermission.map((forwarderWithPermission) => {
      return [
        [
          createForwarderTransaction(forwarderWithPermission, encodeCallScript([directTransaction])),
          directTransaction
        ], forwarders
      ]
    })

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
          const transaction = createForwarderTransaction(forwarder, script)
          // `applyTransactionGas` is only done for the transaction that will be executed
          // TODO: recover if applying gas fails here
          return [await this.applyTransactionGas(transaction, true), ...path]
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
