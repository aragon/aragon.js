import { first, map } from 'rxjs/operators'
import { addressesEqual } from '../../utils'

// Extract just a few important details about the current app to decrease API surface area
function transformAppInformation (app = {}) {
  const {
    appId,
    contractAddress,
    isForwarder,
    kernelAddress,
    proxyAddress
  } = app

  return {
    kernelAddress,
    appAddress: proxyAddress,
    appId: appId,
    appImplementationAddress: contractAddress,
    isForwarder: Boolean(isForwarder)
  }
}

export default function (request, proxy, wrapper) {
  const operation = request.params[0]
  let appCategory = request.params[1]
  if (appCategory !== 'all' && appCategory !== 'current') {
    appCategory = 'all'
  }

  // Backwards compatibility with initial RPC API (no parameters passed)
  if (operation === undefined) {
    return wrapper.apps
  }

  const app$ = appCategory === 'current'
    ? wrapper.apps.pipe(
      map(apps => apps.find(app => addressesEqual(app.proxyAddress, proxy.address))),
      map((app) => transformAppInformation(app))
    )
    : wrapper.apps.pipe(
      map((apps) => apps.map(transformAppInformation))
    )
  if (operation === 'observe') {
    return app$
  }
  if (operation === 'get') {
    return app$.pipe(first())
  }

  return Promise.reject(
    new Error('Invalid get apps operation')
  )
}
