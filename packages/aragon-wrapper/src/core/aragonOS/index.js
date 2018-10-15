import { hash as namehash } from 'eth-ens-namehash'
import { soliditySha3 } from 'web3-utils'
import { getAbi, getArtifact } from '../../interfaces'

// TODO: Remove this when 0.5 Rinkeby DAOs are deprecated
const oldWrongAppId = appName => soliditySha3(`${appName}.aragonpm.eth`)

const aragonpmAppId = appName => namehash(`${appName}.aragonpm.eth`)

const APP_MAPPINGS = {
  [aragonpmAppId('acl')]: 'ACL',
  [aragonpmAppId('evmreg')]: 'EVM Script Registry',

  // TODO: Remove this when 0.5 Rinkeby DAOs are deprecated
  [oldWrongAppId('acl')]: 'ACL',
  [oldWrongAppId('evmreg')]: 'EVM Script Registry'
}

function getAragonOsInternalAppInfo (appId) {
  const appName = APP_MAPPINGS[appId]

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

export { getAragonOsInternalAppInfo }
