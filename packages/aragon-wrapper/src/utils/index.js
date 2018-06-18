import Proxy from '../core/proxy'

// Check address equality without checksums
export function addressesEqual (first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

export function makeProxy (address, interfaceName, web3, initializationBlock) {
  const abi = require(`../../abi/aragon/${interfaceName}.json`)
  return makeProxyFromABI(address, abi, web3, initializationBlock)
}

export function makeProxyFromABI (address, abi, web3, initializationBlock) {
  return new Proxy(address, abi, web3, initializationBlock)
}
