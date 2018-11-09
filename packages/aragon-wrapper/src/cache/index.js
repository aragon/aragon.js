import localforage from 'localforage'
import { Subject } from 'rxjs/Rx'

/**
 * A cache.
 */
export default class Cache {
  constructor (prefix) {
    this.prefix = prefix

    // Set up cache DB
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
    }

    // Set up the changes observable
    this.changes = new Subject()

    // Set DB
    this.db = localforage.createInstance({
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      name: 'localforage'
    })
  }

  getCacheKeyPath (key) {
    return `${this.prefix}.${key}`
  }

  set (key, value) {
    this.db.setItem(
      this.getCacheKeyPath(key),
      value
    ).then(function (v) {
      this.changes.next({ key, v })
    }, function (err) {
      console.error(err)
    })
  }

  get (key, defaultValue) {
    // If we access a key without data the promise resolve but value is null
    this.db.getItem(
      this.getCacheKeyPath(key)
    ).then(function (value = defaultValue) {
      return value
    }, function (err) {
      console.error(err)
    })
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
