import test from 'ava'
import { Observable } from 'rxjs/Rx'
import Messenger from '../../src/rpc/Messenger'

const mockProvider = (handler, messages = []) => ({
  messages () {
    return Observable.from(messages)
  },
  send (message) {
    handler(message)
  }
})

test('messenger.bus', (t) => {
  const messenger = new Messenger(
    mockProvider(null, ['foo', 'foo'])
  )

  t.plan(2)
  return messenger.bus()
    .map((message) => {
      t.is(message, 'foo')
    })
})

test('messenger.requests', (t) => {
  const messenger = new Messenger(
    mockProvider(null, [
      { jsonrpc: '2.0', id: 'foo-id', method: 'foo', params: [] },
      { jsonrpc: '2.0', id: 'foo-id', method: 'foo', params: [] },
      { jsonrpc: '2.0', id: 'foo-id', result: 'foo' }
    ])
  )

  t.plan(2)
  return messenger.requests()
    .map((message) => t.is(message.result, undefined))
})

test('messenger.responses', (t) => {
  const messenger = new Messenger(
    mockProvider(null, [
      { jsonrpc: '2.0', id: 'foo-id', method: 'foo', params: [] },
      { jsonrpc: '2.0', id: 'bar-id', method: 'bar', params: [] },
      { jsonrpc: '2.0', id: 'baz-id', result: 'baz' },
      { jsonrpc: '2.0', id: 'xyz-id', error: 'xyz' }
    ])
  )

  t.plan(2)
  return messenger.responses()
    .map((message) => t.is(message.method, undefined))
})

test('messenger.ofType', (t) => {
  const messenger = new Messenger(
    mockProvider(null, [
      { jsonrpc: '2.0', id: 'foo-id', method: 'foo', params: [] },
      { jsonrpc: '2.0', id: 'bar-id', method: 'bar', params: [] }
    ])
  )

  t.plan(1)
  return messenger.ofType('foo')
    .map((message) => t.is(message.method, 'foo'))
})

test('messenger.ofId', (t) => {
  const messenger = new Messenger(
    mockProvider(null, [
      { jsonrpc: '2.0', id: 'foo-id', result: 'foo' },
      { jsonrpc: '2.0', id: 'bar-id', result: 'bar' }
    ])
  )

  t.plan(1)
  return messenger.ofId('bar-id')
    .map((message) => t.is(message.id, 'bar-id'))
})

test('messenger.sendResponse', (t) => {
  t.plan(4)

  const messenger = new Messenger(
    mockProvider(
      (message) => {
        t.is(message.jsonrpc, '2.0')
        t.is(message.id, 'foo-id')
        t.is(message.result, 'bar')
      }
    )
  )

  const id = messenger.sendResponse(
    'foo-id',
    'bar'
  )
  t.truthy(id)
})

test('messenger.send', (t) => {
  t.plan(5)

  const messenger = new Messenger(
    mockProvider(
      (message) => {
        t.is(message.jsonrpc, '2.0')
        t.truthy(message.id)
        t.is(message.method, 'foo')
        t.deepEqual(message.params, ['bar', 'baz'])
      }
    )
  )

  const id = messenger.send(
    'foo',
    ['bar', 'baz']
  )
  t.truthy(id)
})
