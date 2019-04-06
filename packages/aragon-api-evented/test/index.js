import test from 'ava'
import sinon from 'sinon'
import AragonApp, { providers } from '../src/'

test.afterEach.always(() => {
  sinon.restore()
})

test('should create a store', async t => {

})
