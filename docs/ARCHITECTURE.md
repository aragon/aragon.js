# Architecture of Aragon apps and their communication channels

## Aragon Background Tasks

This spec defines how the Aragon client should handle application background tasks.

### Motivation

Applications should be able to synchronise state and send notifications even if the application is not open.

### Defining background tasks

Applications are already shipped with a standard web manifest (`manifest.json`), and the specification for web manifests also specify how to run background tasks:

> Use the background key to include one or more background scripts, and optionally a background page in your extension.
>
> Background scripts are the place to put code that needs to maintain long-term state, or perform long-term operations, independently of the lifetime of any particular web pages or browser windows.
>
> [...]
>
> (The `scripts` key is) an array of strings, each of which is a path to a JavaScript source. The path is relative to the manifest.json file itself. These are the background scripts that will be included in the extension.
>
> – [Mozilla Developer Network](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/manifest.json/background)

### Executing background tasks

Background tasks for Aragon applications work in exactly the same way, with two modifications: background pages are ignored, and only the first background script is loaded.

### Flow

1. The application is registered in the wrapper by `@aragon/wrapper`
2. The wrapper should check if the `manifest.json` defines any background workers
3. If any background workers are defined, the wrapper should execute the defined script in a web worker.

### Best Practices

Background workers should ideally handle event logs and reduce them to an application state. Furthermore, web workers should send notifications in response to events, if necessary.

The front-end portion of Aragon applications should only read the computed state from the web worker, and should not compute state themselves.

## Aragon Sandbox RPC

> **Legend**
>
> - ↔ Data is passed between the wrapper and the client.
> - → Data is passed from the client to the wrapper.
> - ← Data is passed from the wrapper to the client.

### ↔ `events`

Sets up a subscription for events on the proxy attached to the current application.

The wrapper will send events to the listener as they are caught in the event loop until the client unsubscribes.

#### Request

**Parameters**: _None_

#### Response

**Result**: `[event: EthereumEvent]`

### ↔ `call`

Performs a `call`, i.e. simulates a transaction without mutating state. Identical to `eth_call`.

#### Request

**Parameters**: `[method: string, ...params: any]`

#### Response

**Result**: `[returnValues: object]` or an error

### ↔ `intent`

Publishes an intent to the wrapper.

The wrapper will process the intent and calculate a transaction path. If no path is found (i.e. the calling entity does not have the necessary permissions) then a JSON-RPC error is sent back.

If a transaction path is found, two things can happen:

- The transaction is signed and the resulting transaction hash is sent back to the client as a response
- The transaction is rejected (i.e. not signed) and a JSON-RPC error is sent back as a response

#### Request

**Parameters**: `[method: string, ...params: any]`

#### Response

**Result**: `[txHash: string]` or an error

### → `notification`

Creates a notification.

A notification can optionally include an application context, which will be sent back to the application if the notification is clicked (via. the `context` RPC).

No response is sent back to the client.

#### Request

**Parameters**: `[timestamp: number, body: string, context: ?any]`

#### Response

_None_.

### ← `context`

Sends an application context to the client.

The interpretation of the application context is up to the client.

Application contexts can be used for shortcuts and notifications to trigger certain actions or views.

#### Request

_None_.

#### Response

**Result**: `[context: any]`

### ↔ `cache`

Reads or sets a key in the cache.

#### Request

**Parameters**: `[mode: "get" | "set", key: string, value: ?any]`

#### Response

**Result**: `[value: any]`
