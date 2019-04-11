import { makeProxy } from '../../utils'

export async function makeRepoProxy (appId, apm, web3) {
  const repoAddress = await apm.ensResolve(appId)
  return makeProxy(repoAddress, 'Repo', web3)
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
      versionId,
      version: semanticVersion.join('.')
    }))
}
