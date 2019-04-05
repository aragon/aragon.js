export default function (request, proxy, wrapper) {
  const messageToSign = request.params[0]
  return wrapper.signMessage({ fromAddress: proxy.address, message: messageToSign })
}
