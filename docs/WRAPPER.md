# aragonAPI for wrappers

## Install

```sh
npm install --save @aragon/wrapper
```

## Import

### ES6

```js
import AragonWrapper, { providers } from '@aragon/wrapper'
```

### ES5 (CommonJS)

```js
const AragonWrapper = require('@aragon/wrapper').default
const providers = require('@aragon/wrapper').providers
```

# API Reference

## AragonWrapper

### **Parameters**

- `daoAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the DAO.
- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Wrapper options. (optional, default `{}`)
  - `options.provider` **any** The Web3 provider to use for blockchain communication. Defaults to `web3.currentProvider` if web3 is injected, otherwise will fallback to wss://rinkeby.eth.aragon.network/ws (optional)
  - `options.apm` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Primarily used to set an alternative ipfs provider (optional, default `{}`)
  - `options.apm.ensRegistryAddress` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the ENS registry (optional, default `null`)

### **Examples**

```javascript
const aragon = new Aragon('0xdeadbeef')

// Initialises the wrapper
await aragon.init({
  accounts: {
    providedAccounts: ['0xbeefdead', '0xbeefbeef'],
  },
})
```

### init

Initialise the wrapper.

#### **Parameters**

- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  An optional options object for configuring the wrapper.
  - `accounts` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;string>**
    Options object for [`initAccounts()`](#initaccounts)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

Throws **[Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)** if the `daoAddress` provided during constructor is detected to not be a [`Kernel`](https://github.com/aragon/aragonOS/blob/dev/contracts/kernel/Kernel.sol) instance

### initAccounts

Initialise user-controlled accounts.

#### **Parameters**

- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  - `fetchFromWeb3` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
    Whether accounts should also be fetched from the Web3 instance provided to the wrapper
  - `providedAccounts` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;string>**
    An array of accounts that the user controls

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

### initAcl

Initialise the ACL.

#### **Parameters**

- `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  - `aclAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
    Address of the [`ACL`](https://github.com/aragon/aragonOS/blob/dev/contracts/acl/ACL.sol) instance to use, defaults to the `daoAddress`'s default `ACL`

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

### getProxyValues

Get proxy metadata (`appId`, address of the kernel, ...).

#### **Parameters**

- `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the proxy to get metadata from

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**

### isApp

Check if an object is an app.

#### **Parameters**

- `app` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**

### initApps

Initialise apps observable.

Returns **void**

### initForwarders

Initialise forwarder observable.

Returns **void**

### initNetwork

Initialise connected network details observable.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

### runApp

Run an app.

#### **Parameters**

- `sandbox` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** An object that is compatible with the PostMessage API.
- `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the app proxy.

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

### getAccounts

Get the available accounts for the current user.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>>** An array of addresses

### getTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

#### **Parameters**

- `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
- `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
- `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path

### calculateTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

#### **Parameters**

- `sender` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
- `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
- `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
- `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path

### modifyAddressIdentity

Modify the identity metadata for an address using the highest priority provider.

`modifyAddressIdentity (address: string, metadata: Object) : Promise`

Returns a promise that resolves if the modification was successful.

### resolveAddressIdentity

Resolve the identity metadata for an address using the highest priority provider.

`resolveAddressIdentity (address: string) : Promise`

Returns a promise that resolves with the identity or null if not found

### requestAddressIdentityModification

Request an identity modification using the highest priority provider.

`requestAddressIdentityModification (address: string) : Promise`

Request an identity modification using the highest priority provider.
Returns a promise which delegates resolution to the handler which listens and handles `this.identityIntents`
