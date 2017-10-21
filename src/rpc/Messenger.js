import assert from '../utils/assert'
import jsonrpc from '../utils/jsonrpc'
import PostMessage from './providers/PostMessage'

/**
 * The RPC messenger used for sending requests and responses between contexts.
 *
 * @param {Provider} [provider=PostMessage] The underlying provider that passes messages
 * @class Messenger
 */
export default class Messenger {
  constructor (provider = new PostMessage()) {
    this.provider = provider
  }

  /**
   * Get the message bus of incoming messages
   *
   * @returns {Observable}
   * @memberof Messenger
   * @instance
   */
  bus () {
    return this.provider.messages()
  }

  /**
   * Get requests from the message bus.
   *
   * @returns {Observable}
   * @memberof Messenger
   * @instance
   */
  requests () {
    return this.bus()
      .filter((message) => !jsonrpc.isValidResponse(message))
  }

  /**
   * Get responses from the message bus.
   *
   * @returns {Observable}
   * @memberof Messenger
   * @instance
   */
  responses () {
    return this.bus()
      .filter(jsonrpc.isValidResponse)
  }

  /**
   * Send a response
   *
   * @param {string} id The ID of the request being responded to.
   * @param {any} result The result of the request.
   * @returns {void}
   * @memberof Messenger
   * @instance
   */
  sendResponse (id, result) {
    assert.ok(id, assert.typeAssertionMessage('id', 'string', id))
    assert.ok(result !== undefined, assert.typeAssertionMessage('result', 'any', result))

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
   * @memberof Messenger
   * @instance
   */
  send (method, params = []) {
    assert.ok(method, assert.typeAssertionMessage('method', 'string', method))
    assert.ok(params, assert.typeAssertionMessage('params', 'array', params))

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
   * @memberof Messenger
   * @instance
   */
  sendAndObserveResponses (method, params = []) {
    const id = this.send(method, params)

    return this.responses()
      .filter((message) => message.id === id)
  }

  /**
   * Helper method to send a request and listen for a single response to that request
   *
   * @param {string} method The method name to call
   * @param {Array<any>} [params] The parameters to send with the call
   * @returns {Observable} An observable that resolves to the response
   * @memberof Messenger
   * @instance
   */
  sendAndObserveResponse (method, params = []) {
    return this.sendAndObserveResponses(method, params)
      .first()
  }
}
