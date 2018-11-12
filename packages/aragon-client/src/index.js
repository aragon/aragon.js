import Messenger, { providers } from '@aragon/messenger'
import { defer } from 'rxjs/observable/defer'
import { empty } from 'rxjs/observable/empty'
import { fromPromise } from 'rxjs/observable/fromPromise'
import { merge } from 'rxjs/observable/merge'

export const AppProxyHandler = {
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
export class AppProxy {
  constructor (provider) {
    this.rpc = new Messenger(provider)
  }

  /**
   * Get an array of the accounts the user currently controls over time.
   *
   * @return {Observable}
   */
  accounts () {
    return this.rpc.sendAndObserveResponses(
      'accounts'
    ).pluck('result')
  }

  /**
   * Get the network the app is connected to over time.
   *
   * @return {Observable}
   */
  network () {
    return this.rpc.sendAndObserveResponses(
      'network'
    ).pluck('result')
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
    return defer(
      () => this.rpc.sendAndObserveResponses(
        'events'
      ).pluck('result')
    )
  }

  /**
   * Create a handle to an external contract.
   *
   * @param  {string} address The address of the external contract
   * @param  {Array<Object>} jsonInterface The JSON interface of the external contract
   * @return {Object}
   */
  external (address, jsonInterface) {
    const contract = {
      events: (fromBlock = 0) => {
        return defer(
          () => this.rpc.sendAndObserveResponses(
            'external_events',
            [
              address,
              jsonInterface.filter(
                (item) => item.type === 'event'
              ),
              fromBlock
            ]
          ).pluck('result')
        )
      }
    }

    // Bind calls
    const callMethods = jsonInterface.filter(
      (item) => item.type === 'function' && item.constant
    )
    callMethods.forEach((methodJsonInterface) => {
      contract[methodJsonInterface.name] = (...params) => {
        return this.rpc.sendAndObserveResponse(
          'external_call',
          [address, methodJsonInterface, ...params]
        ).pluck('result')
      }
    })

    return contract
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
   * Listens for events, passes them through `reducer`, caches the resulting state
   * and returns that state.
   *
   * The reducer takes the signature `(state, event)` a lá Redux.
   *
   * Optionally takes an array of other web3 event observables to merge with this app's events
   *
   * @memberof AppProxy
   * @param  {reducer}      reducer
   * @param  {Observable[]} [events]
   * @return {Observable}   An observable of the resulting state from reducing events
   */
  store (reducer, events = [empty()]) {
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
        merge(
          this.events(),
          ...events
        )
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

  /**
   * Describes the transaction path that an EVM callscript encodes.
   *
   * @param  {string} script
   * @return {Observable} An observable that emits the transaction path the script encodes
   */
  describeScript (script) {
    return this.rpc.sendAndObserveResponse(
      'describe_script',
      [script]
    ).pluck('result')
  }

  /**
   * Invoke a whitelisted web3.eth function.
   *
   * @param  {string} method The method to call. Must be in the whitelisted group (mostly getters).
   * @param  {...*} params Parameters for the call
   * @return {Observable} An observable that emits the return value(s) of the call.
   */
  web3Eth (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'web3_eth',
      [method, ...params]
    ).pluck('result')
  }

  /**
   * Allow apps to sign arbitrary data via a RPC call
   *
   * @param  {string} dataToSign
   * @return {void}
   */
  signData (dataToSign) {
    return this.rpc.sendAndObserveResponse(
      'sign_data',
      [dataToSign]
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
 * @param {Object} [provider=MessagePortMessage] An RPC provider (will default to using the MessagePort API)
 */
export default class AragonApp {
  constructor (provider = new providers.MessagePortMessage()) {
    return new Proxy(
      new AppProxy(provider),
      AppProxyHandler
    )
  }
}

// Re-export the Aragon RPC providers
export { providers }
