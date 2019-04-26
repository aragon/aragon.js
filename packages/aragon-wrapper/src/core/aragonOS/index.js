import { soliditySha3 } from 'web3-utils'
import { getAppInfo, hasAppInfo } from '../../interfaces'

const KERNEL_NAMESPACES = new Map([
  [soliditySha3('core'), 'Core'],
  [soliditySha3('app'), 'Default apps'],
  [soliditySha3('base'), 'App code']
])

function getAragonOsInternalAppInfo (appId) {
  const appInfo = getAppInfo(appId, 'aragon')

  return appInfo && {
    ...appInfo,
    isAragonOsInternalApp: true
  }
}

function getKernelNamespace (hash) {
  return KERNEL_NAMESPACES.has(hash)
    ? { name: KERNEL_NAMESPACES.get(hash), hash }
    : null
}

function isAragonOsInternalApp (appId) {
  return hasAppInfo(appId, 'aragon')
}

export {
  getAragonOsInternalAppInfo,
  getKernelNamespace,
  isAragonOsInternalApp
}
