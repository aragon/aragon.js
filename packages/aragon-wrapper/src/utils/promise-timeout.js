// https://italonascimento.github.io/applying-a-timeout-to-your-promises/
export default function promiseTimeout (promise, ms) {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`Promise timed out in ${ms} ms`))
    }, ms)
  })

  // Returns a race between our timeout and the passed in promise
  return Promise.race([
    promise,
    timeout
  ])
}
