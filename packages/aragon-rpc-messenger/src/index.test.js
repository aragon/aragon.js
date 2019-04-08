import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Subject } from 'rxjs'

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
  const sendSpy = sinon.spy()
  const instance = new Messenger({ send: sendSpy })
  // act
  const id = instance.sendResponse(200, 'success')
  // assert
  t.is(jsonrpcStub.encodeResponse.getCall(0).args[0], 200)
  t.is(jsonrpcStub.encodeResponse.getCall(0).args[1], 'success')

  t.is(sendSpy.getCall(0).args[0], payload)
  t.is(id, 2)
})

test('should encode and send the request', t => {
  // arrange
  const payload = { id: 'uuuuidv4', jsonrpc: '2.0' }
  jsonrpcStub.encodeRequest = sinon.stub().returns(payload)
  const sendSpy = sinon.spy()
  const instance = new Messenger({ send: sendSpy })
  // act
  const id = instance.send('sendEth')
  // assert
  t.is(jsonrpcStub.encodeRequest.getCall(0).args[0], 'sendEth')
  t.deepEqual(jsonrpcStub.encodeRequest.getCall(0).args[1], [])

  t.is(sendSpy.getCall(0).args[0], payload)
  t.is(id, 'uuuuidv4')
})

test('should filter the incoming messages to responses only', (t) => {
  t.plan(2)

  // arrange
  const busMock = new Subject()
  const instance = new Messenger(null)
  instance.bus = () => busMock
  jsonrpcStub.isValidResponse = sinon.stub().returns(true)

  // act
  const messages = instance.responses()
  messages.subscribe(value => {
    t.is(jsonrpcStub.isValidResponse.getCall(0).args[0], 'response')
    t.is(value, 'response')
  })

  busMock.next('response')
})

test('should filter the incoming messages to requests only', (t) => {
  t.plan(2)

  // arrange
  const busMock = new Subject()
  const instance = new Messenger(null)
  instance.bus = () => busMock
  jsonrpcStub.isValidResponse = sinon.stub().returns(false)

  // act
  const messages = instance.requests()
  messages.subscribe(value => {
    t.is(jsonrpcStub.isValidResponse.getCall(0).args[0], 'request')
    t.is(value, 'request')
  })

  busMock.next('request')
})

test('should send and observe responses', (t) => {
  t.plan(4)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(41)
  sinon.stub(instance, 'responses').returns(new Subject())
  const messages = instance.sendAndObserveResponses('sendEth')

  // assert
  messages.subscribe(value => t.is(value.data, 'thanks'))
  t.is(instance.send.getCall(0).args[0], 'sendEth')
  t.deepEqual(instance.send.getCall(0).args[1], [])

  // act
  instance.responses().next({ data: 'thanks', id: 41 })
  instance.responses().next({ data: 'thanks', id: 41 })
})

test('should send and observe responses, even if errors are included', (t) => {
  t.plan(5)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'send').returns(41)
  sinon.stub(instance, 'responses').returns(new Subject())
  const messages = instance.sendAndObserveResponses('sendEth')

  // assert
  messages.subscribe(value => {
    if (value.data) {
      t.is(value.data, 'thanks')
    } else if (value.error) {
      t.is(value.error, 'no thanks')
    }
  })
  t.is(instance.send.getCall(0).args[0], 'sendEth')
  t.deepEqual(instance.send.getCall(0).args[1], [])

  // act
  instance.responses().next({ data: 'thanks', id: 41 })
  instance.responses().next({ error: 'no thanks', id: 41 })
  instance.responses().next({ data: 'thanks', id: 41 })
})

test('should send and observe only the first response', (t) => {
  t.plan(3)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'sendAndObserveResponses').returns(new Subject())

  // act
  const messages = instance.sendAndObserveResponse('sendAnt')
  // assert
  messages.subscribe(value => t.is(value, 'first'))
  t.is(instance.sendAndObserveResponses.getCall(0).args[0], 'sendAnt')
  t.deepEqual(instance.sendAndObserveResponses.getCall(0).args[1], [])

  instance.sendAndObserveResponses().next('first')
  instance.sendAndObserveResponses().next('second')
  instance.sendAndObserveResponses().next('third')
})

test('should send and observe only the first error', (t) => {
  t.plan(4)

  // arrange
  const instance = new Messenger(null)
  sinon.stub(instance, 'sendAndObserveResponses').returns(new Subject())
  const messages = instance.sendAndObserveResponse('sendAnt')
  // assert
  messages.subscribe(
    value => t.fail('should not have emitted any next values'),
    error => {
      t.true(error instanceof Error)
      t.is(error.message, 'bad first')
    }
  )
  t.is(instance.sendAndObserveResponses.getCall(0).args[0], 'sendAnt')
  t.deepEqual(instance.sendAndObserveResponses.getCall(0).args[1], [])

  // act
  instance.sendAndObserveResponses().next({ error: 'bad first' })
  instance.sendAndObserveResponses().next('second')
})
