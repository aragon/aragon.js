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

    this.processedBlockKey = `${address}:cache:allEvents:processed`

    this.contract = new this.web3.eth.Contract(
      jsonInterface,
      address
    )

    if (typeof localStorage === "undefined" || localStorage === null) {
      const LocalStorage = require('node-localstorage').LocalStorage;
      this.localStorage = new LocalStorage(process.env.npm_package_config_localstorage);
    } else {
      this.localStorage = localStorage
    }
  }

  getWrapper () {
    return this.wrapper
  }

  async pastPredicate() {
    // TODO: Get block from cache
    const lastProcessed = this.lastProcessedBlock

    if (lastProcessed && false) { // TODO: remove
      console.log('returning last processed', lastProcessed)
      return { fromBlock: lastProcessed + 1 }
    }

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
      console.log('load past events')
      evs.forEach(ev => subject.next(ev))
      if (evs.length > 0) this.setLastProcessedBlock(evs[evs.length - 1].blockNumber)
    })

    // TODO: subscribe to future events

    return subject
  }

  setLastProcessedBlock(bn) {
    // TODO: store the last event transaction index in the block, so that would allow for partially processed blocks (better error resistance)
    this.localStorage.setItem(this.processedBlockKey, bn)
  }

  get lastProcessedBlock() {
    return this.localStorage.getItem(this.processedBlockKey)
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
