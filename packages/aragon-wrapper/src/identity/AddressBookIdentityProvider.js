import AddressIdentityProvider from './AddressIdentityProvider'
import { first, map } from 'rxjs/operators'
import { getCacheKey } from '../utils/index'

const addressBookAppIds = [
  '0x32ec8cc9f3136797e0ae30e7bf3740905b0417b81ff6d4a74f6100f9037425de'
  // TODO Add in App Ids for rinkeby and mainnet appIds
]
/**
 * An identity provider for Address Book Entries
 *
 * @class AddressIdentityProvider
 */
export default class AddressBookIdentityProvider extends AddressIdentityProvider {
  constructor (apps, cache) {
    super()
    this.apps = apps
    this.cache = cache
  }
  /**
   * Optional initialization, if required by the provider
   */
  async init () {
    // no-op
  }

  /**
   * Resolve the identity metadata for an address
   * Should resolve to null if an identity does not exist
   * Will return the first successful resolution                                                                                                                                                                                                                                tity could not be found
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  async resolve (address) {
    address = address.toLowerCase()
    const addressBookApps = await this.apps.pipe(
      first(),
      map(apps => apps.filter(app => addressBookAppIds.includes(app.appId)))
    ).toPromise()

    return addressBookApps.reduce(async (identity, app) => {
      if (identity) {
        return identity
      }
      const cacheKey = getCacheKey(app.proxyAddress, 'state')
      const { entries = [] } = await this.cache.get(cacheKey)
      const { data: entryData } = entries
        .find(entry => entry.addr.toLowerCase() === address) || {}
      return entryData || null
    }, null)
  }

  /**
   * Modify the identity metadata of an address
   *
   * @param  {string} address  Address to resolve
   * @param  {Object} metadata Metadata to modify
   * @return {Promise} Resolved success action or rejected error
   */
  async modify (address, metadata) {
    throw new Error('Use the Address Book to change this label, or create your own local label')
  }
}
