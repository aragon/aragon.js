import { hash as namehash } from 'eth-ens-namehash'
import { keccak256 } from 'js-sha3'

export const apmAppId = appName => namehash(`${appName}.aragonpm.eth`)

/**
 * Find the method descriptor corresponding to the data component of a
 * transaction sent to `app`.
 *
 * @param  {Object} data Data component of a transaction to app
 * @param  {Object} app App artifact
 * @return {Object} Method with radspec notice and function signature
 */
export function findMethodOnAppFromData (data, app) {
  if (app && app.functions) {
    // Find the method
    const methodId = data.substring(2, 10)
    return app.functions.find(
      (method) => keccak256(method.sig).substring(0, 8) === methodId
    )
  }
}
