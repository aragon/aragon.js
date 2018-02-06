<p align="center"><img width="40%" src="https://aragon.one/rsc/imgs/logo_text_black.svg"></p>

<div align="center">
  <!-- Stability -->
  <a href="https://nodejs.org/api/documentation.html#documentation_stability_index">
    <img src="https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square"
      alt="API stability" />
  </a>
  <!-- NPM version -->
  <a href="https://npmjs.org/package/@aragon/aragon.js">
    <img src="https://img.shields.io/npm/v/@aragon/aragon.js.svg?style=flat-square"
      alt="NPM version" />
  </a>
  <!-- Build Status -->
  <a href="https://travis-ci.org/aragon/aragon.js">
    <img src="https://img.shields.io/travis/aragon/aragon.js/master.svg?style=flat-square"
      alt="Build Status" />
  </a>
  <!-- Test Coverage -->
  <a href="https://coveralls.io/github/aragon/aragon.js">
    <img src="https://img.shields.io/coveralls/aragon/aragon.js.svg?style=flat-square"
      alt="Test Coverage" />
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/@aragon/aragon.js">
    <img src="https://img.shields.io/npm/dm/@aragon/aragon.js.svg?style=flat-square"
      alt="Downloads" />
  </a>
  <!-- Standard -->
  <a href="https://standardjs.com">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"
      alt="Standard" />
  </a>
</div>

<div align="center">
  <h4>
    <a href="https://aragon.one">
      Website
    </a>
    <span> | </span>
    <a href="https://github.com/aragon/aragon.js/tree/master/docs">
      Documentation
    </a>
    <span> | </span>
    <a href="https://github.com/aragon/aragon.js/blob/master/.github/CONTRIBUTING.md">
      Contributing
    </a>
    <span> | </span>
    <a href="https://aragon.chat">
      Chat
    </a>
  </h4>
</div>

## Basic Overview
The layer between [Aragon Core](https://github.com/aragon/aragon-core) and the Aragon web- and desktop [application](https://github.com/aragon/aragon). Use it to build third-party apps for Aragon, or to roll your own front-end.

## Install
```sh
npm i @aragon/client
```

## Usage

### Aragon Wrapper

An Aragon wrapper.

**Parameters**

-   `daoAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the DAO.
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** Wrapper options. (optional, default `{}`)
    -   `options.provider` **any** The Web3 provider to use for blockchain communication (optional, default `ws://rinkeby.aragon.network:8546`)
    -   `options.ensRegistryAddress` **[String](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the ENS registry (optional, default `null`)

**Examples**

```javascript
const aragon = new Aragon('0xdeadbeef')

// Initialises the wrapper and logs the installed apps
aragon.init(() => {
  aragon.apps.subscribe(
    (apps) => console.log(apps)
  )
})
```

#### init

Initialise the wrapper.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

#### initAcl

Initialise the ACL.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;void>**

#### getAppProxyValues

Get proxy metadata (`appId`, address of the kernel, ...).

**Parameters**

-   `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the proxy to get metadata from

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**

#### isApp

Check if an object is an app.

**Parameters**

-   `app` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**

#### initApps

Initialise apps observable.

Returns **void**

#### initForwarders

Initialise forwarder observable.

Returns **void**

#### runApp

Run an app.

**Parameters**

-   `sandbox` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** An object that is compatible with the PostMessage API.
-   `proxyAddress` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** The address of the app proxy.

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**

#### getAccounts

Get the available accounts for the current user.

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>>** An array of addresses

#### getTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

**Parameters**

-   `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path

#### calculateTransactionPath

Calculate the transaction path for a transaction to `destination`
that invokes `methodName` with `params`.

**Parameters**

-   `sender` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `destination` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `methodName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `params` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;any>**

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An array of Ethereum transactions that describe each step in the path

## Contributing
Please take a look at our [contributing](https://github.com/aragon/aragon.js/blob/master/CONTRIBUTING.md) guidelines if you're interested in helping!
