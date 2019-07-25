import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react'
import Aragon, { providers } from '@aragon/api'

const postMessage = (name, value) => {
  window.parent.postMessage({ from: 'app', name, value }, '*')
}

const requestMenu = () => {
  postMessage('requestMenu', true)
}

const requestPath = (path, appId) => {
  postMessage('requestPath', [path, appId])
}

const AragonApiContext = createContext()

function AragonApi({
  children,
  reducer = state => (state === null ? {} : state),
  onMessage = () => {},
}) {
  const [api, setApi] = useState(null)
  const [connectedAccount, setConnectedAccount] = useState('')
  const [network, setNetwork] = useState(null)
  const [appState, setAppState] = useState(null)
  const [displayMenuButton, setDisplayMenuButton] = useState(false)
  const [path, setPath] = useState('/')

  useEffect(() => {
    setApi(new Aragon(new providers.WindowMessage(window.parent)))
  }, [])

  useEffect(() => {
    if (AragonApi._mounted) {
      throw new Error(
        'AragonApi has been declared more than once. Please ensure ' +
          'that you only have one instance in your application.'
      )
    }

    AragonApi._mounted = true
    return () => {
      AragonApi._mounted = false
    }
  }, [])

  useEffect(() => {
    if (!api) return

    let subscribers = []

    const handleMessage = ({ data } = {}) => {
      if (!data || data.from !== 'wrapper') {
        return
      }

      if (data.name === 'displayMenuButton') {
        setDisplayMenuButton(data.value)
      }

      if (data.name === 'ready') {
        subscribers = [
          // app state
          api.state().subscribe(state => setAppState(reducer(state))),

          // account
          api
            .accounts()
            .subscribe(accounts => setConnectedAccount(accounts[0] || '')),

          // network
          api.network().subscribe(network => setNetwork(network || null)),

          // path
          api.path().subscribe(path => setPath(path)),
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
  }, [api, reducer])

  // We are only using createElement() once so let’s use it directly rather
  // than the JSX syntax, so we avoid adding a babel transform for it.
  return createElement(
    AragonApiContext.Provider,
    {
      value: {
        api,
        connectedAccount,
        network,
        displayMenuButton,
        path,
        setPath,

        // reducer(null) is called to get the initial state
        appState: appState === null ? reducer(null) : appState,
      },
    },
    children
  )
}

function getAragonApiData(hookName) {
  const aragonApiData = useContext(AragonApiContext)

  if (aragonApiData === undefined) {
    throw new Error(
      `You used ${hookName} in a component that is not a descendant of ` +
        '<AragonApi />. Please declare this component (in the top ' +
        'level component of your app for example).'
    )
  }

  return aragonApiData
}

const useAragonApi = () => ({
  ...getAragonApiData('useAragonApi()'),
  requestMenu,
  requestPath,
  _sendMessage: postMessage,
})

// direct access hooks
const useApi = () => getAragonApiData('useApi()').api
const useAppState = () => getAragonApiData('useAppState()').appState
const useConnectedAccount = () =>
  getAragonApiData('useConnectedAccount()').connectedAccount
const useMenuButton = () => [
  getAragonApiData('useMenuButton()').displayMenuButton,
  requestMenu,
]
const useNetwork = () => getAragonApiData('useNetwork()').network
const usePath = () => [getAragonApiData('usePath()').path, requestPath]

export {
  AragonApi,
  AragonApiContext as _AragonApiContext,
  useApi,
  useAppState,
  useAragonApi,
  useConnectedAccount,
  useMenuButton,
  useNetwork,
  usePath,
}
