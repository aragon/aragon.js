import { from, merge } from 'rxjs'
import { filter, mergeMap, materialize } from 'rxjs/operators'
import { signals } from '@aragon/rpc-messenger'

export function createResponse ({ request: { id } }, { error, value = null, kind }) {
  if (kind === 'C') {
    return { id, payload: signals.COMPLETE }
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
     * - if the observable emits, emit a Notification of kind 'N' (next) with a value property
     * - if the observable rejects, emit a Notification of kind 'E' with an error property
     * - if the observable completes, emit a Notification of kind 'C' (complete)
     */
    mergeMap(
      ({ request, proxy, wrapper }) => {
        return from(handler(request, proxy, wrapper)).pipe(materialize())
      },
      createResponse
    ),
    // TODO: instead of filtering, log if a payload is undefined
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
export { default as cache } from './cache'
export { default as describeScript } from './describe-script'
export { default as describeTransaction } from './describe-transaction'
export { default as getApps } from './get-apps'
export { default as network } from './network'
export { default as path } from './path'
export { default as guiStyle } from './gui-style'
export { default as trigger } from './trigger'
export { default as web3Eth } from './web3-eth'

export { default as intent } from './intent'
export { default as call } from './call'
export { default as signMessage } from './sign-message'
export { default as events } from './events'
export { default as pastEvents } from './past-events'

export { intent as externalIntent } from './external'
export { call as externalCall } from './external'
export { events as externalEvents } from './external'
export { pastEvents as externalPastEvents } from './external'

export { default as addressIdentity } from './address-identity'
export { default as appIdentifier } from './app-identifier'
export { default as searchIdentities } from './search-identities'
