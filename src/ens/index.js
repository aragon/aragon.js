const ENS = require('ethereum-ens')

export default {
  /**
   * Get the address of an ENS name.
   *
   * @param  {string} name
   * @param  {object} web3
   * @param  {string} [registryAddress=null]
   * @return {Promise<string>} The resolved address
   */
  resolve (name, eth, registryAddress = null) {
    // Monkey patch for Web3 1.0 -> Web3 0.x
    let provider = eth.currentProvider
    provider.sendAsync = provider.send

    const ens = new ENS(provider, registryAddress)

    return ens.resolver(name).addr()
  }
}
