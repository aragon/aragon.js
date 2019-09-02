import test from 'ava'
import AppContextPool from './index'

test('AppContextPool starts empty', async (t) => {
  // arrange
  const appAddress = '0x12'
  // act
  const pool = new AppContextPool()
  // assert
  t.false(pool.hasApp(appAddress))
})

test('AppContextPool can create new app contexts', async (t) => {
  // arrange
  const appAddress = '0x12'
  // act
  const pool = new AppContextPool()
  pool.set(appAddress, 'path', '/vote')
  // assert
  t.true(pool.hasApp(appAddress))
})

test('AppContextPool can read and write values to app context', async (t) => {
  // arrange
  const appAddress = '0x12'
  // act
  const pool = new AppContextPool()
  pool.set(appAddress, 'first', 'first value')
  pool.set(appAddress, 'second', 'first value')
  pool.set(appAddress, 'second', 'second value')
  // assert
  t.is(await pool.get(appAddress, 'first'), 'first value')
  t.is(await pool.get(appAddress, 'second'), 'second value')
})

test('AppContextPool can observe values from app context', async (t) => {
  // arrange
  const appAddress = '0x12'
  const contextKey = 'key'
  // act
  const pool = new AppContextPool()
  const observedContext = pool.observe(appAddress, contextKey)
  pool.set(appAddress, contextKey, 'first value') // starting value
  // assert
  let counter = 0
  observedContext.subscribe(val => {
    if (counter === 0) {
      t.is(val, 'first value')
    } else if (counter === 1) {
      t.is(val, 'second value')
    } else if (counter === 2) {
      t.is(val, 'third value')
    } else {
      t.fail('too many emissions')
    }
    counter++
  })

  // Emit after subscribed
  pool.set(appAddress, contextKey, 'second value')
  pool.set(appAddress, contextKey, 'third value')
})
