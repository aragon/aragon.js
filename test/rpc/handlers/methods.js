import test from 'ava'
import { Observable } from 'rxjs/Rx'
import { createRequestHandler, combineRequestHandlers } from '../../../src/rpc/handlers'

test('handlers.createRequestHandler', (t) => {
  const request$ = Observable.from([
    { method: 'foo' },
    { method: 'bar' },
    { method: 'baz' }
  ]).map((request) => ({ request }))

  const response$ = createRequestHandler(
    request$,
    'foo',
    async (request) => request.method
  )

  t.plan(1)
  return response$
    .map((response) =>
      t.is(response.payload, 'foo', 'request handler should only get relevant request types')
    )
})

test('handlers.createRequestHandler errors', (t) => {
  const request$ = Observable.from([
    { id: 'a', method: 'foo', params: ['ok'] },
    { id: 'b', method: 'foo', params: ['throw'] },
    { id: 'c', method: 'foo', params: ['should be ok after throw'] }
  ]).map((request) => ({ request }))

  const response$ = createRequestHandler(
    request$,
    'foo',
    async (request) => {
      if (request.params[0] === 'throw') throw new Error('thrown')

      return request.params[0]
    }
  )

  t.plan(3)
  return response$
    .map((response) => {
      if (response.id === 'a') {
        t.is(response.payload, 'ok')
      } else if (response.id === 'b') {
        t.true(response.payload instanceof Error)
      } else {
        t.is(response.payload, 'should be ok after throw')
      }
    })
})

test('handlers.combineRequestHandlers', (t) => {
  const request$ = Observable.from([
    { method: 'foo' },
    { method: 'bar' },
    { method: 'foo' },
    { method: 'bar' },
    { method: 'baz' }
  ]).map((request) => ({ request }))

  const responseA$ = createRequestHandler(
    request$,
    'foo',
    async (request) => request.method
  )
  const responseB$ = createRequestHandler(
    request$,
    'bar',
    async (request) => request.method
  )

  t.plan(4)
  return combineRequestHandlers(
    responseA$,
    responseB$
  )
    .map((response) => t.true(
      response.payload === 'foo' || response.payload === 'bar'
    ))
})
