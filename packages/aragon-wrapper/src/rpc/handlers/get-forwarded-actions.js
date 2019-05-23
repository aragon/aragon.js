import { map, filter } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  // filter out actions that aren't targeted
  // at the subscribed app proxy
  const proxyActions = actionsArray => (
    actionsArray
    .filter(action => action.target && (action.target === proxy.address))
  )

  return wrapper.forwardedActions.pipe(
    // only emit observables that 
    // contain relevant data to the calling app
    filter(actions => proxyActions(actions).length > 0),
    // transform the observable into an event-like object
    map(
      actions => ({
        event: 'forwardedActions', 
        returnValues: proxyActions(actions)
      })
    )
  )
}