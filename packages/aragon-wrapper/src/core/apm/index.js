import {
  getRepoLatestVersion,
  getRepoLatestVersionForContract,
  fetchRepoContentURI,
  makeRepoProxy
} from './repo'
import { getAppInfo } from '../../interfaces'
import FileFetcher from '../../utils/FileFetcher'

export function getApmInternalAppInfo (appId) {
  return getAppInfo(appId, 'apm')
}

async function fetchRepoContentFromVersion (fetcher, versionData) {
  const { contentURI, contractAddress, version } = versionData

  let appContent
  try {
    appContent = await fetchRepoContentURI(fetcher, contentURI)
  } catch (err) {
    console.warn('Fetching repo content failed', err)
  }

  return {
    ...appContent,
    contractAddress,
    version
  }
}

export default function (web3, { ipfsGateway } = {}) {
  const fetcher = new FileFetcher({ ipfsGateway })

  return {
    fetchLatestRepoContent: async (repoAddress) => {
      const repo = makeRepoProxy(repoAddress, web3)
      return fetchRepoContentFromVersion(fetcher, await getRepoLatestVersion(repo))
    },
    fetchLatestRepoContentForContract: async (repoAddress, codeAddress) => {
      const repo = makeRepoProxy(repoAddress, web3)
      return fetchRepoContentFromVersion(
        fetcher,
        await getRepoLatestVersionForContract(repo, codeAddress)
      )
    }
  }
}
