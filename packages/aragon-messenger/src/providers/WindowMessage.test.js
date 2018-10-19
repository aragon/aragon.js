import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import WindowMessage from './WindowMessage'
import Provider from './Provider'

test.afterEach.always(() => {
  global.window = undefined
  sinon.restore()
})

test('should extend Provider', (t) => {
  t.true(WindowMessage.prototype instanceof Provider)
})

test('should assign window.parent if target is undefined', (t) => {
  // arrange
  global.window = { parent: 'daddy' }
  // act
  const instance = new WindowMessage()
  // assert
  t.is(instance.target, 'daddy')
})

test('should forward the messages\' data emitted from the window object', (t) => {
  // arrange
  global.window = new EventEmitter()
  const target = 'decentralization'
  const instance = new WindowMessage(target)
  // assert
  t.plan(2)
  // act
  const messages = instance.messages()
  messages.subscribe(value => t.is(value, 'pass'))

  global.window.emit('message', { data: 'pass', source: target })
  global.window.emit('message', { data: 'fail' })
  global.window.emit('message', { data: 'pass', source: target })
})

test('should send the payload through postMessage', (t) => {
  // arrange
  const postMessageMock = sinon.spy()
  const instance = new WindowMessage({ postMessage: postMessageMock })
  // act
  instance.send('payload-example')
  // assert
  t.is(postMessageMock.getCall(0).args[0], 'payload-example')
  t.is(postMessageMock.getCall(0).args[1], '*')
})
