import Provider from './Provider'
import { Observable } from 'rxjs/Rx'

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
   * @returns {Observable}
   */
  messages () {
    return Observable.fromEvent(window, 'message', false)
      .filter(event => event.source === this.target)
      .map(value => {
        if (value.error) {
          throw new Error(value.error)
        } else {
          return value
        }
      })
      .pluck('data')
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
