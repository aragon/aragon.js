import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'

import * as eventsUtils from '../../utils/events'

test.beforeEach(t => {
  const utilsStub = {
    events: eventsUtils
  }
  const pastEvents = proxyquire('./past-events', {
    '../../utils': utilsStub
  }).default

  t.context = {
    pastEvents,
    utilsStub
  }
})

test('should invoke proxy.pastEvents with the correct options', async (t) => {
  const { pastEvents } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    pastEvents: sinon.stub().returns(mockObservable)
  }
  const requestStub = {
    params: ['allEvents', { fromBlock: 5 }]
  }
  // act
  const pastEventsObservable = pastEvents(requestStub, proxyStub)
  // assert
  t.true(proxyStub.pastEvents.calledOnceWithExactly(['allEvents'], { fromBlock: 5 }))
  t.is(pastEventsObservable, mockObservable)
})

test('should invoke proxy.pastEvents with the correct options for aragonAPIv1', async (t) => {
  const { pastEvents } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    pastEvents: sinon.stub().returns(mockObservable)
  }
  // aragonAPIv1 only passes the fromBlock
  const requestStub = {
    params: [5, 10]
  }
  // act
  const pastEventsObservable = pastEvents(requestStub, proxyStub)
  // assert
  t.true(proxyStub.pastEvents.calledOnceWith(null, { fromBlock: 5, toBlock: 10 }))
  t.is(pastEventsObservable, mockObservable)
})

test('should invoke proxy.pastEvents with the correct options for aragonAPIv1 when no fromBlock is passed', async (t) => {
  const { pastEvents } = t.context

  t.plan(2)
  // arrange
  const mockObservable = Symbol('mockObservable')
  const proxyStub = {
    pastEvents: sinon.stub().returns(mockObservable)
  }
  // aragonAPIv1 does not need to pass the fromBlock
  const requestStub = {
    params: []
  }
  // act
  const pastEventsObservable = pastEvents(requestStub, proxyStub)
  // assert
  t.true(proxyStub.pastEvents.calledOnceWith(null, { fromBlock: undefined, toBlock: undefined }))
  t.is(pastEventsObservable, mockObservable)
})
