import test from 'ava'
import sinon from 'sinon'

import memoryStorageDriver from 'localforage-memoryStorageDriver'
import Cache from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should set the cache driver to in-memory on non-browser environments', async (t) => {
  t.plan(3)
  // arrange
  const instance = new Cache('counterapp')
  await instance.init()
  // assert
  t.is(instance.db.driver(), memoryStorageDriver._driver)
  instance.changes.subscribe(change => {
    t.deepEqual(change, { key: 'counter', value: 5 })
  })
  // act
  await instance.set('counter', 5)
  // assert
  t.is(await instance.get('counter'), 5)
})

test('should set the cache and emit the change', async (t) => {
  t.plan(3)
  // arrange
  const instance = new Cache('counterapp')
  const dbMock = {
    driver: () => 'test',
    ready: () => true,
    setItem: sinon.stub().returns()
  }
  instance.db = dbMock
  await instance.init()
  // assert
  instance.changes.subscribe(change => {
    t.deepEqual(change, { key: 'counter', value: 5 })
    t.is(dbMock.setItem.getCall(0).args[0], 'counter')
    t.is(dbMock.setItem.getCall(0).args[1], 5)
  })
  // act
  await instance.set('counter', 5)
})

test('should observe the key\'s value for changes in the correct order', async (t) => {
  t.plan(4)
  // arrange
  const instance = new Cache()
  const dbMock = {
    driver: () => 'test',
    ready: () => true,
    setItem: sinon.stub().returns(),
    getItem: sinon.stub().returns(
      new Promise(resolve => setTimeout(resolve, 300))
    )
  }
  instance.db = dbMock
  await instance.init()
  // act
  const observable = instance.observe('counter', 1)
  // assert
  let emissionNumber = 0
  observable.subscribe(value => {
    emissionNumber++
    // first value should be 3 (the default) because getItem returns falsy
    if (emissionNumber === 1) t.is(value, 1)
    if (emissionNumber === 2) t.is(value, 10)
    if (emissionNumber === 3) t.is(value, 11)
    if (emissionNumber === 4) t.is(value, 12)
  })

  // these will be ignored because they happen before `get` finishes
  instance.changes.next({ key: 'counter', value: 4 })
  instance.changes.next({ key: 'counter', value: 5 })

  // these values will emit after get finishes
  setTimeout(() => {
    instance.changes.next({ key: 'counter', value: 10 })
    instance.changes.next({ key: 'counter', value: 11 })
    instance.changes.next({ key: 'somekey', value: 'hey' }) // will be ignored, w
    instance.changes.next({ key: 'counter', value: 12 })
  }, 500)

  // hack so the test doesn't finish prematurely
  await new Promise(resolve => setTimeout(resolve, 700))
})
