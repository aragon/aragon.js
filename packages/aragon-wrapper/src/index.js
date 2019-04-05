// Externals
import { ReplaySubject, Subject, BehaviorSubject, combineLatest, merge } from 'rxjs'
import {
  map, startWith, scan, tap, publishReplay, switchMap, filter, first,
  debounceTime, skipWhile
} from 'rxjs/operators'
import uuidv4 from 'uuid/v4'
import Web3 from 'web3'
import { isAddress, toBN } from 'web3-utils'
import dotprop from 'dot-prop'
import * as radspec from 'radspec'

// APM
import { keccak256 } from 'js-sha3'
import { hash as namehash } from 'eth-ens-namehash'
import apm from '@aragon/apm'

// RPC
import Messenger from '@aragon/rpc-messenger'
import * as handlers from './rpc/handlers'

// Utilities
import { CALLSCRIPT_ID, encodeCallScript } from './evmscript'
import {
  addressesEqual,
  includesAddress,
  makeAddressMapProxy,
  makeProxy,
  makeProxyFromABI,
  getRecommendedGasLimit,
  AsyncRequestCache,
  ANY_ENTITY
} from './utils'

import { getAragonOsInternalAppInfo, getKernelNamespace } from './core/aragonOS'

// Templates
import Templates from './templates'

// Cache
import Cache from './cache'

// Local address labels
import { LocalIdentityProvider } from './identity'

// Interfaces
import { getAbi } from './interfaces'

// Try to get an injected web3 provider, return a public one otherwise.
export const detectProvider = () =>
  typeof web3 !== 'undefined'
    ? web3.currentProvider // eslint-disable-line
    : 'wss://rinkeby.eth.aragon.network/ws'

/**
 * Set up an instance of the template factory that can be used independently
 *
 * @param {string} from
 *        The address of the account using the factory.
 * @param {Object} options
 *        Template factory options.
 * @param {Object} [options.apm]
 *        Options for apm.js (see https://github.com/aragon/apm.js)
 * @param {string} [options.apm.ensRegistryAddress]
 *        ENS registry for apm.js
 * @param {Object} [options.apm.ipfs]
 *        IPFS provider config for apm.js
 * @param {string} [options.apm.ipfs.gateway]
 *        IPFS gateway apm.js will use to fetch artifacts from
 * @param {Function} [options.defaultGasPriceFn=function]
 *        A factory function to provide the default gas price for transactions.
 *        It can return a promise of number string or a number string. The function
 *        has access to a recommended gas limit which can be used for custom
 *        calculations. This function can also be used to get a good gas price
 *        estimation from a 3rd party resource.
 * @param {string|Object} [options.provider=web3.currentProvider]
 *        The Web3 provider to use for blockchain communication. Defaults to `web3.currentProvider`
 *        if web3 is injected, otherwise will fallback to wss://rinkeby.eth.aragon.network/ws
 * @return {Object} Template factory instance
 */
export const setupTemplates = (from, options = {}) => {
  const defaultOptions = {
    apm: {},
    defaultGasPriceFn: () => { },
    provider: detectProvider()
  }
  options = Object.assign(defaultOptions, options)
  const web3 = new Web3(options.provider)

  return Templates(from, {
    web3,
    apm: apm(web3, options.apm),
    defaultGasPriceFn: options.defaultGasPriceFn
  })
}

/**
 * An Aragon wrapper.
 *
 * @param {string} daoAddress
 *        The address of the DAO.
 * @param {Object} options
 *        Wrapper options.
 * @param {Object} [options.apm]
 *        Options for apm.js (see https://github.com/aragon/apm.js)
 * @param {string} [options.apm.ensRegistryAddress]
 *        ENS registry for apm.js
 * @param {Object} [options.apm.ipfs]
 *        IPFS provider config for apm.js
 * @param {string} [options.apm.ipfs.gateway]
 *        IPFS gateway apm.js will use to fetch artifacts from
 * @param {Function} [options.defaultGasPriceFn=function]
 *        A factory function to provide the default gas price for transactions.
 *        It can return a promise of number string or a number string. The function
 *        has access to a recommended gas limit which can be used for custom
 *        calculations. This function can also be used to get a good gas price
 *        estimation from a 3rd party resource.
 * @param {string|Object} [options.provider=web3.currentProvider]
 *        The Web3 provider to use for blockchain communication. Defaults to `web3.currentProvider`
 *        if web3 is injected, otherwise will fallback to wss://rinkeby.eth.aragon.network/ws
 */
