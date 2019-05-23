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

    // Preconditions for searching a minimum of 4 chars for addresses
    if (isAddressSearch && searchTerm.length < 4) {
      return []
    }
    // Preconditions for searching a minimum of 4 chars for names
    if (!isAddressSearch && searchTerm.length < 3) {
      return []
    }

    const identities = await this.identityCache.getAll()
    const searchRegex = RegExp(searchTerm, 'i')
    const results = []

    for (const [address, { name }] of Object.entries(identities)) {
      if (isAddressSearch) {
        searchRegex.test(address) && results.push({ name, address })
      } else {
        searchRegex.test(name) && results.push({ name, address })
      }
    }

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
