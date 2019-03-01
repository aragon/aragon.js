/**
 * A provider passes messages between different contexts.
 *
 * @class Provider
 */
export default class Provider {
  /**
   * An observable of messages being sent to this provider.
   */
  messages () {
    throw new Error('Not implemented')
  }

  /**
   * Send a message to a target.
   *
   * @param {Object} payload The payload to send
   */
  send (payload) {
    throw new Error('Not implemented')
  }
}
