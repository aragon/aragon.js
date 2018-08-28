import ENS from 'ethjs-ens'
const debug = require('debug')('aragon.ens')

/**
 * Resolve an ens name or node
 * 
 * @param {string} nameOrNode 
 * @param {*} opts 
 * @returns {Promise<string>}
 */
export function resolve (nameOrNode, opts = { provider: {}}) {
  const isName = nameOrNode.includes('.')

  // Stupid hack for ethjs-ens
  if (!opts.provider.sendAsync) {
    opts.provider.sendAsync = opts.provider.send
  }

  const ens = new ENS(opts)
  if (isName) {
    debug(`Looking up ENS name ${nameOrNode}`)
    return ens.lookup(nameOrNode)
  }

  debug(`Looking up ENS node ${nameOrNode}`)
  return ens.resolveAddressForNode(nameOrNode)
}
