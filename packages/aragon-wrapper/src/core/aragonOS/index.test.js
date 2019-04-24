import test from 'ava'
import sinon from 'sinon'
import * as aragonOS from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('aragonOS: getKernelNamespace', async (t) => {
  t.plan(3)
  // arrange
  // soliditySha3('core')
  const coreNamespaceHash = '0xc681a85306374a5ab27f0bbc385296a54bcd314a1948b6cf61c4ea1bc44bb9f8'
  // act
  const result = aragonOS.getKernelNamespace(coreNamespaceHash)
  const emptyResult = aragonOS.getKernelNamespace()
  // assert
  t.is(result.hash, coreNamespaceHash)
  t.is(result.name, 'Core')
  t.is(emptyResult, null)
})

test('aragonOS: isAragonOsInternalApp', async (t) => {
  // arrange
  // namehash('acl.aragonpm.eth')
  const aclNamehash = '0xe3262375f45a6e2026b7e7b18c2b807434f2508fe1a2a3dfb493c7df8f4aad6a'
  // act
  const result = aragonOS.isAragonOsInternalApp(aclNamehash)
  const emptyResult = aragonOS.isAragonOsInternalApp()
  // assert
  t.true(result)
  t.false(emptyResult)
})

test('aragonOS: getAragonOsInternalAppInfo', async (t) => {
  t.plan(4)
  // arrange
  // namehash('acl.aragonpm.eth')
  const aclNamehash = '0xe3262375f45a6e2026b7e7b18c2b807434f2508fe1a2a3dfb493c7df8f4aad6a'
  // act
  const result = aragonOS.getAragonOsInternalAppInfo(aclNamehash)
  const emptyResult = aragonOS.getAragonOsInternalAppInfo()
  // assert
  t.is(result.name, 'ACL')
  t.true(Array.isArray(result.abi))
  t.is(result.isAragonOsInternalApp, true)
  t.is(emptyResult, null)
})
