import { hexToAscii } from 'web3-utils'
import { getAbi } from '../../interfaces'
import { makeProxyFromABI } from '../../utils'
import promiseTimeout from '../../utils/promise-timeout'

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

export async function getRepoLatestVersion (repoProxy) {
  const { contentURI, contractAddress, semanticVersion } = await repoProxy.call('getLatest')
  return {
    contractAddress,
    contentURI: hexToAscii(contentURI),
    version: semanticVersion.join('.')
  }
}

export async function getRepoLatestVersionForContract (repoProxy, appContractAddress) {
  const {
    contentURI,
    contractAddress,
    semanticVersion
  } = await repoProxy.call('getLatestForContractAddress', appContractAddress)

  return {
    contractAddress,
    contentURI: hexToAscii(contentURI),
    version: semanticVersion.join('.')
  }
}

export async function getRepoVersionById (repoProxy, versionId) {
  const { contentURI, contractAddress, semanticVersion } = await repoProxy.call('getByVersionId', versionId)
  return {
    contractAddress,
    contentURI: hexToAscii(contentURI),
    version: semanticVersion.join('.'),
    // Keeping this as a string makes comparisons a bit easier down the line
    versionId: versionId.toString()
  }
}

export async function fetchRepoContentURI (fileFetcher, contentURI, { fetchTimeout } = {}) {
  const [provider, location] = contentURI.split(/:(.+)/)

  if (!provider || !location) {
    throw new Error(`contentURI invalid: ${contentURI}`)
  } else if (!fileFetcher.supportsProvider(provider)) {
    throw new Error(`Provider not supported: ${provider}`)
  }

  let files
  try {
    let filesFetch = Promise.all([
      fileFetcher.fetch(provider, location, 'manifest.json'),
      fileFetcher.fetch(provider, location, 'artifact.json')
    ])
    if (Number.isFinite(fetchTimeout) && fetchTimeout > 0) {
      filesFetch = promiseTimeout(filesFetch, fetchTimeout)
    }
    files = (await filesFetch).map(JSON.parse)
  } catch (err) {
    if (err instanceof SyntaxError) {
      // JSON parse error
      console.warn(`Fetch failed: ${contentURI} was not JSON-parsable`, err)
    }

    // Fetch failed or timed out
    return {
      content: { provider, location }
    }
  }

  const [manifest, artifact] = files
  return {
    ...manifest,
    ...artifact,
    content: { provider, location }
  }
}
