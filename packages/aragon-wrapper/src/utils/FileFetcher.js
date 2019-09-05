const axios = require('axios')

function sanitizePath (path) {
  // Disallow a path being declared for the root or navigating to sibling paths
  return path.replace(/^[./]+/, '')
}

function sanitizeUrl (url) {
  // Sanitize url to make sure it has a protocol and ends with a /
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }
  if (!url.endsWith('/')) {
    url = `${url}/`
  }

  return url
}

export default class FileFetcher {
  constructor ({ ipfsGateway = '' } = {}) {
    this.providers = new Map([['http']])

    if (ipfsGateway) {
      this.providers.set('ipfs', { gateway: sanitizeUrl(ipfsGateway) })
    }
  }

  getFullPath (provider, location, path) {
    if (!this.supportsProvider(provider)) {
      throw new Error(`Provider not supported: ${provider}`)
    }

    // When IPFS is the provider, the declared location is a CID
    const baseLocation = provider === 'ipfs'
      ? `${this.providers.get('ipfs').gateway}${location}`
      : location

    return `${sanitizeUrl(baseLocation)}${sanitizePath(path)}`
  }

  async fetch (provider, location, path) {
    const response = await axios(this.getFullPath(provider, location, path), {
      responseType: 'text',

      // This is needed to disable the default behavior of axios, which
      // always tries to use JSON.parse() even if `responseType` is "text".
      //
      // See:
      //   https://github.com/axios/axios/issues/907#issuecomment-322054564
      //
      // Although the comment states that 'undefined' should work, setting 'undefined' on
      // axios@0.19.0 does not override the default, so we have to use null
      transformResponse: null
    })
    return response.data
  }

  supportsProvider (provider) {
    return this.providers.has(provider)
  }
}
