import React, { useState, useEffect } from 'react'
import Aragon, { providers } from '@aragon/api'
import { map } from 'rxjs/operators'

const noop = () => {}

const defaultReducer = state => (state === null ? {} : state)

const postMessage = (name, value) => {
  window.parent.postMessage({ from: 'app', name, value }, '*')
}

const requestMenu = () => {
  postMessage('requestMenu', true)
}

function useAragonApi(appStateReducer = defaultReducer, options = {}) {
  const [api, setApi] = useState(null)
  const [connectedAccount, setConnectedAccount] = useState('')
  const [network, setNetwork] = useState('')
  const [appState, setAppState] = useState(null)
  const [displayMenuButton, setDisplayMenuButton] = useState(false)

  const onMessage = options._onMessage || noop

  // On mount: instantiate Aragon().
  useEffect(() => {
    setApi(new Aragon(new providers.WindowMessage(window.parent)))
  }, [])

  // When `api` is set, listen to incoming messages.
  useEffect(() => {
    if (!api) return

    let subscribers = []

    const handleMessage = ({ data }) => {
      if (data.from !== 'wrapper') {
        return
      }
      if (data.name === 'displayMenuButton') {
        setDisplayMenuButton(data.value)
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

        postMessage('ready', true)
      }

      onMessage(data.name, data.value)
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      subscribers.forEach(subscriber => subscriber.unsubscribe())
    }
  }, [api])

  return {
    // appStateReducer(null) is called to get the initial state
    appState: appState === null ? appStateReducer(null) : appState,
    api,
    network,
    connectedAccount,

    displayMenuButton,
    requestMenu,

    _sendMessage: postMessage,
  }
}

// render prop API
const AragonApi = ({ reducer, options, children }) =>
  children(useAragonApi(reducer, options))

export { useAragonApi, AragonApi }
