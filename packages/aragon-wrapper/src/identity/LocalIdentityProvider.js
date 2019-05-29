import Cache from '../cache'
import AddressIdentityProvider from './AddressIdentityProvider'

/**
 * An local identity provider for addresses
 *
 * @class LocalIdentityProvider
 */
export default class LocalIdentityProvider extends AddressIdentityProvider {
  /**
   * Create a new identity provider attached to a locally-stored cache.
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
   * @return {Promise} Resolved metadata, null when not found, rejected on error
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

    return Promise.resolve({ address, metadata })
  }

  async search (searchTerm = '') {
    const isAddressSearch = searchTerm.substring(0, 2).toLowerCase() === '0x'

    if (searchTerm.length < 3) {
      return []
    }

    const identities = await this.identityCache.getAll()
    const results = Array.from(Object.entries(identities))
      .filter(
        ([address, { name }]) =>
          (isAddressSearch &&
            searchTerm.length > 3 &&
            address.toLowerCase().indexOf(searchTerm.toLowerCase()) === 0) ||
          name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1
      )
      .map(([address, { name }]) => ({ name, address }))

    return results
  }

  /**
   * Get all local identities
   *
   * @return {Promise} Resolved with an object of all identities when completed
   */
  async getAll () {
    return this.identityCache.getAll()
  }

  /**
   * Clear the local cache
   *
   * @return {Promise} Resolved when completed
   */
  async clear () {
    await this.identityCache.clear()
  }
}
