import test from 'ava'
import sinon from 'sinon'
import { of, BehaviorSubject } from 'rxjs'

import getApps from './get-apps'

test.afterEach.always(() => {
  sinon.restore()
})

test('should return a subscription for the entire app list if observing all', async (t) => {
  t.plan(2)

  // arrange
  const initialApps = [{
    appId: 'coolApp',
    kernelAddress: '0x123',
    contractAddress: '0xcoolApp',
    abi: 'abi for coolApp',
    roles: 'roles for coolApp',
    isForwarder: false,
    name: 'Cool App',
    proxyAddress: '0x456',
    icons: [{ src: 'icon_link' }]
  }]
  const appsMock = new BehaviorSubject(initialApps)
  const identifiersMock = of({
    '0x456': 'cool identifier',
    '0x789': 'voting identifier'
  })

  const requestStub = {
    params: ['observe', 'all']
  }
  const proxyStub = {}
  const wrapperStub = {
    apm: {
      getContentPath: (content, path) => `url/${path}`
    },
    apps: appsMock,
    appIdentifiers: identifiersMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)

  // assert
  const expectedInitialApps = [{
    abi: 'abi for coolApp',
    appAddress: '0x456',
    appId: 'coolApp',
    appImplementationAddress: '0xcoolApp',
    identifier: 'cool identifier',
    isForwarder: false,
    kernelAddress: '0x123',
    name: 'Cool App',
    icons: [{ src: 'url/icon_link' }],
    roles: 'roles for coolApp'
  }]
  const expectedEndApps = [].concat(expectedInitialApps, {
    abi: 'abi for votingApp',
    appAddress: '0x789',
    appId: 'votingApp',
    appImplementationAddress: '0xvotingApp',
    identifier: 'voting identifier',
    isForwarder: true,
    kernelAddress: '0x123',
    name: 'Voting App',
    icons: [{ src: 'url/icon_link' }],
    roles: 'roles for votingApp'
  })
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, expectedInitialApps)
    } else if (emitIndex === 1) {
      t.deepEqual(value, expectedEndApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })

  // We need apps' second emission to fire after the identifiers have emitted,
  // so that the combineLatest doesn't skip the initial value
  const endApps = [].concat(initialApps, {
    appId: 'votingApp',
    kernelAddress: '0x123',
    contractAddress: '0xvotingApp',
    abi: 'abi for votingApp',
    roles: 'roles for votingApp',
    isForwarder: true,
    name: 'Voting App',
    proxyAddress: '0x789',
    icons: [{ src: 'icon_link' }]
  })
  appsMock.next(endApps)
})

