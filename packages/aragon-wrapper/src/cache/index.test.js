import test from 'ava'
import sinon from 'sinon'

import Cache from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should set the cache and emit the change', async (t) => {
  // arrange
  const instance = new Cache('counterapp')
  const dbMock = {
    setItem: sinon.stub().returns()
  }
  const setStub = sinon.stub().returns({
    setItem: dbMock.setItem
  })
  instance.db = dbMock
  // assert
  t.plan(3)
  instance.changes.subscribe(change => {
    t.deepEqual(change, { key: 'counter', value: 5 })
    t.is(dbMock.setItem.getCall(0).args[0], 'counter')
    t.is(dbMock.setItem.getCall(0).args[1], 5)
  })
  // act
  await instance.set('counter', 5)
})

test('should observe the key\'s value for changes', (t) => {
  // arrange
  const instance = new Cache()
  instance.get = sinon.stub().returns(2)

  // assert
  t.plan(2)
  // act
  instance.observe('counter', 2).subscribe(value => {
    // this should be called twice, first the default value and second our change
    t.is(value, 2)
  })
  // assert
  instance.changes.next({ key: 'something-else', value: 10 })
  instance.changes.next({ key: 'counter', value: 2 })
})
