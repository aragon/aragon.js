import { Observable } from 'rxjs/Rx'

export default class Proxy {
  constructor (address, 2jsonInterface, web3) {
    this.address = address
    this.contract = new web3.eth.Contract(
      jsonInterface,
      address
    )
  }

  // TODO: Make this a hot observable
  events (eventNames) {
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
      eventSource = Observable.fromEvent(
        this.contract.events[eventNames[0]]({ fromBlock: 0 }), 'data'
      )
    } else {
      // Get multiple events
      eventSource = Observable.fromEvent(
        this.contract.events.allEvents({ fromBlock: 0 }), 'data'
      ).filter(
        (event) => eventNames.includes(event.event)
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
