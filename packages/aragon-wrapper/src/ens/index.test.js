import test from 'ava'
import Web3 from 'web3'
import * as ens from './'

test.beforeEach((t) => {
  t.context.provider = new Web3.providers.HttpProvider('https://mainnet.infura.io')
})

test('should resolve names (nobodywantsthisdomain.eth)', (t) => {
  return t.notThrows(() => ens.resolve('nobodywantsthisdomain.eth', {
    provider: t.context.provider,
    network: 1
  }))
})

test('should resolve nodes', (t) => {
  return t.notThrows(() => ens.resolve('0x184c792a4f08913715911620c811cf60210bf2a6731643aa9c1d5ed936d90b35', {
    provider: t.context.provider,
    network: 1
  }))
})
