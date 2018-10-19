# Aragon Wrapper

## An Aragon wrapper.

### **Parameters**

-   `daoAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the DAO.
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Wrapper options. (optional, default `{}`)
    -   `options.provider` **any** The Web3 provider to use for blockchain communication (optional, default `ws://rinkeby.aragon.network:8546`)
    -   `options.ensRegistryAddress` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the ENS registry (optional, default `null`)

### **Examples**

```javascript
const aragon = new Aragon('0xdeadbeef')

// Initialises the wrapper
await aragon.init({
  accounts: {
    providedAccounts: ["0xbeefdead", "0xbeefbeef"]
  }
})
```

## init

Initialise the wrapper.

### **Parameters**

-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
      An optional options object for configuring the wrapper.
    -   `accounts` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;string>**
          Options object for [`initAccounts()`](#initaccounts)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

## initAccounts

Initialise user-controlled accounts.

### **Parameters**

-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**
    -   `fetchFromWeb3` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**
          Whether accounts should also be fetched from the Web3 instance provided to the wrapper
    -   `providedAccounts` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;string>**
          An array of accounts that the user controls

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

## initAcl

Initialise the ACL.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

## getAppProxyValues

Get proxy metadata (`appId`, address of the kernel, ...).

### **Parameters**

-   `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the proxy to get metadata from

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**

## isApp

Check if an object is an app.

### **Parameters**

-   `app` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**

## initApps

Initialise apps observable.

Returns **void**

## initForwarders

Initialise forwarder observable.

Returns **void**

## runApp

Run an app.

### **Parameters**

-   `sandbox` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** An object that is compatible with the PostMessage API.
-   `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the app proxy.

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

## getAccounts

Get the available accounts for the current user.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>>** An array of addresses

## getTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

### **Parameters**

-   `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path

## calculateTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

### **Parameters**

-   `sender` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path
