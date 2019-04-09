export default function (request, proxy, wrapper) {
  const message = request.params[0]
  return wrapper.signMessage(message, proxy.address)
}
