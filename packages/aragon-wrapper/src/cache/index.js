import { Subject, concat, race } from 'rxjs'
import { filter, pluck } from 'rxjs/operators'
import localforage from 'localforage'
import memoryStorageDriver from 'localforage-memoryStorageDriver'
import { getConfiguration } from '../configuration'
import * as configurationKeys from '../configuration/keys'

/**
 * A persistent cache on browser environments, preferring IndexedDB when available.
 * Falls back to an in-memory cache on node environments.
 *
 * @param {string} prefix
 *        String prefix to use for the cache
 * @param {Object} [options]
 *        Options
 * @param {boolean} [options.forceLocalStorage]
 *        Require the cache to downgrade to localstorage even if IndexedDB is available
 */
export default class Cache {
  static cacheTracker

  static initCacheTracker = async () => {
    if(!Cache.cacheTracker) {
      Cache.cacheTracker = new Cache(configurationKeys.CACHE_TRACKER_PREFIX)
      await Cache.cacheTracker.init()
    }
  }

  static getSavedCaches = async () => {
    const savedCaches = await Cache.cacheTracker.get(configurationKeys.CACHE_TRACKER_CACHES_KEY)
    return Array.from(new Set(savedCaches)).filter(c => !!c)
  }

  static trackNewCache = async (prefix) => {
    if(!Cache.cacheTracker) {
      await Cache.initCacheTracker()
    }

    const savedCaches = await this.getSavedCaches()
    if(savedCaches[0]) {
      await Cache.cacheTracker.set(configurationKeys.CACHE_TRACKER_CACHES_KEY, [...savedCaches, prefix])
    } else {
      await Cache.cacheTracker.set(configurationKeys.CACHE_TRACKER_CACHES_KEY, [prefix])
    }
  }

  static clearAllCaches = async () => {
    if(!Cache.cacheTracker) {
      await Cache.initCacheTracker()
    }

    const savedCaches = await this.getSavedCaches()

    for(let savedCache of savedCaches) {
      try {
        const instance = new Cache(savedCache)
        await instance.init(false)
        await instance.clear()
        await instance.db.dropInstance()
      } catch(e) {
        console.log(e)
      }
    }
  }

  #trackedKeys = new Set()

  constructor (prefix) {
    this.prefix = prefix
    const forceLocalStorage = getConfiguration(configurationKeys.FORCE_LOCAL_STORAGE)
    this.drivers = forceLocalStorage
      ? [localforage.LOCALSTORAGE, memoryStorageDriver]
      : [localforage.INDEXEDDB, localforage.LOCALSTORAGE, memoryStorageDriver]
  }

  async init (track = true) {
    // Set up the changes observable
    this.changes = new Subject()

    // Set up cache DB
    this.db = localforage.createInstance({
      driver: this.drivers,
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

    if(track) {
      await Cache.trackNewCache(this.prefix)
    }
    
  }

  async set (key, value) {
    await this.db.setItem(
      key,
      value
    )

    this.changes.next({ key, value })
  }

  async get (key, defaultValue = null) {
    // If we access a key without data the promise resolve but value is null
    const value = await this.db.getItem(key)
    return value || defaultValue
  }

  async getAll () {
    const all = {}
    await this.db.iterate((value, key) => {
      all[key] = value
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
