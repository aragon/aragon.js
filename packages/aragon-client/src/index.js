import Messenger, { providers } from '@aragon/messenger'
import { defer } from 'rxjs/observable/defer'
import { empty } from 'rxjs/observable/empty'
import { fromPromise } from 'rxjs/observable/fromPromise'
import { merge } from 'rxjs/observable/merge'

/**
 * @private
 */
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
 * @private
 */
export class AppProxy {
  constructor (provider) {
    this.rpc = new Messenger(provider)
  }

  /**
   * Get an array of the accounts the user currently controls over time.
   *
   * @instance
   * @memberof AragonApp
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an array of account addresses every time a change is detected.
   */
  accounts () {
    return this.rpc.sendAndObserveResponses(
      'accounts'
    ).pluck('result')
  }

  /**
   * Get the network the app is connected to over time.
   *
   * @instance
   * @memberof AragonApp
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an object with the connected network's id and type every time the network changes.
   */
  network () {
    return this.rpc.sendAndObserveResponses(
      'network'
    ).pluck('result')
  }

  /**
   * Set the app identifier.
   *
   * This identifier is used to distinguish multiple instances of your app,
   * so choose something that provides additional context to the app instance.
   *
   * Examples include: the name of a token that the app manages,
   * the type of content that a TCR is curating, the name of a group etc.
   *
   * @instance
   * @memberof AragonApp
   * @example
   * app.identify('Customer counter')
   * // or
   * app.identify('Employee counter')
   * @param  {string} identifier The identifier of the app.
   * @return {void}
   */
  identify (identifier) {
    this.rpc.send(
      'identify',
      [identifier]
    )
  }

  /**
   * Listens for events on your app's smart contract from the last unhandled block.
   *
   * @instance
   * @memberof AragonApp
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification).
   */
  events () {
    return defer(
      () => this.rpc.sendAndObserveResponses(
        'events'
      ).pluck('result')
    )
  }

  /**
   * Creates a handle to interact with an external contract
   * (i.e. a contract that is **not** your app's smart contract, such as a token).
   *
   * @instance
   * @memberof AragonApp
   * @param  {string} address The address of the external contract
   * @param  {Array<Object>} jsonInterface The [JSON interface](https://web3js.readthedocs.io/en/1.0/glossary.html#glossary-json-interface) of the external contract.
   * @return {Object}  An external smart contract handle. Calling any function on this object will send a call to the smart contract and return an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the value of the call.
   * @example
   * const token = app.external(tokenAddress, tokenJsonInterface)
   *
   * // Retrieve the symbol of the token
   * token.symbol().subscribe(symbol => console.log(`The token symbol is ${symbol}`))
   *
   * // Retrieve the token balance of an account
   * token.balanceOf(someAccountAddress).subscribe(balance => console.log(`The balance of the account is ${balance}`))
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
   * Set a value in the application cache.
   *
   * @instance
   * @memberof AragonApp
   * @param  {string} key   The cache key to set a value for
   * @param  {string} value The value to persist in the cache
   * @return {string}       This method passes through `value`
   */
  cache (key, value) {
    this.rpc.send(
      'cache',
      ['set', key, value]
    )

    return value
  }

  /**
   * Observe the cached application state over time.
   *
   * This method is also used to share state between the background script and front-end of your application.
   *
   * @instance
   * @memberof AragonApp
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.
   */
  state () {
    return this.rpc.sendAndObserveResponses(
      'cache',
      ['get', 'state']
    ).pluck('result')
  }

