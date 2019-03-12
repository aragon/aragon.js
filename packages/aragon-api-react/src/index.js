import React, { useState, useEffect } from 'react'
import Aragon, { providers } from '@aragon/api'
import { map } from 'rxjs/operators'

function useAragonApi(
  appStateReducer = state => (state === null ? {} : state)
) {
  const [api, setApi] = useState(null)
  const [connectedAccount, setConnectedAccount] = useState('')
  const [network, setNetwork] = useState('')
  const [appState, setAppState] = useState(null)

  // On mount: instantiate Aragon().
  useEffect(() => {
    setApi(new Aragon(new providers.WindowMessage(window.parent)))
  }, [])

  // When `api` is set, listen to incoming messages.
  useEffect(() => {
    if (!api) return

    let subscribers

    const handleMessage = ({ data }) => {
      if (data.from !== 'wrapper') {
        return
      }
      if (data.name === 'ready') {
        subscribers = [
          // app state
          api
            .state()
            .pipe(map(state => appStateReducer(state)))
            .subscribe(state => setAppState(state)),

          // account
          api
            .accounts()
            .subscribe(accounts => setConnectedAccount(accounts[0] || '')),

          // network
          api.network().subscribe(network => setNetwork(network || '')),
        ]

        window.parent.postMessage(
          { from: 'app', name: 'ready', value: true },
          '*'
        )
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      subscribers.forEach(subscriber => subscriber.unsubscribe())
    }
  }, [api])

  return {
    api,
    network,
    connectedAccount,

    // appStateReducer(null) is called to get the initial state
    appState: appState === null ? appStateReducer(null) : appState,
  }
}

// render prop API
const AragonApi = ({ reducer, children }) => children(useAragonApi(reducer))

export { useAragonApi, AragonApi }
