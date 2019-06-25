export default function (request, proxy, wrapper) {
  const [
    dataId,
    cid,
    to
  ] = request.params

  wrapper.registerAppMetadata(
    proxy.address,
    dataId,
    cid,
    to
  )
  return Promise.resolve()
}
