import test from 'ava'

import { LocalIdentityProvider } from './index'

const ADDRESS_MIXED_CASE = '0x332462D19fC398189844E6F23685e19c21F5B265'
const ADDRESS_LOWER_CASE = '0x332462d19fc398189844e6f23685e19c21f5b265'
const SECOND_ADDRESS = '0x552462d19fc398189844e6f23685e19c21f5b200'
const THIRD_ADDRESS = '0x7d77398078079B0D57ed872319F26D29B5405eb8'

test.beforeEach(async t => {
  t.context.localIdentityProvider = new LocalIdentityProvider()
  await t.context.localIdentityProvider.init()
})

test.afterEach(async t => {
  t.context.localIdentityProvider.clear() // clear because its storage is global
})

// The tests run serially to prevent leaks between tests
// because instances of LocalIdentityProvider rely on the
// same underlying cache storage key.
test.serial('should modify a local identity', async t => {
  t.plan(1)
  const provider = t.context.localIdentityProvider
  const expectedName = 'vitalik'

  await provider.modify(ADDRESS_MIXED_CASE, { name: expectedName })
  const identityMetadata = await provider.resolve(ADDRESS_MIXED_CASE)
  t.is(identityMetadata.name, expectedName)
})

test.serial('should throw an error when no name is given', async t => {
  t.plan(2)
  const provider = t.context.localIdentityProvider

  const error = await t.throwsAsync(async () => {
    await provider.modify(ADDRESS_MIXED_CASE)
  }, {
    instanceOf: Error,
    message: 'name is required when modifying a local identity'
  })

  t.is(error.message, 'name is required when modifying a local identity')
})

test.serial('should return null when resolving non existent local identity', async t => {
  t.plan(1)
  const provider = t.context.localIdentityProvider

  const identityMetadata = await provider.resolve(ADDRESS_LOWER_CASE)
  t.is(identityMetadata, null)
})

test.serial('should be case insensitive when resolving', async t => {
  t.plan(1)
  const provider = t.context.localIdentityProvider
  const expectedName = 'vitalik'

  await provider.modify(ADDRESS_MIXED_CASE, { name: expectedName })
  const identityMetadata = await provider.resolve(ADDRESS_LOWER_CASE)

  t.is(identityMetadata.name, expectedName)
})

test.serial('should be case insensitive when modifying', async t => {
  t.plan(2)
  const provider = t.context.localIdentityProvider
  const expectedName = 'vitalik'
  const overwrittenName = 'gavin'

  await provider.clear()
  await provider.modify(ADDRESS_MIXED_CASE, { name: expectedName })
  await provider.modify(ADDRESS_LOWER_CASE, { name: overwrittenName })

  const firstIdentityMetadata = await provider.resolve(ADDRESS_MIXED_CASE)
  const secondidentityMetadata = await provider.resolve(ADDRESS_LOWER_CASE)

  t.is(firstIdentityMetadata.name, overwrittenName)
  t.is(secondidentityMetadata.name, overwrittenName)
})

test.serial('should always have createAt in metadata', async t => {
  t.plan(1)
  const provider = t.context.localIdentityProvider
  const name = 'vitalik'
  await provider.modify(ADDRESS_MIXED_CASE, { name })
  const identityMetadata = await provider.resolve(ADDRESS_LOWER_CASE)
  t.truthy(identityMetadata.createdAt)
})

test.serial('clear clears the local cache', async t => {
  t.plan(3)
  const provider = t.context.localIdentityProvider
  const name = 'vitalik'
  await provider.modify(ADDRESS_MIXED_CASE, { name })
  await provider.modify(SECOND_ADDRESS, { name })
  await provider.modify(THIRD_ADDRESS, { name })

  t.truthy(await provider.resolve(ADDRESS_MIXED_CASE))
  t.truthy(await provider.resolve(SECOND_ADDRESS))
  t.truthy(await provider.resolve(THIRD_ADDRESS))
})

test.serial('getAll will return all local identities with lowercase address keys', async t => {
  t.plan(7)
  const provider = t.context.localIdentityProvider
  const name = 'vitalik'
  await provider.modify(ADDRESS_MIXED_CASE, { name })
  await provider.modify(SECOND_ADDRESS, { name })
  await provider.modify(THIRD_ADDRESS, { name })

  const all = await provider.getAll()

  t.is(Object.keys(all).length, 3)
  t.is(all[ADDRESS_LOWER_CASE].name, name)
  t.is(all[SECOND_ADDRESS].name, name)
  t.is(all[THIRD_ADDRESS.toLowerCase()].name, name)

  t.truthy(all[ADDRESS_LOWER_CASE].createdAt)
  t.truthy(all[SECOND_ADDRESS].createdAt)
  t.truthy(all[THIRD_ADDRESS.toLowerCase()].createdAt)
})

test.serial('search should return an array of results of freely matching identities', async t => {
  // t.plan(7)
  const provider = t.context.localIdentityProvider
  const identities = [
    [ '0x1110000000000000000000000000000000000001', 'James Baldwin' ],
    [ '0x1120000000000000000000000000000000000001', 'David Deutsch' ],
    [ '0x3000000000000000000000000000000000000001', 'Isaac Newton' ],
    [ '0x4000000000000000000000000000000000000001', 'Henry Newton' ],
    [ '0x6000000000000000000000000000000000000001', 'Marie Curie' ],
    [ '0x7000000000000000000000000000000000000001', 'Winnie the Pooh' ],
    [ '0x8900000000088888870000000000000000000001', 'Richard Feynman' ],
    [ '0x0900000000000000000000000000000000000001', 'Aristotle' ],
    [ '0xa000000000000000000000000000000000000002', '0x3b The Who' ],
    [ '0x3b00000000000000000000000000000000000002', 'The man who sold the world? (Nirvana not $Bowie)' ]
  ]
  // map of search terms to expected count and names
  const searchTermToExpectation = {
    'ne': { names: [] },
    '0x': { names: [] },
    'new': { names: [ 'Isaac Newton', 'Henry Newton' ] },
    'win': { names: [ 'James Baldwin', 'Winnie the Pooh' ] },
    'jam': { names: [ 'James Baldwin' ] },
    'ari': { names: [ 'Marie Curie', 'Aristotle' ] },
    '0x09': { names: [ 'Aristotle' ] },
    '0x11': { names: [ 'James Baldwin', 'David Deutsch' ] },
    '0x3b': { names: [ '0x3b The Who', 'The man who sold the world? (Nirvana not $Bowie)' ] },
    'who': { names: [ '0x3b The Who', 'The man who sold the world? (Nirvana not $Bowie)' ] }
  }
  // save test identities
  for (const [address, name] of identities) {
    await provider.modify(address, { name })
  }

  for (const [searchTerm, expectedResult] of Object.entries(searchTermToExpectation)) {
    const results = await provider.search(searchTerm)
    const resultNames = results.map(({ name }) => name)
    t.is(results.length, expectedResult.names.length, `Matching the result count when searching for ${searchTerm}`)
    t.deepEqual(resultNames, expectedResult.names)
  }
})
