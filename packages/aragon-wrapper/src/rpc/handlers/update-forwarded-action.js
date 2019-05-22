export default function (request, proxy, wrapper) {
    wrapper.setForwardedAction(
      proxy.address,
      request.params
    )   
    return Promise.resolve()
}