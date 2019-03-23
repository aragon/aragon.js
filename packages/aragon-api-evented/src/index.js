// import Messenger, { providers } from '@aragon/rpc-messenger'
// import { from } from 'rxjs'
// import { merge } from 'rxjs/observable/merge'
import EventEmitter from 'events'
// import { ReplaySubject, Subject } from 'rxjs'

import { defer, empty, from, merge } from 'rxjs'
import { first, map, filter, pluck, switchMap, mergeScan, publishReplay } from 'rxjs/operators'
import Messenger, { providers } from '@aragon/rpc-messenger'


export class ContractAPI extends EventEmitter {
  constructor(rpc) {
    super()
    this.rpc = rpc
    // lazily initialize the events (after the first subscribe)
    this.once('newListener', (event, listener) => {
      if (event === 'event') {
        // this event (newListener) is fired BEFORE the listener has been added
        // defer this with setTimeout to initialize the events after the listender was added 
        setTimeout(() => this.initializeEvents(), 0)
      }
    })
  }

  initializeEvents () {
    this.rpc.sendAndObserveResponses('events')
      .pipe(
        pluck('result')
      )
      .subscribe(value => {
        this.emit('event', value)
      })
  }

  intent (name, ...params) {
    return this.rpc.sendAndObserveResponse(
      'intent',
      [name, ...params]
    )
      .pipe(
        pluck('result')
      )
      .toPromise()
  }

  call (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'call',
      [method, ...params]
    )
      .pipe(pluck('result'))
      .toPromise()
  }
}

export class ExternalContractAPI extends EventEmitter {
  constructor(rpc, address, jsonInterface, fromBlock = 0) {
    super()
    this.rpc = rpc
    this.address = address
    this.jsonInterface = jsonInterface
    this.fromBlock = fromBlock
    // lazily initialize the events (after the first subscribe)
    this.once('newListener', (event, listener) => {
      if (event === 'event') {
        // this event (newListener) is fired BEFORE the listener has been added
        // defer this with setTimeout to initialize the events after the listender was added 
        setTimeout(() => this.initializeEvents(), 0)
      }
    })
  }

  initializeEvents () {
    this.rpc.sendAndObserveResponses(
      'external_events',
      [
        this.address,
        this.jsonInterface.filter(
          (item) => item.type === 'event'
        ),
        this.fromBlock
      ]
    )
      .pipe(pluck('result'))
      .subscribe(value => {
        this.emit('event', value)
      })
  }

  call (method, ...params) {
    const methodJsonInterface = this.jsonInterface.filter(
      (item) => item.type === 'function' && item.constant && item.name === method
    )

    return this.rpc.sendAndObserveResponse(
      'external_call',
      [address, methodJsonInterface, ...params]
    )
      .pipe(pluck('result'))
      .toPromise()
  }
}

export class StreamAPI extends EventEmitter {
  constructor(source) {
    super()
    this.observable = new ReplaySubject(1)
    // eagerly send the request to the wrapper as soon as this is initialized
    source
      .pipe(
        pluck('result'),
      )
      .do(value => { this.emit('update', value) })
      .subscribe(this.observable)
  }

  get () {
    return this.observable.toPromise()
  }
}

export class AragonApp {
  constructor(provider = new providers.MessagePortMessage()) {
    this.rpc = new Messenger(provider)
    this.contract = new ContractAPI(this.rpc)
    this.externalContract = (...args) => new ExternalContractAPI(this.rpc, ...args)
    this.network = new StreamAPI(this.rpc.sendAndObserveResponses('network'))
    this.accounts = new StreamAPI(this.rpc.sendAndObserveResponses('accounts'))
    this.state = new StreamAPI(this.rpc.sendAndObserveResponses('cache', ['get', 'state']))
    this.dispatcher = new Subject()
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
  store (reducer) {
    const $latestCachedState = from(this.state.get())

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

    const store$ = latestCachedState.pipe(
      switchMap((initialState) =>
        merge(
          Observable.fromEvent(this.contract, 'event'),
          this.dispatcher
        ).pipe(
          mergeScan(wrappedReducer, initialState, 1),
          map((state) => this.cache('state', state))
        )
      ),
      publishReplay(1),
    )
    store$.connect()
  }

  dispatch (event) {
    this.dispatcher.next(event)
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
    ).pipe(
      pluck('result')
    )
      .toPromise()
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
    )
      .pipe(pluck('result'))
      .toPromise()
  }
}

// Re-export the Aragon RPC providers
export { providers }
