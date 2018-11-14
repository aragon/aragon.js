import { Observable } from 'rxjs/Rx'

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
  const fromBlock = providedFromBlock == null ? proxy.initializationBlock : providedFromBlock

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
