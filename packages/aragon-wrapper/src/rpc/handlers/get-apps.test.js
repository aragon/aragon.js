import test from 'ava'
import sinon from 'sinon'
import { of } from 'rxjs'

import getApps from './get-apps'

test.afterEach.always(() => {
  sinon.restore()
})

test('should return a subscription for the entire app list if observing all', async (t) => {
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
  const appsMock = of(initialApps, endApps)

  const requestStub = {
    params: ['observe', 'all']
  }
  const proxyStub = {}
  const wrapperStub = {
    apps: appsMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)
  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApps)
    } else if (emitIndex === 1) {
      t.deepEqual(value, endApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should return a subscription for the entire app list via initial RPC API', async (t) => {
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
  const appsMock = of(initialApps, endApps)

  const requestStub = {
    params: []
  }
  const proxyStub = {}
  const wrapperStub = {
    apps: appsMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)
  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApps)
    } else if (emitIndex === 1) {
      t.deepEqual(value, endApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should return a subscription for just the current app if observing current', async (t) => {
  t.plan(2)

  // arrange
  const currentAppAddress = '0x456'
  const initialApp = {
    appId: 'coolApp',
    kernelAddress: '0x123',
    abi: 'abi for coolApp',
    proxyAddress: currentAppAddress
  }
  const endApp = {
    ...initialApp,
    appId: 'coolApp',
  }
  const appsMock = of(
    [initialApp],
    [
      // This extra app should be filtered out
      {
        appId: 'votingApp',
        kernelAddress: '0x456',
        abi: 'abi for votingApp',
        proxyAddress: '0x789'
      },
      endApp
    ]
  )

  const requestStub = {
    params: ['observe', 'current']
  }
  const proxyStub = {
    address: currentAppAddress
  }
  const wrapperStub = {
    apps: appsMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)
  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApp)
    } else if (emitIndex === 1) {
      t.deepEqual(value, endApp)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should return the initial value for the entire app list if getting all', async (t) => {
  t.plan(1)

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
  const appsMock = of(initialApps, endApps)

  const requestStub = {
    params: ['get', 'all']
  }
  const proxyStub = {}
  const wrapperStub = {
    apps: appsMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)
  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})

test('should return the initial value for just the current app if getting current', async (t) => {
  t.plan(1)

  // arrange
  const currentAppAddress = '0x456'
  const initialApp = {
    appId: 'coolApp',
    kernelAddress: '0x123',
    abi: 'abi for coolApp',
    proxyAddress: currentAppAddress
  }
  const endApp = {
    appId: 'coolApp',
    kernelAddress: '0x123',
    abi: 'new abi for coolApp',
    proxyAddress: currentAppAddress
  }
  const appsMock = of([initialApp], [endApp])

  const requestStub = {
    params: ['get', 'current']
  }
  const proxyStub = {
    address: currentAppAddress
  }
  const wrapperStub = {
    apps: appsMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)
  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApp)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })
})
