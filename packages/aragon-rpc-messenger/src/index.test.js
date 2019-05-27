import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { empty, of, Subject } from 'rxjs'

const jsonrpcStub = {}
class MPM {}
const Messenger = proxyquire('./index', {
  './jsonrpc': {
    default: jsonrpcStub
  },
  './providers/MessagePortMessage': {
    default: MPM
  }
}).default

test.afterEach.always(() => {
  sinon.restore()
})

test('should assign MessagePortMessage as default provider', t => {
  // arrange
  // act
  const instance = new Messenger()
  // assert
  t.true(instance.provider instanceof MPM)
})

test('should return the messages from provider', t => {
  // arrange
  const messagesStub = sinon.stub().returns(6)
  const instance = new Messenger({ messages: messagesStub })
  // act
  const bus = instance.bus()
  // assert
  t.is(bus, 6)
})

test('should encode and send the response', t => {
  // arrange
  const payload = { id: 2, jsonrpc: '2.0' }
  jsonrpcStub.encodeResponse = sinon.stub().returns(payload)
  const mockProvider = { send: sinon.spy() }
  const instance = new Messenger(mockProvider)
  // act
  const id = instance.sendResponse(200, 'success')
  // assert
  t.true(jsonrpcStub.encodeResponse.calledOnceWith(200, 'success'))

  t.is(id, 2)
  t.is(mockProvider.send.getCall(0).args[0], payload)
})

test('should encode and send the request', t => {
  // arrange
  const payload = { id: 'uuuuidv4', jsonrpc: '2.0' }
  jsonrpcStub.encodeRequest = sinon.stub().returns(payload)
  const mockProvider = { send: sinon.spy() }
  const instance = new Messenger(mockProvider)
  // act
  const id = instance.send('sendEth')
  // assert
  t.true(jsonrpcStub.encodeRequest.calledOnceWith('sendEth', []))

  t.is(id, 'uuuuidv4')
  t.true(mockProvider.send.calledOnceWith(payload))
})

test('should filter the incoming messages to responses only', (t) => {
  t.plan(2)

  // arrange
  const busMock = new Subject()
  const instance = new Messenger(null)
  instance.bus = () => busMock
  jsonrpcStub.isValidResponse = sinon.stub().returns(true)

  // assert
  instance.responses().subscribe(value => {
    t.is(value, 'response')
    t.is(jsonrpcStub.isValidResponse.getCall(0).args[0], 'response')
  })

  // act
  busMock.next('response')
  busMock.complete()
})

test('should filter the incoming messages to requests only', (t) => {
  t.plan(2)

  // arrange
  const busMock = new Subject()
  const instance = new Messenger(null)
  instance.bus = () => busMock
  jsonrpcStub.isValidResponse = sinon.stub().returns(false)

  // assert
  instance.requests().subscribe(value => {
    t.is(value, 'request')
    t.is(jsonrpcStub.isValidResponse.getCall(0).args[0], 'request')
  })

  // act
  busMock.next('request')
  busMock.complete()
})

test('should send and observe responses', (t) => {
  t.plan(3)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(responsesMock)
  const messages = instance.sendAndObserveResponses('sendEth', ['params'])

  // assert
  messages.subscribe(value => t.is(value.data, 'thanks'))
  t.true(instance.send.calledOnceWith('sendEth', ['params']))

  // act
  responsesMock.next({ data: 'thanks', id })
  responsesMock.next({ data: 'thanks', id })
  responsesMock.complete()
})

test('should send and observe responses, even if errors are included', (t) => {
  t.plan(5)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(responsesMock)
  const messages = instance.sendAndObserveResponses('sendEth', ['params'])

  // assert
  messages.subscribe(value => {
    if (value.data) {
      t.is(value.data, 'thanks')
    } else if (value.error) {
      t.true(value.error instanceof Error)
      t.is(value.error.message, 'no thanks')
    }
  })
  t.true(instance.send.calledOnceWith('sendEth', ['params']))

  // act
  responsesMock.next({ data: 'thanks', id })
  responsesMock.next({ error: 'no thanks', id })
  responsesMock.next({ data: 'thanks', id })
  responsesMock.complete()
})

