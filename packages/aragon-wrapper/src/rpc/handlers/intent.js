export default async function (request, proxy, wrapper) {
  const transactionPath = await wrapper.getTransactionPath(
    proxy.address,
    request.params[0], // contract method
    request.params.slice(1) // params
  )

  return wrapper.performTransactionPath(transactionPath)
}
