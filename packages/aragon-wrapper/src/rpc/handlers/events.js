export default function (request, proxy) {
  const fromBlock = request.params && request.params[0]

  if (fromBlock) {
    return proxy.events(null, { fromBlock })
  }
  return proxy.events()
}