  /**
   * Listens for events, passes them through `reducer`, caches the resulting state and re-emits that state for easy chaining.
   *
   * This is in fact sugar on top of [`state`](#state), [`events`](#events) and [`cache`](#cache).
   *
   * The reducer takes the signature `(state, event)` à la Redux. Note that it _must always_ return a state, even if it is unaltered by the event.
   *
   * Also note that the initial state is always `null`, not `undefined`, because of [JSONRPC](https://www.jsonrpc.org/specification) limitations.
   *
   * Optionally takes an array of other `Observable`s to merge with this app's events; for example you might use an external contract's Web3 events.
   *
   * @instance
   * @memberof AragonApp
   * @param  {Function} reducer A function that reduces events to a state. This can return a Promise that resolves to a new state.
   * @param  {Observable[]} [events] An optional array of `Observable`s to merge in with the internal events observable
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.
   * @example
   * // A simple reducer for a counter app
   *
   * const state$ = app.store((state, event) => {
   *   // Initial state is always null
   *   if (state === null) state = 0
   *
   *   switch (event.event) {
   *     case 'Increment':
   *       state++
   *       return state
   *     case 'Decrement':
   *       state--
   *       return state
   *   }
   *
   *   // We must always return a state, even if unaltered
   *   return state
   * })
   * @example
   * // A reducer that also reduces events from an external smart contract
   *
   * const token = app.external(tokenAddress, tokenJsonInterface)
   *
   * const state$ = app.store(
   *   (state, event) => {
   *     // ...
   *   },
   *   [token.events()]
   * )
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
   * Perform a read-only call on the app's smart contract.
   *
   * @instance
   * @memberof AragonApp
   * @param  {string} method The name of the method to call.
   * @param  {...*} params An optional variadic number of parameters. The last parameter can be the call options (optional). See the [web3.js doc](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id16) for more details.
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the result of the call.
   */
  call (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'call',
      [method, ...params]
    ).pluck('result')
  }

  /**
   * **NOTE: This call is not currently handled by the wrapper**
   *
   * Send a notification.
   *
   * @instance
   * @memberof AragonApp
   * @param {string} title The title of the notification.
   * @param {string} body The body of the notification.
   * @param {Object} [context={}] An optional context that will be sent back to the app if the notification is clicked.
   * @param {Date} [date=new Date()] An optional date that specifies when the notification originally occured.
   * @return {void}
   */
  notify (title, body, context = {}, date = new Date()) {
    return this.rpc.send(
      'notification',
      [title, body, context, date]
    )
  }

  /**
   *
   * **NOTE: The wrapper does not currently send contexts to apps**
   *
   * Listen for app contexts.
   *
   * An app context is an application specific message that the wrapper can send to the app.
   *
   * For example, if a notification or a shortcut is clicked, the context attached to either of those will be sent to the app.
   *
   * App contexts can be used to display specific views in your app or anything else you might find interesting.
   *
   * @instance
   * @memberof AragonApp
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits app contexts as they are received.-
   */
  context () {
    return this.rpc.requests()
      .filter((request) => request.method === 'context')
      .map((request) => request.params[0])
  }

  /**
   * Decodes an EVM callscript and tries to describe the transaction path that the script encodes.
   *
   * @instance
   * @memberof AragonApp
   * @param  {string} script The EVM callscript to describe
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `destination`, `data` and `description` key.
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
   * @instance
   * @memberof AragonApp
   * @private
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
}

/**
 * This class is used to communicate with the wrapper in which the app is run.
 *
 * Every method in this class sends an RPC message to the wrapper.
 *
 * The app communicates with the wrapper using a messaging provider.
 * The default provider uses the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage),
 * but you may specify another provider to use (see the exported [providers](/docs/PROVIDERS.md) to learn more about them).
 * You will most likely want to use the [`WindowMessage` provider](/docs/PROVIDERS.md#windowmessage) in your frontend.
 *
 * To send an intent to the wrapper (i.e. invoke a method on your smart contract), simply call it on the instance of this class as if it was a JavaScript function.
 *
 * For example, to execute the `increment` function in your app's smart contract:
 *
 * ```js
 * const app = new AragonApp()
 *
 * // Sends an intent to the wrapper that we wish to invoke `increment` on our app's smart contract
 * app.increment(1).subscribe(
 *   (txHash) => console.log(`Success! Incremented in tx ${txHash}`),
 *   (err) => console.log(`Could not increment: ${err}`)
 * )
 * ```
 * The intent function returns an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the hash of the transaction that was sent.
 *
 * You can also pass an optional object after all the required function arguments to specify some values that will be sent in the transaction. They are the same values that can be passed to `web3.eth.sendTransaction()` and can be checked in this [web3.js document](https://web3js.readthedocs.io/en/1.0/web3-eth.html#id62).
 *
 * ```js
 * app.increment(1, { gas: 200000, gasPrice: 80000000 })
 * ```
 *
 * Some caveats to customizing transaction parameters:
 *
 * - `from`, `to`, `data`: will be ignored as aragon.js will calculate those.
 * - `gas`: If the intent cannot be performed directly (needs to be forwarded), the gas amount will be interpreted as the minimum amount of gas to send in the transaction. Because forwarding performs a heavier transaction gas-wise, if the gas estimation done by aragon.js results in more gas than provided in the parameter, the estimated gas will prevail.
 *
 * @example
 * import AragonApp, { providers } from '@aragon/client'
 *
 * // The default provider should be used in background scripts
 * const backgroundScriptOfApp = new AragonApp()
 *
 * // The WindowMessage provider should be used for front-ends
 * const frontendOfApp = new AragonApp(
 *   new providers.WindowMessage(window.parent)
 * )
 * @param {Object} [provider=MessagePortMessage] A provider used to send and receive messages to and from the wrapper. See [providers](/docs/PROVIDERS.md).
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
