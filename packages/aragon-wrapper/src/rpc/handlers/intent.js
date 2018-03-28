export default async function (request, proxy, wrapper) {
  const transactions = wrapper.transactions
  const transactionPath = await wrapper.getTransactionPath(
    proxy.address,
    request.params[0],
    request.params.slice(1)
  )

  return new Promise((resolve, reject) => {
    transactions.next({
      transaction: transactionPath[0],
      path: transactionPath,
      accept (transactionHash) {
        resolve(transactionHash)
      },
      reject (err) {
        reject(err || new Error('The transaction was not signed'))
      }
    })
  })
}
