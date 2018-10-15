import low from 'lowdb'
import Memory from 'lowdb/adapters/Memory'
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
      // const FileAsync = require('lowdb/adapters/FileAsync')

      // adapter = new FileAsync(
      //   path.resolve(
      //     os.homedir(), '.aragon', 'cache.json'
      //   )
      // )
      adapter = new Memory()
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

  async set (key, value) {
    // Some lowdb adapters are synchronous while others are asynchronous so
    // let's always wrap it in a promise
    await Promise.resolve(this.db.set(
      this.getCacheKeyPath(key),
      value
    ).write())

    this.changes.next({ key, value })
  }

  get (key, defaultValue) {
    return this.db.get(
      this.getCacheKeyPath(key)
    ).value() || defaultValue
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
   * @param  {*}      defaultValue
   * @return {Observable}
   */
  observe (key, defaultValue) {
    return this.changes
      .filter((change) => change.key === key)
      .map((change) => change.value)
      .startWith(this.get(key, defaultValue))
  }
}
