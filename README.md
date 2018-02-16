<p align="center"><img width="25%" src="https://wiki.aragon.one/design/logo/png/stroke.png"></p>

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

## Quick Start

```js
const Aragon = require('@aragon/client')

// Set up app
const app = new Aragon()

// Set app identifier
// Just an example, should be more descriptive (e.g. for our token manager, we use the ticker of the token it manages)
app.identify(Math.random())

// Listen to events and build app state
const state$ = app.store((state, event) => {
  // Initial state
  if (state === null) state = 0
  
  // Build state
  if (event.event === 'Decrement') {
    state--
    
    // Send notification
    app.notify('Counter decremented', `The counter was decremented to ${state}`)
  }
  if (event.event === 'Increment') {
    state++
    app.notify('Counter incremented', `The counter was incremented to ${state}`)
  }
  
  return state
})

// Log out the state
state$.subscribe(console.log)

// Send an intent to the wrapper
app.increment().subscribe(
  (txHash) => console.log(`Success! Incremented in tx ${txHash}`),
  (err) => console.log(`Could not increment: ${err}`)
)
```

## Documentation

For wrappers, see [here](docs/WRAPPER.md).

For apps, see [here](docs/APP.md).

## Contributing
Please take a look at our [contributing](https://github.com/aragon/aragon.js/blob/master/CONTRIBUTING.md) guidelines if you're interested in helping!
