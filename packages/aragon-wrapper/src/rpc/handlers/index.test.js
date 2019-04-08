import test from 'ava'
import sinon from 'sinon'
import { of, from } from 'rxjs'

import {
  createRequestHandler,
  combineRequestHandlers
} from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should create a request handler', async (t) => {
  t.plan(5)
  // arrange
  const requestStub = from([{
    request: {
      id: 'uuid0',
      // this one should get filtered away
      method: 'notifications'
    }
  }, {
    request: {
      id: 'uuid1',
      method: 'cache',
      params: ['get', 'settings']
    }
  }, {
    request: {
      id: 'uuid4',
      method: 'cache',
      params: ['set', 'settings'],
      value: { foo: 'bar' }
    }
  }, {
    request: {
      id: 'uuid5',
      method: 'cache',
      params: ['clear']
    }
  }, {
    request: {
      id: 'uuid6',
      method: 'cache',
      params: ['get', 'profile']
    }
  }, {
    request: {
      // this one should NOT get filtered away, but assigned a default response of null
      id: 'uuid8',
      method: 'cache'
    }
  }])
  const handlerStub = (request) => {
    if (request.id === 'uuid8') {
      // undefined result, this will get converted into null so it can be transmited over JSON RPC
      return Promise.resolve()
    }

    if (request.params[0] === 'set') {
      return Promise.reject(new Error(`no permissions to change ${request.params[1]}!!`))
    }

    if (request.params[0] === 'clear') {
      return Promise.reject(new Error())
    }

    return Promise.resolve(`resolved ${request.params[1]}`)
  }
  // act
  const result = createRequestHandler(requestStub, 'cache', handlerStub)
  // assert
  result.subscribe(value => {
    if (value.id === 'uuid1') return t.is(value.payload, 'resolved settings')
    if (value.id === 'uuid4') return t.true(value.payload instanceof Error)
    if (value.id === 'uuid4') return t.is(value.payload.message, 'no permissions to change settings!!')
    if (value.id === 'uuid5') return t.true(value.payload instanceof Error)
    if (value.id === 'uuid5') return t.is(value.payload.message, '')
    if (value.id === 'uuid6') return t.is(value.payload, 'resolved profile')
    if (value.id === 'uuid8') return t.is(value.payload, null)
  })
})

test('should combine request handlers', async (t) => {
  t.plan(2)
  // arrange
  const handlerA = of('handler for A')
  const handlerB = of('handler for B')
  // act
  const result = combineRequestHandlers(handlerA, handlerB)
  // assert
  result.subscribe(value => {
    t.true(value === 'handler for A' || value === 'handler for B')
  })
})
