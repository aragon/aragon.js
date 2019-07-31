export function debug (...params) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(...params)
  }
}
