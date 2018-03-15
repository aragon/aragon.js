import Proxy from '../core/proxy'

export function makeProxy (address, interfaceName, wrapper) {
  return makeProxyFromABI(
    address,
    require(`../../abi/aragon/${interfaceName}.json`),
    wrapper
  )
}

export function makeProxyFromABI (address, abi, wrapper) {
  return new Proxy(
    address,
    abi,
    wrapper
  )
}
