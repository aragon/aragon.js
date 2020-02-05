import { combineLatest } from 'rxjs'
import { first, map } from 'rxjs/operators'
import { addressesEqual } from '../../utils'

// Extract just a few important details about the current app to decrease API surface area
function transformAppInformation (app = {}, getContentPathFn) {
  const {
    abi,
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

  let iconsWithBaseUrl
  try {
    iconsWithBaseUrl = icons.map((icon) =>
      ({ ...icon, src: getContentPathFn(content, icon.src) })
    )
  } catch (_) {}

  return {
    abi,
    identifier,
    kernelAddress,
    name,
    appAddress: proxyAddress,
    appId: appId,
    appImplementationAddress: contractAddress,
    icons: iconsWithBaseUrl,
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

  const getContentPathFn = wrapper.apm.getContentPath
  const app$ = appCategory === 'current'
    ? appWithIdentifier$.pipe(
      map(apps => apps.find(app => addressesEqual(app.proxyAddress, proxy.address))),
      map((app) => transformAppInformation(app, getContentPathFn))
    )
    : appWithIdentifier$.pipe(
      map((apps) => apps.map((app) => transformAppInformation(app, getContentPathFn)))
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
