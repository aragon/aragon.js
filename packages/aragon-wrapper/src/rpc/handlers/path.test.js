import test from 'ava'
import sinon from 'sinon'
import { of } from 'rxjs'

import { APP_CONTEXTS } from '../../apps'
import path from './path'

test.afterEach.always(() => {
  sinon.restore()
})

test("should return an observable for the app's paths on observe", async (t) => {
  t.plan(3)

  // arrange
  const appAddress = '0xABCD'
  const pathContextMock = of('/', '/page1', '/page2')
  const requestStub = {
    params: ['observe']
  }
  const proxyStub = {
    address: appAddress
  }
  const appContextPoolStub = {
    get: sinon
      .stub()
      .withArgs(appAddress, APP_CONTEXTS.PATH)
      .returns(pathContextMock)
  }
  const wrapperStub = {
    appContextPool: appContextPoolStub
  }

  // act
  const result = path(requestStub, proxyStub, wrapperStub)

  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, '/')
    } else if (emitIndex === 1) {
      t.deepEqual(value, '/page1')
    } else if (emitIndex === 2) {
      t.deepEqual(value, '/page2')
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should request app path on modify', async (t) => {
  t.plan(2)

  // arrange
  const appAddress = '0xABCD'
  const newPath = '/new'
  const requestStub = {
    params: ['modify', newPath]
  }
  const proxyStub = {
    address: appAddress
  }
  const mockResponseSymbol = Symbol('response')
  const wrapperStub = {
    requestAppPath: sinon.stub().returns(mockResponseSymbol)
  }

  // act
  const response = path(requestStub, proxyStub, wrapperStub)

  // assert
  t.true(wrapperStub.requestAppPath.calledOnceWith(appAddress, newPath))
  t.is(response, mockResponseSymbol)
})

test('should error on invalid path request', async (t) => {
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
    path(requestStub, proxyStub),
    { message: 'Invalid path operation' }
  )
})
