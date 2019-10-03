import { APP_CONTEXTS } from '../../apps'

export function trigger (request, proxy, wrapper) {
  const [operation] = request.params

  if (operation === 'observe') {
    return wrapper.appContextPool.get(proxy.address, APP_CONTEXTS.TRIGGER)
  }
  if (operation === 'emit') {
    const [
      eventName,
      data
    ] = request.params.slice(1)

    wrapper.appContextPool.set(
      proxy.address,
      APP_CONTEXTS.TRIGGER,
      // Mimic web3.js@1's event schema
      {
        event: eventName,
        // `returnValues` is always a object for real Ethereum events
        returnValues: data || {}
      }
    )
  }
}
