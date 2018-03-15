import { Observable } from 'rxjs/Rx'

export default class Proxy {
  constructor (address, jsonInterface, wrapper) {
    this.address = address
    this.contract = new wrapper.web3.eth.Contract(
      jsonInterface,
      address
    )
    this.wrapper = wrapper
  }

  async streamingPredicate () {
    // Sanity check to see if we can actually get the initialization block
    let initializationBlock = 0
    if (this.contract.methods['getInitializationBlock']) {
      initializationBlock = await this.contract.methods.getInitializationBlock().call()
    }

    return this.wrapper.cache.get(
      `${this.address}.cursor`, {
        blockNumber: initializationBlock,
        transactionIndex: null,
        logIndex: null
      }
    )
  }

  // TODO: Make this a hot observable?
  events (eventNames) {
    const streamingPredicate = Observable.fromPromise(
      this.streamingPredicate()
    )

    const filterOldEvents = (streamingPredicate) => (event) => {
      const isFreshCursor = streamingPredicate.transactionIndex === null || streamingPredicate.logIndex === null

      // If this is a "fresh cursor", i.e. we haven't cached any cursor yet,
      // we will allow processing of everything
      if (isFreshCursor) return true

      const blockMatchesCursor = event.blockNumber === streamingPredicate.blockNumber
      if (blockMatchesCursor) {
        const transactionMatchesCursor = event.transactionIndex === streamingPredicate.transactionIndex

        // If we're at the transaction our cursor is at, then
        // we check if the log we're processing is after than the
        // one we have already processed
        if (transactionMatchesCursor) {
          return event.logIndex > streamingPredicate.logIndex
        }

        // We're not at the transaction we've processed, so we will only
        // allow events to be emitted from later transactions
        return event.transactionIndex > streamingPredicate.transactionIndex
      }

      // We're not at the cursor block, so we will only process events
      // from later blocks
      return event.blockNumber > streamingPredicate.blockNumber
    }

    // Get all events
    if (!eventNames) {
      eventNames = ['allEvents']
    }

    // Convert `eventNames` to an array in order to
    // support `.events(name)` and `.events([a, b])`
    if (!Array.isArray(eventNames)) {
      eventNames = [eventNames]
    }

    let eventSource
    if (eventNames.length === 1) {
      // Get a specific event
      eventSource = streamingPredicate.switchMap((streamingPredicate) =>
        Observable.fromEvent(
          this.contract.events[eventNames[0]]({
            fromBlock: streamingPredicate.blockNumber
          }), 'data'
        ).filter(filterOldEvents(streamingPredicate))
      )
    } else {
      // Get multiple events
      eventSource = streamingPredicate.switchMap((streamingPredicate) =>
        Observable.fromEvent(
          this.contract.events.allEvents({
            fromBlock: streamingPredicate.blockNumber
          }), 'data'
        ).filter(
          (event) => eventNames.includes(event.event)
        ).filter(filterOldEvents(streamingPredicate))
      )
    }

    return eventSource
  }

  call (method, ...params) {
    if (!this.contract.methods[method]) {
      throw new Error(`No method named ${method} on ${this.address}`)
    }

    return this.contract.methods[method](...params).call()
  }
}
