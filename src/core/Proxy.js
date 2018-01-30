import { Observable, Subject } from 'rxjs/Rx'

/**
 * This is a generic contract proxy.
 *
 * It handles fetching events and doing calls for the kernel
 * and the applications.
 *
 * @class Proxy
 */
export default class Proxy {
  /**
   * Creates an instance of the proxy.
   *
   * @param {any} address The address of the proxy
   * @param {array} jsonInterface The JSON interface of the contract we are proxying
   * @param {object} wrapper A reference to the Aragon wrapper
   * @memberof Proxy
   */
  constructor (address, jsonInterface, wrapper) {
    this.address = address
    this.wrapper = wrapper
    this.web3 = wrapper.web3

    this.contract = new this.web3.eth.Contract(
      jsonInterface,
      address
    )
  }

  getWrapper () {
    return this.wrapper
  }

  async pastPredicate() {
    // TODO: Get block from cache
    const initializableABI = require('../../abi/aragon/Initializable.json')
    const initializable = new this.web3.eth.Contract(initializableABI, this.address)
    const initialized = await initializable.methods.getInitializationBlock().call()

    return { fromBlock: parseInt(initialized) }
  }

  async streamingPredicate() {

  }

  async events() {
    const predicate = await this.pastPredicate()

    const subject = new Subject()

    this.contract.getPastEvents('allEvents', predicate, (err, evs) => {
      evs.forEach(ev => subject.next(ev))
    })

    // TODO: subscribe to future events

    return subject
  }

  cacheLastProcessedBlock(block) {

  }

  /*
  // TODO: Implement
  event(eventName, filter = {}) {
    return Observable.fromPromise(this.streamingPredicate())
      .switchMap(
        (streamingPredicate) => Observable.fromEvent(
          this.contract.events[eventName](
            streamingPredicate, filter
          ),
          'data'
        )
    )
  }
  */

  async call (method, ...params) {
    if (!this.contract.methods[method]) {
      throw new Error(`No method named ${method} on ${this.address}`)
    }

    return this.contract.methods[method](...params).call()
  }
}
