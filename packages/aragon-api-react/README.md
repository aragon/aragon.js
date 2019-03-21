# aragonAPI for React

This module lets you interact with aragonAPI using a [React Hook](https://reactjs.org/docs/hooks-intro.html) or, alternatively, with a [render prop](https://reactjs.org/docs/render-props.html).

[`@aragon/api`](https://github.com/aragon/aragon.js/blob/master/docs/APP.md) is used under the hood, so being familiar with it can be useful.

## Usage

```jsx
import { ConnectAragonApi, useAragonApi } from '@aragon/api-react'

function App() {
  const { api, appState } = useAragonApi()
  const { count = 0 } = appState

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => api.increment(1)}>
        Increment
      </button>
    </div>
  )
}

ReactDOM.render(
  <ConnectAragonApi>
    <App />
  </ConnectAragonApi>,
  document.getElementById('root')
)

```

## `<ConnectAragonApi />`

Before using any Hook provided, you need to declare this component to connect the app. It is generally a good idea to do it near the top level of your React tree. It should only be declared once.

It has an optional `reducer` prop, which lets you process the state coming from the background script. If not provided, the state is passed as is from the background script.

### Example

```jsx
import BN from 'bn.js'
import { ConnectAragonApi, useAppState } from  '@aragon/api-react'

function App() {
  const { balance } = useAppState()
  return (
    <div>{balance.toString(10)}</div>
  )
}

function reducer(state) {
  if (state === null) { // initial sync
    return { balance: new BN(0) }
  }
  return { balance: new BN(state.balance) }
}

ReactDOM.render(
  <ConnectAragonApi reducer={reducer}>
    <App />
  </ConnectAragonApi>,
  document.getElementById('root')
)
```



## `useAragonApi()`

A React Hook that initiate the connection of the app with its environment, and returns the data needed to interact with its contract.

As with any React Hook, please ensure that you follow the [Rules of Hooks](https://reactjs.org/docs/hooks-rules.html).


The Hook returns an object containing the following entries:

### api

This is the current [`AragonApp`](https://github.com/aragon/aragon.js/blob/master/docs/APP.md#aragonapp) instance. Use it to call methods on the contract.

Example:

```jsx
function App() {
  const { api } = useAragonApi()
  return (
    <button onClick={() => api.vote(true)}>Vote</button>
  )
}
```

### appState

The app state, after having passed the background script state through the `reducer` prop of `ConnectAragonApi`.

Example:

```jsx
import { useAragonApi } from  '@aragon/api-react'

function App() {
  const { appState } = useAragonApi()
  return (
    <div>{appState.count}</div>
  )
}
```

### connectedAccount

The connected Ethereum account. Its value is `""` (empty string) when there is no account connected.

Example:

```jsx
function App() {
  const { connectedAccount } = useAragonApi()
  return (
    <div>Account: {connectedAccount? connectedAccount : 'Not connected'}</div>
  )
}
```

### network

An [object](https://github.com/aragon/aragon.js/blob/master/docs/APP.md#network) representing the current network using its `id` and `type` entries.

Example:

```jsx
function App() {
  const { network } = useAragonApi()
  return (
    <div>Current network: {network.type}</div>
  )
}
```

### displayMenuButton

Whether or not to display the menu button (`Boolean`), depending on it being automatically hidden or not in the client.

### requestMenu()

Call this function to display the Aragon menu, when hidden automatically. This should be called when the user clicks on the menu button.

## `useApi()`

This Hook returns the same data than the `api` entry from the `useAragonApi()` hook.

## `useAppState()`

This Hook returns the same data than the `appState` entry from the `useAppState()` hook.

## `useConnectedAccount()`

This Hook returns the same data than the `connectedAccount` entry from the `useAragonApi()` hook.

## `useMenuButton()`

This Hook returns an array containing the `displayMenuButton` and the `requestMenu` entries from the `useAragonApi()` hook, in that order.

## `useNetwork()`

This Hook returns the same data than the `network` entry from the `useAragonApi()` hook.
