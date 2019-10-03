import { BehaviorSubject, Subject } from 'rxjs'

const contextInstantiators = {
  path: () => new BehaviorSubject(null),
  trigger: () => new Subject()
}

class AppContext {
  constructor (appAddress) {
    this.appAddress = appAddress

    Object.entries(contextInstantiators).forEach(([context, instantiator]) => {
      this[context] = instantiator()
    })
  }
  get (context) {
    if (!this[context]) {
      throw new Error(`Could not find internal context '${context}' on ${this.appAddress}`)
    }
    return this[context]
  }
}

export const APP_CONTEXTS = Object.keys(contextInstantiators).reduce((contexts, context) => {
  contexts[context.toUpperCase()] = context
  return contexts
}, {})

export default class AppContextPool {
  #appContexts = new Map()

  hasApp (appAddress) {
    return this.#appContexts.has(appAddress)
  }

  get (appAddress, context) {
    let appContext = this.#appContexts.get(appAddress)
    if (!appContext) {
      appContext = new AppContext()
      this.#appContexts.set(appAddress, appContext)
    }

    return appContext.get(context)
  }

  set (appAddress, context, value) {
    this.get(appAddress, context).next(value)
  }
}
