# aragonAPI for React

This module allows for interacting with aragonAPI with [React Hooks](https://reactjs.org/docs/hooks-intro.html). [`@aragon/api`](https://github.com/aragon/aragon.js/blob/master/docs/API.md) is used under the hood, so being familiar with it can be useful.

## Usage

```jsx
import { AragonApi, useAragonApi } from '@aragon/api-react'

function App() {
  const { api, appState } = useAragonApi()
  const { count = 0 } = appState

  return (
    <div>
      <div>{count}</div>
      <button onClick={() => api.increment(1).toPromise()}>Increment</button>
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

This is a simple example demonstrating how we can use `@aragon/api-react` to connect an app's frontend to its contract, fetch some data from its state (`appState`), and trigger an action on it (`api.increment(1)`). The full API is detailed below.

## Installation

Install it alongside `@aragon/api`:

```sh
npm install --save @aragon/api @aragon/api-react
```

## Documentation

### &lt;AragonApi />

Before using any Hook provided, you need to declare this component to connect the app. It is generally a good idea to do it near the top level of your React tree. It should only be declared once.

It has an optional `reducer` prop, which lets you process the state coming from the [background script](https://github.com/aragon/aragon.js/blob/master/docs/BACKGROUND_SCRIPTS.md). If not provided, the state is passed as-is.

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
  return <button onClick={() => api.vote(true).toPromise()}>Vote</button>
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

#### `currentApp`

Details about the current app. Once loaded, it returns a single object with the following keys:

- `appAddress`: the app's contract address
- `appId`: the app's appId
- `appImplementationAddress`: the app's implementation contract address, if any (only available if this app is a proxied AragonApp)
- `identifier`: the app's identifier, if any
- `isForwarder`: whether the app is a forwarder
- `kernelAddress`: the app's attached Kernel address (i.e. organization address)
- `name`: the app's name, if available

Each app detail also includes an `icon(size)` function, that allows you to query for the app's icon (if available) based on a preferred size.

Its value is `null` until it gets loaded.

Example:

```jsx
function App() {
  const { currentApp } = useAragonApi()
  return (
    <div>
      <img width="40" height="40" src={app.icon(40)} />
      {currentApp.appAddress}
    </div>
  )
}
```

#### `installedApps`

The complete list of apps installed in the organization. Its value is an empty array (`[]`) until the list of apps are loaded.

Each object in the array holds the same keys as `currentApp`.

Example:

```jsx
function App() {
  const { installedApps } = useAragonApi()
  return (
    <div>
      {installedApps.map(app => (
        <div>{app.appAddress}</div>
      ))}
    </div>
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

#### `path` / `requestPath()`

The app's current path. Its value is `"/"` by default.

Use `requestPath()` to request the app be navigated to another path. Note that the navigation request _may_ be rejected, and in that case the `path` will stay constant.

Example:

```jsx
function App() {
  const { path, requestPath } = useAragonApi()

  // “Hello World” screen
  if (path === '/hello-world') {
    return (
      <div>
        <h1>Hello World</h1>
        <button onClick={() => requestPath('/')}>
          Back
        </button>
      </div>
    )
  }

  // Home
  return (
    <div>
      <button onClick={() => requestPath('/hello-world')}>
        Click
      </button>
    </div>
  )
}
```

### useApi()

This Hook returns the same data as the `api` entry from the `useAragonApi()` hook.

### useAppState()

This Hook returns the same data as the `appState` entry from the `useAppState()` hook.

### useConnectedAccount()

This Hook returns the same data as the `connectedAccount` entry from the `useAragonApi()` hook.

### useCurrentApp()

This Hook returns the same data as the `currentApp` entry from the `useAragonApi()` hook.

### useInstalledApps()

This Hook returns the same data as the `installedApps` entry from the `useAragonApi()` hook.

### useNetwork()

This Hook returns the same data as the `network` entry from the `useAragonApi()` hook.

### usePath()

This Hook returns an array holding two values from the `useAragonApi()` hook:

1. `path`, and
2. `requestPath`
