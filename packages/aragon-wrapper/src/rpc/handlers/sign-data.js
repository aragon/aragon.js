export default function (request, proxy, wrapper) {
  const dataToSign = request.params[0]

  wrapper.signData(dataToSign)
}
