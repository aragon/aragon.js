export default async function(request, proxy, wrapper) {
  const transactionPath = await wrapper.getTransactionPath(
    proxy.address,
    request.params[0],
    request.params.slice(1)
  )

  return wrapper.performTransactionPath(transactionPath)
}
