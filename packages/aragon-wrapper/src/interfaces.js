// ABIs
import abiAragonACL from '@aragon/os/abi/ACL'
import abiAragonAppProxy from '@aragon/os/abi/AppProxyBase'
import abiAragonERCProxy from '@aragon/os/abi/ERCProxy'
import abiAragonForwarder from '@aragon/os/abi/IForwarder'
import abiAragonKernel from '@aragon/os/abi/Kernel'
import abiAragonEVMScriptRegistry from '@aragon/os/abi/EVMScriptRegistry'
import abiERC20 from '@aragon/os/abi/ERC20'
import abiAPMRegistry from '@aragon/os/abi/APMRegistry'
import abiAPMRepo from '@aragon/os/abi/Repo'
import abiAPMENSSubdomainRegistrar from '@aragon/os/abi/ENSSubdomainRegistrar'

// Artifacts
import artifactsAragonACL from '../artifacts/aragon/ACL.json'
import artifactsAragonKernel from '../artifacts/aragon/Kernel.json'
import artifactsAragonEVMScriptRegistry from '../artifacts/aragon/EVMScriptRegistry.json'
import artifactsAPMRegistry from '../artifacts/apm/APMRegistry.json'
import artifactsAPMRepo from '../artifacts/apm/Repo.json'
import artifactsAPMENSSubdomainRegistrar from '../artifacts/apm/ENSSubdomainRegistrar.json'

const ABIS = {
  'aragon/ACL': abiAragonACL.abi,
  'aragon/AppProxy': abiAragonAppProxy.abi,
  'aragon/ERCProxy': abiAragonERCProxy.abi,
  'aragon/Forwarder': abiAragonForwarder.abi,
  'aragon/Kernel': abiAragonKernel.abi,
  'aragon/EVM Script Registry': abiAragonEVMScriptRegistry.abi,
  'standard/ERC20': abiERC20.abi,
  'apm/APM Registry': abiAPMRegistry.abi,
  'apm/Repo': abiAPMRepo.abi,
  'apm/ENS Subdomain Registrar': abiAPMENSSubdomainRegistrar.abi
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/Kernel': artifactsAragonKernel,
  'aragon/EVM Script Registry': artifactsAragonEVMScriptRegistry,
  'apm/APM Registry': artifactsAPMRegistry,
  'apm/Repo': artifactsAPMRepo,
  'apm/ENS Subdomain Registrar': artifactsAPMENSSubdomainRegistrar
}

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null
