export default async function (request, proxy, wrapper) {
  const [methodSignature, ...params] = request.params

  if (!methodSignature) {
    throw new Error('Invalid intent operation: no method name')
  }

  const transactionPath = await wrapper.getTransactionPath(
    proxy.address,
    methodSignature,
    params
  )

  return wrapper.performTransactionPath(transactionPath)
}
