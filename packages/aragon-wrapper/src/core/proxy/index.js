import { fromEvent, from } from 'rxjs'
import { filter } from 'rxjs/operators'

function getEventNames (eventNames) {
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

export default class Proxy {
  constructor (address, jsonInterface, web3, initializationBlock = 0) {
    this.address = address
    this.contract = new web3.eth.Contract(
      jsonInterface,
      address
    )
    this.web3 = web3
    this.initializationBlock = initializationBlock
  }

  /**
   * Fetches past events for a given block range
   *
   * @param {Array<String>} eventNames events to fetch
   * @param {Object} [options] web3.eth.Contract.getPastEvents()' options
   *   The fromBlock is defaulted to this app's initializationBlock unless explicitly provided
   * @return {Observable} Multi-emission observable with each past event as its own emission
   */
  pastEvents (eventNames, options = {}) {
    eventNames = getEventNames(eventNames)
    options.fromBlock = options.fromBlock || this.initializationBlock

    if (eventNames.length === 1) {
      // Get a specific event
      return from(
        this.contract.getPastEvents(eventNames[0], options)
      )
    } else {
      // Get all events in the block range and filter
      return from(
        this.contract.getPastEvents('allEvents', options)
          .then(events => events.filter(event => eventNames.includes(event.event)))
      )
    }
  }

  /**
   * Subscribe to events, fetching old ones if necessary
   *
   * @param {Array<String>} eventNames events to fetch
   * @param {Object} options web3.eth.Contract.events()' options
   *   The fromBlock is defaulted to this app's initializationBlock unless explicitly provided
   * @return {Observable} Multi-emission observable with individual events found
   */
  events (eventNames, options = {}) {
    eventNames = getEventNames(eventNames)
    options.fromBlock = options.fromBlock || this.initializationBlock

    let eventSource
    if (eventNames.length === 1) {
      // Get a specific event
      eventSource = fromEvent(
        this.contract.events[eventNames[0]](options),
        'data'
      )
    } else {
      // Get multiple events
      eventSource = fromEvent(
        this.contract.events.allEvents(options),
        'data'
      ).pipe(
        filter((event) => eventNames.includes(event.event))
      )
    }

    return eventSource
  }

  async call (method, ...params) {
    if (!this.contract.methods[method]) {
      throw new Error(`No method named ${method} on ${this.address}`)
    }

    const lastParam = params[params.length - 1]

    return (typeof lastParam === 'object' && lastParam !== null)
      ? this.contract.methods[method](...params.slice(0, -1)).call(lastParam)
      : this.contract.methods[method](...params).call()
  }

  async updateInitializationBlock () {
    const initBlock = await this.contract.methods.getInitializationBlock().call()
    this.initializationBlock = initBlock
  }
}
