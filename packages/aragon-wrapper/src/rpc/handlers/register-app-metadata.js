export default function (request, proxy, wrapper) {
  wrapper.registerAppMetadata(
    proxy.address,
    request.params
  )
  return Promise.resolve()
}
