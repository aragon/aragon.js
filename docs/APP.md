# Apps API Reference (`@aragon/client`)

## Top-Level Exports

- [AragonApp([provider])](#aragonapp)
- [providers](#providers)
  - [MessagePortMessage([target])](#messageportmessage)
  - [WindowMessage([target])](#windowmessage)

## App API

- [AragonApp](#aragonapp)
  - [accounts()](#accounts)
  - [identify(identifier)](#identify)
  - [events()](#events)
  - [external(address, jsonInterface)](#external)
  - [cache(key, value)](#cache)
  - [state()](#state)
  - [store(reducer, [events])](#store)
  - [call(method, ...params)](#call)
  - [notify(title, body, [context], [date])](#notify)
  - [context()](#context)
  - [describeScript(script)](#describescript)

## Importing

### ES6

```js
import AragonApp from '@aragon/client'
```

### ES5 (CommonJS)

```js
const AragonApp = require('@aragon/client').default
```

## AragonApp

This class is used to communicate with the wrapper in which the app is run.

Every method in this class sends an RPC message to the wrapper.

The app communicates with the wrapper using a messaging provider. The default provider uses the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), but you may specify another provider to use (see the exported [providers](#providers) to learn more about them). You will most likely want to use the [`WindowMessage` provider](#windowmessage) in your frontend.

To send an intent to the wrapper (i.e. invoke a method on your smart contract), simply call it on the instance of this class as if it was a JavaScript function.

For example, to invoke `increment` on your app's smart contract:

```js
const app = new AragonApp()

// Sends an intent to the wrapper that we wish to invoke `increment` on our
// app's smart contract
app.increment()
```

**Parameters**

1. [`provider`] (`Provider`): A provider used to send and receive messages to and from the wrapper. Defaults to a provider that uses the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), which is suitable for use in [background scripts](BACKGROUND_SCRIPTS.md) as WebWorkers are natively compatible with the MessageChannel API. However, front-ends connected through an iframe should use the [`WindowMessage provider](#windowmessage) as the iframe's PostMessage API is slightly different.

**Example**

```js
import AragonApp, { providers } from '@aragon/client'

// The default provider should be used in background scripts
const backgroundScriptOfApp = new AragonApp()

// The WindowMessage provider should be used for front-ends
const frontendOfApp = new AragonApp(
  new providers.WindowMessage(window.parent)
)
```

### accounts

Get an array of accounts that the user controls over time.

**Parameters**

None.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an array of account addresses every time a change is detected.

### identify

Add an app identifier.

This identifier is used to distinguish multiple instances of your app, so choose something that provides additional context to the app instance.

An example of a good app identifier would be the token symbol of the token that the [Token Manager](https://github.com/aragon/aragon-apps/tree/master/apps/token-manager) app manages.

**Parameters**

1. `identifier` (`String`): The identifier of the app.

**Returns**

None.

### events

Listens for events on your app's smart contract from the last unhandled block.

**Parameters**

None.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification).

### external

Creates a handle to interact with an external contract (i.e. a contract that is **not** your app's smart contract, such as a token).

**Parameters**

1. `address` (`String`): The address of the external contract.
2. `jsonInterface` (`Array<Object>`): The [JSON interface](https://web3js.readthedocs.io/en/1.0/glossary.html#glossary-json-interface) of the external contract.

**Returns**

(`Object`): An external smart contract handle. Calling any function on this object will send a call to the smart contract and return an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the value of the call.

**Example**

```js
const token = app.external(tokenAddress, tokenJsonInterface)

// Retrieve the symbol of the token
token.symbol()
	.subscribe((symbol) => console.log(`The token symbol is ${symbol}`))

// Retrieve the token balance of an account
token.balanceOf(someAccountAddress)
	.subscribe((balance) => console.log(`The balance of the account is ${balance}`))
```

### cache

Set a value in the application cache.

**Parameters**

1. `key` (`String`): The cache key to set a value for
2. `value` (`any`): The value to persist in cache

**Returns**

(`any`): This method passes through `value`

### state

Observe the cached application state over time.

This method is also used to share state between the background script and front-end of your application.

**Parameters**

None.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.

### store

Listens for events, passes them through `reducer`, caches the resulting state and re-emits that state for easy chaining.

This is in fact sugar on top of [`state`](#state), [`events`](#events) and [`cache`](#cache).

The reducer takes the signature `(state, event)` a lá Redux. Note that it *must always* return a state, even if it is unaltered by the event.

Also note that the initial state is always `null`, not `undefined`, because of JSONRPC limitations.

Optionally takes an array of other `Observable`s to merge with this app's events; for example you might use an external contract's Web3 events.

**Parameters**

1. `reducer` (`Function`): A function that reduces events to a state. This can return a Promise that resolves to a new state.
2. [`events`] (`Array<Observable>`): An optional array of `Observable`s to merge in with the internal events observable.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An observable of application states.

**Example**

A simple reducer for a counter app

```js
const state$ = app.store((state, event) => {
  // Initial state is always null
  if (state === null) state = 0

  switch (event.event) {
    case 'Increment':
      state++
      return state
    case 'Decrement':
      state--
      return state
  }

  // We must always return a state, even if unaltered
  return state
})
```

A reducer that also reduces events from an external smart contract

```js
const token = app.external(tokenAddress, tokenJsonInterface)

const state$ = app.store((state, event) => {
  // ...
}, [token.events()])
```

### call

Perform a read-only call on the app's smart contract.

**Parameters**

1. `method` (`String`): The name of the method to call.
2. `...params` (*arguments*): An optional variadic number of parameters.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An observable that emits the result of the call.

**Example**

```js
// Calls the smart contract's `balanceOf` method with the specified account address
app.call('balanceOf', accountAddress)
	.subscribe((balance) => console.log(`The balance of the account is ${balance}`))
```

### notify

**NOTE: This call is not currently handled by the wrapper**

Sends a notification.

**Parameters**

1. `title` (`String`): The title of the notification.
2. `body` (`String`): The body of the notification.
3. [`context`] (`Object`): An optional context that will be sent back to the app if the notification is clicked.
4. [`date`] (`Date`): An optional date that specifies when the notification originally occured.

**Returns**

None.

### context

**NOTE: The wrapper does not currently send contexts to apps**

Listen for app contexts.

An app context is an application specific message that the wrapper can send to the app.

For example, if a notification or a shortcut is clicked, the context attached to either of those will be sent to the app.

App contexts can be used to display specific views in your app or anything else you might find interesting.

**Parameters**

None.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An observable that emits app contexts as they are received.

### describeScript

Decodes an EVM callscript and tries to describe the transaction path that the script encodes.

**Parameters**

1. `script` (`String`): The EVM callscript to describe.

**Returns**

([`Observable`](https://github.com/tc39/proposal-observable)): An observable that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `destination`, `data` and `description` key.

## Providers

### MessagePortMessage

A provider that communicates through the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage).

**Parameters**

1. [`target`] (`Object`): The object (that implements the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage)) to send messages to.

### WindowMessage

A provider that communicates through the [`Window PostMessage API`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

**Parameters**

1. [`target`] (`Object`): The object (that implements the [Window PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)) to send messages to.
