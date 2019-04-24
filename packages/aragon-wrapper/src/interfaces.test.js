import test from 'ava'
import sinon from 'sinon'
import { getAbi, getArtifact, getAppInfo, hasAppInfo } from './interfaces'
import { apmAppId } from './utils/apps'

test.afterEach.always(() => {
  sinon.restore()
})

test('interfaces: getAbi', async (t) => {
  t.plan(11)
  // arrange
  const availableABIs = [
    'aragon/ACL',
    'aragon/AppProxy',
    'aragon/ERCProxy',
    'aragon/Forwarder',
    'aragon/Kernel',
    'aragon/EVM Script Registry',
    'apm/APM Registry',
    'apm/Repo',
    'apm/ENS Subdomain Registrar',
    'standard/ERC20'
  ]
  // assert
  availableABIs.forEach(abiName => {
    const result = getAbi(abiName)
    t.true(Array.isArray(result), abiName)
  })

  const emptyResult = getAbi()
  t.is(emptyResult, null)
})

test('interfaces: getArtifact', async (t) => {
  t.plan(13)
  // arrange
  const availableArtifacts = [
    'aragon/ACL',
    'aragon/Kernel',
    'aragon/EVM Script Registry',
    'apm/APM Registry',
    'apm/Repo',
    'apm/ENS Subdomain Registrar'
  ]
  // assert
  availableArtifacts.forEach(artifactName => {
    const result = getArtifact(artifactName)
    t.true('functions' in result)
    t.true('roles' in result)
  })

  const emptyResult = getArtifact()
  t.is(emptyResult, null)
})

test('interfaces: getAppInfo', async (t) => {
  t.plan(29)
  // arrange
  const availableMappings = [
    ['aragon', [
      apmAppId('acl'),
      apmAppId('evmreg'),
      apmAppId('kernel')
    ]],
    ['apm', [
      apmAppId('apm-registry'),
      apmAppId('apm-repo'),
      apmAppId('apm-enssub'),
      apmAppId('apm-registry.open'),
      apmAppId('apm-repo.open'),
      apmAppId('apm-enssub.open')
    ]]
  ]
  // assert
  availableMappings.forEach(([namespace, appIds]) => {
    appIds.forEach((appId) => {
      const result = getAppInfo(appId, namespace)
      t.true(Array.isArray(result.abi))
      t.true('functions' in result)
      t.true('roles' in result)
    })
  })

  const emptyDueToUnknownMapping = getAppInfo(apmAppId('acl'), 'wrongNamespace')
  t.is(emptyDueToUnknownMapping, null)

  const emptyDueToUnknownApp = getAppInfo(apmAppId('wrongApp'), 'aragon')
  t.is(emptyDueToUnknownApp, null)
})

test('interfaces: hasAppInfo', async (t) => {
  const availableMappings = [
    ['aragon', [
      apmAppId('acl'),
      apmAppId('evmreg'),
      apmAppId('kernel')
    ]],
    ['apm', [
      apmAppId('apm-registry'),
      apmAppId('apm-repo'),
      apmAppId('apm-enssub'),
      apmAppId('apm-registry.open'),
      apmAppId('apm-repo.open'),
      apmAppId('apm-enssub.open')
    ]]
  ]
  // assert
  availableMappings.forEach(([namespace, appIds]) => {
    appIds.forEach((appId) => {
      t.true(hasAppInfo(appId, namespace))
    })
  })

  t.false(hasAppInfo(apmAppId('acl'), 'wrongNamespace'))
  t.false(hasAppInfo(apmAppId('wrongApp'), 'aragon'))
})
