// ABIs
import abiAragonACL from '@aragon/os/abi/ACL'
import abiAragonAppProxy from '@aragon/os/abi/AppProxyBase'
import abiAragonERCProxy from '@aragon/os/abi/ERCProxy'
import abiAragonForwarder from '@aragon/os/abi/IForwarder'
import abiAragonKernel from '@aragon/os/abi/Kernel'
import abiAragonEVMScriptRegistry from '@aragon/os/abi/EVMScriptRegistry'
import abiERC20 from '@aragon/os/abi/ERC20'

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
