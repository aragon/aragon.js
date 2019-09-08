import {
  getRepoLatestVersion,
  getRepoLatestVersionForContract,
  fetchRepoContentURI,
  makeRepoProxy
} from './repo'
import { getAppInfo } from '../../interfaces'
import FileFetcher from '../../utils/FileFetcher'

const DEFAULT_FETCH_TIMEOUT = 10000 // 10s

export function getApmInternalAppInfo (appId) {
  return getAppInfo(appId, 'apm')
}

async function fetchRepoContentFromVersion (fetcher, versionData, { fetchTimeout }) {
  const { contentURI, contractAddress, version } = versionData

  let appContent
  try {
    appContent = await fetchRepoContentURI(fetcher, contentURI, { fetchTimeout })
  } catch (err) {
    console.warn('Fetching repo content failed', err)
  }

  return {
    ...appContent,
    contractAddress,
    version
  }
}

export default function (web3, { ipfsGateway, fetchTimeout = DEFAULT_FETCH_TIMEOUT } = {}) {
  const fetcher = new FileFetcher({ ipfsGateway })

  return {
    getContentPath: ({ location, provider }, path) =>
      fetcher.getFullPath(provider, location, path),
    fetchLatestRepoContent: async (repoAddress, options) => {
      const repo = makeRepoProxy(repoAddress, web3)
      return fetchRepoContentFromVersion(
        fetcher,
        await getRepoLatestVersion(repo),
        { fetchTimeout, ...options }
      )
    },
    fetchLatestRepoContentForContract: async (repoAddress, codeAddress, options) => {
      const repo = makeRepoProxy(repoAddress, web3)
      return fetchRepoContentFromVersion(
        fetcher,
        await getRepoLatestVersionForContract(repo, codeAddress),
        { fetchTimeout, ...options }
      )
    }
  }
}
