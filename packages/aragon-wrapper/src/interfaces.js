// ABIs
import abiAragonACL from '../abi/aragon/ACL.json'
import abiAragonAppProxy from '../abi/aragon/AppProxy.json'
import abiAragonForwarder from '../abi/aragon/Forwarder.json'
import abiAragonKernel from '../abi/aragon/Kernel.json'

// Artifacts
import artifactsAragonACL from '../artifacts/aragon/ACL.json'

const ABIS = {
  'aragon/ACL': abiAragonACL,
  'aragon/AppProxy': abiAragonAppProxy,
  'aragon/Forwarder': abiAragonForwarder,
  'aragon/Kernel': abiAragonKernel,
  'aragon/EVM Script Registry': {} // TODO
}

const ARTIFACTS = {
  'aragon/ACL': artifactsAragonACL,
  'aragon/EVM Script Registry': {} // TODO
}

export const getAbi = name => ABIS[name] || null
export const getArtifact = name => ARTIFACTS[name] || null
