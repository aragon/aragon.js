import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import Proxy from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should get all the events', (t) => {
  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      allEvents: () => eventEmitter
    }
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
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

test('should get only the requested events', (t) => {
  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      allEvents: () => eventEmitter
    }
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.events(['PayFee', 'PayService'])
  // assert
  events.subscribe(event => {
    t.deepEqual(event.amount, 5)
  })

  eventEmitter.emit('data', { event: 'PayFee', amount: 5 })
  eventEmitter.emit('data', { event: 'PaySomethingElse', amount: 10 })
  eventEmitter.emit('data', { event: 'PayService', amount: 5 })
})

test('should get only request the single event', (t) => {
  t.plan(4)
  // arrange
  const allEventEmitter = new EventEmitter()
  const payFeeEventEmitter = new EventEmitter()
  const allEventsStub = sinon.stub().returns(allEventEmitter)
  const payFeeEventStub = sinon.stub().returns(payFeeEventEmitter)
  const contract = {
    events: {
      allEvents: allEventsStub,
      PayFee: payFeeEventStub
    }
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.events('PayFee')
  // assert
  t.true(payFeeEventStub.calledOnce)
  t.true(allEventsStub.notCalled)

  let eventCount = 0
  events.subscribe(event => {
    if (eventCount === 0) {
      t.deepEqual(event.amount, 5)
    } else if (eventCount === 1) {
      t.deepEqual(event.amount, 10)
    } else {
      // Should only see it twice
      t.fail()
    }
    ++eventCount
  })

  // Emit on both specific and all event emitters
  allEventEmitter.emit('data', { event: 'PaySomethingElse', amount: 10 })
  allEventEmitter.emit('data', { event: 'PayFee', amount: 5 })
  payFeeEventEmitter.emit('data', { event: 'PayFee', amount: 5 })
  allEventEmitter.emit('data', { event: 'PayFee', amount: 10 })
  payFeeEventEmitter.emit('data', { event: 'PayFee', amount: 10 })
  allEventEmitter.emit('data', { event: 'PayService', amount: 5 })
})

test('should default the fromBlock to initializationBlock for requested events', (t) => {
  t.plan(2)
  // arrange
  const initializationBlock = 5
  const eventEmitter = new EventEmitter()
  const allEventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: allEventsStub
    }
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub, initializationBlock)
  // act
  const events = instance.events()
  // assert
  t.true(allEventsStub.calledOnceWith({ fromBlock: initializationBlock }))
  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should use the correct options for requested events', (t) => {
  t.plan(2)
  // arrange
  const fromBlock = 10
  const eventEmitter = new EventEmitter()
  const allEventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: allEventsStub
    }
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.events(null, { fromBlock })
  // assert
  t.true(allEventsStub.calledOnceWith({ fromBlock }))
  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should use the correct options for requested past events with fromBlock and toBlock ', (t) => {
  t.plan(3)
  // arrange
  const fromBlock = 10
  const toBlock = 5

  const pastEventsStub = sinon.stub().resolves([{ one: 1 }, { two: 2 }])

  const contract = {
    getPastEvents: pastEventsStub
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.pastEvents(null, { fromBlock, toBlock })
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock, toBlock }))

  events.subscribe(events => {
    t.deepEqual(events[0], { one: 1 })
    t.deepEqual(events[1], { two: 2 })
  })
  return events // return observable for ava to wait for its completion
})

test('should use the correct options for requested past events with toBlock and initializationBlock set ', (t) => {
  t.plan(1)
  // arrange
  const toBlock = 500
  const initializationBlock = 20

  const pastEventsStub = sinon.stub().resolves([{ one: 1 }, { two: 2 }])

  const contract = {
    getPastEvents: pastEventsStub
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub, initializationBlock)
  // act
  instance.pastEvents(null, { toBlock })
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock: initializationBlock, toBlock }))
})

test('should use the correct options for requested past events with single event filter', (t) => {
  t.plan(3)
  // arrange
  const pastEventsStub = sinon.stub().resolves([{ event: 'Orange', amount: 16 }, { event: 'Apple', amount: 16 }, { event: 'Pear', amount: 5 }])

  const contract = {
    getPastEvents: pastEventsStub
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new Proxy(null, null, web3Stub)
  // act
  const events = instance.pastEvents(['Orange', 'Apple'])
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock: 0, toBlock: null }))

  events.subscribe(events => {
    t.is(events[0].amount, 16)
    t.is(events[1].amount, 16)
  })

  return events // return observable for ava to wait for its completion
})