export default class Aragon {
  constructor (daoAddress, options = {}) {
    const defaultOptions = {
      apm: {},
      defaultGasPriceFn: () => { },
      provider: detectProvider()
    }
    options = Object.assign(defaultOptions, options)

    // Set up Web3
    this.web3 = new Web3(options.provider)

    // Set up APM
    this.apm = apm(this.web3, options.apm)

    // Set up the kernel proxy
    this.kernelProxy = makeProxy(daoAddress, 'Kernel', this.web3)

    // Set up cache
    this.cache = new Cache(daoAddress)

    this.defaultGasPriceFn = options.defaultGasPriceFn
  }

  /**
   * Initialise the wrapper.
   *
   * @param {Object} [options] Options
   * @param {Object} [options.accounts] `initAccount()` options (see below)
   * @param {Object} [options.acl] `initACL()` options (see below)
   * @return {Promise<void>}
   * @throws {Error} Will throw an error if the `daoAddress` is detected to not be a Kernel instance
   */
  async init (options = {}) {
    let aclAddress

    try {
      // Check if address is kernel
      // web3 throws if it's an empty address ('0x')
      aclAddress = await this.kernelProxy.call('acl')
    } catch (_) {
      throw Error(`Provided daoAddress is not a DAO`)
    }

    await this.cache.init()
    await this.kernelProxy.updateInitializationBlock()
    await this.initAccounts(options.accounts)
    await this.initAcl(Object.assign({ aclAddress }, options.acl))
    await this.initIdentityProviders()
    this.initApps()
    this.initForwarders()
    this.initNetwork()
    this.initNotifications()
    this.transactions = new Subject()
    this.signatures = new Subject()
  }

  /**
   * Initialise the accounts observable.
   *
   * @param {Object} [options] Options
   * @param {boolean} [options.fetchFromWeb3] Whether or not accounts should also be fetched from
   *                                          the provided Web3 instance
   * @param {Array<string>} [options.providedAccounts] Array of accounts that the user controls
   * @return {Promise<void>}
   */
  async initAccounts ({ fetchFromWeb3, providedAccounts = [] } = {}) {
    this.accounts = new ReplaySubject(1)
    const accounts = fetchFromWeb3
      ? providedAccounts.concat(await this.web3.eth.getAccounts())
      : providedAccounts

    this.setAccounts(accounts)
  }

  /**
   * Initialise the ACL (Access Control List).
   *
   * @return {Promise<void>}
   */
  async initAcl ({ aclAddress } = {}) {
    if (!aclAddress) {
      aclAddress = await this.kernelProxy.call('acl')
    }

    // Set up ACL proxy
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
    this.permissions = merge(...aclObservables).pipe(
      // Keep track of all the types of events that have been processed
      scan(([permissions, eventSet], event) => {
        const eventData = event.returnValues

        // NOTE: dotprop.get() doesn't work through proxies, so we manually access permissions
        const appPermissions = permissions[eventData.app] || {}

        if (event.event === SET_PERMISSION_EVENT) {
          const key = `${eventData.role}.allowedEntities`

          // Converts to and from a set to avoid duplicated entities
          const permissionsForRole = new Set(dotprop.get(appPermissions, key, []))

          if (eventData.allowed) {
            permissionsForRole.add(eventData.entity)
          } else {
            permissionsForRole.delete(eventData.entity)
          }

          dotprop.set(appPermissions, key, Array.from(permissionsForRole))
        }

        if (event.event === CHANGE_PERMISSION_MANAGER_EVENT) {
          dotprop.set(appPermissions, `${eventData.role}.manager`, eventData.manager)
        }

        permissions[eventData.app] = appPermissions
        return [permissions, eventSet.add(event.event)]
      }, [makeAddressMapProxy({}), new Set()]),
      // Skip until we have received events from all event subscriptions
      // Note that this is safe as the ACL will always have to emit both
      // ChangePermissionManager and SetPermission events every time a
      // permission is created
      skipWhile(([permissions, eventSet]) => eventSet.size < aclObservables.length),
      map(([permissions]) => permissions),
      // Throttle so it only continues after 30ms without new values
      // Avoids DDOSing subscribers as during initialization there may be
      // hundreds of events processed in a short timespan
      debounceTime(30),
      publishReplay(1)
    )
    this.permissions.connect()
  }

