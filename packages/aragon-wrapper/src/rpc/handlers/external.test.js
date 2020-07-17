import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import * as configurationKeys from '../../configuration/keys'
import * as eventsUtils from '../../utils/events'

test.beforeEach(t => {
  const configurationStub = {
    getConfiguration: sinon.stub()
  }
  const utilsStub = {
    events: eventsUtils
  }
  const external = proxyquire('./external', {
    '../../configuration': configurationStub,
    '../../utils': utilsStub
  })

  t.context = {
    external,
    configurationStub,
    utilsStub
  }
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should return the correct tx path from external tx intent', async t => {
  const { external } = t.context
  const targetAddr = '0x123'
  const targetMethodAbiFragment = [{ name: 'foo' }]
  const targetParams = [8]
  const mockPath = [{ to: '0x123', data: '0x456' }]

  t.plan(3)
  // arrange
  const wrapperStub = {
    getExternalTransactionPath: sinon.stub().returns(mockPath),
    performTransactionPath: sinon.stub().returns(Promise.resolve())
  }
  const requestStub = {
    params: [targetAddr, targetMethodAbiFragment, ...targetParams]
  }
  // act
  const result = external.intent(requestStub, null, wrapperStub)
  // assert
  await t.notThrowsAsync(result)
  t.true(wrapperStub.getExternalTransactionPath.calledOnceWith(targetAddr, targetMethodAbiFragment, targetParams))
  t.true(wrapperStub.performTransactionPath.calledOnceWith(mockPath, { external: true }))
})

test('should return an observable from the contract events', async (t) => {
  const { external } = t.context

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = {}
  const eventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: eventsStub
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 'allEvents', { fromBlock: 8 }]
  }
  // act
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(eventsStub.calledOnceWith({ fromBlock: 8 }))
  events.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test("should default fetching contract events from app's initialization block", async (t) => {
  const { external } = t.context
  const initBlock = 10

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = { initializationBlock: initBlock }
  const eventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: eventsStub
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 'allEvents', {}]
  }
  // act
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(eventsStub.calledOnceWith({ fromBlock: initBlock }))
  events.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should handle events for aragonAPIv1', async (t) => {
  const { external } = t.context
  const fromBlock = 10

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = {}
  const eventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: eventsStub
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  // aragonAPIv1 only passes the fromBlock
  const requestStub = {
    params: ['addr', 'ji', fromBlock]
  }
  // act
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(eventsStub.calledOnceWith({ fromBlock }))
  events.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should handle events without fromBlock for aragonAPIv1', async (t) => {
  const { external } = t.context
  const initBlock = 10

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = { initializationBlock: initBlock }
  const eventsStub = sinon.stub().returns(eventEmitter)
  const contract = {
    events: {
      allEvents: eventsStub
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  // aragonAPIv1 does not need to pass the fromBlock
  const requestStub = {
    params: ['addr', 'ji']
  }
  // act
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(eventsStub.calledOnceWith({ fromBlock: initBlock }))
  events.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test("should return an observable from the contract's past events", async (t) => {
  const { external } = t.context

  t.plan(2)
  // arrange
  const proxy = {}
  const contract = {
    getPastEvents: sinon.stub().returns([{ event: 'pay_fee', amount: 5 }])
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 'allEvents', { fromBlock: 8 }]
  }
  // act
  const result = external.pastEvents(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(contract.getPastEvents.calledOnceWith('allEvents', { fromBlock: 8 }))
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })
})

test("should default fetching past events starting from app's initialization block", async (t) => {
  const { external } = t.context
  const initBlock = 10

  t.plan(2)
  // arrange
  const proxy = { initializationBlock: initBlock }
  const contract = {
    getPastEvents: sinon.stub().returns([{ event: 'pay_fee', amount: 5 }])
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 'allEvents', {}]
  }
  // act
  const result = external.pastEvents(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(contract.getPastEvents.calledOnceWith('allEvents', { fromBlock: initBlock }))
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })
})

test('should handle past events for aragonAPIv1', async (t) => {
  const { external } = t.context
  const initBlock = 10
  const toBlock = 18

  t.plan(2)
  // arrange
  const proxy = { initializationBlock: initBlock }
  const contract = {
    getPastEvents: sinon.stub().returns([{ event: 'pay_fee', amount: 5 }])
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  // aragonAPIv1 only passes the event options
  const requestStub = {
    params: ['addr', 'ji', { toBlock }]
  }
  // act
  const result = external.pastEvents(requestStub, proxy, { web3: web3Stub })
  // assert
  t.true(contract.getPastEvents.calledOnceWith('allEvents', { fromBlock: initBlock, toBlock }))
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })
})

test('should not apply a delay to events if not configured', async (t) => {
  const { external, configurationStub } = t.context

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = {}
  const contract = {
    events: {
      'allEvents': sinon.stub().returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  // Set a delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(0)
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  const startTime = Date.now()
  events.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
    // Hard to say exactly how much time this will take, but 20ms seems safe
    // (this should be immediate)
    t.true((Date.now() - startTime) < 20)
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should apply a delay to events if configured', async (t) => {
  const { external, configurationStub } = t.context
  const delayTime = 1000

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const proxy = {}
  const contract = {
    events: {
      'allEvents': sinon.stub().returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  // Set a delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(delayTime)
  const events = external.events(requestStub, proxy, { web3: web3Stub })
  // assert
  // Since we've added the delay, we need to tell ava to wait until we're done subscribing
  return new Promise(resolve => {
    const startTime = Date.now()
    events.subscribe(value => {
      t.deepEqual(value, { event: 'pay_fee', amount: 5 })
      t.true((Date.now() - startTime) > delayTime)
      resolve()
    })

    eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
  })
})
