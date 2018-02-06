import ipfs from './providers/ipfs'
import * as ens from '../ens'

module.exports = (web3, opts = {
  ensRegistryAddress: null
}) => {
  // Set up providers
  const providers = {
    ipfs: ipfs(opts.ipfs)
  }

  const readFileFromApplication = (contentURI, path) => {
    const [contentProvider, contentLocation] = contentURI.split(':')

    if (!contentProvider || !contentLocation) {
      throw new Error(`Invalid content URI (expected format was "<provider>:<identifier>")`)
    }

    if (!providers[contentProvider]) {
      throw new Error(`The storage provider "${contentProvider}" is not supported`)
    }

    return providers[contentProvider].getFile(contentLocation, path)
  }

  const getApplicationInfo = (contentURI) => {
    return Promise.all([
      readFileFromApplication(contentURI, 'manifest.json'),
      readFileFromApplication(contentURI, 'artifact.json')
    ])
      .then((files) => files.map(JSON.parse))
      .then(
        ([ manifest, module ]) => {
          const [provider, location] = contentURI.split(':')

          return Object.assign(
            manifest,
            module,
            { content: { provider, location } }
          )
        }
      )
  }

  function returnVersion (web3) {
    return (version) => {
      return getApplicationInfo(web3.utils.hexToAscii(version.contentURI))
        .then((info) =>
          Object.assign(info, {
            contractAddress: version.contractAddress
          }))
    }
  }

  return {
    /**
     * Get the APM repository registry contract for `appId`.
     *
     * @param {string} appId
     * @return {Promise} A promise that resolves to the Web3 contract
     */
    getRepoRegistry (appId) {
      const repoId = appId.split('.').slice(1).join('.')

      return ens.resolve(repoId, opts)
        .then(
          (address) => new web3.eth.Contract(
            require('../../abi/apm/APMRegistry.json'),
            address
          )
        )
    },
    /**
     * Get the APM repository contract for `appId`.
     *
     * @param {string} appId
     * @return {Promise} A promise that resolves to the Web3 contract
     */
    getRepository (appId) {
      return ens.resolve(appId, opts)
        .then(
          (address) => new web3.eth.Contract(
            require('../../abi/apm/Repo.json'),
            address
          )
        )
    },
    getVersion (appId, version) {
      return this.getRepository(appId)
        .then((repository) =>
          repository.methods.getBySemanticVersion(version).call()
        )
        .then(returnVersion(web3))
    },
    getVersionById (appId, versionId) {
      return this.getRepository(appId)
        .then((repository) =>
          repository.methods.getByVersionId(versionId).call()
        )
        .then(returnVersion(web3))
    },
    getLatestVersion (appId) {
      return this.getRepository(appId)
        .then((repository) =>
          repository.methods.getLatest().call()
        )
        .then(returnVersion(web3))
    },
    getLatestVersionForContract (appId, address) {
      return this.getRepository(appId)
        .then((repository) =>
          repository.methods.getLatestForContractAddress(address).call()
        )
        .then(returnVersion(web3))
    },
    getAllVersions (appId) {
      return this.getRepository(appId)
        .then((repository) =>
          repository.methods.getVersionsCount().call()
        )
        .then((versionCount) => Promise.all(
          Array(versionCount).fill().map((_, versionId) =>
            this.getVersionById(appId, versionId))
        ))
    }
  }
}
