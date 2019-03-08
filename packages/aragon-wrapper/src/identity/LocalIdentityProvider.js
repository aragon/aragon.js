import { BehaviorSubject, merge } from 'rxjs'
import { scan, publishReplay, pluck, map, filter } from 'rxjs/operators'
import Cache from '../cache'
import AddressIdentityProvider from './AddressIdentityProvider'

/**
 * An local identity provider for addresses
 *
 * @class LocalIdentityProvider
 */
export default class LocalIdentityProvider extends AddressIdentityProvider {
  /**
   * Create a new local  identity provider attached to a globally-stored cache.
   *
   * @param {Object} [target=window.parent] An window implementing the postMessage API.
   */
  constructor () {
    super()
    this.identityCache = new Cache('localIdentity')
  }

  async init () {
    await this.identityCache.init()

    this.identities$ = new BehaviorSubject(await this.identityCache.getAll())
      .pipe(
        scan((identities, { address, metadata, clear }) => {
          if (clear) return {}

          identities[address] = metadata
          return identities
        }),
        publishReplay(1)
      )
    this.identities$.connect()
  }

  /**
   * Resolve the locally-stored label for an address
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  resolve (address) {
    return this.identityCache.get(address)
  }

  /**
   * Returns the cache changes observable
   * Emits a string of an address that has been either changed or deleted
   * @return {Observable<string>} address changed cache changes
   */
  changes () {
    const singleAddressChanges$ = this.identityCache.changes.pipe(
      pluck('key')
    )

    // Emit `all` when identities is cleared
    const clearChanges$ = this.identities$.pipe(
      filter(identities => Object.keys(identities).length === 0),
      map(_ => 'all')
    )
    return merge(singleAddressChanges$, clearChanges$)
  }
  /**
   * Modify the locally-stored label of an address
   *
   * @param  {string} address  Address to resolve
   * @param  {Object} metadata Metadata to modify
   * @return {Promise} Resolved success action or rejected error
   */
  async modify (address, { name = '', createdAt = Date.now() } = {}) {
    if (!name) {
      throw new Error('name is required when modifying a local identity')
    }
    const metadata = { name, createdAt }
    // First save it in the cache
    await this.identityCache.set(address, metadata)
    // Then emit it on the observable
    this.identities$.next({ address, metadata })

    // TODO: this should be spec'd out better
    return {
      requiredAction: null
    }
  }

  /**
   * Clear the locally-stored label of an address
   *
   * @return {Promise} Resolved when completed
   */
  async clear () {
    await this.identityCache.clear()

    // clear the observable (feels clunky/ugly with clear)
    this.identities$.next({ clear: true })
  }
}
