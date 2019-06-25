export default function (request, proxy, wrapper) {
  const [
    actionId,
    evmScript,
    state
  ] = request.params
  
  wrapper.setForwardedAction(
    proxy.address,
    actionId,
    evmScript,
    state
  )
  return Promise.resolve()
}
