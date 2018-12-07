export default function(request, proxy, wrapper) {
  const cacheKey = `${proxy.address}.${request.params[1]}`
  if (request.params[0] === 'get') {
    return wrapper.cache.observe(cacheKey)
  }

  if (request.params[0] === 'set') {
    wrapper.cache.set(cacheKey, request.params[2])
    return Promise.resolve()
  }

  return Promise.reject(new Error('Invalid cache operation'))
}
