export default function (request, proxy, wrapper) {
  wrapper.setAppIdentifier(
    proxy.address,
    request.params[0]
  )
}
