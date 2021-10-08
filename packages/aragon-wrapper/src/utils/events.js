export function getEventNames(eventNames) {
  // Get all events
  if (!eventNames) {
    return ['allEvents']
  }

  // Convert `eventNames` to an array in order to
  // support `.events(name)` and `.events([a, b])`
  if (!Array.isArray(eventNames)) {
    eventNames = [eventNames]
  }

  return eventNames
}

// get all events by blocks (configured from REACT_APP_PAST_EVENTS_BATCH_SIZE environment variable)
export async function getPastEventsByBatch({ options, contract, eventName }) {
  let res = []
  const opts = { ...options }
  const batchSize = +process.env.REACT_APP_PAST_EVENTS_BATCH_SIZE

  for (let i = +options.fromBlock; i < +options.toBlock; i += batchSize) {
    opts.fromBlock = i
    const toBlock = i + batchSize - 1
    
    if (toBlock > options.toBlock) {
      opts.toBlock = options.toBlock
    }
    else {
      opts.toBlock = toBlock
    }

    const arr = await contract.getPastEvents(eventName, opts)
    if (arr && arr.length)
      res = res.concat(arr)
  }

  return res;
}