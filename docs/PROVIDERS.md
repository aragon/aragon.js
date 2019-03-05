# Providers

## Import

Providers are usually being imported from `@aragon/app` or `@aragon/wrapper`.

### ES6

```js
import { providers } from '@aragon/app'
import { providers } from '@aragon/wrapper'
```

### ES5 (CommonJS)

```js
const providers = require('@aragon/app').providers
const providers = require('@aragon/wrapper').providers
```

A provider is used to send and receive messages between the wrapper and the app.

## MessagePortMessage

A provider communicates through the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage). It is suitable to use in background scripts since WebWorkers are natively compatible with the MessageChannel API.

**Parameters**

1. [`target`] (`Object`): The object (that implements the [MessageChannel PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage)) to send messages to. (optional, default `self`)

## WindowMessage

A provider that communicates through the [Window PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).  It is suitable to use in front-ends connected through an iframe by passing [window.parent](https://developer.mozilla.org/en-US/docs/Web/API/Window/parent).

**Example**
```
const provider = new WindowMessage(window.parent)
```

**Parameters**

1. [`target`] (`Object`): The object (that implements the [Window PostMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)) to send messages to.
