import test from 'ava'
import sinon from 'sinon'
import { getAbi, getArtifact } from './interfaces'

test.afterEach.always(() => {
  sinon.restore()
})

test('interfaces: getAbi', async (t) => {
  t.plan(9)
  // arrange
  const availableABIs = [
    'aragon/ACL',
    'aragon/AppProxy',
    'aragon/ERCProxy',
    'aragon/Forwarder',
    'aragon/Kernel',
    'aragon/EVM Script Registry',
    'aragon/Repo',
    'standard/ERC20'
  ]
  // act
  availableABIs.map(abiName => {
    const result = getAbi(abiName)
    // assert
    t.true(Array.isArray(result))
  })

  const emptyResult = getAbi()
  t.is(emptyResult, null)
})

test('interfaces: getArtifact', async (t) => {
  t.plan(7)
  // arrange
  const availableArtifacts = [
    'aragon/ACL',
    'aragon/Kernel',
    'aragon/EVM Script Registry'
  ]
  // act
  availableArtifacts.map(artifactName => {
    const result = getArtifact(artifactName)
    // assert
    t.true('functions' in result)
    t.true('roles' in result)
  })

  const emptyResult = getArtifact()
  t.is(emptyResult, null)
})
