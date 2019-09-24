import AddressIdentityProvider from './AddressIdentityProvider'
import { from } from 'rxjs'
import { concatAll, first, map, skipWhile, filter, flatMap, defaultIfEmpty, reduce } from 'rxjs/operators'
import { getCacheKey } from '../utils/index'
import { apmAppId } from '../utils/apps'

const addressBookAppIds = [
  apmAppId('address-book'),
  apmAppId('address-book.open'),
  apmAppId('tps-address-book.open'),
  apmAppId('address-book-staging.open'),
  apmAppId('address-book.hatch')
]
/**
 * An identity provider for Address Book Entries
 *
 * @extends AddressIdentityProvider
 */
export default class AddressBookIdentityProvider extends AddressIdentityProvider {
  /**
   * Create a new identity Provider that queries installed Address Book apps
   * @param {Observable} apps apps Observable from the wrapper
   * @param {Cache} cache the cache instance utilized by the wrapper
   */
  constructor (apps, cache) {
    super()
    this.apps = apps
    this.cache = cache
  }

  /**
   * Resolve the identity metadata for an address
   * Should resolve to null if an identity does not exist
   * Will return the first successful resolution                                                                                                                                                                                                                                tity could not be found
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolves with identity metadata or null if not found
   */
  async resolve (address) {
    address = address.toLowerCase()
    return this.apps.pipe(
      concatAll(),
      filter(app => addressBookAppIds.includes(app.appId)),
      map(async app => {
        const cacheKey = getCacheKey(app.proxyAddress, 'state')
        const { entries = [] } = await this.cache.get(cacheKey)
        const { data: entryData } = entries
          .find(entry => entry.addr.toLowerCase() === address) || {}
        return entryData || null
      }
      ),
      flatMap(pendingEntryData => from(pendingEntryData)),
      skipWhile(entryData => !entryData),
      defaultIfEmpty(null),
      first()
    ).toPromise()
  }

  /**
   * Search for matches in the installed address books.
   *
   * If the search term starts with '0x', addresses will be matched for instead.
   *
   * @param  {string} searchTerm Search term
   * @return {Promise} Resolved with array of matches, each containing the address and name
   */
  async search (searchTerm = '') {
    const isAddressSearch = searchTerm.substring(0, 2).toLowerCase() === '0x'
    const identities = await this.getAll()
    const results = Object.entries(identities)
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
   * get all identities from all installed address book instances
   *
   * @return {Promise} Resolved with an object of all identities when completed
   */
  async getAll () {
    return this.apps.pipe(
      first(),
      concatAll(),
      filter(app => addressBookAppIds.includes(app.appId)),
      reduce(
        async (allEntries, app) => {
          const cacheKey = getCacheKey(app.proxyAddress, 'state')
          const { entries = [] } = await this.cache.get(cacheKey)
          const allEntriesResolved = await allEntries
          const entriesObject = entries.reduce((obj, entry) => {
            return { ...obj, [entry.addr.toLowerCase()]: entry.data }
          }, {})
          // ensure the entries retrieved from the first-installed address book aren't overwritten
          return { ...entriesObject, ...allEntriesResolved }
        },
        Promise.resolve({})
      )
    ).toPromise()
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
