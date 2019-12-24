import { from, merge } from 'rxjs'
import { filter, mergeMap, materialize } from 'rxjs/operators'
import { signals } from '@aragon/rpc-messenger'

const METHOD_HANDLERS = new Map([

  // Generic handlers
  ['accounts', 'accounts'],
  ['cache', 'cache'],
  ['describe_script', 'describeScript'],
  ['describe_transaction', 'describeTransaction'],
  ['get_apps', 'getApps'],
  ['network', 'network'],
  ['path', 'path'],
  ['gui_style', 'guiStyle'],
  ['trigger', 'trigger'],
  ['web3_eth', 'web3Eth'],

  // Contract handlers
  ['intent', 'intent'],
  ['call', 'call'],
  ['sign_message', 'signMessage'],
  ['events', 'events'],
  ['past_events', 'pastEvents'],

  // External contract handlers
  ['external_call', 'externalCall'],
  ['external_events', 'externalEvents'],
  ['external_intent', 'externalIntent'],
  ['external_past_events', 'externalPastEvents'],

  // Identity handlers
  ['identify', 'appIdentifier'],
  ['address_identity', 'addressIdentity'],
  ['search_identities', 'searchIdentities']
])

export function createResponse ({ request: { id } }, { error, value = null, kind }) {
  if (kind === 'C') {
    return { id, payload: signals.COMPLETE }
  }

  if (kind === 'E') {
    return { id, payload: error || new Error() }
  }

  return { id, payload: value }
}

export function createRequestHandler (request$, handlers) {

  // Send request to handler and return response
  return request$.pipe(
    /**
     * Turn the promise returned by the handler into an observable and materialize it, i.e:
     * - if the observable emits, emit a Notification of kind 'N' (next) with a value property
     * - if the observable rejects, emit a Notification of kind 'E' with an error property
     * - if the observable completes, emit a Notification of kind 'C' (complete)
     */
    mergeMap(
      ({ request, proxy, wrapper }) => {
        const handler = handlers[METHOD_HANDLERS.get(request.method)]
        return handler
          ? from(handler(request, proxy, wrapper)).pipe(materialize())
          : from([])
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
