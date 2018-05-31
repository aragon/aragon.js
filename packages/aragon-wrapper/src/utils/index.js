import Proxy from '../core/proxy'

// Check address equality without checksums
export function addressesEqual (first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

export function makeProxy (address, interfaceName, web3) {
  return makeProxyFromABI(
    address,
    require(`../../abi/aragon/${interfaceName}.json`),
    web3
  )
}

export function makeProxyFromABI (address, abi, web3) {
  return new Proxy(
    address,
    abi,
    web3
  )
}
