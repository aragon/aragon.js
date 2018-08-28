import test from 'ava'

import Provider from './Provider'

test('messages member should throw', (t) => {
    // arrange
    const instance = new Provider()
    // act
    const error = t.throws(instance.messages, Error)
    // assert
    t.is(error.message, 'Not implemented')
})

test('send member should throw', (t) => {
    // arrange
    const instance = new Provider()
    // act
    const error = t.throws(instance.send, Error)
    // assert
    t.is(error.message, 'Not implemented')
})
