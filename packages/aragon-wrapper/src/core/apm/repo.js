import { getAbi } from '../../interfaces'
import { makeProxyFromABI } from '../../utils'

export function makeRepoProxy (address, web3, options) {
  return makeProxyFromABI(address, getAbi('apm/Repo'), web3, options)
}

export async function getAllRepoVersions (repoProxy) {
  const versions = []
  const versionCount = await repoProxy.call('getVersionsCount')

  // Versions index starts at 1
  for (let versionId = 1; versionId <= versionCount; ++versionId) {
    versions.push(await getRepoVersionById(repoProxy, versionId))
  }

  return Promise.all(versions)
}

export function getRepoVersionById (repoProxy, versionId) {
  return repoProxy
    .call('getByVersionId', versionId)
    .then(({ contentURI, contractAddress, semanticVersion }) => ({
      contentURI,
      contractAddress,
      version: semanticVersion.join('.'),
      // Keeping this as a string makes comparisons a bit easier down the line
      versionId: versionId.toString()
    }))
}
