import { fromEvent, from } from 'rxjs'
import { delay, filter } from 'rxjs/operators'
import { getConfiguration } from '../../configuration'
import * as configurationKeys from '../../configuration/keys'
import { getEventNames } from '../../utils/events'

export default class ContractProxy {
  constructor (address, jsonInterface, web3, { initializationBlock = 0 } = {}) {
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
   * @return {Observable} Single-emission observable with an array of past events
   */
  pastEvents (eventNames, options = {}) {
    options.fromBlock = options.fromBlock || this.initializationBlock
    eventNames = getEventNames(eventNames)



    // The `from`s only unpack the returned Promises (and not the array inside them!)
    if (eventNames.length === 1) {
      // Get a specific event or all events unfiltered
      return from(
        new Promise(async resolve => {
          // console.log("Resolving ", resolve);
          const ranges = [];

          for (let i = +options.fromBlock; i < +options.toBlock; i += 1024) {
            ranges.push({ ...options, fromBlock: i, toBlock: (i + 1023) > options.toBlock ? options.toBlock : i + 1023 });
          }

          // console.log(ranges);
          // console.log(options);

          let res = [];
          for (let range of ranges) {
            const arr = await this.contract.getPastEvents(eventNames[0], range);
            if (arr && arr.length)
              res = res.concat(arr);
          }
          // console.log(ranges, res);
          resolve(res);
        })
      );
      // return from(this.contract.getPastEvents(eventNames[0], options));
    } else {
      // Get all events and filter ourselves
      return from(
        this.contract.getPastEvents('allEvents', options)
          .then(events => events.filter(event => eventNames.includes(event.event)))
      )
    }
  }

  /**
   * Subscribe to events, fetching past events if necessary (based on the given options)
   *
   * @param {Array<String>} eventNames events to fetch
   * @param {Object} options web3.eth.Contract.events()' options
   *   The fromBlock is defaulted to this app's initializationBlock unless explicitly provided
   * @return {Observable} Multi-emission observable with individual events
   */
  events (eventNames, options = {}) {
    options.fromBlock = options.fromBlock || this.initializationBlock
    eventNames = getEventNames(eventNames)

    let eventSource
    if (eventNames.length === 1) {
      // Get a specific event or all events unfiltered
      eventSource = fromEvent(
        this.contract.events[eventNames[0]](options),
        'data'
      )
    } else {
      // Get all events and filter ourselves
      eventSource = fromEvent(
        this.contract.events.allEvents(options),
        'data'
      ).pipe(
        filter((event) => eventNames.includes(event.event))
      )
    }

    const eventDelay = getConfiguration(configurationKeys.SUBSCRIPTION_EVENT_DELAY) || 0
    // Small optimization: don't pipe a delay if we don't have to
    return eventDelay ? eventSource.pipe(delay(eventDelay)) : eventSource
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
