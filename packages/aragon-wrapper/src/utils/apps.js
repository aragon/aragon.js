import { hash as namehash } from 'eth-ens-namehash'
import { keccak256 } from 'js-sha3'

export const apmAppId = appName => namehash(`${appName}.aragonpm.eth`)

/**
 * Find the method descriptor corresponding to the data component of a
 * transaction sent to `app`.
 *
 * @param  {Object} app App artifact
 * @param  {Object} data Data component of a transaction to app
 * @return {Object} Method with radspec notice and function signature
 */
export function findAppMethodFromData(app, data) {
  if (app && app.functions) {
    // Find the method
    const methodId = data.substring(2, 10)

    let method = app.functions.find(
      method => keccak256(method.sig).substring(0, 8) === methodId
    )

    if (method === undefined) {
      app.deprecated.forEach(version => {
        method = version.find(
          method => keccak256(method.sig).substring(0, 8) === methodId
        )
        if (method) return method
      })
    }

    return method
  }
}

export const knownAppIds = [
  apmAppId('finance'),
  apmAppId('token-manager'),
  apmAppId('vault'),
  apmAppId('voting'),
]
