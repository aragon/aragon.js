export default function (request, proxy, wrapper) {
  const eventsOptions = {}
  const [fromBlock, toBlock] = request.params

  if (fromBlock) {
    eventsOptions.fromBlock = fromBlock
  }

  if (toBlock) {
    eventsOptions.toBlock = toBlock
  }

  return proxy.pastEvents(null, eventsOptions)
}
