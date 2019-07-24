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

  let method

  // First try to find the method in the current functions
  if (Array.isArray(functions)) {
    method = functions.find(
      method => keccak256(method.sig).substring(0, 8) === methodId
    )
  }

  // Couldn't find it in current functions, try on deprecated versions
  const hasValidDeprecatedFunctions = Object.values(deprecatedFunctions || {}).every(Array.isArray)
  if (!method && hasValidDeprecatedFunctions) {
    // Flatten all the deprecated functions
    const allDeprecatedFunctions = [].concat(...Object.values(deprecatedFunctions))
    method = allDeprecatedFunctions.find(
      method => keccak256(method.sig).substring(0, 8) === methodId
    )
  }

  return method
}

export const knownAppIds = [
  apmAppId('finance'),
  apmAppId('token-manager'),
  apmAppId('vault'),
  apmAppId('voting')
]
