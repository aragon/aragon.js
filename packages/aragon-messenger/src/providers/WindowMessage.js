import Provider from './Provider'
import { fromEvent } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'

/**
 * A provider that uses the Window postMessage API to pass messages between windows.
 *
 * @param {Object} [target=window.parent] An window implementing the postMessage API.
 * @class WindowMessage
 * @extends {Provider}
 */
export default class WindowMessage extends Provider {
  constructor (target = window.parent) {
    super()
    this.target = target
  }

  /**
   * An observable of messages being sent to this provider.
   *
   * @memberof WindowMessage
   * @instance
   * @returns {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html)
   */
  messages () {
    return fromEvent(window, 'message', false).pipe(
      filter((event) => event.source === this.target),
      pluck('data')
    )
  }

  /**
   * Send a payload to the underlying target of this provider.
   *
   * @param {Object} payload
   * @memberof WindowMessage
   * @instance
   */
  send (payload) {
    this.target.postMessage(payload, '*')
  }
}
