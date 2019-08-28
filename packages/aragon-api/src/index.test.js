import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { defer, from, of, Subject } from 'rxjs'

const Index = proxyquire.noCallThru().load('./index', {
  '@aragon/rpc-messenger': {}
})

async function sleep (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function createDeferredStub (observable) {
  return sinon.stub().returns(defer(() => observable))
}

test.afterEach.always(() => {
  sinon.restore()
})

test('should send intent when the method does not exist in target', t => {
  t.plan(3)
  // arrange
  const observable = of({
    id: 'uuid1',
    result: 10
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observable)
    }
  }
  // act
  const result = Index.AppProxyHandler.get(instanceStub, 'add')(5)
  // assert
  result.subscribe(value => {
    t.is(value, 10)
  })
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'intent')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['add', 5])
})

test('should return the network details as an observable', t => {
  t.plan(2)
  // arrange
  const networkDetails = {
    id: 4,
    type: 'rinkeby'
  }
  const networkFn = Index.AppProxy.prototype.network
  const observable = of({
    jsonrpc: '2.0',
    id: 'uuid1',
    result: networkDetails
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observable)
    }
  }
  // act
  const result = networkFn.call(instanceStub)
  // assert
  // the call to sendAndObserveResponse is made before we subscribe
  t.truthy(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('network'))
  result.subscribe(value => {
    t.deepEqual(value, networkDetails)
  })
})

test('should return the accounts as an observable', t => {
  t.plan(2)
  // arrange
  const accountsFn = Index.AppProxy.prototype.accounts
  const observable = of({
    jsonrpc: '2.0',
    id: 'uuid1',
    result: ['accountX', 'accountY', 'accountZ']
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observable)
    }
  }
  // act
  const result = accountsFn.call(instanceStub)
  // assert
  // the call to sendAndObserveResponse is made before we subscribe
  t.truthy(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('accounts'))
  result.subscribe(value => {
    t.deepEqual(value, ['accountX', 'accountY', 'accountZ'])
  })
})

test('should return the installed apps as an observable', t => {
  t.plan(3)

  const initialApps = [
    {
      abi: 'abi for kernel',
      appId: 'kernel',
      codeAddress: '0xkernel',
      isAragonOsInternalApp: true,
      proxyAddress: '0x123'
    }
  ]
  const endApps = [].concat(initialApps, {
    abi: 'abi for counterApp',
    appId: 'counterApp',
    codeAddress: '0xcounterApp',
    isForwarder: false,
    kernelAddress: '0x123',
    proxyAddress: '0x456'
  })

  // arrange
  const getAppsFn = Index.AppProxy.prototype.getApps
  const observable = of(
    {
      jsonrpc: '2.0',
      id: 'uuid1',
      result: initialApps
    }, {
      jsonrpc: '2.0',
      id: 'uuid1',
      result: endApps
    }
  )
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observable)
    }
  }
  // act
  const result = getAppsFn.call(instanceStub)
  // assert
  // the call to sendAndObserveResponses is made before we subscribe
  t.truthy(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('get_apps'))
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

test('should send an identify request', t => {
  t.plan(2)
  // arrange
  const identifyFn = Index.AppProxy.prototype.identify
  const instanceStub = {
    rpc: {
      send: sinon.stub()
    }
  }
  // act
  identifyFn.call(instanceStub, 'ANT')
  // assert
  t.is(instanceStub.rpc.send.getCall(0).args[0], 'identify')
  t.deepEqual(instanceStub.rpc.send.getCall(0).args[1], ['ANT'])
})

test('should return the events observable', t => {
  t.plan(2)
  // arrange
  const eventsFn = Index.AppProxy.prototype.events
  const observable = of({
    id: 'uuid1',
    result: ['eventA', 'eventB']
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observable)
    }
  }
  // act
  const result = eventsFn.call(instanceStub)
  // assert
  result.subscribe(value => {
    t.deepEqual(value, ['eventA', 'eventB'])
  })
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'events')
})

test('should return an handle for an external contract events', t => {
  t.plan(3)
  // arrange
  const externalFn = Index.AppProxy.prototype.external
  const observableEvents = of({
    id: 'uuid1',
    result: { name: 'eventA', value: 3000 }
  })
  const jsonInterfaceStub = [
    { type: 'event', name: 'SetPermission' }
  ]
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observableEvents)
    }
  }
  // act
  const result = externalFn.call(instanceStub, '0xextContract', jsonInterfaceStub)
  // assert
  // events from block 2
  result.events(2).subscribe(value => {
    t.deepEqual(value, { name: 'eventA', value: 3000 })

    t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'external_events')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponses.getCall(0).args[1],
      ['0xextContract', [jsonInterfaceStub[0]], 2]
    )
  })
})

test('should return a handle for creating external calls', t => {
  t.plan(4)
  // arrange
  const externalFn = Index.AppProxy.prototype.external
  const observableCall = of({
    id: 'uuid4',
    result: 'bob was granted permission for the counter app'
  })

  const jsonInterfaceStub = [
    { type: 'function', name: 'grantPermission', constant: true }
  ]

  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observableCall)
    }
  }

  // act
  const result = externalFn.call(instanceStub, '0xextContract', jsonInterfaceStub)

  // assert
  t.true(typeof result.grantPermission === 'function')

  result.grantPermission('0xbob', '0xcounter').subscribe(value => {
    t.is(value, 'bob was granted permission for the counter app')

    t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'external_call')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1],
      ['0xextContract', jsonInterfaceStub[0], '0xbob', '0xcounter']
    )
  })
})

