import { empty, from, merge } from 'rxjs'
import { first, map, filter, pluck, switchMap, mergeScan, publishReplay } from 'rxjs/operators'
import Messenger, { providers } from '@aragon/rpc-messenger'

export const AppProxyHandler = {
  get (target, name, receiver) {
    if (name in target) {
      return target[name]
    }

    return function (...params) {
      return target.rpc.sendAndObserveResponse(
        'intent',
        [name, ...params]
      ).pipe(
        pluck('result')
      )
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
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an array of account addresses every time a change is detected.
   */
  accounts () {
    return this.rpc.sendAndObserveResponses(
      'accounts'
    ).pipe(
      pluck('result')
    )
  }

  /**
   * Get the network the app is connected to over time.
   *
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an object with the connected network's id and type every time the network changes.
   */
  network () {
    return this.rpc.sendAndObserveResponses(
      'network'
    ).pipe(
      pluck('result')
    )
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
   * Resolve an address' identity, using the highest priority provider.
   *
   * @param  {string} address Address to resolve.
   * @return {Observable} Single-emission observable that emits the resolved identity or null if not found
   */
  resolveAddressIdentity (address) {
    return this.rpc.sendAndObserveResponse(
      'address_identity',
      ['resolve', address]
    ).pipe(
      pluck('result')
    )
  }

  /**
   * Request an address' identity be modified with the highest priority provider.
   *
   * The request is typically handled by the aragon client.
   *
   * @param  {string} address Address to modify.
   * @return {Observable} Single-emission observable that emits if the modification succeeded or cancelled by the user
   */
  requestAddressIdentityModification (address) {
    return this.rpc.sendAndObserveResponse(
      'address_identity',
      ['modify', address]
    ).pipe(
      pluck('result')
    )
  }

  /**
   * Listens for events on your app's smart contract from the last unhandled block.
   *
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification).
   */
  events () {
    return this.rpc.sendAndObserveResponses(
      'events'
    ).pipe(
      pluck('result')
    )
  }

  /**
   * Creates a handle to interact with an external contract
   * (i.e. a contract that is **not** your app's smart contract, such as a token).
   *
   * @param  {string} address The address of the external contract
   * @param  {Array<Object>} jsonInterface The [JSON interface](https://web3js.readthedocs.io/en/1.0/glossary.html#glossary-json-interface) of the external contract.
   * @return {Object}  An external smart contract handle. Calling any function on this object will send a call to the smart contract and return an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the value of the call.
   */
  external (address, jsonInterface) {
    const contract = {
      events: (fromBlock) => {
        const eventArgs = [
          address,
          jsonInterface.filter(
            (item) => item.type === 'event'
          )
        ]
        if (typeof fromBlock === 'number') {
          eventArgs.push(fromBlock)
        }

        return this.rpc.sendAndObserveResponses(
          'external_events',
          eventArgs
        ).pipe(
          pluck('result')
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
        ).pipe(
          pluck('result')
        )
      }
    })

    return contract
  }

  /**
   * Set a value in the application cache.
   *
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
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.
   */
  state () {
    return this.rpc.sendAndObserveResponses(
      'cache',
      ['get', 'state']
    ).pipe(
      pluck('result')
    )
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
   * @param  {Function} reducer A function that reduces events to a state. This can return a Promise that resolves to a new state.
   * @param  {Observable[]} [events] An optional array of `Observable`s to merge in with the internal events observable
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.
   */
  store (reducer, events = [empty()]) {
    const initialState = this.state().pipe(first())

    // Wrap the reducer in another reducer that
    // allows us to execute code asynchronously
    // in our reducer. That's a lot of reducing.
    //
    // This is needed for the `mergeScan` operator.
    // Also, this supports both sync and async code
    // (because of the `Promise.resolve`).
    const wrappedReducer = (state, event) =>
      from(
        Promise.resolve(reducer(state, event))
      )

    const store$ = initialState.pipe(
      switchMap((initialState) =>
        merge(
          this.events(),
          ...events
        ).pipe(
          mergeScan(wrappedReducer, initialState, 1),
          map((state) => this.cache('state', state))
        )
      ),
      publishReplay(1)
    )
    store$.connect()

    return store$
  }

  /**
   * Perform a read-only call on the app's smart contract.
   *
   * @param  {string} method The name of the method to call.
   * @param  {...*} params An optional variadic number of parameters. The last parameter can be the call options (optional). See the [web3.js doc](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id16) for more details.
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the result of the call.
   */
  call (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'call',
      [method, ...params]
    ).pipe(
      pluck('result')
    )
  }

  /**
   * **NOTE: This call is not currently handled by the wrapper**
   *
   * Send a notification.
   *
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
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits app contexts as they are received.-
   */
  context () {
    return this.rpc.requests().pipe(
      filter((request) => request.method === 'context'),
      map((request) => request.params[0])
    )
  }

  /**
   * Decodes an EVM callscript and tries to describe the transaction path that the script encodes.
   *
   * @param  {string} script The EVM callscript to describe
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `destination`, `data` and `description` key.
   */
  describeScript (script) {
    return this.rpc.sendAndObserveResponse(
      'describe_script',
      [script]
    ).pipe(
      pluck('result')
    )
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
    ).pipe(
      pluck('result')
    )
  }

  /**
   * Allow apps to sign arbitrary data via a RPC call
   *
   * @param  {string} message The message to sign
   * @return {void}
   */
  requestSignMessage (message) {
    return this.rpc
      .sendAndObserveResponse('sign_message', [message])
      .pipe(
        pluck('result')
      )
  }

  /**
   * send a forwarded action's information to the wrapper
   *
   * @param {string} actionId ID assigned to forwarded action in Forwarder
   * @param {string} evmScript The execution script caught by the Forwarder
   * @return {void}
   */
  newForwardedAction (actionId, evmScript) {
    return this.rpc.send(
      'update_forwarded_action',
      [actionId, evmScript]
    )
  }

  /**
   * update a forwarded action's state the wrapper
   *
   * If the execution is pending, state = 0
   * If the execution completed, state = 1
   * If the execution failed, state = 2
   *
   * @param {string} actionId ID assigned to forwarded action in Forwarder
   * @param {integer} state The current state of the forwarded action within the forwarder
   * @param {string} [evmScript=''] The optionally updated execution script
   * @return {void}
   */
  updateForwardedAction (actionId, state, evmScript = '') {
    return this.rpc.send(
      'update_forwarded_action',
      [actionId, evmScript, state]
    )
  }

  /**
   * Listens for forwarded actions that target your app and emits them like contract events
   *
   * @return {Observable} An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an array of forwarded action objects
   */
  getForwardedActions () {
    return this.rpc.sendAndObserveResponses(
      'get_forwarded_actions'
    ).pipe(pluck('result'))
  }

  /**
   * Register data for external apps
   *
   * @param {string} from Address of the application generating the data
   * @param {<Array>string} to Address of the applications allowed access to the data
   * @param {string} dataId internal ID assigned to the data by the originator
   * @param {string} cid external identifier (e.g., IPFS hash)
   * @return {void}
   */
  registerAppMetadata (from, to, dataId, cid) {
    return this.rpc.send(
      'register_app_metadata',
      [from, to, dataId, cid]
    )
  }

}

/**
 * This class is used to communicate with the wrapper in which the app is run.
 *
 * Every method in this class sends an RPC message to the wrapper through the provider.
 */
export default class AragonApp {
  /**
   * Create a connected AragonApp instance.
   *
   * @param {Object} [provider=MessagePortMessage] The provider used to send and receive messages to and from the wrapper.
   */
  constructor (provider = new providers.MessagePortMessage()) {
    return new Proxy(
      new AppProxy(provider),
      AppProxyHandler
    )
  }
}

// Re-export the Aragon RPC providers
export { providers }
