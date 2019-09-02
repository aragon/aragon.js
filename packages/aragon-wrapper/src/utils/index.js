import { isAddress } from 'web3-utils'
import ContractProxy from '../core/proxy'
import { getAbi } from '../interfaces'

export const ANY_ENTITY = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'

// Check address equality without checksums
export function addressesEqual (first, second) {
  first = first && first.toLowerCase()
  second = second && second.toLowerCase()
  return first === second
}

// "Safer" version of [].includes() for addresses
export function includesAddress (arr, address) {
  return arr.some(a => addressesEqual(a, address))
}

// Address map that ensures consistent non-checksummed interpretations of addresses
export function makeAddressMapProxy (target = {}) {
  const targetLowerCaseKeys = {}
  Object.entries(target).forEach(([address, val]) => {
    targetLowerCaseKeys[address.toLowerCase()] = val
  })

  return new Proxy(targetLowerCaseKeys, {
    get (target, property, receiver) {
      if (property in target) {
        return target[property]
      }

      if (typeof property === 'string' && isAddress(property)) {
        // Our set handler will ensure any addresses are stored in all lowercase
        return target[property.toLowerCase()]
      }
    },
    set (target, property, value, receiver) {
      if (typeof property === 'string' && isAddress(property)) {
        target[property.toLowerCase()] = value
      } else {
        target[property] = value
      }
      return true
    }
  })
}

/**
 * Get a standard cache key
 *
 * @param {string} address
 * @param {string} location
 */
export function getCacheKey (address, location) {
  return `${address}.${location}`
}

export function makeProxy (address, interfaceName, web3, options) {
  const abi = getAbi(`aragon/${interfaceName}`)
  return makeProxyFromABI(address, abi, web3, options)
}

const appProxyEventsAbi = getAbi('aragon/AppProxy').filter(({ type }) => type === 'event')
export function makeProxyFromAppABI (address, appAbi, web3, options) {
  const appAbiWithProxyEvents = [].concat(appAbi, appProxyEventsAbi)
  return makeProxyFromABI(address, appAbiWithProxyEvents, web3, options)
}

export function makeProxyFromABI (address, abi, web3, options) {
  return new ContractProxy(address, abi, web3, options)
}

export { default as AsyncRequestCache } from './AsyncRequestCache'
