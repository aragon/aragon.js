import { first, filter, map } from 'rxjs/operators'
import { defer } from 'rxjs'
import jsonrpc from './jsonrpc'
import MessagePortMessage from './providers/MessagePortMessage'
import WindowMessage from './providers/WindowMessage'
import DevMessage from './providers/DevMessage'

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
   * Helper method to send a request and listen for multiple responses to that request.
   * To avoid dropping responses, the request is only sent once a subscriber is attached.
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params=[]] The parameters to send with the call
   * @returns {Observable} An observable of responses to the sent request
   */
  sendAndObserveResponses (method, params = []) {
    return defer(() => {
      const id = this.send(method, params)

      return this.responses().pipe(
        filter((message) => message.id === id),
        map((response) => {
          if (response.error) {
            response.error = new Error(response.error)
          }
          return response
        })
        // Let callers handle errors themselves
      )
    })
  }

  /**
   * Helper method to send a request and listen for a single response to that request
   * To avoid dropping the response, the request is only sent once a subscriber is attached.
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params] The parameters to send with the call
   * @returns {Observable} An observable that resolves to the response
   */
  sendAndObserveResponse (method, params = []) {
    return this.sendAndObserveResponses(method, params).pipe(
      first(),
      map((response) => {
        // Emit an error if the response is an error
        if (response.error) {
          throw response.error
        }
        return response
      })
    )
  }
}
