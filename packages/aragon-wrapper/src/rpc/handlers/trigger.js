import { map, filter } from 'rxjs/operators'
export function trigger (request, proxy, wrapper) {
  const [
    eventName,
    returnValues
  ] = request.params

  wrapper.triggerAppStore(
    proxy.address,
    eventName,
    returnValues
  )
  return Promise.resolve()
}

export function triggerSubscribe (request, proxy, wrapper) {
  return wrapper.trigger.pipe(
    filter(appEvent => appEvent.origin === proxy.address),
    map(appEvent => appEvent.frontendEvent)
  )
}
