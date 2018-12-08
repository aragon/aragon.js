import localforage from 'localforage'
import { Subject } from 'rxjs/Rx'
import { concat } from 'rxjs/observable/concat'

/**
 * A cache.
 */
export default class Cache {
  constructor (prefix) {
    this.prefix = prefix

    // if (typeof window === 'undefined') {
    //   // TODO: Support caching on the file system
    //   const path = require('path')
    //   const os = require('os')
    // }

    // Set up the changes observable
    this.changes = new Subject()

    // Set up cache DB
    this.db = localforage.createInstance({
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      name: `localforage/${this.prefix}`
    })
  }

  async set (key, value) {
    await this.db.setItem(
      key,
      value
    )

    this.changes.next({ key, value })
  }

  async get (key, defaultValue) {
    // If we access a key without data the promise resolve but value is null
    const value = await this.db.getItem(key)
    return value || defaultValue
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
    const keyChanges = this.changes
      .filter(change => change.key === key)
      .pluck('value')
    /*
     * If `get` takes longer than usual, and a new `set` finishes before then,
     * this.changes will emit new values, but they will be discarded. that's why
     * we use `concat` and not `merge`.
     */
    return concat(this.get(key, defaultValue), keyChanges)
  }
}
