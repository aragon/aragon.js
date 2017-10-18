import { hash } from 'eth-ens-namehash'
import consts from '../utils/constants'

const registries = {
  1: '0x314159265dd8dbb310642f98f50c066173c1259b',
  3: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  // TODO: Remove
  15: '0x41c1d1d886b4256fab171128ab161c50e24d5ab5'
}

export function resolve (name, eth, chainId = 15) {
  let node = name
  if (!name.startsWith('0x')) {
    node = hash(name)
  }

  if (!registries[chainId]) {
    return Promise.reject(new Error(`No known ENS registry for chain ID ${chainId}`))
  }

  return new eth.Contract(
    require('../../abi/ens/ENSRegistry.json'),
    registries[chainId]
  ).methods.resolver(node).call()
    .then((resolverAddress) => {
      if (resolverAddress === consts.NULL_ADDRESS) throw new Error('ENS name could not be resolved')

      return new eth.Contract(
        require('../../abi/ens/ENSResolver.json'),
        resolverAddress
      ).methods.addr(node).call()
    })
}

export default {
  resolve
}
