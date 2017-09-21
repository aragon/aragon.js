import ganache from 'ganache-core'

export default (gasLimit = 50000000) => (t) => {
  // Set up provider w/ monkey patch needed for Web3 1.0.0
  const provider = ganache.provider({
    gasLimit
  })
  provider.send = provider.sendAsync

  t.context.provider = provider
}
