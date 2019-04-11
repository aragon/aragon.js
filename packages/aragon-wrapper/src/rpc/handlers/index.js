import { from, merge } from 'rxjs'
import { filter, mergeMap, materialize } from 'rxjs/operators'

export function createResponse ({ request: { id } }, { error, value = null, kind }) {
  if (kind === 'C') {
    return {}
  }

  if (kind === 'E') {
    return { id, payload: error || new Error() }
  }

  return { id, payload: value }
}

export function createRequestHandler (request$, requestType, handler) {
  // Filter request types to match provided params
  const filteredRequest$ = request$.pipe(
    filter(({ request }) => request.method === requestType)
  )

  // Send request to handler and return response
  return filteredRequest$.pipe(
    /**
     * Turn the promise returned by the handler into an observable and materialize it, i.e:
     * - if the promise rejects emit a Notification of kind 'E' with an error property
     * - if the promise resolves emit a Notification of kind 'N' (next) with a value property AND
     * another one of kind 'C' (complete) which we should filter out
     */
    mergeMap(
      ({ request, proxy, wrapper }) => {
        return from(handler(request, proxy, wrapper)).pipe(materialize())
      },
      createResponse
    ),
    // filter empty responses caused by Notifications of kind 'C'
    filter((response) => response.payload !== undefined)
  )
}

export function combineRequestHandlers (...handlers) {
  return merge(
    ...handlers
  )
}

// Export request handlers
export { default as accounts } from './accounts'
export { default as addressIdentity } from './address-identity'
export { default as cache } from './cache'
export { default as call } from './call'
export { default as describeScript } from './describe-script'
export { call as externalCall } from './external'
export { events as externalEvents } from './external'
export { default as events } from './events'
export { default as identifier } from './identifier'
export { default as intent } from './intent'
export { default as network } from './network'
export { default as notifications } from './notifications'
export { default as web3Eth } from './web3-eth'
