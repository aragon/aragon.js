import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react'
import Aragon, { providers } from '@aragon/api'
import { map } from 'rxjs/operators'

const postMessage = (name, value) => {
  window.parent.postMessage({ from: 'app', name, value }, '*')
}

const requestMenu = () => {
  postMessage('requestMenu', true)
}

const AragonApiContext = createContext()

function ConnectAragonApi({
  children,
  reducer = state => (state === null ? {} : state),
  onMessage = () => {},
}) {
  const [api, setApi] = useState(null)
  const [connectedAccount, setConnectedAccount] = useState('')
  const [network, setNetwork] = useState('')
  const [appState, setAppState] = useState(null)
  const [displayMenuButton, setDisplayMenuButton] = useState(false)

  useEffect(() => {
    setApi(new Aragon(new providers.WindowMessage(window.parent)))
  }, [])

  useEffect(() => {
    if (ConnectAragonApi._mounted) {
      throw new Error(
        'ConnectAragonApi has been declared more than once. Please ensure ' +
          'that you only have one instance in your application.'
      )
    }

    ConnectAragonApi._mounted = true
    return () => {
      ConnectAragonApi._mounted = false
    }
  }, [])

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
            .pipe(map(state => reducer(state)))
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
  }, [api, reducer])

  return createElement(
    AragonApiContext.Provider,
    {
      value: {
        api,
        connectedAccount,
        network,
        displayMenuButton,

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
        '<ConnectAragonApi />. Please declare this component (in the top ' +
        'level component of your app for example).'
    )
  }

  return aragonApiData
}

const useAragonApi = () => ({
  ...getAragonApiData('useAragonApi()'),
  requestMenu,
  _sendMessage: postMessage,
})

// direct access hooks
const useConnectedAccount = () =>
  getAragonApiData('useConnectedAccount()').connectedAccount
const useNetwork = () => getAragonApiData('useNetwork()').network
const useApi = () => getAragonApiData('useApi()').api
const useMenuButton = () => {
  const { displayMenuButton, requestMenu } = getAragonApiData('useMenuButton()')
  return [displayMenuButton, requestMenu]
}

export {
  AragonApiContext as _AragonApiContext,
  ConnectAragonApi,
  useApi,
  useAragonApi,
  useConnectedAccount,
  useMenuButton,
  useNetwork,
}