// Test backwards compatibility with initial RPC API (no parameters passed)
test('should return a subscription for the entire unmodified app list via initial RPC API', async (t) => {
  t.plan(2)

  // arrange
  const initialApps = [{
    appId: 'coolApp',
    kernelAddress: '0x123',
    contractAddress: '0xcoolApp',
    abi: 'abi for coolApp',
    roles: 'roles for coolApp',
    isForwarder: false,
    name: 'Cool App',
    icon: 'icon link',
    proxyAddress: '0x456'
  }]
  const endApps = [].concat(initialApps, {
    appId: 'votingApp',
    kernelAddress: '0x123',
    contractAddress: '0xvotingApp',
    abi: 'abi for votingApp',
    roles: 'roles for votingApp',
    isForwarder: true,
    name: 'Voting App',
    icon: 'icon link',
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

test('should return the initial value for the entire app list if getting all', async (t) => {
  t.plan(1)

  // arrange
  const initialApps = [{
    appId: 'coolApp',
    kernelAddress: '0x123',
    contractAddress: '0xcoolApp',
    abi: 'abi for coolApp',
    roles: 'roles for coolApp',
    isForwarder: false,
    name: 'Cool App',
    proxyAddress: '0x456',
    icons: [{ src: 'icon_link' }]
  }]
  const appsMock = new BehaviorSubject(initialApps)
  const identifiersMock = of({
    '0x456': 'cool identifier',
    '0x789': 'voting identifier'
  })

  const requestStub = {
    params: ['get', 'all']
  }
  const proxyStub = {}
  const wrapperStub = {
    apm: {
      getContentPath: (content, path) => `url/${path}`
    },
    apps: appsMock,
    appIdentifiers: identifiersMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)

  // assert
  const expectedApps = [{
    abi: 'abi for coolApp',
    appAddress: '0x456',
    appId: 'coolApp',
    appImplementationAddress: '0xcoolApp',
    identifier: 'cool identifier',
    isForwarder: false,
    kernelAddress: '0x123',
    name: 'Cool App',
    icons: [{ src: 'url/icon_link' }],
    roles: 'roles for coolApp'
  }]
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, expectedApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })

  // Even though this is filtered out, we need apps' second emission to fire after the identifiers
  // have emitted, so that the combineLatest doesn't skip the initial value
  const endApps = [].concat(initialApps, {
    appId: 'votingApp',
    kernelAddress: '0x123',
    contractAddress: '0xvotingApp',
    abi: 'abi for votingApp',
    roles: 'roles for votingApp',
    isForwarder: true,
    name: 'Voting App',
    proxyAddress: '0x789',
    icons: [{ src: 'icon_link' }]
  })
  appsMock.next(endApps)
})

test('should return a subscription for just the current app if observing current', async (t) => {
  t.plan(2)

  // arrange
  const currentAppAddress = '0x456'
  const initialApp = {
    appId: 'coolApp',
    contractAddress: '0xcoolApp',
    kernelAddress: '0x123',
    abi: 'abi for coolApp',
    roles: 'roles for coolApp',
    isForwarder: false,
    name: 'Cool App',
    proxyAddress: currentAppAddress,
    icons: [{ src: 'icon_link' }]
  }
  const appsMock = new BehaviorSubject([initialApp])
  const identifiersMock = of({
    '0x456': 'cool identifier'
  })

  const requestStub = {
    params: ['observe', 'current']
  }
  const proxyStub = {
    address: currentAppAddress
  }
  const wrapperStub = {
    apm: {
      getContentPath: (content, path) => `url/${path}`
    },
    apps: appsMock,
    appIdentifiers: identifiersMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)

  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, {
        abi: 'abi for coolApp',
        appAddress: currentAppAddress,
        appId: 'coolApp',
        appImplementationAddress: '0xcoolApp',
        identifier: 'cool identifier',
        isForwarder: false,
        kernelAddress: '0x123',
        name: 'Cool App',
        icons: [{ src: 'url/icon_link' }],
        roles: 'roles for coolApp'
      })
    } else if (emitIndex === 1) {
      t.deepEqual(value, {
        abi: 'abi for coolApp',
        appAddress: currentAppAddress,
        appId: 'new coolApp',
        appImplementationAddress: '0xcoolApp',
        identifier: 'cool identifier',
        isForwarder: false,
        kernelAddress: '0x123',
        name: 'Cool App',
        icons: [{ src: 'url/icon_link' }],
        roles: 'roles for coolApp'
      })
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })

  // We need apps' second emission to fire after the identifiers have emitted,
  // so that the combineLatest doesn't skip the initial value
  const endApp = {
    ...initialApp,
    appId: 'new coolApp'
  }
  appsMock.next([
    // This extra app should be filtered out
    {
      appId: 'votingApp',
      kernelAddress: '0x123',
      contractAddress: '0xvotingApp',
      abi: 'abi for votingApp',
      roles: 'roles for votingApp',
      isForwarder: true,
      name: 'Voting App',
      proxyAddress: '0x789',
      icons: [{ src: 'icon_link' }]
    },
    endApp
  ])
})

test('should return the initial value for just the current app if getting current', async (t) => {
  t.plan(1)

  // arrange
  const currentAppAddress = '0x456'
  const initialApp = {
    appId: 'coolApp',
    contractAddress: '0xcoolApp',
    kernelAddress: '0x123',
    abi: 'abi for coolApp',
    roles: 'roles for coolApp',
    isForwarder: false,
    name: 'Cool App',
    proxyAddress: currentAppAddress,
    icons: [{ src: 'icon_link' }]
  }
  const endApp = {
    ...initialApp,
    appId: 'new coolApp'
  }
  const appsMock = new BehaviorSubject([initialApp])
  const identifiersMock = of({
    '0x456': 'cool identifier'
  })

  const requestStub = {
    params: ['get', 'current']
  }
  const proxyStub = {
    address: currentAppAddress
  }
  const wrapperStub = {
    apm: {
      getContentPath: (content, path) => `url/${path}`
    },
    apps: appsMock,
    appIdentifiers: identifiersMock
  }

  // act
  const result = await getApps(requestStub, proxyStub, wrapperStub)

  // assert
  let emitIndex = 0
  result.subscribe(value => {
    if (emitIndex === 0) {
      t.deepEqual(value, {
        abi: 'abi for coolApp',
        appAddress: currentAppAddress,
        appId: 'coolApp',
        appImplementationAddress: '0xcoolApp',
        identifier: 'cool identifier',
        isForwarder: false,
        kernelAddress: '0x123',
        name: 'Cool App',
        icons: [{ src: 'url/icon_link' }],
        roles: 'roles for coolApp'
      })
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })

  // Even though this is filtered out, we need apps' second emission to fire after the identifiers
  // have emitted, so that the combineLatest doesn't skip the initial value
  appsMock.next([endApp])
})
