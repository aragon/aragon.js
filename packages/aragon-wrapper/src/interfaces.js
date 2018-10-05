// ABIs
import abiAragonACL from '../abi/aragon/ACL.json'
import abiAragonAppProxy from '../abi/aragon/AppProxy.json'
import abiAragonForwarder from '../abi/aragon/Forwarder.json'
import abiAragonKernel from '../abi/aragon/Kernel.json'
import abiAragonEVMScriptRegistry from '../abi/aragon/EVMScriptRegistry.json'
import abiERC20 from '../abi/standard/ERC20.json'

// Artifacts
import artifactsAragonACL from '../artifacts/aragon/ACL.json'
import artifactsAragonKernel from '../artifacts/aragon/Kernel.json'
import artifactsAragonEVMScriptRegistry from '../artifacts/aragon/EVMScriptRegistry.json'

const ABIS = {
  'aragon/ACL': abiAragonACL,
  'aragon/AppProxy': abiAragonAppProxy,
  'aragon/Forwarder': abiAragonForwarder,
  'aragon/Kernel': abiAragonKernel,
  'aragon/EVM Script Registry': abiAragonEVMScriptRegistry,
  'standard/ERC20': abiERC20
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/Kernel': artifactsAragonKernel,
  'aragon/EVM Script Registry': artifactsAragonEVMScriptRegistry
}

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null
