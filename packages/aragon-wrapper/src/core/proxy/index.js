import { fromEvent } from 'rxjs'
import { filter } from 'rxjs/operators'

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

  // TODO: Make this a hot observable
  events (eventNames, fromBlock = this.initializationBlock) {
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
      eventSource = fromEvent(
        this.contract.events[eventNames[0]]({ fromBlock }), 'data'
      )
    } else {
      // Get multiple events
      eventSource = fromEvent(
        this.contract.events.allEvents({ fromBlock }), 'data'
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