  /**
   * Check if an object is an app.
   *
   * @param  {Object}  app
   * @return {boolean}
   */
  isApp (app) {
    return app.kernelAddress && this.isKernelAddress(app.kernelAddress)
  }

  /**
   * Check if an address is this DAO's kernel.
   *
   * @param  {string}  address
   * @return {boolean}
   */
  isKernelAddress (address) {
    return addressesEqual(address, this.kernelProxy.address)
  }

  /**
   * Initialize apps observable.
   *
   * @return {void}
   */
  initApps () {
    // Cache requests so we don't make unnecessary calls when a call is already in-flight
    const applicationInfoCache = new AsyncRequestCache((cacheKey) => {
      const [appId, codeAddress] = cacheKey.split('.')
      return getAragonOsInternalAppInfo(appId) ||
        this.apm.getLatestVersionForContract(appId, codeAddress)
    })

    const proxyContractValueCache = new AsyncRequestCache((proxyAddress) => {
      if (this.isKernelAddress(proxyAddress)) {
        const kernelProxy = makeProxy(proxyAddress, 'ERCProxy', this.web3, this.kernelProxy.initializationBlock)

        return Promise.all([
          // Use Kernel ABI
          this.kernelProxy.call('KERNEL_APP_ID'),
          // Use ERC897 proxy ABI
          // Note that this won't work on old Aragon Core 0.5 Kernels,
          // as they had not implemented ERC897 yet
          kernelProxy.call('implementation')
        ]).then((values) => ({
          appId: values[0],
          codeAddress: values[1]
        }))
      }

      const appProxy = makeProxy(proxyAddress, 'AppProxy', this.web3, this.kernelProxy.initializationBlock)
      const appProxyForwarder = makeProxy(proxyAddress, 'Forwarder', this.web3, this.kernelProxy.initializationBlock)

      return Promise.all([
        appProxy.call('kernel'),
        appProxy.call('appId'),
        appProxy.call('implementation'),
        // Not all apps implement the forwarding interface
        appProxyForwarder.call('isForwarder').catch(() => false)
      ]).then((values) => ({
        kernelAddress: values[0],
        appId: values[1],
        codeAddress: values[2],
        isForwarder: values[3]
      }))
    })

    // Get all app proxy addresses
    const baseApps$ = this.permissions.pipe(
      map(Object.keys),
      // Add Kernel as the first "app"
      map((proxyAddresses) => {
        const appsWithoutKernel = proxyAddresses.filter((address) => !this.isKernelAddress(address))
        return [this.kernelProxy.address].concat(appsWithoutKernel)
      }),
      // Get proxy values
      switchMap(
        (proxyAddresses) => Promise.all(
          proxyAddresses.map(async (proxyAddress) => {
            let proxyValues
            try {
              proxyValues = await proxyContractValueCache.request(proxyAddress)
            } catch (_) {}

            return {
              proxyAddress,
              ...proxyValues
            }
          })
        )
      ),
      // Filter to remove any non-apps assigned in permissions
      map(appProxies => appProxies.filter(
        (appProxy) => this.isApp(appProxy) || this.isKernelAddress(appProxy.proxyAddress)
      ))
    )

    // Get artifact info for apps
    const appsWithInfo$ = baseApps$.pipe(
      switchMap(
        (apps) => Promise.all(
          apps.map(async (app) => {
            let appInfo
            if (app.appId && app.codeAddress) {
              const cacheKey = `${app.appId}.${app.codeAddress}`
              try {
                appInfo = await applicationInfoCache.request(cacheKey)
              } catch (_) { }
            }

            return Object.assign(app, appInfo)
          })
        )
      )
    )

    // Combine the loaded apps with any identifiers they may have declared
    this.identifiers = new Subject()
    this.apps = combineLatest(
      appsWithInfo$,
      this.identifiers.pipe(
        scan(
          (identifiers, { address, identifier }) =>
            Object.assign(identifiers, { [address]: identifier }),
          {}),
        startWith({})
      ),
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
    ).pipe(
      publishReplay(1)
    )
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
    this.forwarders = this.apps.pipe(
      map(
        (apps) => apps.filter((app) => app.isForwarder)
      ),
      publishReplay(1)
    )
    this.forwarders.connect()
  }

