import { APP_CONTEXTS } from '../../apps'

export default function (request, proxy, wrapper) {
  const [operation, path] = request.params

  if (operation === 'observe') {
    return wrapper.appContextPool.get(proxy.address, APP_CONTEXTS.PATH)
  }
  if (operation === 'modify') {
    return wrapper.requestAppPath(proxy.address, path)
  }

  return Promise.reject(
    new Error('Invalid path operation')
  )
}
