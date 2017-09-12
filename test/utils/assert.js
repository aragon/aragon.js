import test from 'ava'
import assert from '../../src/utils/assert'

test('assert.ok', (t) => {
  const error = t.throws(() => {
    assert.ok(false, '🚨')
  }, Error, 'should throw when predicate is false')
  t.is(error.message, '🚨')

  t.notThrows(() => {
    assert.ok(true, '👌')
  }, 'should not throw when predicate is true')
})

test('assert.isAddress', (t) => {
  const nonAddresses = [
    'function',
    {}
  ]
  nonAddresses.forEach((nonAddress) => {
    t.throws(() => {
      assert.isAddress('testAddress', nonAddress)
    })
  })

  const addresses = [
    '0xc6d9d2cd449a754c494264e1809c50e34d64562b',
    'c6d9d2cd449a754c494264e1809c50e34d64562b'
  ]
  addresses.forEach((address) => {
    t.notThrows(() => {
      assert.isAddress('testAddress', address)
    })
  })
})
