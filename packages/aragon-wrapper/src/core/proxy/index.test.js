import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import * as configurationKeys from '../../configuration/keys'

test.beforeEach(t => {
  const configurationStub = {
    getConfiguration: sinon.stub()
  }
  const ContractProxy = proxyquire('./index', {
    '../../configuration': configurationStub
  }).default

  t.context = {
    ContractProxy,
    configurationStub
  }
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should get all the events', (t) => {
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.events()
  // assert
  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should get only the requested events', (t) => {
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub)
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
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub)
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
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub, { initializationBlock })
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
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.events(null, { fromBlock })
  // assert
  t.true(allEventsStub.calledOnceWith({ fromBlock }))
  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should not apply a delay to events if not configured', (t) => {
  const { ContractProxy, configurationStub } = t.context

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

  // Set no delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(0)
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.events()
  // assert
  const startTime = Date.now()

  events.subscribe(event => {
    t.deepEqual(event, { foo: 'bar' })
    // Hard to say exactly how much time this will take, but 20ms seems safe
    // (this should be immediate)
    t.true((Date.now() - startTime) < 20)
  })

  eventEmitter.emit('data', { foo: 'bar' })
})

test('should apply a delay to events if configured', (t) => {
  const { ContractProxy, configurationStub } = t.context
  const delayTime = 1000

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

  // Set a delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(delayTime)
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.events()
  // assert
  // Since we've added the delay, we need to tell ava to wait until we're done subscribing
  return new Promise(resolve => {
    const startTime = Date.now()
    events.subscribe(event => {
      t.deepEqual(event, { foo: 'bar' })
      t.true((Date.now() - startTime) > delayTime)
      resolve()
    })

    eventEmitter.emit('data', { foo: 'bar' })
  })
})

test('should use the correct options for requested past events with fromBlock and toBlock ', (t) => {
  const { ContractProxy } = t.context

  t.plan(4)
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
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.pastEvents(null, { fromBlock, toBlock })
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock, toBlock }))

  events.subscribe(events => {
    t.is(events.length, 2)
    t.deepEqual(events[0], { one: 1 })
    t.deepEqual(events[1], { two: 2 })
  })
  return events // return observable for ava to wait for its completion
})

test('should use the correct options for requested past events with toBlock and initializationBlock set ', (t) => {
  const { ContractProxy } = t.context

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
  const instance = new ContractProxy(null, null, web3Stub, { initializationBlock })
  // act
  instance.pastEvents(null, { toBlock })
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock: initializationBlock, toBlock }))
})

test('should filter past events correctly when more than one eventName is passed', (t) => {
  const { ContractProxy } = t.context

  t.plan(4)
  // arrange
  const pastEventsStub = sinon.stub().resolves([
    { event: 'Orange', amount: 16 },
    { event: 'Apple', amount: 10 },
    { event: 'Pear', amount: 5 }
  ])

  const contract = {
    getPastEvents: pastEventsStub
  }

  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const instance = new ContractProxy(null, null, web3Stub)
  // act
  const events = instance.pastEvents(['Orange', 'Pear'])
  // assert
  t.true(pastEventsStub.calledWithMatch('allEvents', { fromBlock: 0, toBlock: null }))

  events.subscribe(events => {
    t.is(events.length, 2)
    t.deepEqual(events[0], { event: 'Orange', amount: 16 })
    t.deepEqual(events[1], { event: 'Pear', amount: 5 })
  })

  return events // return observable for ava to wait for its completion
})
