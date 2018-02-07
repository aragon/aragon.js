import Messenger from '@aragon/messenger'

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

class AppProxy {
  constructor (rpc = new Messenger()) {
    this.rpc = rpc
  }

  /**
   * Get events from the application contract.
   *
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
   * @param  {reducer} reducer
   * @return {Observable} An observable of the resulting state from reducing events
   */
  store (reducer) {
    const initialState = this.state().take(1)

    return initialState
      .switchMap((initialState) =>
        this.events()
          .startWith(initialState)
          .scan(reducer)
          .map((state) => this.cache('state', state))
      )
  }

  /**
   * Perform a call to the application contract.
   *
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
