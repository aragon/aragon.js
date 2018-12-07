import Provider from './Provider'
import { Observable } from 'rxjs/Rx'

/**
 * A provider that uses the MessagePort postMessage API to pass messages between windows.
 *
 * @param {Object} [target=self] An MessagePort (WebWorker instances are inherently MessagePorts).
 * @class MessagePortMessage
 * @extends {Provider}
 */
export default class MessagePortMessage extends Provider {
  // eslint-disable-next-line no-undef
  constructor(target = self) {
    super()
    this.target = target
  }

  /**
   * An observable of messages being sent to this provider.
   *
   * @memberof MessagePortMessage
   * @instance
   * @returns {Observable} Messages being sent to this provider
   */
  messages() {
    return Observable.fromEvent(this.target, 'message', false)
      .filter(
        event =>
          // We can't use event.source in WebWorker messages as it seems to be null
          // However, the fallback to check the target should always be true
          (event.source || event.target) === this.target
      )
      .pluck('data')
  }

  /**
   * Send a payload to the underlying target of this provider.
   *
   * @param {Object} payload Payload
   * @memberof MessagePortMessage
   * @instance
   * @returns {void}
   */
  send(payload) {
    this.target.postMessage(payload)
  }
}
