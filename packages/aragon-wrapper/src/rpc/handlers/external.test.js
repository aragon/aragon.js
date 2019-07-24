import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import * as configurationKeys from '../../configuration/keys'

test.beforeEach(t => {
  const configurationStub = {
    getConfiguration: sinon.stub()
  }
  const external = proxyquire('./external', {
    '../../configuration': configurationStub
  })

  t.context = {
    external,
    configurationStub
  }
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should return an observable from the contract events', async (t) => {
  const { external } = t.context

  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
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
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should not apply a delay to events if not configured', async (t) => {
  const { external, configurationStub } = t.context

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
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
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  const startTime = Date.now()
  result.subscribe(value => {
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
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  // Since we've added the delay, we need to tell ava to wait until we're done subscribing
  return new Promise(resolve => {
    const startTime = Date.now()
    result.subscribe(value => {
      t.deepEqual(value, { event: 'pay_fee', amount: 5 })
      t.true((Date.now() - startTime) > delayTime)
      resolve()
    })

    eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
  })
})
