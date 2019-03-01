import { BehaviorSubject } from 'rxjs/Rx'
import Cache from '../cache'
import AddressIdentityProvider from './AddressIdentityProvider'

/**
 * An local label identity provider for addresses
 *
 * @class LocalLabelIdentityProvider
 */
export default class LocalLabelIdentityProvider extends AddressIdentityProvider {
  /**
   * Create a new local label identity provider attached to a globally-stored cache.
   *
   * @param {Object} [target=window.parent] An window implementing the postMessage API.
   */
  constructor () {
    super()
    this.labelCache = new Cache('localAddressLabel')
  }

  async init () {
    await this.labelCache.init()

    this.labels = new BehaviorSubject(await this.labelCache.getAll())
      .scan((labels, modifier) => modifier(labels))
  }

  /**
   * Resolve the locally-stored label for an address
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  async resolve (address) {
    return this.labelCache.get(address)
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
    await this.labelCache.set(address, metadata)
    // Then emit it on the observable
    this.labels.next((labels) => {
      labels.address = metadata
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
    await this.labelCache.clear()
  }
}
