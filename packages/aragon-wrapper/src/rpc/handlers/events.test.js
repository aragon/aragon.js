import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'

import * as eventsUtils from '../../utils/events'

test.beforeEach(t => {
  const utilsStub = {
    events: eventsUtils
  }
  const events = proxyquire('./events', {
    '../../utils': utilsStub
  }).default

  t.context = {
    events,
    utilsStub
  }
})

test('should invoke proxy.events with the correct options', async (t) => {
  const { events } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    events: sinon.stub().returns(mockObservable)
  }
  const requestStub = {
    params: ['allEvents', { fromBlock: 5 }]
  }
  // act
  const eventsObservable = events(requestStub, proxyStub)
  // assert
  t.true(proxyStub.events.calledOnceWithExactly(['allEvents'], { fromBlock: 5 }))
  t.is(eventsObservable, mockObservable)
})

test('should invoke proxy.events with the correct options for aragonAPIv1', async (t) => {
  const { events } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    events: sinon.stub().returns(mockObservable)
  }
  // aragonAPIv1 only passes the fromBlock
  const requestStub = {
    params: [5]
  }
  // act
  const eventsObservable = events(requestStub, proxyStub)
  // assert
  t.true(proxyStub.events.calledOnceWith(null, { fromBlock: 5 }))
  t.is(eventsObservable, mockObservable)
})

test('should invoke proxy.events with the correct options for aragonAPIv1 when no fromBlock is passed', async (t) => {
  const { events } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    events: sinon.stub().returns(mockObservable)
  }
  // aragonAPIv1 does not need to pass the fromBlock
  const requestStub = {
    params: []
  }
  // act
  const eventsObservable = events(requestStub, proxyStub)
  // assert
  t.true(proxyStub.events.calledOnceWith(null, { fromBlock: undefined }))
  t.is(eventsObservable, mockObservable)
})