  /**
   * Initialise identity providers.
   *
   * @return {Promise<void>}
   */
  async initIdentityProviders () {
    const defaultIdentityProviders = [{
      name: 'local',
      provider: new LocalIdentityProvider()
    }]
    // TODO: detect other installed providers
    const detectedIdentityProviders = []
    const identityProviders = [...defaultIdentityProviders, ...detectedIdentityProviders]

    // Init all providers
    await Promise.all(identityProviders.map(({ provider }) => {
      // Most providers should have this defined to a noop function by default, but just in case
      if (typeof provider.init === 'function') {
        return provider.init()
      }
      return Promise.resolve()
    }))

    this.identityProviderRegistrar = new Map(
      identityProviders.map(({ name, provider }) => [name, provider])
    )
    // Set up identity modification intent observable
    this.identityIntents = new Subject()
  }

  /**
   * Modify the identity metadata for an address using the highest priority provider.
   *
   * @param  {string} address Address to modify
   * @param  {Object} metadata Modification metadata object
   * @return {Promise} Resolves if the modification was successful
   */
  modifyAddressIdentity (address, metadata) {
    const providerName = 'local'
    const provider = this.identityProviderRegistrar.get(providerName)
    if (provider && typeof provider.modify === 'function') {
      return provider.modify(address, metadata)
    }
    return Promise.reject(new Error(`Provider (${providerName}) not installed`))
  }

  /**
   * Resolve the identity metadata for an address using the highest priority provider.
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolves with the identity or null if not found
   */
  resolveAddressIdentity (address) {
    const providerName = 'local' // TODO - get provider
    const provider = this.identityProviderRegistrar.get(providerName)
    if (provider && typeof provider.resolve === 'function') {
      return provider.resolve(address)
    }
    return Promise.reject(new Error(`Provider (${providerName}) not installed`))
  }

  /**
   * Request an identity modification using the highest priority provider.
   *
   * Returns a promise which delegates resolution to the handler
   * which listens and handles `this.identityIntents`
   *
   * @param  {string} address Address to modify
   * @return {Promise} Reolved by the handler of identityIntents
   */
  requestAddressIdentityModification (address) {
    const providerName = 'local' // TODO - get provider
    if (this.identityProviderRegistrar.has(providerName)) {
      return new Promise((resolve, reject) => {
        this.identityIntents.next({
          address,
          providerName,
          resolve,
          reject
        })
      })
    }

    return Promise.reject(new Error(`Provider (${providerName}) not installed`))
  }

  /**
   * Clear all local identities
   *
   * @return {Promise<void>}
   */
  clearLocalIdentities () {
    return this.identityProviderRegistrar.get('local').clear()
  }

  /**
   * Get all local identities for listing functionality
   *
   * @return {Promise<Object>}
   */
  getLocalIdentities () {
    return this.identityProviderRegistrar.get('local').getAll()
  }

