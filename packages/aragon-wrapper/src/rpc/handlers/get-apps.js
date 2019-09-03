import { combineLatest } from 'rxjs'
import { first, map } from 'rxjs/operators'
import { addressesEqual } from '../../utils'

// Extract just a few important details about the current app to decrease API surface area
function transformAppInformation (app = {}, getFullPathFn) {
  const {
    appId,
    content,
    contractAddress,
    icons,
    identifier,
    isForwarder,
    kernelAddress,
    name,
    proxyAddress
  } = app

  let iconSrc
  if (content && Array.isArray(icons)) {
    const { src } = icons[0]

    try {
      iconSrc = getFullPathFn(content, src)
    } catch (_) { }
  }

  return {
    iconSrc,
    identifier,
    kernelAddress,
    name,
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

  const appWithIdentifier$ = combineLatest(wrapper.apps, wrapper.appIdentifiers).pipe(
    map(([apps, identifiers]) =>
      apps.map((app) =>
        ({
          ...app,
          identifier: identifiers[app.proxyAddress]
        })
      )
    )
  )

  const getFullPathFn = wrapper.apm.getFullPathFromContent
  const app$ = appCategory === 'current'
    ? appWithIdentifier$.pipe(
      map(apps => apps.find(app => addressesEqual(app.proxyAddress, proxy.address))),
      map((app) => transformAppInformation(app, getFullPathFn))
    )
    : appWithIdentifier$.pipe(
      map((apps) => apps.map((app) => transformAppInformation(app, getFullPathFn)))
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
