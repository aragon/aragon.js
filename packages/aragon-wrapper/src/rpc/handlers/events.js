export default function (request, proxy) {
  const [eventsOptions] = request.params
  if (eventsOptions != null) {
    return proxy.events(null, eventsOptions)
  }
  return proxy.events()
}
