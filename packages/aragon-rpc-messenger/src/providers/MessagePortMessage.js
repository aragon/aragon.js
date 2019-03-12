import Provider from './Provider'
import { fromEvent } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'

/**
 * A provider that communicates through the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage).
 *
 * @class MessagePortMessage
 * @extends {Provider}
 */
export default class MessagePortMessage extends Provider {
  /**
   * Create a new message provider for use with MessageChannels.
   *
   * @param {Object} [target=self] The object (that implements the
   * [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage)) to send messages to.
   * Example: a WebWorker instance.
   */
  // eslint-disable-next-line no-undef
  constructor (target = self) {
    super()
    this.target = target
  }

  /**
   * An observable of messages being sent to this provider.
   *
   * @returns {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html)
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
   */
  send (payload) {
    this.target.postMessage(payload)
  }
}
