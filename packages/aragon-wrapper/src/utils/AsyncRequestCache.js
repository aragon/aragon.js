/**
 * A cache to deduplicate async requests.
 */
export default class AsyncRequestCache {
  #cache = new Map()
  #requestFn

  /**
   * Create a new AsyncRequestCache that will use `requestFn` when requesting each key
   *
   * @param  {function} requestFn Async function for requesting each key
   */
  constructor (requestFn) {
    this.#requestFn = requestFn
  }

  /**
   * Check if the `key` is available in the cache
   *
   * @param  {string} key Key to check
   * @return {boolean} If key is in the cache
   */
  has (key) {
    return this.#cache.has(key)
  }

  /**
   * Request `key`, using previous result if cached.
   * Resets the cache for `key` if the request was not successful.
   *
   * @param  {string} key Key to request
   * @param  {boolean} [invalidate] Invalidate any previous requests
   * @return {Promise<*>} Request result
   */
  request (key, invalidate) {
    if (!invalidate && this.has(key)) {
      return this.#cache.get(key)
    }
    const request = Promise.resolve(this.#requestFn(key))
      .catch((err) => {
        this.#cache.delete(key)
        throw err
      })
    this.#cache.set(key, request)
    return request
  }
}
