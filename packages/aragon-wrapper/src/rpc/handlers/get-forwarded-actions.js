import { map, filter } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  return wrapper.forwardedActions.pipe(
    // transform the observable into an event-like object
    // that only contains actions targeting the proxy
    map(actions => ({
      event: 'ForwardedActions',
      returnValues: actions[proxy.address]
    })),
    // only emit observables that
    // contain actions
    filter(proxyActionEvents => proxyActionEvents.returnValues)
  )
}
