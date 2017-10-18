import ipfsAPI from 'ipfs-api'
import streamToString from 'stream-to-string'

const ipfs = ipfsAPI()
export default (hash, path) => {
  return new Promise((resolve, reject) => {
    ipfs.files.cat(`${hash}/${path}`, (err, file) => {
      if (err) {
        reject(err)
        return
      }

      resolve(streamToString(file))
    })
  })
}
