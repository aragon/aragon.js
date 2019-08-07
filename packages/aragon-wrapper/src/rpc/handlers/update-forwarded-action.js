export default function (request, proxy, wrapper) {
  const [
    actionId,
    evmScript,
    status
  ] = request.params

  wrapper.setForwardedAction(
    proxy.address,
    actionId,
    evmScript,
    status
  )
  return Promise.resolve()
}
