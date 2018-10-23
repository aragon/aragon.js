// ABIs
import abiAragonACL from '../abi/aragon/ACL.json'
import abiAragonAppProxy from '../abi/aragon/AppProxy.json'
import abiAragonERCProxy from '../abi/aragon/ERCProxy.json'
import abiAragonForwarder from '../abi/aragon/Forwarder.json'
import abiAragonKernel from '../abi/aragon/Kernel.json'
import abiAragonEVMScriptRegistry from '../abi/aragon/EVMScriptRegistry.json'

// Artifacts
import artifactsAragonACL from '../artifacts/aragon/ACL.json'
import artifactsAragonKernel from '../artifacts/aragon/Kernel.json'
import artifactsAragonEVMScriptRegistry from '../artifacts/aragon/EVMScriptRegistry.json'

const ABIS = {
  'aragon/ACL': abiAragonACL,
  'aragon/AppProxy': abiAragonAppProxy,
  'aragon/ERCProxy': abiAragonERCProxy,
  'aragon/Forwarder': abiAragonForwarder,
  'aragon/Kernel': abiAragonKernel,
  'aragon/EVM Script Registry': abiAragonEVMScriptRegistry
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/Kernel': artifactsAragonKernel,
  'aragon/EVM Script Registry': artifactsAragonEVMScriptRegistry
}

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null
