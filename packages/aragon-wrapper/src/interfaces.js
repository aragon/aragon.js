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
  'aragon/ACL': abiAragonACL.abi,
  'aragon/AppProxy': abiAragonAppProxy.abi,
  'aragon/ERCProxy': abiAragonERCProxy.abi,
  'aragon/Forwarder': abiAragonForwarder.abi,
  'aragon/Kernel': abiAragonKernel.abi,
  'aragon/EVM Script Registry': abiAragonEVMScriptRegistry.abi,
  'standard/ERC20': abiERC20.abi,
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/Kernel': artifactsAragonKernel,
  'aragon/EVM Script Registry': artifactsAragonEVMScriptRegistry,
}

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null
