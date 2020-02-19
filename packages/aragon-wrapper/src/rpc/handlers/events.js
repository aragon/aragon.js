import { getEventNames } from '../../utils/events'

export default function (request, proxy) {
  // `events` RPC compatibility with aragonAPI versions:
  //   - aragonAPIv2: `'events', [eventNames, eventOptions]`
  //   - aragonAPIv1: `'events', [fromBlock (optional)]`
  if (request.params.length === 2) {
    // aragonAPIv2
    const eventNames = getEventNames(request.params[0])
    const eventOptions = request.params[1]
    return proxy.events(eventNames, eventOptions)
  } else if (request.params.length <= 1) {
    // aragonAPIv1
    const fromBlock = request.params[0]
    return proxy.events(null, { fromBlock })
  }

  // Otherwise, just use event defaults
  return proxy.events()
}
