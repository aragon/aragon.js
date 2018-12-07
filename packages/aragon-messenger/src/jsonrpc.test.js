import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

const uuidv4Stub = sinon.stub()
const jsonrpc = proxyquire('./jsonrpc', {
  'uuid/v4': uuidv4Stub,
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should encode the request', t => {
  // arrange
  uuidv4Stub.returns('some-id')
  // act
  const encoded = jsonrpc.encodeRequest('m')
  // assert
  t.is(encoded.jsonrpc, '2.0')
  t.is(encoded.id, 'some-id')
  t.is(encoded.method, 'm')
  t.deepEqual(encoded.params, [])
})

test('should encode the response', t => {
  // act
  const encoded = jsonrpc.encodeResponse('1234')
  // assert
  t.is(encoded.jsonrpc, '2.0')
  t.is(encoded.id, '1234')
  t.is(encoded.result, null)
})

test('should encode the error response', t => {
  // act
  const encoded = jsonrpc.encodeResponse('1234', new Error())
  // assert
  t.is(encoded.jsonrpc, '2.0')
  t.is(encoded.id, '1234')
  t.is(encoded.error, 'An error occurred')
})

test('should encode the error response and preserve the message', t => {
  // act
  const encoded = jsonrpc.encodeResponse('1234', new Error('no-good'))
  // assert
  t.is(encoded.jsonrpc, '2.0')
  t.is(encoded.id, '1234')
  t.is(encoded.error, 'no-good')
})

test('should return true for valid responses', t => {
  // arrange
  const response = {
    jsonrpc: '2.0',
    id: 'some-id',
    result: 200,
  }
  // act
  const valid = jsonrpc.isValidResponse(response)
  // assert
  t.true(valid)
})

test('should return true for valid error responses', t => {
  // arrange
  const response = {
    jsonrpc: '2.0',
    id: 'some-id',
    error: null,
  }
  // act
  const valid = jsonrpc.isValidResponse(response)
  // assert
  t.true(valid)
})
