import { BehaviorSubject } from 'rxjs'
import { first } from 'rxjs/operators'

function ensureContext (apps, appAddress, context) {
  let app = apps.get(appAddress)
  if (!app) {
    app = new Map()
    apps.set(appAddress, app)
  }

  let appContext = app.get(context)
  if (!appContext) {
    appContext = new BehaviorSubject(null)
    app.set(context, appContext)
  }

  return appContext
}

export default class AppContextPool {
  #apps = new Map()

  hasApp (appAddress) {
    return this.#apps.has(appAddress)
  }

  async get (appAddress, context) {
    const app = this.#apps.get(appAddress)
    if (!app || !app.has(context)) {
      return null
    }
    return app.get(context).pipe(first()).toPromise()
  }

  observe (appAddress, context) {
    const appContext = ensureContext(this.#apps, appAddress, context)
    return appContext
  }

  set (appAddress, context, value) {
    const appContext = ensureContext(this.#apps, appAddress, context)
    appContext.next(value)
  }
}
