import { isAddress } from 'web3-utils'
import ContractProxy from '../core/proxy'
import { getAbi } from '../interfaces'

const DEFAULT_GAS_FUZZ_FACTOR = 1.5
const PREVIOUS_BLOCK_GAS_LIMIT_FACTOR = 0.95

export const ANY_ENTITY = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'

// Check address equality without checksums
export function addressesEqual(first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

// "Safer" version of [].includes() for addresses
export function includesAddress(arr, address) {
  return arr.some(a => addressesEqual(a, address))
}

export function makeAddressMapProxy(target) {
  return new Proxy(target, {
    get(target, property, receiver) {
      if (property in target) {
        return target[property]
      }

      if (typeof property === 'string' && isAddress(property)) {
        // Our set handler will ensure any addresses are stored in all lowercase
        return target[property.toLowerCase()]
      }
    },
    set(target, property, value, receiver) {
      if (typeof property === 'string' && isAddress(property)) {
        target[property.toLowerCase()] = value
      } else {
        target[property] = value
      }
      return true
    },
  })
}

export function makeProxy(address, interfaceName, web3, initializationBlock) {
  const abi = getAbi(`aragon/${interfaceName}`)
  return makeProxyFromABI(address, abi, web3, initializationBlock)
}

export function makeProxyFromABI(address, abi, web3, initializationBlock) {
  return new ContractProxy(address, abi, web3, initializationBlock)
}

export async function getRecommendedGasLimit(
  web3,
  estimatedGasLimit,
  { gasFuzzFactor = DEFAULT_GAS_FUZZ_FACTOR } = {}
) {
  const latestBlock = await web3.eth.getBlock('latest')
  const latestBlockGasLimit = latestBlock.gasLimit

  const upperGasLimit = Math.round(
    latestBlockGasLimit * PREVIOUS_BLOCK_GAS_LIMIT_FACTOR
  )
  const bufferedGasLimit = Math.round(estimatedGasLimit * gasFuzzFactor)

  if (estimatedGasLimit > upperGasLimit) {
    // TODO: Consider whether we should throw an error rather than returning with a high gas limit
    return estimatedGasLimit
  } else if (bufferedGasLimit < upperGasLimit) {
    return bufferedGasLimit
  } else {
    return upperGasLimit
  }
}
