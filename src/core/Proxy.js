import { Observable } from 'rxjs/Rx'

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

  events () {
    return Observable.fromEvent(
      this.contract.events.allEvents({
        fromBlock: 0
      }),
      'data'
    )
  }

  async call (method, ...params) {
    if (!this.contract.methods[method]) {
      throw new Error(`No method named ${method} on ${this.address}`)
    }

    return this.contract.methods[method](...params).call()
  }
}
