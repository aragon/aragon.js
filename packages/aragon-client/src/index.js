import Messenger from '@aragon/messenger'
import { fromPromise } from 'rxjs/observable/fromPromise'

const AppProxyHandler = {
  get (target, name, receiver) {
    if (name in target) {
      return target[name]
    }

    return function (...params) {
      return target.rpc.sendAndObserveResponse(
        'intent',
        [name, ...params]
      ).pluck('result')
    }
  }
}

/**
 * A JavaScript proxy that wraps RPC calls to the wrapper.
 */
class AppProxy {
  constructor (rpc = new Messenger()) {
    this.rpc = rpc
  }

  /**
   * Set the app identifier.
   *
   * An app identifier is a way to distinguish multiple instances
   * of the same app.
   *
   * Examples include: the name of a token that the app manages,
   * the type of content that a TCR is curating, the name of a group etc.
   *
   * @param  {string} identifier
   * @return {void}
   */
  identify (identifier) {
    this.rpc.send(
      'identify',
      [identifier]
    )
  }

  /**
   * Get events from the application contract.
   *
   * @memberof AppProxy
   * @return {Observable} An observable of contract events (as defined in Web3)
   */
  events () {
    return this.rpc.sendAndObserveResponses(
      'events'
    ).pluck('result')
  }

  /**
   * Cache a value for the application.
   *
   * @memberof AppProxy
   * @param  {string} key   The cache key
   * @param  {string} value The value to cache
   * @return {string}       Will pass through `value`
   */
  cache (key, value) {
    this.rpc.send(
      'cache',
      ['set', key, value]
    )

    return value
  }

  /**
   * Observe the application state.
   *
   * @memberof AppProxy
   * @return {Observable} An observable of application states over time.
   */
  state () {
    return this.rpc.sendAndObserveResponses(
      'cache',
      ['get', 'state']
    ).pluck('result')
  }

  /**
   * A state reducer a lá Redux.
   *
   * @callback reducer
   * @param {*} state
   * @param {Object} event
   * @return {Object} The next state
   */

  /**
   * Listens for events, passes them through `reducer`, caches the resulting state
   * and returns that state.
   *
   * The reducer takes the signature `(state, event)` a lá Redux.
   *
   * @memberof AppProxy
   * @param  {reducer} reducer
   * @return {Observable} An observable of the resulting state from reducing events
   */
  store (reducer) {
    const initialState = this.state().first()

    // Wrap the reducer in another reducer that
    // allows us to execute code asynchronously
    // in our reducer. That's a lot of reducing.
    //
    // This is needed for the `mergeScan` operator.
    // Also, this supports both sync and async code
    // (because of the `Promise.resolve`).
    const wrappedReducer = (state, event) =>
      fromPromise(
        Promise.resolve(reducer(state, event))
      )

    const store$ = initialState
      .switchMap((initialState) =>
        this.events()
          .mergeScan(wrappedReducer, initialState, 1)
          .map((state) => this.cache('state', state))
      )
      .publishReplay(1)
    store$.connect()

    return store$
  }

  /**
   * Perform a call to the application contract.
   *
   * @memberof AppProxy
   * @param  {string} method The method to call
   * @param  {...*} params Parameters for the call
   * @return {Observable} An observable that emits the return value(s) of the call.
   */
  call (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'call',
      [method, ...params]
    ).pluck('result')
  }

  /**
   * Send a notification.
   *
   * @memberof AppProxy
   * @param {string} title The notification title
   * @param {string} body The notification body
   * @param {object} [context={}] The application context to send back if the notification is clicked
   * @param {Date} [date=new Date()] The notification timestamp
   * @return {void}
   */
  notify (title, body, context = {}, date = new Date()) {
    return this.rpc.send(
      'notification',
      [title, body, context, date]
    )
  }

  /**
   * Listen for app contexts sent from the wrapper.
   *
   * An app context is sent from the wrapper and correspond to a specific view
   * in your app.
   *
   * For example, when sending a notification, you can optionally supply an
   * app context. If the notification is clicked, the app is loaded and
   * the context is sent back to the app.
   *
   * @return {Observable} An observable of incoming app contexts
   */
  context () {
    return this.rpc.requests()
      .filter((request) => request.method === 'context')
      .map((request) => request.params[0])
  }
}

/**
 * An Aragon app.
 *
 * This class handles communicating with the wrapper using Aragon RPC.
 *
 * The class itself contains "magic methods", that is, undefined methods
 * will instead become an intent that is sent to the wrapper.
 *
 * For example:
 *
 * ```js
 * app.transfer('foo', 'bar')
 * ```
 *
 * will result in an intent to send a transaction to the application proxy,
 * invoking the contract function `transfer` with the parameters `foo` and `bar`.
 *
 * @param {Object} [rpc=] An RPC provider (will default to using the PostMessage API)
 */
export default class AragonApp {
  constructor (rpc) {
    return new Proxy(
      new AppProxy(rpc),
      AppProxyHandler
    )
  }
}

// Re-export the Aragon RPC providers
export { providers } from '@aragon/messenger'
