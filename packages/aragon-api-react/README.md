# aragonAPI for React

This module allows to interact with aragonAPI using [React Hooks](https://reactjs.org/docs/hooks-intro.html). [`@aragon/api`](https://github.com/aragon/aragon.js/blob/master/docs/API.md) is used under the hood, so being familiar with it can be useful.

## Usage

```jsx
import { AragonApi, useAragonApi } from '@aragon/api-react'

function App() {
  const { api, appState } = useAragonApi()
  const { count = 0 } = appState

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => api.increment(1)}>Increment</button>
    </div>
  )
}

ReactDOM.render(
  <AragonApi>
    <App />
  </AragonApi>,
  document.getElementById('root')
)
```

This is a simple example demonstrating how we can use aragonAPI for React to connect the app to its contract, fetch some data from its state (using `appState`), and trigger an action on it (with `api.increment(1)`). The full API is detailed below.

## Installation

Install it alongside `@aragon/api`:

```sh
npm install --save @aragon/api @aragon/api-react
```

## Documentation

### &lt;AragonApi />

Before using any Hook provided, you need to declare this component to connect the app. It is generally a good idea to do it near the top level of your React tree. It should only be declared once.

It has an optional `reducer` prop, which lets you process the state coming from the [background script](https://github.com/aragon/aragon.js/blob/master/docs/BACKGROUND_SCRIPTS.md). If not provided, the state is passed as is.

#### Example

```jsx
import { AragonApi, useAppState } from '@aragon/api-react'
import BN from 'bn.js'

function App() {
  const { balance } = useAppState()
  return <div>{balance.toString(10)}</div>
}

function reducer(state) {
  if (state === null) {
    // initial sync
    return { balance: new BN(0) }
  }
  return { balance: new BN(state.balance) }
}

ReactDOM.render(
  <AragonApi reducer={reducer}>
    <App />
  </AragonApi>,
  document.getElementById('root')
)
```

### useAragonApi()

A React Hook that returns the data needed to interact with the app contract.

As with any React Hook, please ensure that you follow the [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html).

It returns an object containing the following entries:

#### `api`

This is the current [`AragonApp`](https://github.com/aragon/aragon.js/blob/master/docs/API.md#aragonapp) instance. Use it to call methods on the contract.

Example:

```jsx
function App() {
  const { api } = useAragonApi()
  return <button onClick={() => api.vote(true)}>Vote</button>
}
```

#### `appState`

The app state, after having passed the [background script](https://github.com/aragon/aragon.js/blob/master/docs/BACKGROUND_SCRIPTS.md) state through the `reducer` prop of `AragonApi`.

Example:

```jsx
import { useAragonApi } from '@aragon/api-react'

function App() {
  const { appState } = useAragonApi()
  return <div>{appState.count}</div>
}
```

#### `connectedAccount`

The connected Ethereum account. Its value is `""` (empty string) when there is no account connected.

Example:

```jsx
function App() {
  const { connectedAccount } = useAragonApi()
  return (
    <div>Account: {connectedAccount ? connectedAccount : 'Not connected'}</div>
  )
}
```

#### `network`

An [object](https://github.com/aragon/aragon.js/blob/master/docs/API.md#network) representing the current network using its `id` and `type` entries. Its value is `null` until it gets loaded.

Example:

```jsx
function App() {
  const { network } = useAragonApi()
  return <div>Current network: {network.type}</div>
}
```

#### `displayMenuButton`

Whether or not to display the menu button (`Boolean`), depending on it being automatically hidden or not in the client.

#### `requestMenu()`

Call this function to display the Aragon menu, when hidden automatically. This should be called when the user clicks on the menu button.

### useApi()

This Hook returns the same data than the `api` entry from the `useAragonApi()` hook.

### useAppState()

This Hook returns the same data than the `appState` entry from the `useAppState()` hook.

### useConnectedAccount()

This Hook returns the same data than the `connectedAccount` entry from the `useAragonApi()` hook.

### useMenuButton()

This Hook returns an array containing the `displayMenuButton` and the `requestMenu` entries from the `useAragonApi()` hook, in that order.

### useNetwork()

This Hook returns the same data than the `network` entry from the `useAragonApi()` hook.
