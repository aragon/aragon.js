import low from 'lowdb'
// import FileAsync from 'lowdb/adapters/FileAsync'
import LocalStorage from 'lowdb/adapters/LocalStorage'
import { Subject } from 'rxjs/Rx'

/**
 * A cache.
 */
export default class Cache {
  constructor (prefix) {
    this.prefix = prefix

    // Set up cache DB
    let adapter = null
    if (typeof window === 'undefined') {
      // TODO: Support caching on the file system
      // const path = require('path')
      // const os = require('os')
      // adapter = new FileAsync(
      //   path.resolve(
      //     os.homedir(), '.aragon', 'cache.json'
      //   )
      // )
    } else {
      adapter = new LocalStorage()
    }
    this.db = low(adapter)

    // Set default cache state
    this.db.defaults({}).write()

    // Set up the changes observable
    this.changes = new Subject()
  }

  getCacheKeyPath (key) {
    return `${this.prefix}.${key}`
  }

  set (key, value) {
    return this.db.set(
      this.getCacheKeyPath(key),
      value
    ).write()
      .then(() => this.changes.next({ key, value }))
  }

  get (key) {
    return this.db.get(
      this.getCacheKeyPath(key)
    ).value()
  }

  update (key, transition) {
    return this.set(key,
      transition(this.get(key))
    )
  }

  /**
   * Observe the value of a key in cache over time
   *
   * @memberof Cache
   * @param  {string} key
   * @return {Observable}
   */
  observe (key) {
    return this.changes.filter(
      (change) => change.key === key
    ).map(
      (change) => change.value
    )
  }
}
