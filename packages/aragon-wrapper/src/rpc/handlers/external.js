import { fromEvent } from 'rxjs'
import ContractProxy from '../../core/proxy'

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
  const eventsOptions = {}
  const [
    address,
    jsonInterface,
    providedFromBlock,
    providedToBlock
  ] = request.params

  // Use the app proxy's initialization block by default
  const externalProxy = new ContractProxy(address, jsonInterface, wrapper.web3, proxy.initializationBlock)

  if (providedFromBlock) {
    eventsOptions.fromBlock = providedFromBlock
  }

  if (providedToBlock) {
    eventsOptions.toBlock = providedToBlock
  }

  return externalProxy.pastEvents(null, eventsOptions)
}
