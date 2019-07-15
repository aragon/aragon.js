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
    proxyAddress,
    method,
    ...params
  ] = request.params

  const installedApp = await wrapper.getApp(proxyAddress)
  const transactionPath = installedApp
    ? await wrapper.getTransactionPath(
      proxyAddress,
      method.name,
      params
    )
    : await wrapper.getUninstalledAppTransactionPath(
      proxyAddress,
      method,
      params
    )

  return wrapper.performTransactionPath(
    transactionPath.map((tx) => ({
      ...tx,
      external: true,
      installedApp: !!installedApp
    }))
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
