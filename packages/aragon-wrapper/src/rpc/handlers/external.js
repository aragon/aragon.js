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

export function events (request, proxy, wrapper) {
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

  // Ensure it's an object
  const eventsOptions = {
    ...options
  }
  // Use the app proxy's initialization block by default
  eventsOptions.fromBlock = eventsOptions.fromBlock || proxy.initializationBlock

  return fromEvent(
    contract.events.allEvents(eventsOptions),
    'data'
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

  // Ensure it's an object
  const eventsOptions = {
    ...options
  }
  // Use the app proxy's initialization block by default
  eventsOptions.fromBlock = eventsOptions.fromBlock || proxy.initializationBlock

  return from(
    contract.getPastEvents('allEvents', eventsOptions)
  )
}
