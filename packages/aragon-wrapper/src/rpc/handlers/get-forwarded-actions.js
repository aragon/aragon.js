import { map, filter } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  // filter out actions that aren't targeted
  // at the subscribed app proxy
  const getProxyActions = actionsArray => (
    actionsArray
      .filter(action => (action.target === proxy.address))
  )

  return wrapper.forwardedActions.pipe(
    // transform the observable into an event-like object
    // that only contains actions targeting the proxy
    map(actions => ({
      event: 'ForwardedActions',
      returnValues: getProxyActions(actions)
    })),
    // only emit observables that
    // contain actions
    filter(proxyActionEvents => proxyActionEvents.returnValues.length > 0)
  )
}
