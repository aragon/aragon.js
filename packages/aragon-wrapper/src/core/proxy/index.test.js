import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import Proxy from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should get all the events', t => {
  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      allEvents: () => eventEmitter,
    },
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract),
    },
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.events()
  // assert
  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should get only the requested events', t => {
  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      allEvents: () => eventEmitter,
    },
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract),
    },
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.events(['pay_fee', 'pay_service'])
  // assert
  events.subscribe(event => {
    t.deepEqual(event.amount, 5)
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
  eventEmitter.emit('data', { event: 'pay_something_else', amount: 10 })
  eventEmitter.emit('data', { event: 'pay_service', amount: 5 })
})
