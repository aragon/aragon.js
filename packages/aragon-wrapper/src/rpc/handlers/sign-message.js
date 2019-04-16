export default function (request, proxy, wrapper) {
  const message = request.params[0]
  if (typeof message !== 'string') {
    throw new Error('Message to sign must be a string')
  }
  return wrapper.signMessage(message, proxy.address)
}
