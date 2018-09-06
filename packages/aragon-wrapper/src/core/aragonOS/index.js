import { hash as namehash } from 'eth-ens-namehash'
import { getAbi, getArtifact } from '../../interfaces'

const aragonpmName = appName => namehash(`${appName}.aragonpm.eth`)

const APP_MAPPINGS = {
  [aragonpmName('acl')]: 'ACL',
}

function getAragonOsInternalAppInfo(appId) {
  const appName = APP_MAPPINGS[appId]

  if (!appName) {
    return {}
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
