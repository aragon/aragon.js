import abi from 'web3-eth-abi'
import { soliditySha3 } from 'web3-utils'

import { addressesEqual } from '../../utils'
import { findAppMethodFromData } from '../../utils/apps'

const SET_APP_ABI = [
  { name: 'namespace', type: 'bytes32' },
  { name: 'appId', type: 'bytes32' },
  { name: 'appAddress', type: 'address' }
]

const CORE_NAMESPACE = soliditySha3('core')
const APP_ADDR_NAMESPACE = soliditySha3('app')
const APP_BASES_NAMESPACE = soliditySha3('base')
const KERNEL_NAMESPACES_NAMES = new Map([
  [CORE_NAMESPACE, 'Core'],
  [APP_ADDR_NAMESPACE, 'Default apps'],
  [APP_BASES_NAMESPACE, 'App code']
])

/**
 * Decode `Kernel.setApp()` parameters based on transaction data.
 *
 * @param  {Object} data Transaction data
 * @return {Object} Decoded parameters for `setApp()` (namespace, appId, appAddress)
 */
export function decodeKernelSetAppParameters (data) {
  // Strip 0x prefix + bytes4 sig to get parameter data
  const paramData = data.substring(10)
  return abi.decodeParameters(SET_APP_ABI, paramData)
}

export function getKernelNamespace (hash) {
  return KERNEL_NAMESPACES_NAMES.has(hash)
    ? { name: KERNEL_NAMESPACES_NAMES.get(hash), hash }
    : null
}

export function isKernelAppCodeNamespace (namespaceHash) {
  return namespaceHash === APP_BASES_NAMESPACE
}

/**
 * Is the transaction intent for `Kernel.setApp()`?
 *
 * @param  {Object} kernelApp App artifact for Kernel
 * @param  {Object} intent Transaction intent
 * @return {Boolean} Whether the intent is `Kernel.setApp()`
 */
export function isKernelSetAppIntent (kernelApp, intent) {
  if (!addressesEqual(kernelApp.proxyAddress, intent.to)) return false

  const method = findAppMethodFromData(kernelApp, intent.data)
  return !!method && method.sig === 'setApp(bytes32,bytes32,address)'
}
