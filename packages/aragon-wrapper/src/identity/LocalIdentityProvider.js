import { BehaviorSubject } from 'rxjs'
import { scan } from 'rxjs/operators'
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

    this.identities = new BehaviorSubject(await this.identityCache.getAll())
      .pipe(
        scan((identities, modifier) => modifier(identities))
      )
  }

  /**
   * Resolve the locally-stored label for an address
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  async resolve (address) {
    return this.identityCache.get(address)
  }

  /**
   * Modify the locally-stored label of an address
   *
   * @param  {string} address  Address to resolve
   * @param  {Object} metadata Metadata to modify
   * @return {Promise} Resolved success action or rejected error
   */
  async modify (address, metadata) {
    // First save it in the cache
    await this.identityCache.set(address, metadata)
    // Then emit it on the observable
    this.identities.next((identities) => {
      identities[address] = metadata
    })

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
  }
}
