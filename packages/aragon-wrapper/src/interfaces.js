import { apmAppId } from './utils/apps'

// ABIs
import abiAragonACL from '@aragon/os/abi/ACL'
import abiAragonAppProxy from '@aragon/os/abi/AppProxyBase'
import abiAragonERCProxy from '@aragon/os/abi/ERCProxy'
import abiAragonForwarder from '@aragon/os/abi/IForwarder'
import abiAragonForwarderFee from '@aragon/os/abi/IForwarderFee'
import abiAragonKernel from '@aragon/os/abi/Kernel'
import abiAragonEVMScriptRegistry from '@aragon/os/abi/EVMScriptRegistry'
import abiERC20 from '@aragon/os/abi/ERC20'
import abiApmRegistry from '@aragon/os/abi/APMRegistry'
import abiApmRepo from '@aragon/os/abi/Repo'
import abiApmEnsSubdomainRegistrar from '@aragon/os/abi/ENSSubdomainRegistrar'

// Artifacts
import artifactsAragonACL from '../artifacts/aragon/ACL.json'
import artifactsAragonKernel from '../artifacts/aragon/Kernel.json'
import artifactsAragonEVMScriptRegistry from '../artifacts/aragon/EVMScriptRegistry.json'
import artifactsApmRegistry from '../artifacts/apm/APMRegistry.json'
import artifactsApmRepo from '../artifacts/apm/Repo.json'
import artifactsApmEnsSubdomainRegistrar from '../artifacts/apm/ENSSubdomainRegistrar.json'

const ABIS = {
  'aragon/ACL': abiAragonACL.abi,
  'aragon/AppProxy': abiAragonAppProxy.abi,
  'aragon/ERCProxy': abiAragonERCProxy.abi,
  'aragon/Forwarder': abiAragonForwarder.abi,
  'aragon/ForwarderFee': abiAragonForwarderFee.abi,
  'aragon/Kernel': abiAragonKernel.abi,
  'aragon/EVM Script Registry': abiAragonEVMScriptRegistry.abi,
  'apm/APM Registry': abiApmRegistry.abi,
  'apm/Repo': abiApmRepo.abi,
  'apm/ENS Subdomain Registrar': abiApmEnsSubdomainRegistrar.abi,
  'standard/ERC20': abiERC20.abi
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/Kernel': artifactsAragonKernel,
  'aragon/EVM Script Registry': artifactsAragonEVMScriptRegistry,
  'apm/APM Registry': artifactsApmRegistry,
  'apm/Repo': artifactsApmRepo,
  'apm/ENS Subdomain Registrar': artifactsApmEnsSubdomainRegistrar
}

const SYSTEM_APP_MAPPINGS = new Map([
  [apmAppId('acl'), 'ACL'],
  [apmAppId('evmreg'), 'EVM Script Registry'],
  [apmAppId('kernel'), 'Kernel']
])

const APM_APP_MAPPINGS = new Map([
  [apmAppId('apm-registry'), 'APM Registry'],
  [apmAppId('apm-repo'), 'Repo'],
  [apmAppId('apm-enssub'), 'ENS Subdomain Registrar'],
  // Support open.aragonpm.eth's native packages
  // Note that these were erroneously deployed on the open.aragonpm.eth instance rather than
  // reusing the aragonpm.eth versions
  [apmAppId('apm-registry.open'), 'APM Registry'],
  [apmAppId('apm-repo.open'), 'Repo'],
  [apmAppId('apm-enssub.open'), 'ENS Subdomain Registrar'],
  // Support hatch.aragonpm.eth's native packages (see note above for `open.aragonpm.eth`)
  [apmAppId('apm-registry.hatch'), 'APM Registry'],
  [apmAppId('apm-repo.hatch'), 'Repo'],
  [apmAppId('apm-enssub.hatch'), 'ENS Subdomain Registrar']
])

const APP_NAMESPACE_MAPPINGS = new Map([
  ['aragon', SYSTEM_APP_MAPPINGS],
  ['apm', APM_APP_MAPPINGS]
])

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null

export function getAppInfo (appId, namespace) {
  const nameMapping = APP_NAMESPACE_MAPPINGS.get(namespace)

  if (!nameMapping || !nameMapping.has(appId)) {
    return null
  }

  const name = nameMapping.get(appId)
  const app = `${namespace}/${name}`
  const abi = getAbi(app)
  const artifact = getArtifact(app)

  return {
    abi,
    name,
    ...artifact
  }
}
export function hasAppInfo (appId, namespace) {
  const mapping = APP_NAMESPACE_MAPPINGS.get(namespace)
  return Boolean(mapping) && mapping.has(appId)
}
