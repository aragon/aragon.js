import { hash } from 'eth-ens-namehash'
import consts from '../utils/constants'

const registries = {
  1: '0x314159265dd8dbb310642f98f50c066173c1259b',
  3: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  // TODO: Remove
  15: '0x41c1d1d886b4256fab171128ab161c50e24d5ab5'
}

const resolve = async (name, eth, chainId = 15) => {
  let node = name
  if (!name.startsWith('0x') && name.length == 64 + 2) {
    node = hash(name)
  }

  const ensAddr = process.env.npm_package_config_ens || registries[chainId]
  if (!ensAddr) {
    return Promise.reject(new Error(`No known ENS registry for chain ID ${chainId}`))
  }

  const ens = new eth.Contract(require('../../abi/ens/ENSRegistry.json'), ensAddr)
  const resolverAddr = await ens.methods.resolver(node).call()

  if (resolverAddr === consts.NULL_ADDRESS) throw new Error('ENS name could not be resolved')

  const resolver = new eth.Contract(require('../../abi/ens/ENSResolver.json'), resolverAddr)
  return resolver.methods.addr(node).call()
}

export default {
  resolve
}
