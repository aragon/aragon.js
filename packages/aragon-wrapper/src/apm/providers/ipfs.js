import ipfsAPI from 'ipfs-api'

export default (opts = {}) => {
  const ipfs = ipfsAPI(opts.rpc)

  return {
    /**
     * Gets the file at `path` from the content URI `hash`.
     *
     * @param {string} hash The content URI hash
     * @param {string} path The path to the file
     * @return {Promise} A promise that resolves to the contents of the file
     */
    getFile (hash, path) {
      return ipfs.files.cat(`${hash}/${path}`)
        .then((file) => file.toString('utf8'))
    },
    /**
     * Uploads all files from `path` and returns the content URI for those files.
     *
     * @param {string} path The path that contains files to upload
     * @return {Promise} A promise that resolves to the content URI of the files
     */
    async uploadFiles (path) {
      const hashes = await ipfs.util.addFromFs(path, { recursive: true })
      const { hash } = hashes.pop()

      return `ipfs:${hash}`
    }
  }
}
