import { from, merge } from 'rxjs'
import { filter, mergeMap, materialize } from 'rxjs/operators'

export function createResponse ({ request: { id } }, { error, value = null }) {
  if (error) {
    return { id, payload: error }
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
    mergeMap(
      ({ request, proxy, wrapper }) => from(handler(request, proxy, wrapper)),
      materialize(),
      createResponse
    ),
    filter((response) => response.payload !== undefined || response.error !== undefined)
  )
}

export function combineRequestHandlers (...handlers) {
  return merge(
    ...handlers
  )
}

// Export request handlers
export { default as cache } from './cache'
export { default as events } from './events'
export { default as intent } from './intent'
export { default as call } from './call'
export { default as notifications } from './notifications'
export { call as externalCall } from './external'
export { events as externalEvents } from './external'
export { default as identifier } from './identifier'
export { default as accounts } from './accounts'
export { default as describeScript } from './describe-script'
export { default as web3Eth } from './web3-eth'
