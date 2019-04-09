export default function (request, proxy, wrapper) {
  const message = request.params[0]
  return wrapper.signMessage({ appAddress: proxy.address, message })
}
