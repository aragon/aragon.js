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
