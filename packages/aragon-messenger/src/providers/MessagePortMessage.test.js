import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import MessagePortMessage from './MessagePortMessage'

test('should send the payload through postMessage', (t) => {
    // arrange
    const postMessageMock = sinon.spy()
    const instance = new MessagePortMessage({ postMessage: postMessageMock })
    // act
    instance.send('payload-example')
    // assert
    t.is(postMessageMock.getCall(0).args[0], 'payload-example')
})

test('should forward the messages data emitted from the given target', (t) => {
    // arrange
    const target = new EventEmitter()
    const instance = new MessagePortMessage(target)
    // assert
    t.plan(2)
    // act
    const messages = instance.messages()
    messages.subscribe(value => t.is(value, 'pass'))
    
    target.emit('message', { data: 'pass', source: target })
    target.emit('message', { data: 'fail' })
    target.emit('message', { data: 'pass', source: target })
})

test('should assign self if target is undefined', (t) => {
    // arrange
    global.self = sinon.spy()
    // act
    const instance = new MessagePortMessage()
    // assert
    t.is(instance.target, global.self)
    // cleanup
    global.self = undefined
})
