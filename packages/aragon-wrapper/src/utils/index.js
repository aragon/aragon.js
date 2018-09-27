import Proxy from '../core/proxy'
import { getAbi } from '../interfaces'

const GAS_FUZZ_FACTOR = 1.5
const PREVIOUS_BLOCK_GAS_LIMIT_FACTOR = 0.95

// Check address equality without checksums
export function addressesEqual (first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

export function makeProxy (address, interfaceName, web3, initializationBlock) {
  const abi = getAbi(`aragon/${interfaceName}`)
  return makeProxyFromABI(address, abi, web3, initializationBlock)
}

export function makeProxyFromABI (address, abi, web3, initializationBlock) {
  return new Proxy(address, abi, web3, initializationBlock)
}

export const getRecommendedGasLimit = async (web3, estimatedGasLimit) => {
  const latestBlock = await web3.eth.getBlock('latest')
  const latestBlockGasLimit = latestBlock.gasLimit;

  const upperGasLimit = Math.round(latestBlockGasLimit*PREVIOUS_BLOCK_GAS_LIMIT_FACTOR)
  const bufferedGasLimit = Math.round(estimatedGasLimit*GAS_FUZZ_FACTOR)

  if (estimatedGasLimit > upperGasLimit) {
    // TODO: Consider whether we should throw an error rather than returning with a high gas limit
    return estimatedGasLimit
  } else if (bufferedGasLimit < upperGasLimit) {
    return bufferedGasLimit
  } else {
    return upperGasLimit
  }
}
