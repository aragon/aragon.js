import jsonrpc from './jsonrpc'
import MessagePortMessage from './providers/MessagePortMessage'
import WindowMessage from './providers/WindowMessage'
import DevMessage from './providers/DevMessage'
import { first, filter } from 'rxjs/operators'

export const providers = {
  MessagePortMessage,
  WindowMessage,
  DevMessage
}

/**
 * The RPC messenger used for sending requests and responses between contexts.
 *
 * @param {Provider} [provider=MessagePortMessage] The underlying provider that passes messages
 * @class Messenger
 */
export default class Messenger {
  constructor (provider = new MessagePortMessage()) {
    this.provider = provider
  }

  /**
   * Get the message bus of incoming messages
   *
   * @returns {Observable}
   */
  bus () {
    return this.provider.messages()
  }

  /**
   * Get requests from the message bus.
   *
   * @returns {Observable}
   */
  requests () {
    return this.bus().pipe(
      filter(message => !jsonrpc.isValidResponse(message))
    )
  }

  /**
   * Get responses from the message bus.
   *
   * @returns {Observable}
   */
  responses () {
    return this.bus().pipe(
      filter(jsonrpc.isValidResponse)
    )
  }

  /**
   * Send a response
   *
   * @param {string} id The ID of the request being responded to.
   * @param {any} result The result of the request.
   * @returns {string}
   */
  sendResponse (id, result) {
    const payload = jsonrpc.encodeResponse(id, result)
    this.provider.send(payload)

    return payload.id
  }

  /**
   * Send a request
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params=[]] The parameters to send with the call
   * @returns {string} The ID of the payload that was sent
   */
  send (method, params = []) {
    const payload = jsonrpc.encodeRequest(method, params)
    this.provider.send(payload)

    return payload.id
  }

  /**
   * Helper method to send a request and listen for responses to that request
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params=[]] The parameters to send with the call
   * @returns {Observable} An observable of responses to the sent request
   */
  sendAndObserveResponses (method, params = []) {
    const id = this.send(method, params)

    return this.responses().pipe(
      filter((message) => message.id === id)
    )
  }

  /**
   * Helper method to send a request and listen for a single response to that request
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params] The parameters to send with the call
   * @returns {Observable} An observable that resolves to the response
   */
  sendAndObserveResponse (method, params = []) {
    return this.sendAndObserveResponses(method, params).pipe(
      first()
    )
  }
}
