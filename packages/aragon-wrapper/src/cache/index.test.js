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

test('should set to the cache and emit the change', async (t) => {
  t.plan(3)
  // arrange
  const instance = new Cache('counterapp')
  await instance.init()
  instance.db.setItem = sinon.stub()
  instance.db.getItem = sinon.stub()
  // assert
  instance.changes.subscribe(change => {
    t.deepEqual(change, { key: 'counter', value: 5 })
    t.is(instance.db.setItem.getCall(0).args[0], 'counter')
    t.is(instance.db.setItem.getCall(0).args[1], 5)
  })
  // act
  await instance.set('counter', 5)
})

test('should set to the cache return all', async t => {
  t.plan(3)
  // arrange
  const instance = new Cache(t.title)
  await instance.init()

  const allBefore = await instance.getAll()
  t.deepEqual(allBefore, {}, 'empty object when cache is empty')

  await instance.set('one', 1)
  await instance.set('two', 2)
  await instance.set('three', 3)
  await instance.set('four', 4)

  const allAfter = await instance.getAll()
  t.is(Object.keys(allAfter).length, 4)
  t.deepEqual(allAfter, {
    one: 1,
    two: 2,
    three: 3,
    four: 4
  })
})

test('should return null when getting a non existant item', async t => {
  t.plan(1)
  const instance = new Cache('counterapp')
  await instance.init()

  const item = await instance.get('nonexistant')
  t.is(item, null)
})

test('should remove from the cache and emit the change', async (t) => {
  t.plan(2)
  // arrange
  const instance = new Cache('counterapp')
  await instance.init()
  instance.db.removeItem = sinon.stub()
  instance.db.getItem = sinon.stub()
  // assert
  instance.changes.subscribe(change => {
    t.deepEqual(change, { key: 'counter', value: null })
    t.is(instance.db.removeItem.getCall(0).args[0], 'counter')
  })
  // act
  await instance.remove('counter')
})

test('should clear from the cache and emit the change', async (t) => {
  t.plan(2)
  // arrange
  const instance = new Cache('counterapp')
  await instance.init()
  instance.db.clear = sinon.stub()
  instance.db.setItem = sinon.stub()
  instance.db.getItem = sinon.stub()

  const observable = instance.observe('counter', 1)

  // Make sure the get request is finished before we try to clear
  await new Promise(resolve => setTimeout(resolve, 0))

  // assert
  let emissionNumber = 0
  observable.subscribe(value => {
    emissionNumber++
    // first value should be 1 (the default) because getItem returns falsy
    if (emissionNumber === 1) t.is(value, 1)
    // second value should be the cache clear
    if (emissionNumber === 2) t.is(value, null)
  })

  // act
  await instance.clear()
})

test('should observe the key\'s value for changes in the correct order if getItem is fast', async (t) => {
  t.plan(4)
  // arrange
  const instance = new Cache()
  await instance.init()
  instance.db.getItem = sinon.stub().returns(
    new Promise(resolve => setTimeout(resolve, 300))
  )
  // act
  const observable = instance.observe('counter', 1)

  // assert
  let emissionNumber = 0
  observable.subscribe(value => {
    emissionNumber++
    // first value should be 1 (the default) because getItem returns falsy
    if (emissionNumber === 1) t.is(value, 1)
    if (emissionNumber === 2) t.is(value, 10)
    if (emissionNumber === 3) t.is(value, 11)
    if (emissionNumber === 4) t.is(value, 12)
  })

  // these values will emit after get finishes
  setTimeout(() => {
    instance.changes.next({ key: 'counter', value: 10 })
    instance.changes.next({ key: 'counter', value: 11 })
    instance.changes.next({ key: 'somekey', value: 'hey' }) // will be ignored
    instance.changes.next({ key: 'counter', value: 12 })
  }, 500)

  // hack so the test doesn't finish prematurely
  await new Promise(resolve => setTimeout(resolve, 700))
})

test('should observe the key\'s value for changes in the correct order if getItem is slow', async (t) => {
  t.plan(5)
  // arrange
  const instance = new Cache()
  await instance.init()
  instance.db.getItem = sinon.stub().returns(
    new Promise(resolve => setTimeout(resolve, 300))
  )
  // act
  const observable = instance.observe('counter', 1)
  // assert
  let emissionNumber = 0
  observable.subscribe(value => {
    emissionNumber++
    // first value should be 4 because new sets happen immediately
    if (emissionNumber === 1) t.is(value, 4)
    if (emissionNumber === 2) t.is(value, 5)
    if (emissionNumber === 3) t.is(value, 10)
    if (emissionNumber === 4) t.is(value, 11)
    if (emissionNumber === 5) t.is(value, 12)
  })

  // these values will emit before `get` finishes
  instance.changes.next({ key: 'counter', value: 4 })
  instance.changes.next({ key: 'counter', value: 5 })

  // these values will emit after get finishes
  setTimeout(() => {
    instance.changes.next({ key: 'counter', value: 10 })
    instance.changes.next({ key: 'counter', value: 11 })
    instance.changes.next({ key: 'somekey', value: 'hey' }) // will be ignored
    instance.changes.next({ key: 'counter', value: 12 })
  }, 500)

  // hack so the test doesn't finish prematurely
  await new Promise(resolve => setTimeout(resolve, 700))
})
