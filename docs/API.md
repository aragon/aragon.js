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

## Important Concepts / APIs

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

### store

**Should be** used as the main "event loop" in an application's background script (running inside a WebWorker). Listens for events, passes them through `reducer`, caches the resulting state, and re-emits that state for easy chaining.

The store has block caching automatically applied, such that subsequent loads of the application only fetch new events from a cached ("committed") block height (rather than from `0` or the app's initialization block).

The reducer takes the signature `(state, event)` à la Redux. Note that it _must always_ return a state, even if it is unaltered by the event. Returning `undefined` will reset the reduced state to its initial `null` state.

Also note that the initial state is always `null`, not `undefined`, because of [JSONRPC](https://www.jsonrpc.org/specification) limitations.

Optionally takes a configuration object comprised of an `init` function, to re-initialize cached state, and an `externals` array for subscribing to external contract events. See below for more details.

#### Parameters

- `reducer` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)**: A function that reduces events to a state. The function is allowed to be `async` and can return a Promise that resolves to the new state.
- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional, default `{}`): Optional configuration for the store:
  - `options.init` **[Function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function)** (optional): An initialization function for the state that takes the cached state (`null` if no cached state exists) as a parameter and returns re-initialized state. The function is allowed to be `async` and can return a Promise that resolves to the state.
  - `options.externals` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)** (optional): An array of external contracts whose events the store will also be subscribed to. Each element in the array is an object containing:
    - `contract` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**: an external contract handle returned from `api.external()`
    - `initializationBlock` **[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** (optional, defaults to the application's own initialization block):  block from which the external contract's events should be fetched from.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits the application state every time it changes.

#### Lifecycle

A simple representation of the store's lifecycle:

1. Obtain the store's initial state by fetching any cached ("committed") state for the app, else use `null` as the initial state
1. Fetch past events from the contract and, starting with the initial state, reduce new state based on the incoming events
  - Note that there are some "custom" built-in events at this step:
    - `SYNC_STATUS_SYNCING`: triggered when event fetching starts
    - `SYNC_STATUS_SYNCED`: triggered when event fetching is complete
1. Cache the state at the end of this initial sync as the app's "committed" state to date
1. Subscribe to new events from the contract and reduce new state based on the incoming events. Note that this state is not cached as "commited" state and will not be available on the app's next start
  - Note that there are some "custom" built-in events at this step:
    - `ACCOUNT_TRIGGER`: triggered whenever the currently connected account changes

If `options.init` and `options.externals` are given, the lifecycle becomes a bit more complicated:

1. Obtain the initial "committed" state, as before
1. If `options.init` is available, feed the initial state into `options.init`. Use the returned state from `options.init` as the new current state.
1. Fetch past events from the application contract and any given `options.externals` contracts, reducing new state from found events. Note that new events from both the application contract and external contracts are **not** fetched until all past events have been found.
1. Cache the state at the end of the initial sync as "committed" state, as before
1. Subscribe to new events from the contract and any given `options.externals` contracts, reducing new state based on the incoming events.

If the application emits its own `trigger`s (see [`emitTrigger`](#emittrigger)), the triggers will appear in the reducer only once the syncing phase for past events starts. Any triggers emitted before this will be ignored. Triggers are implicitly transformed into the web3 event schema of `event` (string) and `returnValues` (object).

> **Note**<br>
> The custom events are symbols and can be fetched from the `events` export of `@aragon/api` (e.g. `import { events } from '@aragon/api'`).
> All custom events conform to the web3 event schema of `event` (string) and `returnValues` (object).

#### Examples

A simple example:

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

A more complicated example that also includes `options.init` and `options.external`

```javascript
// A reducer that also reduces events from an external smart contract and uses
// an initialization function

const token = api.external(tokenAddress, tokenJsonInterface)

const initStore = async (cachedStoreState) => {
  // Perform any re-initializations on the cached committed state
  // This is useful for updating state (e.g. token balances, etc.) that may not
  // be // dependent on events
  const reinitializedStoreState = { ...cachedStoreState }

  // The state returned here will be used to start the reducer
  // (rather than the cached state)
  return reinitializedStoreState
}

const state$ = api.store(
  (state, event) => {
    // ...
  },
  {
    externals: {
      contract: token,
      initializationBlock: 0 // By default this uses the current AragonApp's initialization block
    },
    init: initStore,
  }
)
```

## Available APIs

### accounts

Get an array of the accounts the user currently controls over time.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an array of account addresses every time a change is detected.

### network

Get the network the app is connected to over time.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an object with the connected network's id and type every time the network changes.

### currentApp

Get information about this app (e.g. `appAddress`, `appId`, etc.).

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits this app's details, including:

- `abi`: this app's ABI
- `appAddress`: this app's contract address
- `appId`: this app's appId
- `appImplementationAddress`: this app's implementation contract address, if any (only available if this app is a proxied AragonApp)
- `identifier`: this app's self-declared identifier, if any
- `isForwarder`: whether this app is a forwarder
- `kernelAddress`: this app's attached kernel address (i.e. organization address)
- `name`: this app's name, if available

Each app detail also includes an `icon(size)` function, that allows you to query for the app's icon (if available) based on a preferred size.

### installedApps

Get the list of installed applications on the Kernel (organization) this app is attached to.

To get information about just the current app, use `currentApp()` instead.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an array of installed application objects every time a change to the installed applications is detected. Each object contains the same details as `currentApp()`.

### guiStyle

Can be ignored by non-GUI apps.

Get the current style of the client running this app.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits an object containing two entries: `appearance` and `theme`.

`appearance` is currently one of `light` or `dark`. Other values could be passed in the future (e.g. `black` for OLED screens). It is always present and should be respected by apps to display a corresponding theme, unless `theme` is present.

`theme` contains an entire theme object ([e.g. aragonUI's light theme](https://github.com/aragon/aragon-ui/blob/be4faf21172bdbc98816dd7ca4533bfa51e6712a/src/theme/theme-light.js)) that should be applied to the app. It is optional and apps should respect it when present. If not possible, apps should respect the value of `appearance`.

### path

Get the current path for the app over time. Useful with `requestPath()` to request and respond to in-app navigation changes.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits a string for the app's current path every time the path changes.

### requestPath

Request the current app be allowed to navigate to a different path. Different clients may behave differently, such as requesting user interaction, but all clients _should_ only allow an app to change its path if it is currently visible to users.

#### Parameters

- `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The path to navigate to

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits `null` on success or an error if the path request was rejected.

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

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the described transaction path. The emitted transaction path is an array of objects, where each item has a `to`, `data`, and `description` key.

### describeTransaction

Tries to describe an Ethereum transaction based on its input data.

#### Parameters

- `transaction` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**: Transaction object, holding `to` and `data`.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the description, if describable. The result is an object with:

- `description`: a string description
- `annotatedDescription`: (if available) an array of objects annotating the description

### events

Subscribe for events on your app's smart contract.

#### Parameters

- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional): [web3.eth.Contract.events()' options](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id34). Unless explicitly provided, `fromBlock` is always defaulted to the current app's initialization block.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits [Web3 events](https://web3js.readthedocs.io/en/1.0/glossary.html#specification). Note that in the background, an `eth_getLogs` will first be done to retrieve events from the last unhandled block and only afterwards will an `eth_subscribe` be made to subscribe to new events.

### pastEvents

Fetch events from past blocks on your app's smart contract.

#### Parameters

- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional): [web3.eth.Contract.getPastEvents()' options](https://web3js.readthedocs.io/en/1.0/web3-eth-contract.html#id37). Unless explicity provided, `fromBlock` is always defaulted to the current app's initialization block.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: An single-emission observable that emits an array of [Web3 events](https://web3js.readthedocs7io/en/1.0/glossary.html#specification) from past blocks.

### external

Creates a handle to interact with an external contract (i.e. a contract that is **not** your app's smart contract, such as a token).

#### Parameters

- `address` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The address of the external contract
- `jsonInterface` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**: The [JSON interface](https://solidity.readthedocs.io/en/latest/abi-spec.html#abi-json) of the external contract

#### Examples

```javascript
const token = api.external(tokenAddress, tokenJsonInterface)

// Retrieve the symbol of the token
token.symbol().subscribe(symbol => console.log(`The token symbol is ${symbol}`))

// Retrieve the token balance of an account
token
  .balanceOf(someAccountAddress)
  .subscribe(balance => console.log(`The balance of the account is ${balance}`))
```

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**: An external smart contract handle, containing the following methods:

- `events(options)`: returns a multi-emission observable with individual events found, similar to [`events`](#events)
- `pastEvents(options)`: returns a single-emission observable with an array of events found in past blocks, similar to [`pastEvents`](#pastevents)
- Any other method on the handle will respond based on the given contract ABI:
  - Calling any `constant` method (e.g. `view`, `pure`) will send a call to the smart contract and return a single emission observable with the result
  - Calling any `non-constant` method will send an "external intent" to prompt a real transaction to the smart contract and return a single emission observable with the signature status (signed or not; similar to [`intents`](#intents)

### requestSignMessage

Perform a signature using the [personal_sign](https://web3js.readthedocs.io/en/1.0/web3-eth-personal.html#sign) method.

#### Parameters

- `message` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The message to sign

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A single-emission observable that emits the signature hash on success or an error if the user chose not to sign the message.

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

#### Examples

```javascript
api.web3Eth('getTransactionReceipt', trxHash).subscribe(
  receipt => {
    // use receipt
  },
  err => {
    // handle error
  }
)
```

```javascript
const block = api.web3Eth('getBlock', blockNumber).toPromise()
```

```javascript
const balance = await api.web3Eth('getBalance', connectedAccount).toPromise()
```

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

Reduce and cache application state based on events. See [store documentation above](#store).

### triggers

Observe any emitted event triggers for this application.

Returns **[Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable)**: A multi-emission observable that emits on every emitted event trigger for this application (see [`emitTrigger()`](#emittrigger)).

### emitTrigger

Emit an event trigger to all running aragonAPI instances of your application, including the triggering instance. For example, if an application's frontend emits an event trigger, both the frontend and the background script's aragonAPI instances will receive it.

A common use case is to emit non-Ethereum event triggers from an application's frontend to its background script to recalculate reduced state based on a timer, user action, or external API request.

#### Parameters

- `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**: The name of the event
- `data` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** (optional, default `{}`): event data

Returns **void**.

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
