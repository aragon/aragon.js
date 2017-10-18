import test from 'ava'
import jsonrpc from '../../src/utils/jsonrpc'

test('jsonrpc.encodeRequest', (t) => {
  t.throws(() => {
    jsonrpc.encodeRequest()
  }, /method/g, 'should throw when method name is undefined')

  let payload = jsonrpc.encodeRequest('foo', ['bar', 'baz'])
  t.is(payload.jsonrpc, '2.0')
  t.truthy(payload.id, 'should set payload id')
  t.is(payload.method, 'foo', 'should set method')
  t.deepEqual(payload.params, ['bar', 'baz'], 'should set params')

  let defaultParamsPayload = jsonrpc.encodeRequest('foo')
  t.deepEqual(defaultParamsPayload.params, [], 'should default params to []')
})

test('jsonrpc.encodeResponse', (t) => {
  t.throws(() => {
    jsonrpc.encodeResponse()
  }, /Expected id to be of type/g, 'should throw when request id is undefined')

  t.throws(() => {
    jsonrpc.encodeResponse('foo-id')
  }, /Expected result to be of type/g, 'should throw when result is undefined')

  const payload = jsonrpc.encodeResponse('foo-id', 'result')
  t.is(payload.jsonrpc, '2.0')
  t.is(payload.id, 'foo-id')
  t.is(payload.result, 'result', 'should set method')
})

test('jsonrpc.isValidResponse', (t) => {
  const invalidCases = [
    null,
    undefined,
    { jsonrpc: '2', id: 'foo-id', result: 'foo-result' },
    { jsonrpc: '2.0', id: 1, result: 'foo-result' },
    { jsonrpc: '2.0', id: 'foo-id' }
  ]
  const validCases = [
    { jsonrpc: '2.0', id: 'foo-id', result: 'foo-result' },
    { jsonrpc: '2.0', id: 'foo-id', error: 'foo-error' }
  ]

  for (const invalidCase of invalidCases) {
    t.false(jsonrpc.isValidResponse(invalidCase))
  }

  for (const validCase of validCases) {
    t.true(jsonrpc.isValidResponse(validCase))
  }
})
