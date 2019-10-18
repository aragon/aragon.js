import test from 'ava'
import sinon from 'sinon'
import { of } from 'rxjs'

import { APP_CONTEXTS } from '../../apps'
import trigger from './trigger'

test.afterEach.always(() => {
  sinon.restore()
})

test("should return an observable for the app's triggers", async (t) => {
  t.plan(3)

  // arrange
  const appAddress = '0xABCD'
  const triggerContextMock = of(
    {
      event: 'event1',
      returnValues: {
        data: 'data1'
      }
    },
    {
      event: 'event2',
      returnValues: {
        data: 'data2'
      }
    },
    {
      event: 'event3',
      returnValues: {
        data: 'data3'
      }
    }
  )
  const requestStub = {
    params: ['observe']
  }
  const proxyStub = {
    address: appAddress
  }
  const appContextPoolStub = {
    get: sinon
      .stub()
      .withArgs(appAddress, APP_CONTEXTS.TRIGGER)
      .returns(triggerContextMock)
  }
  const wrapperStub = {
    appContextPool: appContextPoolStub
  }

  // act
  const result = trigger(requestStub, proxyStub, wrapperStub)

  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, {
        event: 'event1',
        returnValues: {
          data: 'data1'
        }
      })
    } else if (emitIndex === 1) {
      t.deepEqual(value, {
        event: 'event2',
        returnValues: {
          data: 'data2'
        }
      })
    } else if (emitIndex === 2) {
      t.deepEqual(value, {
        event: 'event3',
        returnValues: {
          data: 'data3'
        }
      })
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should emit trigger', async (t) => {
  t.plan(1)

  // arrange
  const appAddress = '0xABCD'
  const newEventName = 'newEvent'
  const newEventData = 'newData'
  const requestStub = {
    params: ['emit', newEventName, newEventData]
  }
  const proxyStub = {
    address: appAddress
  }
  const appContextPoolStub = {
    emit: sinon.stub()
  }
  const wrapperStub = {
    appContextPool: appContextPoolStub
  }

  // act
  trigger(requestStub, proxyStub, wrapperStub)

  // assert
  t.true(appContextPoolStub.emit.calledOnceWith(
    appAddress,
    APP_CONTEXTS.TRIGGER,
    {
      event: newEventName,
      returnValues: newEventData
    }
  ))
})

test('should error on invalid trigger request', async (t) => {
  t.plan(1)

  // arrange
  const appAddress = '0xABCD'
  const requestStub = {
    params: ['notHandled']
  }
  const proxyStub = {
    address: appAddress
  }

  // assert
  await t.throwsAsync(
    trigger(requestStub, proxyStub),
    { message: 'Invalid trigger operation' }
  )
})
