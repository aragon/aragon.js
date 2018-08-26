import { hash as namehash } from 'eth-ens-namehash'

const aragonpmName = appName => namehash(`${appName}.aragonpm.eth`)

const APP_MAPPINGS = {
  [aragonpmName('acl')]: 'ACL',
}

function getAragonOSAppInfo(appId) {
  const appName = APP_MAPPINGS[appId]

  if (!appName) {
    return {}
  }

  const abi = require(`../../../abi/aragon/${appName}.json`)
  const artifact = require(`../../../artifacts/aragon/${appName}.json`)

  return { abi, name: appName, ...artifact }
}

export { getAragonOSAppInfo }