  /**
   * Initialise the network observable.
   *
   * @return {Promise<void>}
   */
  async initNetwork () {
    this.network = new ReplaySubject(1)
    this.network.next({
      id: await this.web3.eth.net.getId(),
      type: await this.web3.eth.net.getNetworkType()
    })
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

    this.notifications = new BehaviorSubject(cached).pipe(
      scan((notifications, { modifier, notification }) => modifier(notifications, notification)),
      tap((notifications) => this.cache.set('notifications', notifications)),
      publishReplay(1)
    )
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
          notification => ((new Date(notification.date)).getTime() >= date.getTime())
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
        return notifications.pipe(
          filter(notification => notification.id !== id)
        )
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
   * As there may be race conditions with losing messages from cross-context environments,
   * running an app is split up into two parts:
   *
   *   1. Set up any required state for the app. This step is allowed to be asynchronous.
   *   2. Connect the app to a running context, by associating the context's message provider
   *      to the app. This step is synchronous.
   *
   * @param  {string} proxyAddress
   *         The address of the app proxy.
   * @return {Promise<function>}
   */
  async runApp (proxyAddress) {
    // Step 1: Set up required state for the app

    // Only get the first result from the observable, so our running contexts don't get
    // reinitialized if new apps appear
    const apps = await this.apps.pipe(first()).toPromise()

    const app = apps.find((app) => addressesEqual(app.proxyAddress, proxyAddress))

    // TODO: handle undefined (no proxy found), otherwise when calling app.proxyAddress next, it will throw
    const appProxy = makeProxyFromABI(app.proxyAddress, app.abi, this.web3)

    await appProxy.updateInitializationBlock()

    // Step 2: Associate app with running context
    return (sandboxMessengerProvider) => {
      // Set up messenger
      const messenger = new Messenger(
        sandboxMessengerProvider
      )

      // Wrap requests with the application proxy
      // Note that we have to do this synchronously with the creation of the message provider,
      // as we otherwise risk race conditions and may lose messages
      const request$ = messenger.requests().pipe(
        map(request => ({ request, proxy: appProxy, wrapper: this })),
        // Use the same request$ result in each handler
        // Turns request$ into a subject
        publishReplay(1)
      )
      request$.connect()

      // Register request handlers
      const shutdown = handlers.combineRequestHandlers(
        handlers.createRequestHandler(request$, 'cache', handlers.cache),
        handlers.createRequestHandler(request$, 'events', handlers.events),
        handlers.createRequestHandler(request$, 'intent', handlers.intent),
        handlers.createRequestHandler(request$, 'call', handlers.call),
        handlers.createRequestHandler(request$, 'network', handlers.network),
        handlers.createRequestHandler(request$, 'notification', handlers.notifications),
        handlers.createRequestHandler(request$, 'external_call', handlers.externalCall),
        handlers.createRequestHandler(request$, 'external_events', handlers.externalEvents),
        handlers.createRequestHandler(request$, 'identify', handlers.identifier),
        handlers.createRequestHandler(request$, 'address_identity', handlers.addressIdentity),
        handlers.createRequestHandler(request$, 'accounts', handlers.accounts),
        handlers.createRequestHandler(request$, 'describe_script', handlers.describeScript),
        handlers.createRequestHandler(request$, 'web3_eth', handlers.web3Eth),
        handlers.createRequestHandler(request$, 'sign_message', handlers.signMessage)
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
    return this.accounts.pipe(first()).toPromise()
  }

  /**
   * Allows apps to sign arbitrary data via a RPC call
   *
   * @param {Array<Object>} params An object containing the address of the app and the message to be signed
   * @return {Promise<string>} signature hash
   */
  signMessage (params) {
    const { fromAddress, message } = params

    return new Promise((resolve, reject) => {
      this.signatures.next({
        from: fromAddress,
        message,
        accept (signatureHash) {
          resolve(signatureHash)
        },
        reject (err) {
          reject(err || new Error('The message was not signed'))
        }
      })
    })
  }

  /**
   * @param {Array<Object>} transactionPath An array of Ethereum transactions that describe each step in the path
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
    return this.apps.pipe(
      map(apps => apps.find(app => addressesEqual(app.proxyAddress, proxyAddress))),
      first()
    ).toPromise()
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
    const permissions = await this.permissions.pipe(first()).toPromise()
    const appPermissions = permissions[appAddress]

    return dotprop.get(appPermissions, `${roleHash}.manager`)
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
   * @param  {Array<Object>} path
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

      let description
      let annotatedDescription
      try {
        description = await radspec.evaluate(
          expression,
          {
            abi: app.abi,
            transaction: step
          },
          { ethNode: this.web3.currentProvider }
        )
      } catch (err) { }

      if (description) {
        const processed = await this.postprocessRadspecDescription(description)
        description = processed.description
        annotatedDescription = processed.annotatedDescription
      }

      return Object.assign(step, {
        description,
        annotatedDescription,
        name: app.name,
        identifier: app.identifier
      })
    }))
  }

  /**
   * Look for known addresses and roles in a radspec description and substitute them with a human string
   *
   * @param  {string} description
   * @return {Promise<Object>} description and annotated description
   */
  async postprocessRadspecDescription (description) {
    const addressRegexStr = '0x[a-fA-F0-9]{40}'
    const addressRegex = new RegExp(`^${addressRegexStr}$`)
    const bytes32RegexStr = '0x[a-f0-9]{64}'
    const bytes32Regex = new RegExp(`^${bytes32RegexStr}$`)
    const combinedRegex = new RegExp(`\\b(${addressRegexStr}|${bytes32RegexStr})\\b`)

    const tokens = description
      .split(combinedRegex)
      .map(token => token.trim())
      .filter(token => token)

    if (tokens.length <= 1) {
      return { description }
    }

    const apps = await this.apps.pipe(first()).toPromise()
    const roles = apps
      .map(({ roles }) => roles || [])
      .reduce((acc, roles) => acc.concat(roles), []) // flatten

    const annotateAddress = (input) => {
      if (addressesEqual(input, ANY_ENTITY)) {
        return [input, "'Any account'", { type: 'any-account', value: ANY_ENTITY }]
      }

      const app = apps.find(
        ({ proxyAddress }) => addressesEqual(proxyAddress, input)
      )
      if (app) {
        const replacement = `${app.name}${app.identifier ? ` (${app.identifier})` : ''}`
        return [input, `'${replacement}'`, { type: 'app', value: app }]
      }

      return [input, input, { type: 'address', value: input }]
    }

    const annotateBytes32 = (input) => {
      const role = roles.find(({ bytes }) => bytes === input)

      if (role && role.name) {
        return [input, `'${role.name}'`, { type: 'role', value: role }]
      }

      const app = apps.find(
        ({ appName }) => appName && namehash(appName) === input
      )

      if (app) {
        // return the entire app as it contains APM package details
        return [input, `'${app.appName}'`, { type: 'apmPackage', value: app }]
      }

      const namespace = getKernelNamespace(input)
      if (namespace) {
        return [input, `'${namespace.name}'`, { type: 'kernelNamespace', value: namespace }]
      }

      return [input, input, { type: 'bytes32', value: input }]
    }

    const annotateText = (input) => {
      return [input, input, { type: 'text', value: input }]
    }

    const annotatedTokens = tokens.map(token => {
      if (addressRegex.test(token)) {
        return annotateAddress(token)
      }
      if (bytes32Regex.test(token)) {
        return annotateBytes32(token)
      }
      return annotateText(token)
    })

    const compiled = annotatedTokens.reduce((acc, [_, replacement, annotation]) => {
      acc.description.push(replacement)
      acc.annotatedDescription.push(annotation)
      return acc
    }, {
      annotatedDescription: [],
      description: []
    })

    return {
      annotatedDescription: compiled.annotatedDescription,
      description: compiled.description.join(' ')
    }
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
    // If a pretransaction is required for the main transaction to be performed,
    // performing web3.eth.estimateGas could fail until the pretransaction is mined
    // Example: erc20 approve (pretransaction) + deposit to vault (main transaction)
    if (transaction.pretransaction) {
      // Calculate gas settings for pretransaction
      transaction.pretransaction = await this.applyTransactionGas(transaction.pretransaction, false)
      // Note: for transactions with pretransactions gas limit and price cannot be calculated
      return transaction
    }

    // NOTE: estimateGas mutates the argument object and transforms the address to lowercase
    // so this is a hack to make sure checksums are not destroyed
    // Also, at the same time it's a hack for checking if the call will revert,
    // since `eth_call` returns `0x` if the call fails and if the call returns nothing.
    // So yeah...
    const estimatedGasLimit = await this.web3.eth.estimateGas({ ...transaction, gas: undefined })
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

    const permissions = await this.permissions.pipe(first()).toPromise()
    const app = await this.getApp(destination)

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

    if (transactionOptions.token) {
      const { address: tokenAddress, value: tokenValue } = transactionOptions.token

      const erc20ABI = getAbi('standard/ERC20')
      const tokenContract = new this.web3.eth.Contract(erc20ABI, tokenAddress)
      const balance = await tokenContract.methods.balanceOf(sender).call()

      const tokenValueBN = toBN(tokenValue)

      if (toBN(balance).lt(tokenValueBN)) {
        throw new Error(`Balance too low. ${sender} balance of ${tokenAddress} token is ${balance} (attempting to send ${tokenValue})`)
      }

      const allowance = await tokenContract.methods.allowance(sender, destination).call()
      const allowanceBN = toBN(allowance)

      // If allowance is already greater than or equal to amount, there is no need to do an approve transaction
      if (allowanceBN.lt(tokenValueBN)) {
        if (allowanceBN.gt(toBN(0))) {
          // TODO: Actually handle existing approvals (some tokens fail when the current allowance is not 0)
          console.warn(`${sender} already approved ${destination}. In some tokens, approval will fail unless the allowance is reset to 0 before re-approving again.`)
        }

        const tokenApproveTransaction = {
          // TODO: should we include transaction options?
          from: sender,
          to: tokenAddress,
          data: tokenContract.methods.approve(destination, tokenValue).encodeABI()
        }

        directTransaction.pretransaction = tokenApproveTransaction
        delete transactionOptions.token
      }
    }

    let appsWithPermissionForMethod = []

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

      const permissionsForDestination = permissions[destination]
      appsWithPermissionForMethod = dotprop.get(
        permissionsForDestination,
        `${roleSig}.allowedEntities`,
        []
      )

      // No one has access
      if (appsWithPermissionForMethod.length === 0) {
        return []
      }

      try {
        // `applyTransactionGas` can throw if the transaction will fail
        // if that happens, we will try to find a transaction path through a forwarder
        return [await this.applyTransactionGas(directTransaction)]
      } catch (_) { }
    }

    const forwarders = await this.forwarders.pipe(first()).toPromise().then(
      (forwarders) => forwarders.map(
        (forwarder) => forwarder.proxyAddress
      )
    )

    let forwardersWithPermission

    if (finalForwarderProvided) {
      if (!includesAddress(forwarders, finalForwarder)) {
        return []
      }

      forwardersWithPermission = [finalForwarder]
    } else {
      // Find forwarders with permission to perform the action
      forwardersWithPermission = forwarders
        .filter(
          (forwarder) => includesAddress(appsWithPermissionForMethod, forwarder)
        )
    }

    return this.calculateForwardingPath(sender, destination, directTransaction, forwardersWithPermission)
  }

  /**
   * Calculate the forwarding path for a transaction to `destination`
   * that invokes `directTransaction`.
   *
   * @param  {string} sender
   * @param  {string} destination
   * @param  {Object} directTransaction
   * @param  {string} [forwardersWithPermission]
   * @return {Array<Object>} An array of Ethereum transactions that describe each step in the path
   */
  async calculateForwardingPath (sender, destination, directTransaction, forwardersWithPermission) {
    // No forwarders can perform the requested action
    if (forwardersWithPermission.length === 0) {
      return []
    }

    // Only apply the pretransaction to the final forwarding transaction
    const pretransaction = directTransaction.pretransaction
    delete directTransaction.pretransaction

    // TODO: No need for contract?
    // A helper method to create a transaction that calls `forward` on a forwarder with `script`
    const forwardMethod = new this.web3.eth.Contract(
      getAbi('aragon/Forwarder')
    ).methods['forward']

    const createForwarderTransaction = (forwarderAddress, script) => (
      {
        ...directTransaction, // Options are overwriten by the values below
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
        transaction.pretransaction = pretransaction
        // TODO: recover if applying gas fails here
        return [await this.applyTransactionGas(transaction, true), directTransaction]
      }
    }

    // Get a list of all forwarders (excluding the forwarders with direct permission)
    const forwarders = await this.forwarders.pipe(first()).toPromise().then(
      (forwarders) => forwarders
        .map((forwarder) => forwarder.proxyAddress)
        .filter((forwarder) => !includesAddress(forwardersWithPermission, forwarder))
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
          transaction.pretransaction = pretransaction
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

// Re-export the AddressIdentityProvider abstract base class
export { AddressIdentityProvider } from './identity'
// Re-export the Aragon RPC providers
export { providers } from '@aragon/rpc-messenger'
