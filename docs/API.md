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

The app communicates with the wrapper using a messaging provider. The default provider uses the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage), but you may specify another provider to use (see the exported [providers](/docs/PROVIDERS.md) to learn more about them). You will most likely want to use the [`WindowMessage` provider](/docs/PROVIDERS.md#windowmessage) in your frontend.

### Parameters

- `provider` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional, default `MessagePortMessage`): A provider used to send and receive messages to and from the wrapper. See [providers](/docs/PROVIDERS.md).

### Examples

```javascript
import AragonApp, { providers } from '@aragon/api'

// The default provider should be used in background scripts
const backgroundScriptOfApp = new AragonApp()

// The WindowMessage provider should be used for front-ends
const frontendOfApp = new AragonApp(new providers.WindowMessage(window.parent))
```

> **Note**<br>
> Most of the returned observables will propagate errors from `@aragon/wrapper` (e.g. the Aragon client) if an RPC request failed. An example would be trying to use `api.call('nonexistentFunction')`. Multi-emission observables (e.g. `api.accounts()`) will forward the error without stopping the stream, leaving the subscriber to handle the error case.

> **Note**<br>
> Although many of the API methods return observables, many of them are single-emission observables that you can turn directly into a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). While this is seen as an "antipattern" by experienced RxJS users, it is highly convenient when you're not working fully in the context of streams and just need a particular async value (e.g. `api.call('getVoteDetails', voteId)`). The Aragon One team recommends this approach when first developing your apps if you are not already experienced with RxJS.
>
> You can use the [`.toPromise()`](https://rxjs-dev.firebaseapp.com/api/index/class/Observable#toPromise) method on all single-emission observables safely (e.g. `await api.call('getVoteDetails', voteId).toPromise()`). If you receive a multi-emission observable (e.g. `api.accounts()`) but only care about its current value, you can use the [`first()`](https://rxjs-dev.firebaseapp.com/api/operators/first) operator, e.g. `api.accounts().pipe(first()).toPromise()`.

> **Note**<br>
> All methods returning observables will only send their RPC requests upon the returned observable being subscribed. For example, calling `api.increment()` will **NOT** send an intent until you have subscribed to the returned observable. This is to ensure that responses cannot be accidentally skipped.
>
> If you're not interested in the response, you can either make an "empty" subscription (i.e. `api.increment().subscribe()`), or turn it into a promise and await it (i.e. `await api.increment().toPromise()`).

### intents

To send an intent to the wrapper (i.e. invoke a method on your smart contract), simply call it on the instance of this class as if it was a JavaScript function.

For example, to execute the `increment` function in your app's smart contract:

```js
const api = new AragonApp()

// Sends an intent to the wrapper that we wish to invoke `increment` on our app's smart contract
api
  .increment(1)
  .subscribe(
    txHash => console.log(`Success! Incremented in tx ${txHash}`),
    err => console.log(`Could not increment: ${err}`)
  )
```

The intent function returns a single-emission [RxJS observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable) that emits the hash of the transaction that was sent or an error if the user choose not to sign the transaction.

You can also pass an optional object after all the required function arguments to specify some transaction options. They are the same values that can be passed to `web3.eth.sendTransaction()` and the full list can be seen in the [web3.js documentation](https://web3js.readthedocs.io/en/1.0/web3-eth.html#id62).

```js
api.increment(1, { gas: 200000, gasPrice: 80000000 })
```

Some caveats to customizing transaction parameters:

- `from`, `to`, `data`: will be ignored as aragonAPI will calculate those.
- `gas`: If the intent cannot be performed directly (needs to be forwarded), the gas amount will be interpreted as the minimum amount of gas to send in the transaction. Because forwarding performs a heavier transaction gas-wise, if the gas estimation done by aragonAPI results in more gas than provided in the parameter, the estimated gas will prevail.

#### Pretransactions

> **Note**<br>
> Some intents may require additional transactions ahead of the actual intent, such as a token approval if the intent is to transfer tokens on the user's behalf.
> We use the concept of "pretransactions" to allow apps to easily declare that they require these actions.

**Token Approvals**

You can include a `token` parameter in the final options object if you need to grant the app an token allowance before a transaction. A slightly modified [example](https://github.com/aragon/aragon-apps/blob/7d61235044509095db09cf354f38422f0778d4bb/apps/finance/app/src/App.js#L58) from the Finance app:

```js
intentParams = {
  token: { address: tokenAddress, value: amount }
  gas: 500000
}

api.deposit(tokenAddress, amount, reference, intentParams)
```

If you want to grant the token allowance to a different contract from the current app, you can pass along a `spender` paramater in the `token` object as follows:

```js
intentParams = {
  token: { address: tokenAddress, value: amount, spender: otherContractAddress }
  gas: 500000
}

api.deposit(tokenAddress, amount, reference, intentParams)
```

### accounts

Get an array of the accounts the user currently controls over time.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an array of account addresses every time a change is detected.

### network

Get the network the app is connected to over time.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an object with the connected network's id and type every time the network changes.

### call

Perform a read-only call on the app's smart contract.

#### Parameters

- `method` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The name of the method to call
- `params` **...any**: An optional variadic number of parameters. The last parameter can be the call options (optional). See the [web3.js doc](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id16) for more details.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the result of the call.

### describeScript

Decodes an EVM callscript and tries to describe the transaction path that the script encodes.

#### Parameters

- `script` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The EVM callscript to describe

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `destination`, `data` and `description` key.

### events

Listens for events on your app's smart contract from the last unhandled block.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification). Note that in the background, an `eth_getLogs` will first be done to retrieve events from the last unhandled block and only afterwards will an `eth_subscribe` be made to subscribe to new events.

### external

Creates a handle to interact with an external contract (i.e. a contract that is **not** your app's smart contract, such as a token).

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The proxy address of the external contract
- `jsonInterface` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**: The [JSON interface](https://web3js.readthedocs.io/en/1.0/glossary.html#glossary-json-interface) of the external contract

#### Examples

```javascript
const token = api.external(tokenProxyAddress, tokenJsonInterface)

// Retrieve the symbol of the token
token.symbol().subscribe(symbol => console.log(`The token symbol is ${symbol}`))

// Retrieve the token balance of an account
token
  .balanceOf(someAccountAddress)
  .subscribe(balance => console.log(`The balance of the account is ${balance}`))
```

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**: An external smart contract handle. Calling any function on this object will send a call to the smart contract and return an [RxJS observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable) that emits the value of the call.

### requestSignMessage

Perform a signature using the [personal_sign](https://web3js.readthedocs.io/en/1.0/web3-eth-personal.html#sign) method.

#### Parameters

- `message` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The message to sign

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the result of the signature. Errors if the user chose not to sign the message.

#### Examples

```javascript
  api
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

### web3Eth

Request a white-listed [web3.eth](https://web3js.readthedocs.io/en/1.0/web3-eth.html) function call.

Currently the white-list includes:

- `estimateGas`,
- `getAccounts`,
- `getBalance`,
- `getBlock`,
- `getBlockNumber`,
- `getBlockTransactionCount`,
- `getCode`,
- `getCoinbase`,
- `getCompilers`,
- `getGasPrice`,
- `getHashrate`,
- `getPastLogs`,
- `getProtocolVersion`,
- `getStorageAt`,
- `getTransaction`,
- `getTransactionCount`,
- `getTransactionFromBlock`,
- `getTransactionReceipt`,
- `getWork`,
- `getUncle`,
- `isMining`,
- `isSyncing`

#### Parameters

- `params` **...any**: An optional variadic number of parameters for the function. See the [web3.eth docs](https://web3js.readthedocs.io/en/1.0/web3-eth.html) for more details.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable with the result of the call.

### cache

Set a value in the application cache.

#### Parameters

- `key` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The cache key for the value
- `value` **any**: The value to persist in the cache (must conform to the [structured cloning algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm))

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits when the cache operation has been commited.

### state

Observe the cached application state over time.

This method is also used to share state between the background script and front-end of your application.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits the application state every time it changes. The type of the emitted values is application specific.

### store

Listens for events, passes them through `reducer`, caches the resulting state and re-emits that state for easy chaining.

This is in fact sugar on top of [`state`](#state), [`events`](#events) and [`cache`](#cache).

The reducer takes the signature `(state, event)` à la Redux. Note that it _must always_ return a state, even if it is unaltered by the event.

Also note that the initial state is always `null`, not `undefined`, because of [JSONRPC](https://www.jsonrpc.org/specification) limitations.

Optionally takes an array of other `Observable`s to merge with this app's events; for example you might use an external contract's Web3 events.

#### Parameters

- `reducer` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)**: A function that reduces events to a state. This can return a Promise that resolves to a new state
- `events` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;Observable>?** (optional, default `[empty()]`): An optional array of `Observable`s to merge in with the internal events observable

#### Examples

```javascript
// A simple reducer for a counter app

const state$ = api.store((state, event) => {
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

const token = api.external(tokenAddress, tokenJsonInterface)

const state$ = api.store(
  (state, event) => {
    // ...
  },
  [token.events()]
)
```

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable  that emits the application state every time it changes. The type of the emitted values is application specific.

### identify

Set the app identifier.

This identifier is used to distinguish multiple instances of your app, so choose something that provides additional context to the app instance.

Examples include: the name of a token that the app manages, the type of content that a TCR is curating, the name of a group etc.

#### Parameters

- `identifier` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The identifier of the app

#### Examples

```javascript
api.identify('Customer counter')
// or
api.identify('Employee counter')
```

Returns **void**.

### resolveAddressIdentity

Resolve an address' identity, using the highest priority provider.

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: Address to resolve

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the resolved identity or null if not found.

### requestAddressIdentityModification

Request an address' identity be modified with the highest priority provider. The request will typically be handled by the Aragon client.

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: Address to modify

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits if the modification succeeded or was cancelled by the user.

### searchIdentities

Search for identities that match a given search term.

#### Parameters

- `searchTerm` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: String to search for. Must be above a certain length, as defined by the handler (e.g. Aragon client uses minimum length of 3).

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits with an array of any matching identities.

### context

**NOTE: The wrapper does not currently send contexts to apps**

Listen for app contexts.

An app context is an application specific message that the wrapper can send to the app.

For example, if a notification or a shortcut is clicked, the context attached to either of those will be sent to the app.

App contexts can be used to display specific views in your app or anything else you might find interesting.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits app contexts as they are received.

### notify

**NOTE: This call is not currently handled by the wrapper.**

Send a notification.

#### Parameters

- `title` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The title of the notification
- `body` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The body of the notification
- `context` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional, default `{}`): An optional context that will be sent back to the app if the notification is clicked
- `date` **[Date](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)** (optional, default `newDate()`): An optional date that specifies when the notification originally occured

Returns **void**.
