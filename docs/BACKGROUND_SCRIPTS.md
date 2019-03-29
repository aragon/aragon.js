# aragonJS - Background Scripts

This document outlines how to write background scripts for your app and why you might want to do so.

Background scripts are parts of your app that are always run as soon as the Aragon Dapp is opened. This is hugely useful if you want to keep your app up to date every time a user opens your app since you can build out your application state in the background. Furthermore, background scripts create a nice separation of concerns - your background script handles all of the state building and your app front-end is simply presentational.

## Setup

First you need to instantiate an instance of the [`AragonApp`](/docs/APP.md#aragonapp) class from `@aragon/api`.

```js
import Aragon from '@aragon/api'
const app = new Aragon()
```

Next, you need to specify that your app has a background script. In your `manifest.json` file, simply specify the `script` key. The value should be the path to your built background script. For example, if our built background script was located at `dist/script.js`, we would specify it like so:

```js
{
  // name etc.
  "script": "/dist/script.js"
}
```

## Building State

All of the [`AragonApp`](/docs/APP.md#aragonapp) methods are available to you. We highly recommend that you use [`AragonApp#store`](/docs/APP.md#store) as it handles state caching and events subscriptions for you.

```js
const state$ = app.store((state, event) => {
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

## Sharing State

If you use [`AragonApp#store`](/docs/APP.md#store) then state will be automatically shared with your front-end in [real-time](https://en.wikipedia.org/wiki/Real-time_web) (via [`AragonApp#state`](/docs/APP.md#state)).
