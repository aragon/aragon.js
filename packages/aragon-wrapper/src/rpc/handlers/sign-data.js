export default function (request, proxy, wrapper) {
  const dataToSign = request.params[0]
  return wrapper.signData({ fromAddress: proxy.address, data: dataToSign })
}
