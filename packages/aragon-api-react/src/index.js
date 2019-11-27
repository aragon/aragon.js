import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
} from 'react'
import Aragon, { providers } from '@aragon/api'

const warn = (...params) => {
  // Warn in dev mode only
  if (process.env.NODE_ENV === 'development') {
    console.warn(...params)
  }
}

const postMessage = (name, value) => {
  window.parent.postMessage({ from: 'app', name, value }, '*')
}

const requestMenu = () => {
  warn(
    'api-react: "requestMenu" is deprecated and is a noop. It can safely be removed from your codebase.'
  )
}

const AragonApiContext = createContext()

function AragonApi({
  children,
  reducer = state => (state === null ? {} : state),
  onMessage = () => {},
}) {
  const [api, setApi] = useState(null)
  const [appState, setAppState] = useState(null)
  const [connectedAccount, setConnectedAccount] = useState('')
  const [currentApp, setCurrentApp] = useState(null)
  const [installedApps, setInstalledApps] = useState([])
  const [network, setNetwork] = useState(null)
  const [path, setPath] = useState('/')
  const [guiStyle, setGuiStyle] = useState({ appearance: 'light', theme: null })
  const [requestPath, setRequestPath] = useState(null)

  useEffect(() => {
    const api = new Aragon(new providers.WindowMessage(window.parent))
    setApi(api)
    setRequestPath(() => path => api.requestPath(path).toPromise())
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

    let cancelled = false
    let subscribers = []

    const handleMessage = ({ data } = {}) => {
      if (!data || data.from !== 'wrapper') {
        return
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

          // installed apps
          api.installedApps().subscribe(apps => setInstalledApps(apps || [])),

          // path
          api.path().subscribe(path => setPath(path || '/')),

          // GUI style
          api.guiStyle().subscribe(guiStyle => setGuiStyle(guiStyle)),
        ]

        api
          .currentApp()
          .toPromise()
          .then(currentApp => {
            if (!cancelled) {
              setCurrentApp(currentApp || null)
            }
          })

        postMessage('ready', true)
      }

      onMessage(data.name, data.value)
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      cancelled = true
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
        currentApp,
        installedApps,
        network,
        path,
        requestPath,
        guiStyle,

        // reducer(null) is called to get the initial state
        appState: appState === null ? reducer(null) : appState,

        // Deprecated
        displayMenuButton: false,
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
  _sendMessage: postMessage,

  // Deprecated
  requestMenu,
})

// direct access hooks
const useApi = () => getAragonApiData('useApi()').api
const useAppState = () => getAragonApiData('useAppState()').appState
const useConnectedAccount = () =>
  getAragonApiData('useConnectedAccount()').connectedAccount
const useCurrentApp = () => getAragonApiData('useCurrentApp()').currentApp
const useInstalledApps = () => getAragonApiData('useInstalledApps()').installedApps
const useNetwork = () => getAragonApiData('useNetwork()').network
const usePath = () => {
  const { path, requestPath } = getAragonApiData('usePath()')
  return [path, requestPath]
}
function useGuiStyle() {
  return getAragonApiData('useGuiStyle()').guiStyle
}

// Deprecated
const useMenuButton = () => {
  warn('api-react: "useMenuButton" is deprecated. It can safely be removed from your codebase.')

  return [
    getAragonApiData('useMenuButton()').displayMenuButton,
    requestMenu,
  ]
}

export {
  AragonApi,
  AragonApiContext as _AragonApiContext,
  useApi,
  useAppState,
  useAragonApi,
  useConnectedAccount,
  useCurrentApp,
  useInstalledApps,
  useNetwork,
  usePath,
  useGuiStyle,
  // Deprecated
  useMenuButton,
}
