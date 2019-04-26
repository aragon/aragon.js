import { keccak256 } from 'js-sha3'
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

export function makeAddressMapProxy (target) {
  return new Proxy(target, {
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

export function makeProxy (address, interfaceName, web3, initializationBlock) {
  const abi = getAbi(`aragon/${interfaceName}`)
  return makeProxyFromABI(address, abi, web3, initializationBlock)
}

export function makeProxyFromABI (address, abi, web3, initializationBlock) {
  return new ContractProxy(address, abi, web3, initializationBlock)
}

/**
 * Find the method descriptor corresponding to the data component of a
 * transaction sent to `app`.
 *
 * @param  {Object} data Data component of a transaction to app
 * @param  {Object} app App artifact
 * @return {Object} Method with radspec notice and function signature
 */
export function findMethodOnAppFromData (data, app) {
  if (app && app.functions) {
    // Find the method
    const methodId = data.substring(2, 10)
    return app.functions.find(
      (method) => keccak256(method.sig).substring(0, 8) === methodId
    )
  }
}

export { default as AsyncRequestCache } from './AsyncRequestCache'
