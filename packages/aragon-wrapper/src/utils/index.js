import Proxy from '../core/proxy'

export function makeProxy (address, interfaceName, web3) {
  return new Proxy(
    address,
    require(`../../abi/aragon/${interfaceName}.json`),
    web3
  )
}
