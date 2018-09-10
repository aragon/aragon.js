import test from 'ava'
import sinon from 'sinon'
import { Observable } from 'rxjs/Rx'

import {
  createRequestHandler,
  combineRequestHandlers
} from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should create a request handler', async (t) => {
  t.plan(3)
  // arrange
  const requestStub = Observable.create((observer) => {
    observer.next({
      request: {
        id: 'uuid0',
        // this one should get filtered away
        method: 'notifications',
      }
    })
    observer.next({
      request: {
        id: 'uuid1',
        method: 'cache',
        params: ['get'],
        value: 'settings'
      }
    })
    observer.next({
      request: {
        id: 'uuid4',
        method: 'cache',
        params: ['set'],
        value: 'settings'
      }
    })
    observer.next({
      request: {
        id: 'uuid6',
        method: 'cache',
        params: ['get'],
        value: 'profile'
      }
    })
  })
  const handlerStub = (request) => {
    if (request.params[0] === 'set') {
      return Promise.reject('no permissions!!')
    }

    return Promise.resolve(`resolved ${request.value}`)
  }
  // act
  const result = createRequestHandler(requestStub, 'cache', handlerStub)
  // assert
  result.subscribe(value => {
    if (value.id === 'uuid1') return t.is(value.payload, 'resolved settings')
    if (value.id === 'uuid4') return t.is(value.payload, 'no permissions!!')
    if (value.id === 'uuid6') return t.is(value.payload, 'resolved profile')
  })
})

test('should combine request handlers', async (t) => {
  t.plan(2)
  // arrange
  const handlerA = Observable.create((observer) => {
    observer.next('handler for A')
  })
  const handlerB = Observable.create((observer) => {
    observer.next('handler for B')
  })
  // act
  const result = combineRequestHandlers(handlerA, handlerB)
  // assert
  result.subscribe(value => {
    t.true(value === 'handler for A' || value === 'handler for B')
  })
})