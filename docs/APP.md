# aragonAPI for Apps

## Install

```sh
npm install --save @aragon/api
```

## Import

### ES6

```js
import AragonApp, { providers } from '@aragon/api'
```

### ES5 (CommonJS)

```js
const AragonApp = require('@aragon/api').default
const providers = require('@aragon/api').providers
```

<!-- Warning!! -->

<!-- This document has references to /docs/PROVIDERS.md -->

# API Reference

## AragonApp

This class is used to communicate with the wrapper in which the app is run.

Every method in this class sends an RPC message to the wrapper.

The app communicates with the wrapper using a messaging provider.
The default provider uses the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage),
but you may specify another provider to use (see the exported [providers](/docs/PROVIDERS.md) to learn more about them).
You will most likely want to use the [`WindowMessage` provider](/docs/PROVIDERS.md#windowmessage) in your frontend.

To send an intent to the wrapper (i.e. invoke a method on your smart contract), simply call it on the instance of this class as if it was a JavaScript function.

For example, to execute the `increment` function in your app's smart contract:

```js
const app = new AragonApp()

// Sends an intent to the wrapper that we wish to invoke `increment` on our app's smart contract
app
  .increment(1)
  .subscribe(
    txHash => console.log(`Success! Incremented in tx ${txHash}`),
    err => console.log(`Could not increment: ${err}`)
  )
```

The intent function returns an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the hash of the transaction that was sent.

You can also pass an optional object after all the required function arguments to specify some values that will be sent in the transaction. They are the same values that can be passed to `web3.eth.sendTransaction()` and can be checked in this [web3.js document](https://web3js.readthedocs.io/en/1.0/web3-eth.html#id62).

```js
app.increment(1, { gas: 200000, gasPrice: 80000000 })
```

You can include a `token` parameter in this optional object if you need to do a token approval before a transaction. A slightly modified [example](https://github.com/aragon/aragon-apps/blob/master/apps/finance/app/src/App.js#L79) from the Finance app:

```js
intentParams = {
  token: { address: tokenAddress, value: amount }
  gas: 500000
}

app.deposit(tokenAddress, amount, reference, intentParams)
```

Some caveats to customizing transaction parameters:

- `from`, `to`, `data`: will be ignored as aragon.js will calculate those.
- `gas`: If the intent cannot be performed directly (needs to be forwarded), the gas amount will be interpreted as the minimum amount of gas to send in the transaction. Because forwarding performs a heavier transaction gas-wise, if the gas estimation done by aragon.js results in more gas than provided in the parameter, the estimated gas will prevail.

### Parameters

- `provider` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** A provider used to send and receive messages to and from the wrapper. See [providers](/docs/PROVIDERS.md). (optional, default `MessagePortMessage`)

### Examples

```javascript
import AragonApp, { providers } from '@aragon/api'

// The default provider should be used in background scripts
const backgroundScriptOfApp = new AragonApp()

// The WindowMessage provider should be used for front-ends
const frontendOfApp = new AragonApp(new providers.WindowMessage(window.parent))
```

### accounts

Get an array of the accounts the user currently controls over time.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an array of account addresses every time a change is detected.

### network

Get the network the app is connected to over time.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits an object with the connected network's id and type every time the network changes.

### identify

Set the app identifier.

This identifier is used to distinguish multiple instances of your app,
so choose something that provides additional context to the app instance.

Examples include: the name of a token that the app manages,
the type of content that a TCR is curating, the name of a group etc.

#### Parameters

- `identifier` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The identifier of the app.

#### Examples

```javascript
app.identify('Customer counter')
// or
app.identify('Employee counter')
```

Returns **void**

### resolveAddressIdentity

Resolve an address' identity, using the highest priority provider.

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Address to resolve.

Returns a single-emission observable that emits the resolved identity or null if not found

### requestAddressIdentityModification

Request an address' identity be modified with the highest priority provider.
The request is typically handled by the aragon client.

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** Address to modify.

Returns a single-emission observable that emits if the modification succeeded or was cancelled by the user.

### events

Listens for events on your app's smart contract from the last unhandled block.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification).

### external

Creates a handle to interact with an external contract (i.e. a contract that is **not** your app's smart contract, such as a token). Sending transactions to these external contracts is not yet supported as additional security and disclosure enhancements are required in frontend clients (this is a large attack vector for malicious applications to invoke dangerous functionality).

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the external contract
- `jsonInterface` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** The [JSON interface](https://web3js.readthedocs.io/en/1.0/glossary.html#glossary-json-interface) of the external contract.

#### Examples

```javascript
const token = app.external(tokenAddress, tokenJsonInterface)

// Retrieve the symbol of the token
token.symbol().subscribe(symbol => console.log(`The token symbol is ${symbol}`))

// Retrieve the token balance of an account
token
  .balanceOf(someAccountAddress)
  .subscribe(balance => console.log(`The balance of the account is ${balance}`))
```

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** An external smart contract handle. Calling any function on this object will send a call to the smart contract and return an [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the value of the call.

### cache

Set a value in the application cache.

#### Parameters

- `key` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The cache key to set a value for
- `value` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The value to persist in the cache

Returns **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** This method passes through `value`

### state

Observe the cached application state over time.

This method is also used to share state between the background script and front-end of your application.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.

### store

Listens for events, passes them through `reducer`, caches the resulting state and re-emits that state for easy chaining.

This is in fact sugar on top of [`state`](#state), [`events`](#events) and [`cache`](#cache).

The reducer takes the signature `(state, event)` à la Redux. Note that it _must always_ return a state, even if it is unaltered by the event.

Also note that the initial state is always `null`, not `undefined`, because of [JSONRPC](https://www.jsonrpc.org/specification) limitations.

Optionally takes an array of other `Observable`s to merge with this app's events; for example you might use an external contract's Web3 events.

#### Parameters

- `reducer` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** A function that reduces events to a state. This can return a Promise that resolves to a new state.
- `events` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;Observable>?** An optional array of `Observable`s to merge in with the internal events observable (optional, default `[empty()]`)

#### Examples

```javascript
// A simple reducer for a counter app

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

```javascript
// A reducer that also reduces events from an external smart contract

const token = app.external(tokenAddress, tokenJsonInterface)

const state$ = app.store(
  (state, event) => {
    // ...
  },
  [token.events()]
)
```

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the application state every time it changes. The type of the emitted values is application specific.

### call

Perform a read-only call on the app's smart contract.

#### Parameters

- `method` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The name of the method to call.
- `params` **...any** An optional variadic number of parameters. The last parameter can be the call options (optional). See the [web3.js doc](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id16) for more details.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the result of the call.

### requestSignMessage

Perform a signature using the [personal_sign](https://web3js.readthedocs.io/en/1.0/web3-eth-personal.html#sign) method.

#### Parameters

- `message` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The message to sign.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the result of the signature.

#### Examples

```javascript
  app
    .requestSignMessage('messageToSign')
    .subscribe(
      signature => {
        // use signature hash
      },
      err => {
        // handle error (including the user denying the signature request)
      }
    )
```

### notify

**NOTE: This call is not currently handled by the wrapper**

Send a notification.

#### Parameters

- `title` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The title of the notification.
- `body` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The body of the notification.
- `context` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** An optional context that will be sent back to the app if the notification is clicked. (optional, default `{}`)
- `date` **[Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)** An optional date that specifies when the notification originally occured. (optional, default `newDate()`)

Returns **void**

### context

**NOTE: The wrapper does not currently send contexts to apps**

Listen for app contexts.

An app context is an application specific message that the wrapper can send to the app.

For example, if a notification or a shortcut is clicked, the context attached to either of those will be sent to the app.

App contexts can be used to display specific views in your app or anything else you might find interesting.

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits app contexts as they are received.-

### describeScript

Decodes an EVM callscript and tries to describe the transaction path that the script encodes.

#### Parameters

- `script` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The EVM callscript to describe

Returns **Observable** An [RxJS observable](http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html) that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `destination`, `data` and `description` key.
