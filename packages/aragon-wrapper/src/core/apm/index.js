import { makeProxy } from '../../utils'

export async function makeRepoProxy (appId, apm, web3) {
  const repoAddress = await apm.ensResolve(appId)
  return makeProxy(repoAddress, 'Repo', web3)
}

export async function getAllVersionsOfRepo (repoProxy) {
  const versions = []
  const versionCount = await repoProxy.call('getVersionsCount')

  // Versions index starts at 1
  for (let versionId = 1; versionId <= versionCount; ++versionId) {
    const versionDetails = repoProxy
      .call('getByVersionId')
      .then(({ contentURI, contractAddress, semanticVersion }) => ({
        contentURI,
        contractAddress,
        version: semanticVersion.join('.')
      }))
    versions.push(versionDetails)
  }

  return Promise.all(versions)
}
