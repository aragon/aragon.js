export default function (request, proxy, wrapper) {
  const [operation] = request.params

  if (operation === 'observe') {
    return wrapper.appContextPool.observe(proxy.address, 'path')
  }
  if (operation === 'modify') {
    return wrapper.requestAppPath(proxy.address, request.params[1])
  }

  return Promise.reject(
    new Error('Invalid path operation')
  )
}
