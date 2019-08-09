export default function (request, proxy, wrapper) {
  const [
    actionId,
    evmScript,
    status
  ] = request.params

  wrapper.setForwardedAction({
    currentApp: proxy.address,
    actionId,
    evmScript,
    status
  })
  return Promise.resolve()
}
