import test from 'ava'
import { Subject } from 'rxjs'

import DevMessage from './DevMessage'
import Provider from './Provider'

test('should extend Provider', t => {
  t.true(DevMessage.prototype instanceof Provider)
})

test('should filter the incoming messages from the bus by target', t => {
  // arrange
  const busMock = new Subject()
  const instance = new DevMessage('id', null, busMock)
  // assert
  t.plan(2)
  // act
  const messages = instance.messages()
  messages.subscribe(value => t.is(value.data, 'pass'))

  busMock.next({ data: 'pass', target: 'id' })
  busMock.next({ data: 'fail' })
  busMock.next({ data: 'pass', target: 'id' })
})

test('should attach the target and send via the bus', t => {
  // arrange
  const busMock = new Subject()
  const instance = new DevMessage(null, 'target', busMock)
  // assert
  t.plan(2)
  // act
  busMock.subscribe(value => {
    // assert
    t.is(value.data, 'what-up')
    t.is(value.target, 'target')
  })

  instance.send({ data: 'what-up' })
})
