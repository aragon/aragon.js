import { Observable } from 'rxjs/Rx'
import { addressesEqual } from '../../utils'

export async function intent (request, proxy, wrapper) {
  const web3 = wrapper.web3
  let [
    address,
    method,
    ...params
  ] = request.params

  const contract = new web3.eth.Contract(
    [method],
    address
  )

  let transactionOptions = {}

  // If an extra parameter has been provided, it is the transaction options if it is an object
  if (method.inputs.length + 1 === params.length && typeof params[params.length - 1] === 'object') {
    const options = params.pop()
    Object.assign(transactionOptions, options)
  }

  let { from } = transactionOptions
  const accounts = await wrapper.getAccounts()

  // default to 1st account if from isn't specified, or doesn't exist
  // in the list of accounts
  if (!from || !accounts.find(a => addressesEqual(from, a))) {
    from = accounts[0]
  }

  const transaction = {
    ...transactionOptions, // Options are overwritten by the values below
    external: true,
    from,
    to: address,
    data: contract.methods[method.name](...params).encodeABI()
  }

  return wrapper.performTransactionPath([await wrapper.applyTransactionGas(transaction)])
}

export function call (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    method,
    ...params
  ] = request.params

  const contract = new web3.eth.Contract(
    [method],
    address
  )

  return contract.methods[method.name](...params).call()
}

export function events (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    jsonInterface,
    fromBlock
  ] = request.params

  const contract = new web3.eth.Contract(
    jsonInterface,
    address
  )

  return Observable.fromEvent(
    contract.events.allEvents({
      fromBlock
    }), 'data'
  )
}
