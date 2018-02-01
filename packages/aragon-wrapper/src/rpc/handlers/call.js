export default function (request, proxy) {
  const method = request.params[0]

  return proxy.call(method, ...request.params.slice(1))
}
