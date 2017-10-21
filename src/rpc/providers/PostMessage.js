import Provider from './Provider'
import { Observable } from 'rxjs/Rx'

/**
 * A provider that uses the PostMessage API to pass messages between frames and WebWorkers.
 *
 * @param {Object} [target=window.parent] An object implementing the PostMessage API.
 * @class PostMessage
 * @extends {Provider}
 */
export default class PostMessage extends Provider {
  constructor (target = window.parent) {
    super()
    this.target = target
  }

  /**
   * An observable of messages being sent to this provider.
   *
   * @memberof PostMessage
   * @instance
   * @returns {Observable}
   */
  messages () {
    return Observable.fromEvent(window, 'message')
      .filter((event) =>
        event.source === this.target)
      .pluck('data')
  }

  /**
   * Send a payload to the underlying target of this provider.
   *
   * @param {Object} payload
   * @memberof PostMessage
   * @instance
   */
  send (payload) {
    this.target.postMessage(payload, '*')
  }
}
