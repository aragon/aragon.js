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
  }

  /**
   * Resolve the locally-stored label for an address
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  resolve (address) {
    address = address.toLowerCase()
    return this.identityCache.get(address)
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
    address = address.toLowerCase()

    const metadata = { name, createdAt }
    // First save it in the cache
    await this.identityCache.set(address, metadata)

    // TODO: this should be spec'd out better
    return Promise.resolve({ address, metadata })
  }

  /**
   * Clear the locally-stored label of an address
   *
   * @return {Promise} Resolved when completed
   */
  async getAll () {
    return this.identityCache.getAll()
  }

  /**
   * Clear the locally-stored label of an address
   *
   * @return {Promise} Resolved when completed
   */
  async clear () {
    await this.identityCache.clear()
  }
}