test('should end response stream, once notified of its completion', (t) => {
  t.plan(2)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(responsesMock)
  const messages = instance.sendAndObserveResponses('sendEth')

  // assert
  let completed
  messages.subscribe({
    next (value) { t.is(value.data, 'thanks') },
    complete () { completed = true }
  })

  // act
  responsesMock.next({ data: 'thanks', id })
  responsesMock.next({ completed: true, id })
  responsesMock.next({ data: 'thanks again', id })
  responsesMock.complete()

  t.true(completed)
})

test('should send and observe responses, defaulting parameters to empty array', (t) => {
  t.plan(1)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'send')
  sinon.stub(instance, 'responses').returns(empty())
  const messages = instance.sendAndObserveResponses('sendEth')

  // assert
  messages.subscribe()
  t.true(instance.send.calledOnceWith('sendEth', []))
})

test('should send and observe responses, but delay sending the request after subscribing', (t) => {
  t.plan(2)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'send')
  sinon.stub(instance, 'responses').returns(empty())
  const messages = instance.sendAndObserveResponses('sendEth', ['params'])

  // assert
  t.true(instance.send.notCalled) // hasn't sent request before subscribing
  messages.subscribe()
  t.true(instance.send.calledOnceWith('sendEth', ['params']))
})

test('should send and observe only the first response', (t) => {
  t.plan(2)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(41)
  sinon.stub(instance, 'responses').returns(responsesMock)

  // act
  const messages = instance.sendAndObserveResponse('sendAnt', ['params'])
  // assert
  messages.subscribe(value => t.is(value.data, 'first'))
  t.true(instance.send.calledOnceWith('sendAnt', ['params']))

  responsesMock.next({ data: 'first', id })
  responsesMock.next({ data: 'second', id })
  responsesMock.next({ data: 'third', id })
  responsesMock.complete()
})

test('should send and observe only the first error', (t) => {
  t.plan(3)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(41)
  sinon.stub(instance, 'responses').returns(responsesMock)
  const messages = instance.sendAndObserveResponse('sendAnt', ['params'])
  // assert
  messages.subscribe(
    value => t.fail('should not have emitted any next values'),
    error => {
      t.true(error instanceof Error)
      t.is(error.message, 'bad first')
    }
  )
  t.true(instance.send.calledOnceWith('sendAnt', ['params']))

  // act
  responsesMock.next({ error: 'bad first', id })
  responsesMock.next({ data: 'second', id })
  responsesMock.complete()
})

test('should end response stream immediately on first response', (t) => {
  t.plan(2)

  // arrange
  const id = 41
  const responsesMock = new Subject()
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(responsesMock)
  const messages = instance.sendAndObserveResponse('sendEth')

  // assert
  let completed
  messages.subscribe({
    next (value) { t.is(value.data, 'thanks') },
    complete () { completed = true }
  })

  // act
  responsesMock.next({ data: 'thanks', id })
  responsesMock.next({ data: 'thanks again', id })
  responsesMock.next({ completed: true, id })
  responsesMock.complete()

  t.true(completed)
})

test('should send and observe only the first response, defaulting parameters to empty array', (t) => {
  t.plan(1)

  // arrange
  const id = 41
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(of({ data: 'response', id })) // must emit at least once
  const messages = instance.sendAndObserveResponse('sendAnt')

  // assert
  messages.subscribe()
  t.true(instance.send.calledOnceWith('sendAnt', []))
})

test('should send and observe only the first response, but delay sending the request after subscribing', (t) => {
  t.plan(2)

  // arrange
  const id = 41
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(id)
  sinon.stub(instance, 'responses').returns(of({ data: 'response', id })) // must emit at least once

  // act
  const messages = instance.sendAndObserveResponse('sendAnt', ['params'])
  // assert
  t.true(instance.send.notCalled) // hasn't sent request before subscribing
  messages.subscribe()
  t.true(instance.send.calledOnceWith('sendAnt', ['params']))
})
