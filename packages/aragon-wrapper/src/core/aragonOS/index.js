import { hash as namehash } from 'eth-ens-namehash'
import { soliditySha3 } from 'web3-utils'
import { getAbi, getArtifact } from '../../interfaces'

const aragonpmAppId = appName => namehash(`${appName}.aragonpm.eth`)

const APP_MAPPINGS = new Map([
  [aragonpmAppId('acl'), 'ACL'],
  [aragonpmAppId('evmreg'), 'EVM Script Registry'],
  [aragonpmAppId('kernel'), 'Kernel']
])

const KERNEL_NAMESPACES = new Map([
  [soliditySha3('core'), 'Core'],
  [soliditySha3('app'), 'Default apps'],
  [soliditySha3('base'), 'App code']
])

function getAragonOsInternalAppInfo (appId) {
  const appName = APP_MAPPINGS.get(appId)

  if (!appName) {
    return
  }

  const abi = getAbi(`aragon/${appName}`)
  const artifact = getArtifact(`aragon/${appName}`)

  return {
    abi,
    name: appName,
    isAragonOsInternalApp: true,
    ...artifact
  }
}

function getKernelNamespace (hash) {
  if (KERNEL_NAMESPACES.has(hash)) {
    return { name: KERNEL_NAMESPACES.get(hash), hash }
  }
}

function isAragonOsInternalApp (appId) {
  return APP_MAPPINGS.has(appId)
}

export {
  getAragonOsInternalAppInfo,
  getKernelNamespace,
  isAragonOsInternalApp
}
