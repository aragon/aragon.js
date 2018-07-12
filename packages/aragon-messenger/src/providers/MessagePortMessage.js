import Provider from './Provider'
import { fromEvent } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'

/**
 * A provider that uses the MessagePort postMessage API to pass messages between windows.
 *
 * @param {Object} [target=self] An MessagePort (WebWorker instances are inherently MessagePorts).
 * @class MessagePortMessage
 * @extends {Provider}
 */
export default class MessagePortMessage extends Provider {
  constructor (target = self) {
    super()
    this.target = target
  }

  /**
   * An observable of messages being sent to this provider.
   *
   * @memberof MessagePortMessage
   * @instance
   * @returns {Observable}
   */
  messages () {
    return fromEvent(this.target, 'message', false).pipe(
      // We can't use event.source in WebWorker messages as it seems to be null
      // However, the fallback to check the target should always be true
      filter((event) => (event.source || event.target) === this.target),
      pluck('data')
    )
  }

  /**
   * Send a payload to the underlying target of this provider.
   *
   * @param {Object} payload
   * @memberof MessagePortMessage
   * @instance
   */
  send (payload) {
    this.target.postMessage(payload)
  }
}
