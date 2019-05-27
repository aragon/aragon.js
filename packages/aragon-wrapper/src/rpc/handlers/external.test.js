import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'

import { events, pastEvents } from './external'

test.afterEach.always(() => {
  sinon.restore()
})

test('should return an observable from the contract events', async (t) => {
  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      'allEvents': sinon.stub().withArgs({ fromBlock: 8 }).returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', { fromBlock: 8 }]
  }
  // act
  const result = events(requestStub, null, { web3: web3Stub })
  // assert
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test("should return an observable from the contract's past events", async (t) => {
  t.plan(1)
  // arrange
  const contract = {
    getPastEvents: sinon.stub().withArgs({ fromBlock: 8 }).returns([{ event: 'pay_fee', amount: 5 }])
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', { fromBlock: 8 }]
  }
  // act
  const result = pastEvents(requestStub, null, { web3: web3Stub })
  // assert
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })
})
