export default function (request, proxy, wrapper) {
    wrapper.setAction(
      proxy.address,
      request.params
    )   
    return Promise.resolve()
}