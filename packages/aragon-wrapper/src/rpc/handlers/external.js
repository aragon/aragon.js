import { fromEvent, from } from 'rxjs'

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

export async function externalIntent (request, proxy, wrapper) {
  const [
    externalProxyAddress,
    method,
    ...params
  ] = request.params
  const transactionPath = await wrapper.getTransactionPath(
    externalProxyAddress,
    method.name,
    params
  )

  return wrapper.performTransactionPath(
    transactionPath.map((tx) => ({ ...tx, external: true }))
  )
}

export function events (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    jsonInterface,
    providedFromBlock
  ] = request.params
  // Use the app proxy's initialization block by default
  const fromBlock = providedFromBlock == null ? proxy.initializationBlock : providedFromBlock

  const contract = new web3.eth.Contract(
    jsonInterface,
    address
  )

  return fromEvent(
    contract.events.allEvents({
      fromBlock
    }), 'data'
  )
}

export function pastEvents (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    jsonInterface,
    options
  ] = request.params

  const contract = new web3.eth.Contract(
    jsonInterface,
    address
  )
  // ensure it's an object
  const eventsOptions = {
    ...options
  }

  eventsOptions.fromBlock = eventsOptions.fromBlock || proxy.initializationBlock

  return from(
    contract.getPastEvents('allEvents', eventsOptions)
  )
}
