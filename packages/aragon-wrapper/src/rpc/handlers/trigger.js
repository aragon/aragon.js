import { APP_CONTEXTS } from '../../apps'

export default function trigger (request, proxy, wrapper) {
  const [operation] = request.params

  if (operation === 'observe') {
    return wrapper.appContextPool.get(proxy.address, APP_CONTEXTS.TRIGGER)
  }
  if (operation === 'emit') {
    const [
      eventName,
      data
    ] = request.params.slice(1)

    wrapper.appContextPool.emit(
      proxy.address,
      APP_CONTEXTS.TRIGGER,
      // Mimic web3.js@1's event schema
      {
        event: eventName,
        // `returnValues` is always a object for real Ethereum events
        returnValues: data || {}
      }
    )
    return Promise.resolve()
  }

  return Promise.reject(
    new Error('Invalid trigger operation')
  )
}
