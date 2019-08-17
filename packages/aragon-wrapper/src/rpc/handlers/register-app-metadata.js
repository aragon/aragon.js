export default function (request, proxy, wrapper) {
  const [
    blockNumber,
    dataId,
    cid,
    to
  ] = request.params

  wrapper.registerAppMetadata(
    proxy.address,
    blockNumber,
    dataId,
    cid,
    to
  )
  return Promise.resolve()
}
