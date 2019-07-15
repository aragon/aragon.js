// Externals
import { asyncScheduler, concat, from, merge, of, ReplaySubject, Subject, BehaviorSubject } from 'rxjs'
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  endWith,
  filter,
  first,
  map,
  mergeAll,
  mergeMap,
  publishReplay,
  scan,
  startWith,
  switchMap,
  tap,
  throttleTime,
  withLatestFrom
} from 'rxjs/operators'
import uuidv4 from 'uuid/v4'
import Web3 from 'web3'
import { isAddress } from 'web3-utils'
import dotprop from 'dot-prop'

// APM
import apm from '@aragon/apm'

// RPC
import Messenger from '@aragon/rpc-messenger'
import * as handlers from './rpc/handlers'

// Utilities
import { getApmAppInfo } from './core/apm'
import { makeRepoProxy, getAllRepoVersions, getRepoVersionById } from './core/apm/repo'
import {
  getAragonOsInternalAppInfo,
  isAragonOsInternalApp
} from './core/aragonOS'
import { getKernelNamespace, isKernelAppCodeNamespace } from './core/aragonOS/kernel'
import {
  tryDescribingUpdateAppIntent,
  tryDescribingUpgradeOrganizationBasket,
  tryEvaluatingRadspec
} from './radspec'
import {
  addressesEqual,
  getCacheKey,
  includesAddress,
  makeAddressMapProxy,
  makeProxy,
  makeProxyFromABI,
  AsyncRequestCache,
  ANY_ENTITY
} from './utils'
import { decodeCallScript, encodeCallScript, isCallScript } from './utils/callscript'
import { isValidForwardCall, parseForwardCall } from './utils/forwarding'
import { doIntentPathsMatch } from './utils/intents'
import {
  applyForwardingPretransaction,
  createDirectTransaction,
  createForwarderTransactionBuilder,
  getRecommendedGasLimit
} from './utils/transactions'

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
    this.initAppIdentifiers()
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

    const ACL_CACHE_KEY = getCacheKey(aclAddress, 'acl')

    const REORG_SAFETY_BLOCK_AGE = 100

    const currentBlock = await this.web3.eth.getBlockNumber()
    const cacheBlockHeight = Math.max(currentBlock - REORG_SAFETY_BLOCK_AGE, 0) // clamp to 0 for safety

    // Check if we have cached ACL for this address
    // Cache object for an ACL: { permissions, blockNumber }
    const cachedAclState = await this.cache.get(ACL_CACHE_KEY, {})
    const { permissions: cachedPermissions, blockNumber: cachedBlockNumber } = cachedAclState

    const pastEventsOptions = {
      toBlock: cacheBlockHeight,
      // When using cache, fetch events from the next block after cache
      fromBlock: cachedPermissions ? cachedBlockNumber + 1 : undefined
    }
    const pastEvents$ = this.aclProxy.pastEvents(null, pastEventsOptions).pipe(
      mergeMap((pastEvents) => from(pastEvents)),
      // Custom cache event
      endWith({
        event: ACL_CACHE_KEY,
        returnValues: {}
      })
    )
    const currentEvents$ = this.aclProxy.events(null, { fromBlock: cacheBlockHeight + 1 }).pipe(
      startWith({
        event: 'starting current events',
        returnValues: {}
      })
    )

    // Permissions Object:
    // { app -> role -> { manager, allowedEntities -> [ entities with permission ] } }
    const fetchedPermissions$ = concat(pastEvents$, currentEvents$).pipe(
      scan(([permissions], event) => {
        const eventData = event.returnValues

        if (eventData.app) {
          // NOTE: dotprop.get() doesn't work through proxies, so we manually access permissions
          const appPermissions = permissions[eventData.app] || {}

          if (event.event === SET_PERMISSION_EVENT) {
            const key = `${eventData.role}.allowedEntities`

            // Converts to and from a set to avoid duplicated entities
            const allowedEntitiesSet = new Set(dotprop.get(appPermissions, key, []))

            if (eventData.allowed) {
              allowedEntitiesSet.add(eventData.entity)
            } else {
              allowedEntitiesSet.delete(eventData.entity)
            }

            dotprop.set(appPermissions, key, Array.from(allowedEntitiesSet))
          }

          if (event.event === CHANGE_PERMISSION_MANAGER_EVENT) {
            // We only care about the last one. An app permission can have only one manager
            dotprop.set(appPermissions, `${eventData.role}.manager`, eventData.manager)
          }

          permissions[eventData.app] = appPermissions
        }

        return [permissions, event]
      }, [ makeAddressMapProxy(cachedPermissions || {}) ]),

      // Cache if we're finished syncing up to cache block height
      map(([permissions, event]) => {
        if (event.event === ACL_CACHE_KEY) {
          this.cache.set(
            ACL_CACHE_KEY,
            // Make copy for cache
            { permissions: Object.assign({}, permissions), blockNumber: cacheBlockHeight }
          )
        }
        return permissions
      }),

      // Throttle so it only continues after 30ms without new values
      // Avoids DDOSing subscribers as during initialization there may be
      // hundreds of events processed in a short timespan
      debounceTime(30),
      publishReplay(1)
    )
    fetchedPermissions$.connect()

    const cachedPermissions$ = cachedPermissions ? of(makeAddressMapProxy(cachedPermissions)) : of()
    this.permissions = concat(cachedPermissions$, fetchedPermissions$).pipe(publishReplay(1))
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
    /******************************
     *                            *
     *          CACHING           *
     *                            *
     ******************************/

    const applicationInfoCache = new AsyncRequestCache((cacheKey) => {
      const [appId, codeAddress] = cacheKey.split('.')
      return getAragonOsInternalAppInfo(appId) ||
        getApmAppInfo(appId) ||
        this.apm.getLatestVersionForContract(appId, codeAddress)
    })

    const proxyContractValueCache = new AsyncRequestCache((proxyAddress) => {
      if (this.isKernelAddress(proxyAddress)) {
        const kernelProxy = makeProxy(proxyAddress, 'ERCProxy', this.web3)

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

      const appProxy = makeProxy(proxyAddress, 'AppProxy', this.web3)
      const appProxyForwarder = makeProxy(proxyAddress, 'Forwarder', this.web3)

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

    /******************************
     *                            *
     *            APPS            *
     *                            *
     ******************************/

    // Get all installed app proxy addresses
    const installedApps$ = this.permissions.pipe(
      map(Object.keys),
      // Dedupe until apps change
      distinctUntilChanged((oldProxies, newProxies) => {
        if (oldProxies.length !== newProxies.length) {
          return false
        }
        const oldSet = new Set(oldProxies)
        const intersection = new Set(newProxies.filter(newProxy => oldSet.has(newProxy)))
        return intersection.size === oldSet.size
      }),
      // Add Kernel as the first "app"
      map((proxyAddresses) => {
        const appsWithoutKernel = proxyAddresses.filter((address) => !this.isKernelAddress(address))
        return [this.kernelProxy.address].concat(appsWithoutKernel)
      }),
      // Get proxy values
      // Note that we can safely discard throttled values,
      // so we use a `switchMap()` instead of a `mergeMap()`
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

    // SetApp events are emitted when apps are installed and upgraded
    // These may modify the implementation addresses of the proxies (modifying their behaviour), so
    // we invalidate any caching we've done
    const updatedApps$ = this.kernelProxy
      // Override events subscription with empty options to subscribe from latest block
      .events('SetApp', {})
      .pipe(
        // Only care about changes if they're in the APP_BASE namespace
        filter(({ returnValues }) => isKernelAppCodeNamespace(returnValues.namespace)),

        // Merge with latest value of installedApps$ so we can return the full list of apps
        withLatestFrom(
          installedApps$,
          function updateApps (setAppEvent, apps) {
            const { appId: setAppId } = setAppEvent.returnValues
            return apps.map(async (app) => {
              if (app.appId !== setAppId) {
                return app
              }

              let proxyValues
              try {
                proxyValues = await proxyContractValueCache.request(
                  app.proxyAddress,
                  true // force cache invalidation
                )
              } catch (_) {}

              return {
                ...app,
                ...proxyValues,
                updated: true
              }
            })
          }
        ),
        // Emit resolved array of promises, one at a time
        concatMap(updatedApps => Promise.all(updatedApps))
      )

    // We merge these two observables, which both return the full list of apps attached with their
    // proxy values:
    //   - installedApps$: emits any time the list of installed apps changes
    //   - updatedApps$:   emits any time SetApp could modify an installed app
    const apps$ = merge(installedApps$, updatedApps$)

    // Get artifact info for apps
    const appsWithInfo$ = apps$.pipe(
      concatMap(
        (apps) => Promise.all(
          apps.map(async (app) => {
            let appInfo
            if (app.appId && app.codeAddress) {
              const cacheKey = `${app.appId}.${app.codeAddress}`
              try {
                appInfo = await applicationInfoCache.request(cacheKey)
              } catch (_) { }
            }

            return {
              ...appInfo,
              // Override the fetched appInfo with the actual app proxy's values to avoid mismatches
              ...app
            }
          })
        )
      )
    )

    this.apps = appsWithInfo$.pipe(
      publishReplay(1)
    )
    this.apps.connect()

    /*******************************
     *                             *
     *            REPOS            *
     *                             *
     ******************************/

    // Initialize installed repos from the list of apps
    const installedRepoCache = new Map()
    const repo$ = apps$.pipe(
      // Map installed apps into a deduped list of their aragonPM repos, with these assumptions:
      //   - No apps are lying about their appId (malicious apps _could_ masquerade as other
      //     apps by setting this value themselves)
      //   - `contractAddress`s will stay the same across all installed apps.
      //      This is technically not true as apps could set this value themselves
      //      (e.g. as pinned apps do), but these apps wouldn't be able to upgrade anyway
      //
      //  Ultimately returns an array of objects, holding the repo's:
      //    - appId
      //    - base contractAddress
      map((apps) => Object.values(
        apps
          .filter(({ appId }) => !isAragonOsInternalApp(appId))
          .reduce((installedRepos, { appId, codeAddress, updated }) => {
            installedRepos[appId] = {
              appId,
              updated,
              contractAddress: codeAddress
            }
            return installedRepos
          }, {})
      )),

      // Filter list of installed repos into:
      //   - New repos we haven't seen before (so we only subscribe once to their events)
      //   - Repos with apps that were updated in the kernel, to recalculate their current version
      map((repos) => {
        const newRepoAppIds = []
        const updatedRepoAppIds = []

        repos.forEach((repo) => {
          const { appId, updated } = repo
          if (!installedRepoCache.has(appId)) {
            newRepoAppIds.push(appId)
          } else if (updated) {
            updatedRepoAppIds.push(appId)
          }

          // Mark repo as seen and cache installed information
          installedRepoCache.set(appId, repo)
        })

        return [newRepoAppIds, updatedRepoAppIds]
      }),

      // Stop if there's no new repos or updated apps
      filter(([newRepoAppIds, updatedRepoAppIds]) =>
        newRepoAppIds.length || updatedRepoAppIds.length
      ),

      // Project new repos into their ids and web3 proxy objects
      concatMap(async ([newRepoAppIds, updatedRepoAppIds]) => {
        const newRepos = await Promise.all(
          newRepoAppIds.map(async (appId) => {
            const repoProxy = await makeRepoProxy(appId, this.apm, this.web3)
            await repoProxy.updateInitializationBlock()

            return {
              appId,
              repoProxy
            }
          })
        )
        return [newRepos, updatedRepoAppIds]
      }),

      // Here's where the fun begins!
      // It'll be easy to get lost, so remember to take it slowly.
      // Just remember, with this `mergeMap()`, we'll be subscribing to all the projected (returned)
      // observables and merging their respective emissions into a single observable.
      //
      // The output of this merged observable are update events containing the following:
      //   - `appId`: mandatory, signifies which repo was updated
      //   - `repoAddress`: optional, address of the repo contract itself
      //   - `versions`: optional, new version information
      mergeMap(([newRepos, updatedRepoAppIds]) => {
        // Create a new observable to project each new update as its own update emission.
        const update$ = of(...updatedRepoAppIds).pipe(
          map((appId) => ({ appId }))
        )

        // Create a new observable to project each new repo as its own emission.
        const newRepo$ = of(...newRepos)

        // Create a new observable to project each new repo's address as its own update emission.
        const repoAddress$ = newRepo$.pipe(
          map(({ appId, repoProxy }) => ({
            appId,
            repoAddress: repoProxy.address
          }))
        )

        // Create a new observable that projects each NewVersion event as its own update event
        // emission.
        // This one is a bit trickier, due to the higher order observable. Keep reading.
        const version$ = newRepo$.pipe(
          // `mergeMap()` to "flatten" the async transformation. This async function returns an
          // observable, which is ultimately the NewVersion stream. More on this, after the break.
          // Note: we don't care about the ordering, so we use `mergeMap()` instead of `concatMap()`
          mergeMap(async ({ appId, repoProxy }) => {
            const initialVersions = [
              // Immediately query state from the repo contract, to avoid having to wait until all
              // past events sync (may be long)
              ...await getAllRepoVersions(repoProxy)
            ]

            // Return an observable subscribed to NewVersion events, giving us:
            //   - Timestamps for versions that were published prior to this process running
            //   - Notifications for newly published versions
            //
            // Reduce this with the cached version information to emit version updates for the repo.
            return repoProxy.events('NewVersion').pipe(
              // Project each event to a new version info object, one at a time
              concatMap(async (event) => {
                const { versionId: eventVersionId } = event.returnValues

                // Adjust from Ethereum time
                const timestamp = (await this.web3.eth.getBlock(event.blockNumber)).timestamp * 1000

                const versionIndex = initialVersions.findIndex(({ versionId }) => versionId === eventVersionId)
                const versionInfo =
                  versionIndex === -1
                    ? await getRepoVersionById(repoProxy, eventVersionId)
                    : initialVersions[versionIndex]

                return {
                  ...versionInfo,
                  timestamp
                }
              }),

              // Trick to immediately emit (e.g. similar to a do/while loop)
              startWith(null),

              // Reduce newly emitted versions into the full list of versions
              scan(({ appId, versions }, newVersionInfo) => {
                let newVersions = versions
                if (newVersionInfo) {
                  const versionIndex = versions.findIndex(({ versionId }) => versionId === newVersionInfo.versionId)

                  if (versionIndex === -1) {
                    newVersions = versions.concat(newVersionInfo)
                  } else {
                    newVersions = Array.from(versions)
                    newVersions[versionIndex] = newVersionInfo
                  }
                }

                return {
                  appId,
                  versions: newVersions
                }
              }, {
                appId,
                versions: initialVersions
              })
            )
          }),

          // This bit is interesting.
          // We've "flattened" our async transformation with the `mergeMap()` above, but it still
          // returns an observable. We need to flatten this observable's emissions into the upper
          // stream, which is what `mergeAll()` achieves.
          mergeAll()
        )

        // Merge all of the repo update events resulting from the apps being updated, and return it
        // to the upper `mergeMap()` so it can be re-flattened into a single event stream.
        return merge(repoAddress$, version$, update$)
      }),

      // Reduce the event stream into a current representation of the installed repos, and which
      // repo to update next.
      scan(({ repos }, repoUpdate) => {
        const { appId: updatedAppId, ...update } = repoUpdate
        const updatedRepoInfo = {
          ...repos[updatedAppId],
          ...update
        }

        return {
          repos: {
            ...repos,
            [updatedAppId]: updatedRepoInfo
          },
          updatedRepoAppId: updatedAppId
        }
      }, {
        repos: {},
        updatedRepoAppId: null
      }),

      // Stop if we don't have enough information yet to continue
      filter(({ repos, updatedRepoAppId }) =>
        !!updatedRepoAppId && Array.isArray(repos[updatedRepoAppId].versions)
      ),

      // Grab the full information of the updated repo using its latest values.
      // With this, we've taken the basic stream of updates for events and mapped them onto their
      // full repo objects.
      concatMap(async ({ repos, updatedRepoAppId: appId }) => {
        const { repoAddress, versions } = repos[appId]
        const installedRepoInfo = installedRepoCache.get(appId)

        const latestVersion = versions[versions.length - 1]
        const currentVersion = Array.from(versions)
          // Apply reverse to find the latest version with the currently installed contract address
          .reverse()
          .find(version => version.contractAddress === installedRepoInfo.contractAddress)

        // Get info for the current and latest versions of the repo
        const currentVersionRequest = applicationInfoCache
          .request(`${appId}.${currentVersion.contractAddress}`)
          .catch(() => ({}))
          .then(content => ({
            content,
            version: currentVersion.version
          }))

        const versionInfos = await Promise.all([
          currentVersionRequest,
          currentVersion.contractAddress === latestVersion.contractAddress
            ? currentVersionRequest // current version is also the latest, no need to refetch
            : applicationInfoCache
              .request(`${appId}.${latestVersion.contractAddress}`)
              .catch(() => ({}))
              .then(content => ({
                content,
                version: latestVersion.version
              }))
        ])

        // Emit updated repo information
        return {
          appId,
          repoAddress,
          versions,
          currentVersion: versionInfos[0],
          latestVersion: versionInfos[1]
        }
      })
    )

    this.installedRepos = repo$.pipe(
      // Finally, we reduce the merged updates from individual repos into one final, expanding array
      // of the installed repos
      scan((repos, updatedRepo) => {
        const repoIndex = repos.findIndex(repo => repo.repoAddress === updatedRepo.repoAddress)
        if (repoIndex === -1) {
          return repos.concat(updatedRepo)
        } else {
          const nextRepos = Array.from(repos)
          nextRepos[repoIndex] = updatedRepo
          return nextRepos
        }
      }, []),
      // Throttle updates, but must keep trailing to ensure we don't drop any updates
      throttleTime(500, asyncScheduler, { leading: false, trailing: true }),
      publishReplay(1)
    )
    this.installedRepos.connect()
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
   * Initialise app identifier observable.
   *
   * @return {void}
   */
  initAppIdentifiers () {
    this.appIdentifiers = new BehaviorSubject({}).pipe(
      scan(
        (identifiers, { address, identifier }) =>
          Object.assign(identifiers, { [address]: identifier })
      ),
      publishReplay(1)
    )
    this.appIdentifiers.connect()
  }

  /**
   * Set the identifier of an app.
   *
   * @param {string} address The proxy address of the app
   * @param {string} identifier The identifier of the app
   * @return {void}
   */
  setAppIdentifier (address, identifier) {
    this.appIdentifiers.next({
      address,
      identifier
    })
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
   * Search identities based on a term
   *
   * @param  {string} searchTerm
   * @return {Promise} Resolves with the identity or null if not found
   */
  searchIdentities (searchTerm) {
    const providerName = 'local' // TODO - get provider
    const provider = this.identityProviderRegistrar.get(providerName)
    if (provider && typeof provider.search === 'function') {
      return provider.search(searchTerm)
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
          reject (err) {
            reject(err || new Error('The identity modification was not completed'))
          }
        })
      })
    }

    return Promise.reject(new Error(`Provider (${providerName}) not installed`))
  }

  /**
   * Remove selected local identities
   *
   * @param {Array<string>} addresses The addresses to be removed from the local identity provider
   * @return {Promise}
   */
  async removeLocalIdentities (addresses) {
    const localProvider = this.identityProviderRegistrar.get('local')
    for (const address of addresses) {
      await localProvider.remove(address)
    }
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
      const handlerSubscription = handlers.combineRequestHandlers(
        handlers.createRequestHandler(request$, 'cache', handlers.cache),
        handlers.createRequestHandler(request$, 'events', handlers.events),
        handlers.createRequestHandler(request$, 'past_events', handlers.pastEvents),
        handlers.createRequestHandler(request$, 'intent', handlers.intent),
        handlers.createRequestHandler(request$, 'call', handlers.call),
        handlers.createRequestHandler(request$, 'network', handlers.network),
        handlers.createRequestHandler(request$, 'notification', handlers.notifications),
        handlers.createRequestHandler(request$, 'external_call', handlers.externalCall),
        handlers.createRequestHandler(request$, 'external_events', handlers.externalEvents),
        handlers.createRequestHandler(request$, 'external_past_events', handlers.externalPastEvents),
        handlers.createRequestHandler(request$, 'identify', handlers.appIdentifier),
        handlers.createRequestHandler(request$, 'address_identity', handlers.addressIdentity),
        handlers.createRequestHandler(request$, 'search_identities', handlers.searchIdentities),
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

      // The attached unsubscribe isn't automatically bound to the subscription
      const shutdown = () => handlerSubscription.unsubscribe()

      const shutdownAndClearCache = async () => {
        shutdown()

        // Remove all cache keys related to this app one by one
        return Object
          .keys(await this.cache.getAll())
          .reduce((promise, cacheKey) => {
            return promise.then(() =>
              cacheKey.startsWith(proxyAddress)
                ? this.cache.remove(cacheKey)
                : Promise.resolve()
            )
          }, Promise.resolve())
      }

      return {
        setContext,
        shutdown,
        shutdownAndClearCache
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
   * @param {string} message to be signed
   * @param {string} requestingApp proxy address of requesting app
   * @return {Promise<string>} signature hash
   */
  signMessage (message, requestingApp) {
    if (typeof message !== 'string') {
      return Promise.reject(new Error('Message to sign must be a string'))
    }
    return new Promise((resolve, reject) => {
      this.signatures.next({
        message,
        requestingApp,
        resolve,
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
        resolve,
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
        try {
          return this.describeTransactionPath(path)
        } catch (_) { }
      }
    }

    return []
  }

  /**
   * Calculate the transaction path for a basket of intents.
   * Expects the `intentBasket` to be an array of tuples holding the following:
   *   {string}   destination: destination address
   *   {string}   methodName: method to invoke on destination
   *   {Array<*>} params: method params
   * These are the same parameters as the ones used for `getTransactionPath()`
   *
   * Allows user to specify how many of the intents should be checked to ensure their paths are
   * compatible. `checkMode` supports:
   *   'all': All intents will be checked to make sure they use the same forwarding path.
   *   'single': assumes all intents can use the path found from the first intent
   *
   * @param  {Array<Array<string, string, Array<*>>>} intentBasket Intents
   * @param  {Object} [options]
   * @param  {string} [options.checkMode] Path checking mode
   * @return {Promise<Object>} An object containing:
   *   - `direct`: whether the current account can directly invoke this basket
   *     (requiring separate transactions)
   *   - `transactions`: array of Ethereum transactions that describe each step in the path, with
   *     the last step being an array of transactions that describe each intent in the basket
   */
  async getTransactionPathForIntentBasket (intentBasket, { checkMode = 'all' } = {}) {
    // Get transaction paths for entire basket
    const intentsToCheck =
      checkMode === 'all'
        ? intentBasket // all -- use all intents
        : checkMode === 'single'
          ? [intentBasket[0]] // single -- only use first intent
          : []
    const intentPaths = await Promise.all(
      intentsToCheck.map(
        ([destination, methodName, params]) =>
          this.getTransactionPath(destination, methodName, params))
    )

    // If the paths don't match, we can't send the transactions in this intent basket together
    const pathsMatch = doIntentPathsMatch(intentPaths)
    if (pathsMatch) {
      // Create direct transactions for each intent in the intentBasket
      const sender = (await this.getAccounts())[0] // TODO: don't assume it's the first account
      const directTransactions = await Promise.all(
        intentBasket.map(
          async ([destination, methodName, params]) =>
            createDirectTransaction(sender, await this.getApp(destination), methodName, params, this.web3)
        )
      )

      if (intentPaths[0].length === 1) {
        // Sender has direct access
        try {
          const decoratedTransactions = await this.describeTransactionPath(
            await Promise.all(
              directTransactions.map(transaction => this.applyTransactionGas(transaction))
            )
          )

          return {
            direct: true,
            transactions: decoratedTransactions
          }
        } catch (_) { }
      } else {
        // Need to encode calls scripts for each forwarder transaction in the path
        const createForwarderTransaction = createForwarderTransactionBuilder(sender, {}, this.web3)
        const forwarderPath = intentPaths[0]
          // Ignore the last part of the path, which was the original intent
          .slice(0, -1)
          // Start from the "last" forwarder and move backwards to the sender
          .reverse()
          // Just use the forwarders' addresses
          .map(({ to }) => to)
          .reduce(
            (path, nextForwarder) => {
              const lastStep = path[0]
              const encodedLastStep = encodeCallScript(Array.isArray(lastStep) ? lastStep : [lastStep])
              return [createForwarderTransaction(nextForwarder, encodedLastStep), ...path]
            },
            // Start the recursive calls script encoding with the direct transactions for the
            // intent basket
            [directTransactions]
          )

        try {
          // Put the finishing touches: apply gas, and add radspec descriptions
          forwarderPath[0] = await this.applyTransactionGas(forwarderPath[0], true)
          return {
            direct: false,
            path: await this.describeTransactionPath(forwarderPath)
          }
        } catch (_) { }
      }
    }

    // Failed to find a path
    return {
      direct: false,
      path: []
    }
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
   * Decodes an EVM callscript and returns the transaction path it describes.
   *
   * @param  {string} script
   * @return {Array<Object>} An array of Ethereum transactions that describe each step in the path
   */
  decodeTransactionPath (script) {
    // In the future we may support more EVMScripts, but for now let's just assume we're only
    // dealing with call scripts
    if (!isCallScript(script)) {
      throw new Error(`Script could not be decoded: ${script}`)
    }

    const path = decodeCallScript(script)
    return path.map((segment) => {
      const { data } = segment

      if (isValidForwardCall(data)) {
        const forwardedEvmScript = parseForwardCall(data)

        try {
          segment.children = this.decodeTransactionPath(forwardedEvmScript)
        } catch (err) {}
      }

      return segment
    })
  }

  /**
   * Use radspec to create a human-readable description for each transaction in the given `path`
   *
   * @param  {Array<Object>} path
   * @return {Promise<Array<Object>>} The given `path`, with decorated with descriptions at each step
   */
  async describeTransactionPath (path) {
    return Promise.all(path.map(async (step) => {
      let decoratedStep

      if (Array.isArray(step)) {
        // Intent basket with multiple transactions in a single callscript
        // First see if the step can be handled with a specialized descriptor
        try {
          decoratedStep = tryDescribingUpgradeOrganizationBasket(step, this)
        } catch (err) { }

        // If the step wasn't handled, just individually describe each of the transactions
        // TODO: annotate this description
        return decoratedStep || Promise.all(step.map(this.describeTransactionPath))
      }

      // Single transaction step
      // First see if the step can be handled with a specialized descriptor
      try {
        decoratedStep = await tryDescribingUpdateAppIntent(step, this)
      } catch (err) { }

      // Finally, if the step wasn't handled yet, evaluate via radspec normally
      if (!decoratedStep) {
        try {
          decoratedStep = await tryEvaluatingRadspec(step, this)
        } catch (err) { }
      }

      // Annotate the description, if one was found
      if (decoratedStep) {
        if (decoratedStep.description) {
          try {
            const processed = await this.postprocessRadspecDescription(decoratedStep.description)
            decoratedStep.description = processed.description
            decoratedStep.annotatedDescription = processed.annotatedDescription
          } catch (err) { }
        }

        if (decoratedStep.children) {
          decoratedStep.children = await this.describeTransactionPath(decoratedStep.children)
        }
      }

      return decoratedStep || step
    }))
  }

  /**
   * Look for known addresses and roles in a radspec description and substitute them with a human string
   *
   * @param  {string} description
   * @return {Promise<Object>} Description and annotated description
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

      const app = apps.find(({ appId }) => appId === input)

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
    const directTransaction = await createDirectTransaction(sender, app, methodName, params, this.web3)

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
        try {
          // `applyTransactionGas` can throw if the transaction will fail
          // If that happens, we give up as we should've been able to perform the action directly
          return [await this.applyTransactionGas(directTransaction)]
        } catch (_) {
          return []
        }
      }

      const roleSig = app.roles.find(
        (role) => role.id === method.roles[0]
      ).bytes

      const permissionsForDestination = permissions[destination]
      appsWithPermissionForMethod = dotprop.get(
        permissionsForDestination,
        `${roleSig}.allowedEntities`,
        []
      )

      // No one has access, so of course we (or the final forwarder) don't as well
      if (appsWithPermissionForMethod.length === 0) {
        return []
      }

      try {
        // `applyTransactionGas` can throw if the transaction will fail
        // If that happens, we will try to find a transaction path through a forwarder
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

    // TODO: handle pretransactions specified in the intent
    // This is difficult to do generically, as some pretransactions
    // (e.g. token approvals) only work if they're for a specific target
    delete directTransaction.pretransaction

    const createForwarderTransaction = createForwarderTransactionBuilder(sender, directTransaction, this.web3)

    // Check if one of the forwarders that has permission to perform an action
    // with `sig` on `address` can forward for us directly
    for (const forwarder of forwardersWithPermission) {
      const script = encodeCallScript([directTransaction])
      if (await this.canForward(forwarder, sender, script)) {
        const transaction = createForwarderTransaction(forwarder, script)
        try {
          const transactionWithFee = await applyForwardingPretransaction(transaction, this.web3)
          // `applyTransactionGas` can throw if the transaction will fail
          // If that happens, we give up as we should've been able to perform the action with this
          // forwarder
          return [await this.applyTransactionGas(transactionWithFee, true), directTransaction]
        } catch (err) {
          return []
        }
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

    // Find the shortest path via a breadth-first search of forwarder paths.
    // We do a breadth-first instead of depth-first search because:
    //   - We assume that most forwarding paths will be quite short, so it should be faster
    //     to check in "stages" rather than exhaust single paths
    //   - We don't currently protect against cycles in the path, and so exhausting single
    //     paths can be wasteful if they result in dead ends
    // TODO(onbjerg): Should we find and return multiple paths?
    do {
      const [path, [forwarder, ...nextQueue]] = queue.shift()

      // Skip if no forwarder or the path is longer than 5
      if (!forwarder || path.length > 5) continue

      // Get the previous forwarder address
      const previousForwarder = path[0].to

      // Encode the previous transaction into an EVM callscript
      const script = encodeCallScript([path[0]])

      if (await this.canForward(previousForwarder, forwarder, script)) {
        if (await this.canForward(forwarder, sender, script)) {
          // The previous forwarder can forward a transaction for this forwarder,
          // and this forwarder can forward for our address, so we have found a path
          const transaction = createForwarderTransaction(forwarder, script)

          // Only apply pretransactions and gas to the first transaction in the path
          // as it's the only one that will be executed by the user
          try {
            const transactionWithFee = await applyForwardingPretransaction(transaction, this.web3)
            // `applyTransactionGas` can throw if the transaction will fail
            // If that happens, we give up as we should've been able to perform the action with this
            // forwarding path
            return [await this.applyTransactionGas(transactionWithFee, true), ...path]
          } catch (err) {
            return []
          }
        } else {
          // The previous forwarder can forward a transaction for this forwarder,
          // but this forwarder can not forward for our address, so we add it as a
          // possible path in the queue for later exploration.
          queue.push([
            [createForwarderTransaction(forwarder, script), ...path],
            // Avoid including the current forwarder as a candidate for the next step
            // in the path. Note that this is naive and may result in repeating cycles,
            // but the maximum path length would prevent against infinite loops
            forwarders.filter((nextForwarder) => nextForwarder !== forwarder)
          ])
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
