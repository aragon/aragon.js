import { isAddress, toChecksumAddress } from 'web3-utils'
import ContractProxy from '../core/proxy'
import { getAbi } from '../interfaces'

const GAS_FUZZ_FACTOR = 1.5
const PREVIOUS_BLOCK_GAS_LIMIT_FACTOR = 0.95

// Check address equality without checksums
export function addressesEqual (first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

export function makeAddressLookupProxy (target) {
  return new Proxy(target, {
    get (target, property, receiver) {
      if (property in target) {
        return target[property]
      }

      if (typeof property === 'string' && isAddress(property)) {
        // Check all lowercase address
        let withoutChecksum = property.toLowerCase()
        if (withoutChecksum in target) { return target[withoutChecksum] }

        // Check all uppercase address
        withoutChecksum = property.toUpperCase()
        if (withoutChecksum in target) { return target[withoutChecksum] }

        // Finally check with checksum, if possible
        try {
          return target[toChecksumAddress(property)]
        } catch (_) {}
      }
      return undefined
    }
  })
}

export function makeProxy (address, interfaceName, web3, initializationBlock) {
  const abi = getAbi(`aragon/${interfaceName}`)
  return makeProxyFromABI(address, abi, web3, initializationBlock)
}

export function makeProxyFromABI (address, abi, web3, initializationBlock) {
  return new ContractProxy(address, abi, web3, initializationBlock)
}

export async function getRecommendedGasLimit (web3, estimatedGasLimit) {
  const latestBlock = await web3.eth.getBlock('latest')
  const latestBlockGasLimit = latestBlock.gasLimit

  const upperGasLimit = Math.round(latestBlockGasLimit * PREVIOUS_BLOCK_GAS_LIMIT_FACTOR)
  const bufferedGasLimit = Math.round(estimatedGasLimit * GAS_FUZZ_FACTOR)

  if (estimatedGasLimit > upperGasLimit) {
    // TODO: Consider whether we should throw an error rather than returning with a high gas limit
    return estimatedGasLimit
  } else if (bufferedGasLimit < upperGasLimit) {
    return bufferedGasLimit
  } else {
    return upperGasLimit
  }
}
