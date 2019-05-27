export default function (request, proxy, wrapper) {
  const [eventsOptions] = request.params
  if (eventsOptions != null) {
    return proxy.pastEvents(null, eventsOptions)
  }
  return proxy.pastEvents()
}
