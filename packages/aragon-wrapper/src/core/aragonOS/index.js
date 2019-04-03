import { hash as namehash } from 'eth-ens-namehash'
import { soliditySha3 } from 'web3-utils'
import { getAbi, getArtifact } from '../../interfaces'

const aragonpmAppId = appName => namehash(`${appName}.aragonpm.eth`)

const SYSTEM_APP_MAPPINGS = new Map([
  [aragonpmAppId('acl'), 'ACL'],
  [aragonpmAppId('evmreg'), 'EVM Script Registry'],
  [aragonpmAppId('kernel'), 'Kernel']
])

const APM_APP_MAPPINGS = new Map([
  [aragonpmAppId('apm-registry'), 'APM Registry'],
  [aragonpmAppId('apm-repo'), 'Repo'],
  [aragonpmAppId('apm-enssub'), 'ENS Subdomain Registrar']
])

const KERNEL_NAMESPACES = new Map([
  [soliditySha3('core'), 'Core'],
  [soliditySha3('app'), 'Default apps'],
  [soliditySha3('base'), 'App code']
])

function getAppInfo (appId, namespace, mappings) {
  const appName = mappings.get(appId)

  if (!appName) {
    return
  }

  const app = `${namespace}/${appName}`
  const abi = getAbi(app)
  const artifact = getArtifact(app)

  return {
    abi,
    name: appName,
    ...artifact
  }
}

function getAragonOsInternalAppInfo (appId) {
  const appInfo = getAppInfo(appId, 'aragon', SYSTEM_APP_MAPPINGS)

  if (!appInfo) {
    return
  }

  return {
    isAragonOsInternalApp: true,
    ...appInfo
  }
}

function getAPMAppInfo (appId) {
  const appInfo = getAppInfo(appId, 'apm', APM_APP_MAPPINGS)

  if (!appInfo) {
    return
  }

  return {
    isAragonOsInternalApp: false,
    ...appInfo
  }
}

function getKernelNamespace (hash) {
  if (KERNEL_NAMESPACES.has(hash)) {
    return { name: KERNEL_NAMESPACES.get(hash), hash }
  }
}

export { getAragonOsInternalAppInfo, getAPMAppInfo, getKernelNamespace }
