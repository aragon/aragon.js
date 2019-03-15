# aragonAPI for React

This module lets you interact with aragonAPI using a [React Hook](https://reactjs.org/docs/hooks-intro.html) or, alternatively, with a [render prop](https://reactjs.org/docs/render-props.html).

[`@aragon/api`](https://github.com/aragon/aragon.js/blob/master/docs/APP.md) is used under the hood, so being familiar with it can be useful.

## Usage

```jsx
import { useAragonApi } from '@aragon/api-react'

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
```

## Hook: `useAragonApi(reducer)`

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

The app state, after having passed the background script state through the optional `reducer` parameter. This is where you can process the state coming from the background script before passing it to your app. If not provided, the state is passed as is from the background script.

Example:

```jsx
import BN from 'bn.js'
import { useAragonApi } from  '@aragon/api-react'

function reducer(state) {

  // Initial sync
  if (state === null) {
    return {
      balance: new BN(0),
      syncing: true,
    }
  }

  return {
    balance: new BN(state.balance),
    syncing: false,
  }
}

function App() {
  const { appState } = useAragonApi(reducer)
  return (
    <div>{appState.balance.toString(10)}</div>
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

## Render prop: `<AragonApi reducer={reducer} />`

A render prop API is also provided. It is very similar to the Hook API, except that the reducer is passed as a component prop: `reducer`. As with the Hook, the reducer function is optional.

```jsx
import { AragonApi } from  '@aragon/api-react'

function App() {
  return (
    <AragonApi reducer={state => state}>
      {({api, appState, connectedAccount, network}) => (
        <div>{appState.result}</div>
      )}
    </AragonApi>
  )
}
```
