import test from 'ava'
import sinon from 'sinon'
import { of } from 'rxjs'

import getApps from './get-apps'

test.afterEach.always(() => {
  sinon.restore()
})

test('should return an observable from the app list', async (t) => {
  t.plan(2)

  // arrange
  const initialApps = [
    {
      appId: 'coolApp',
      kernelAddress: '0x123',
      abi: 'abi for coolApp',
      proxyAddress: '0x456'
    }
  ]
  const endApps = [].concat(initialApps, {
    appId: 'votingApp',
    kernelAddress: '0x456',
    abi: 'abi for votingApp',
    proxyAddress: '0x789'
  })

  const appsObservable = of(initialApps, endApps)
  // act
  const result = await getApps(null, null, { apps: appsObservable })
  // assert
  let emitIndex = 1
  result.subscribe(value => {
    if (emitIndex === 1) {
      t.deepEqual(value, initialApps)
    } else if (emitIndex === 2) {
      t.deepEqual(value, endApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})
