import { Observable } from 'rxjs/Rx'
import assert from '../utils/assert'

// NOTE: How do we handle breaking changes in app reducers + events?

/**
 * This is the kernel proxy (aka. "the DAO" in the context of the user).
 *
 * All transactions are routed through the proxy to the kernel and
 * eventually to the app responsible for handling the transaction.
 *
 * The proxy also acts as the shell around any events that might be
 * fired from apps and the kernel (e.g. ACL events), and is thus
 * the event store for a specific DAO.
 *
 * A DAO's storage is also tied to the kernel proxy. Apps and the
 * kernel write to the kernel proxy storage.
 *
 * @export
 * @class Proxy
 */
export default class Proxy {
  /**
   * Creates an instance of the kernel proxy.
   *
   * @param {any} address The address of the kernel proxy.
   * @param {any} web3
   * @memberof Proxy
   */
  constructor (address, jsonInterface, wrapper) {
    this.address = address
    this.web3 = wrapper.web3

    this.contract = new this.web3.eth.Contract(
      jsonInterface,
      address
    )
  }

  events () {
    // return Observable.fromEvent(
    //   this.contract.events.allEvents({
    //     fromBlock: 0
    //   }),
    //   'data'
    // )
    return Observable.fromPromise(
      this.contract.getPastEvents('allEvents', {
        fromBlock: 0
      })
    ).switchMap((evts) => Observable.from(evts))
  }

  call (method, ...params) {
    if (!this.contract.methods[method]) {
      return Observable.throw(new Error(`No method named ${method} on ${this.address}`))
    }

    return Observable.fromPromise(
      this.contract.methods[method](...params).call()
    )
  }
}
