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
export function findAppMethodFromData (app, data) {
  const methodId = data.substring(2, 10)
  const { deprecatedFunctions, functions } = app || {}

  // First try to find the method in the current functions
  if (Array.isArray(functions)) {
    return functions.find(
      method => keccak256(method.sig).substring(0, 8) === methodId
    )
  }

  // Couldn't find it in current functions, try with deprecated versions' functions
  const deprecatedFunctionsFromVersions = Object.values(deprecatedFunctions || {})
  if (deprecatedFunctionsFromVersions.length && deprecatedFunctionsFromVersions.every(Array.isArray)) {
    // Flatten all the deprecated functions
    const allDeprecatedFunctions = [].concat(...deprecatedFunctionsFromVersions)
    return allDeprecatedFunctions.find(
      method => keccak256(method.sig).substring(0, 8) === methodId
    )
  }
}

export const knownAppIds = [
  apmAppId('finance'),
  apmAppId('token-manager'),
  apmAppId('vault'),
  apmAppId('voting')
]
