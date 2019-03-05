import { Subject, concat, race } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'
import localforage from 'localforage'
import memoryStorageDriver from 'localforage-memoryStorageDriver'

/**
 * A cache.
 */
export default class Cache {
  #trackedKeys = new Set()

  constructor (prefix) {
    this.prefix = prefix
  }

  async init () {
    // Set up the changes observable
    this.changes = new Subject()

    // Set up cache DB
    this.db = localforage.createInstance({
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, memoryStorageDriver._driver],
      name: `localforage/${this.prefix}`
    })

    try {
      // Make sure localforage has settled down and is not waiting for anything else
      // before possibly setting new drivers
      await this.db.ready()
    } catch (err) {
      // If localforage isn't able to automatically connect to a driver
      // due to lack of support in the environment (e.g. node),
      // use an in-memory driver instead
      // TODO: this doesn't provide an persistent cache for node
      if (this.db.driver() === null) {
        await this.db.defineDriver(memoryStorageDriver)
        await this.db.setDriver(memoryStorageDriver._driver)
      }

      await this.db.ready()
    }
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

  async getAll () {
    const all = {}
    await this.db.iterate((value, key) => {
      all.key = value
    })
    return all
  }

  async remove (key) {
    await this.db.removeItem(key)
    this.changes.next({ key, value: null })
  }

  async clear () {
    await this.db.clear()

    for (const key of this.#trackedKeys) {
      this.changes.next({ key, value: null })
    }
  }

  /**
   * Observe the value of a key in cache over time
   *
   * @param  {string} key
   * @param  {*}      defaultValue
   * @return {Observable}
   */
  observe (key, defaultValue) {
    this.#trackedKeys.add(key)

    const getResult$ = this.get(key, defaultValue)
    const keyChange$ = this.changes.pipe(
      filter(change => change.key === key),
      pluck('value')
    )

    /*
     * There is an inherent race between `this.get()` and a new item being set
     * on the cache key. Note that `concat()` only subscribes to the next observable
     * **AFTER** the previous one ends (it doesn't buffer hot observables).
     *
     * Thus, we either want:
     *   - The concatenated result of `this.get()` and `this.changes`, if `this.changes`
     *     doesn't emit new items, or
     *   - Just `this.changes` since `this.get()` may be stale by the time it returns
     */
    return race(concat(getResult$, keyChange$), keyChange$)
  }
}
