import { hash as namehash } from 'eth-ens-namehash'
import Web3 from 'web3'
import { getAbi, getArtifact } from '../../interfaces'

// TODO: Remove this when 0.5 Rinkeby DAOs are deprecated
const oldWrongAppId = appName => Web3.utils.soliditySha3(`${appName}.aragonpm.eth`)

const aragonpmAppId = appName => namehash(`${appName}.aragonpm.eth`)

const APP_MAPPINGS = {
  [aragonpmAppId('acl')]: 'ACL',
  [aragonpmAppId('evmreg')]: 'EVMScriptRegistry',

  // TODO: Remove this when 0.5 Rinkeby DAOs are deprecated
  [oldWrongAppId('acl')]: 'ACL',
  [oldWrongAppId('evmreg')]: 'EVMScriptRegistry'
}

function getAragonOSAppInfo (appId) {
  const appName = APP_MAPPINGS[appId]

  if (!appName) {
    return {}
  }

  const abi = getAbi(`aragon/${appName}`)
  const artifact = getArtifact(`aragon/${appName}`)

  return { abi, name: appName, ...artifact }
}

export { getAragonOSAppInfo }
