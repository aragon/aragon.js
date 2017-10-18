import test from 'ava'
import { Subject } from 'rxjs/Rx'
import Messenger from '../../src/rpc/Messenger'
import Aragon from '../../src/client/index'

const mockMessenger = (handler) => {
  return new Messenger({
    bus: new Subject(),
    messages () {
      return this.bus
    },
    send (message) {
      let response = handler(message)

      if (response) {
        if (!Array.isArray(response)) {
          response = [response]
        }

        setTimeout(() => {
          response.forEach((message) => this.bus.next(message))
        }, 100)
      }
    }
  })
}

test('client.events', (t) => {
  const client = new Aragon(
    mockMessenger(
      (message) => {
        t.is(message.method, 'events')

        return [
          { jsonrpc: '2.0', id: message.id, result: 'foo' },
          { jsonrpc: '2.0', id: message.id, result: 'bar' }
        ]
      }
    )
  )

  t.plan(3)
  return client.events()
    .take(2)
    .map((result) => t.true(
      result === 'foo' || result === 'bar'
    ))
})

test('client.cache', (t) => {
  const client = new Aragon(
    mockMessenger(
      (message) => {
        t.is(message.method, 'cache')
        t.deepEqual(message.params, ['set', 'state', 'foo'])
      }
    )
  )

  client.cache('state', 'foo')
})

test('client.state', (t) => {
  const client = new Aragon(
    mockMessenger(
      (message) => {
        t.is(message.method, 'cache')
        t.deepEqual(message.params, ['get', 'state'])

        return [
          { jsonrpc: '2.0', id: message.id, result: 'state 1' },
          { jsonrpc: '2.0', id: message.id, result: 'state 2' }
        ]
      }
    )
  )

  t.plan(4)
  return client.state()
    .take(2)
    .map((result) => t.true(
      result === 'state 1' || result === 'state 2'
    ))
})

test('client.call', (t) => {
  const client = new Aragon(
    mockMessenger(
      (message) => {
        t.is(message.method, 'call')
        t.deepEqual(message.params, ['balanceOf', '0xdeadbeef'])

        return [
          { jsonrpc: '2.0', id: message.id, result: 'should pass through' },
          { jsonrpc: '2.0', id: message.id, result: 'should not' }
        ]
      }
    )
  )

  t.plan(3)
  return client.call('balanceOf', '0xdeadbeef')
    .map((result) => t.is(result, 'should pass through'))
})

test('client.intent', (t) => {
  const client = new Aragon(
    mockMessenger(
      (message) => {
        t.is(message.method, 'intent')
        t.deepEqual(message.params, [
          'doSomeMumboJumboIntent',
          'with',
          'these',
          'params'
        ])

        return [
          { jsonrpc: '2.0', id: message.id, result: 'result of intent' },
          { jsonrpc: '2.0', id: message.id, result: 'should not pass through' }
        ]
      }
    )
  )

  t.plan(3)
  return client.doSomeMumboJumboIntent('with', 'these', 'params')
    .map((result) => t.is(result, 'result of intent'))
})
