/**
 * An identity provider for addresses
 *
 * This is the expected interface which all identity
 * providers are expected to implement
 * Additional functionality can be added in subclasses
 *
 *
 * @class AddressIdentityProvider
 */
export default class AddressIdentityProvider {
  /**
   * Optional initialization, if required by the provider
   */
  async init () {
  }

  /**
   * Resolve the identity metadata for an address
   *
   * @param  {string} address Address to resolve
   * @return {Promise} Resolved metadata or rejected error
   */
  async resolve (address) {
    throw new Error('Not implemented')
  }

  /**
   * Modify the identity metadata of an address
   *
   * @param  {string} address  Address to resolve
   * @param  {Object} metadata Metadata to modify
   * @return {Promise} Resolved success action or rejected error
   */
  async modify (address, metadata) {
    throw new Error('Not implemented')
  }
}
