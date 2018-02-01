export default function (request, proxy) {
  // TODO: Is this a smell?
  // const transactionQueue = proxy.getWrapper().transactions

  // return new Promise((resolve, reject) => {
  //   transactionQueue.next({
  //     transaction: null,
  //     path: [],
  //     accept (transactionHash) {
  //       resolve(transactionHash)
  //     },
  //     reject () {
  //       reject(new Error('The transaction was not signed'))
  //     }
  //   })
  // })
  return null
}
