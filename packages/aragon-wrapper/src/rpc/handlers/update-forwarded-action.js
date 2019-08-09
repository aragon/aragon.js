export default function (request, proxy, wrapper) {
  const [
    actionId,
    blockNumber,
    evmScript,
    status
  ] = request.params

  wrapper.setForwardedAction({
    actionId,
    blockNumber,
    currentApp: proxy.address,
    evmScript,
    status
  })
  return Promise.resolve()
}