test('should return a handle for creating external transaction intents', t => {
  t.plan(4)
  // arrange
  const externalFn = Index.AppProxy.prototype.external
  const observableIntent = of({
    id: 'uuid4',
    result: 10
  })

  const jsonInterfaceStub = [
    { type: 'function', name: 'add', constant: false }
  ]

  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observableIntent)
    }
  }

  // act
  const result = externalFn.call(instanceStub, '0xextContract', jsonInterfaceStub)

  // assert
  t.true(typeof result.add === 'function')

  result.add(10).subscribe(value => {
    t.is(value, 10)
    t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'external_intent')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1],
      ['0xextContract', jsonInterfaceStub[0], 10]
    )
  })
})

test('should return the state from cache', t => {
  t.plan(3)
  // arrange
  const stateFn = Index.AppProxy.prototype.state
  const observable = of({
    id: 'uuid1',
    result: { counter: 5 }
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observable)
    }
  }
  // act
  const result = stateFn.call(instanceStub)
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'cache')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[1], ['get', 'state'])
  result.subscribe(value => {
    t.deepEqual(value, { counter: 5 })
  })
})

test('should create a store and reduce correctly without previously cached state', async t => {
  t.plan(2)
  // arrange
  const storeFn = Index.AppProxy.prototype.store
  const observableEvents = new Subject()

  const instanceStub = {
    accounts: () => from([
      ['0x0000000000000000000000000000000000000abc']
    ]),
    cache: () => of(),
    events: createDeferredStub(observableEvents),
    getCache: () => from([null]),
    pastEvents: () => of([]),
    web3Eth: sinon.stub().withArgs('getBlockNumber').returns(from(['4385398']))
  }
  const reducer = (state, action) => {
    if (state === null) state = { actionHistory: [], counter: 0 }

    switch (action.event) {
      case 'Add':
        state.actionHistory.push(action)
        state.counter += action.payload
        return state
      case 'Subtract':
        state.actionHistory.push(action)
        state.counter -= action.payload
        return state
    }
    return state
  }
  // act
  const result = storeFn.call(instanceStub, reducer)
  // assert
  result.subscribe(value => {
    if (value.counter === 2) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 2 }
      ])
    }
    if (value.counter === 12) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 2 },
        { event: 'Add', payload: 10 }
      ])
    }
  })
  // send events; wait to avoid grouping through debounce
  await sleep(250)
  observableEvents.next({ event: 'Add', payload: 2 })
  await sleep(500)
  observableEvents.next({ event: 'Add', payload: 10 })
  await sleep(500)
})

test('should create a store and reduce correctly with previously cached state', async t => {
  t.plan(2)
  // arrange
  const storeFn = Index.AppProxy.prototype.store
  const observableEvents = new Subject()

  const instanceStub = {
    accounts: () => from([
      ['0x0000000000000000000000000000000000000abc']
    ]),
    cache: () => of(),
    events: createDeferredStub(observableEvents),
    getCache: () => of({
      state: {
        actionHistory: [
          { event: 'Add', payload: 5 }
        ],
        counter: 5
      },
      blockNumber: 1
    }),
    pastEvents: () => of([]),
    web3Eth: sinon.stub().withArgs('getBlockNumber').returns(from(['4385398']))
  }
  const reducer = (state, action) => {
    if (state === null) state = { actionHistory: [], counter: 0 }

    switch (action.event) {
      case 'Add':
        state.actionHistory.push(action)
        state.counter += action.payload
        return state
      case 'Subtract':
        state.actionHistory.push(action)
        state.counter -= action.payload
        return state
    }
    return state
  }
  // act
  const result = storeFn.call(instanceStub, reducer)
  // assert
  result.subscribe(value => {
    if (value.counter === 5) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 5 }
      ])
    }
    if (value.counter === 7) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 5 },
        { event: 'Add', payload: 2 },
      ])
    }
    if (value.counter === 17) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 5 },
        { event: 'Add', payload: 2 },
        { event: 'Add', payload: 10 }
      ])
    }
  })
  // send events; wait to avoid grouping through debounce
  await sleep(250)
  observableEvents.next({ event: 'Add', payload: 2 })
  await sleep(500)
  observableEvents.next({ event: 'Add', payload: 10 })
  await sleep(500)
})

test('should perform a call to the contract and observe the response', t => {
  t.plan(3)
  // arrange
  const callFn = Index.AppProxy.prototype.call
  const observable = of({
    id: 'uuid1',
    result: 'success'
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observable)
    }
  }
  // act
  const result = callFn.call(instanceStub, 'transferEth', 10)
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'call')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['transferEth', 10])
  result.subscribe(value => {
    t.deepEqual(value, 'success')
  })
})

test('should send a describeScript request and observe the response', t => {
  t.plan(3)
  // arrange
  const describeScriptFn = Index.AppProxy.prototype.describeScript
  const observable = of({
    id: 'uuid1',
    result: 'script executed'
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observable)
    }
  }
  // act
  const result = describeScriptFn.call(instanceStub, 'goto fail')
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'describe_script')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['goto fail'])
  result.subscribe(value => {
    t.deepEqual(value, 'script executed')
  })
})

test('should send a web3Eth function request and observe the response', t => {
  t.plan(3)
  // arrange
  const web3EthFn = Index.AppProxy.prototype.web3Eth
  const observable = of({
    id: 'uuid1',
    result: ['accountA', 'accountB']
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observable)
    }
  }
  // act
  const result = web3EthFn.call(instanceStub, 'getAccounts', 5)
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'web3_eth')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['getAccounts', 5])
  result.subscribe(value => {
    t.deepEqual(value, ['accountA', 'accountB'])
  })
})
