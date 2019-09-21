import test from 'ava'
import Cache from '../cache'
import { of } from 'rxjs'

import { AddressBookIdentityProvider } from './index'
let apps, cache
test.before(async t => {
  apps = of([
    {
      appId: '0x32ec8cc9f3136797e0ae30e7bf3740905b0417b81ff6d4a74f6100f9037425de',
      proxyAddress: '0x0'
    },
    {
      appId: '0x123',
      proxyAddress: '0x1'
    },
    {
      appId: '0x32ec8cc9f3136797e0ae30e7bf3740905b0417b81ff6d4a74f6100f9037425de',
      proxyAddress: '0x11'
    }
  ])

  cache = new Cache('stubbedAddressBook')
  await cache.init()
  cache.set('0x0.state', { entries: [{ addr: '0x3', data: { name: 'testEntity' } }] })
  cache.set('0x11.state', { entries: [{ addr: '0x3', data: { name: 'testEntity2' } }] })
})

test.beforeEach(async t => {
  t.context.addressBookIdentityProvider = new AddressBookIdentityProvider(apps, cache)
  await t.context.addressBookIdentityProvider.init()
})

test('should resolve identity from first address book in app array', async t => {
  const provider = t.context.addressBookIdentityProvider
  const identityMetadata = await provider.resolve('0x3')
  t.is(identityMetadata.name, 'testEntity')
})

test('should resolve to null for non-existent identity', async t => {
  const provider = t.context.addressBookIdentityProvider
  const identityMetadata = await provider.resolve('0x9')
  t.is(identityMetadata, null)
})

test('should throw error on any modify attempt', async t => {
  const provider = t.context.addressBookIdentityProvider
  await t.throwsAsync(() => provider.modify('0x9', { name: 'newEntity' }))
})
