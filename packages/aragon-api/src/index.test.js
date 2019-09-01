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

function subscribe (observable, handler) {
  // Mimic an async delay to test the deferred behaviour
  sleep(10)
  observable.subscribe(handler)
}

test.afterEach.always(() => {
  sinon.restore()
})

test('should send intent when the method does not exist in target', t => {
  t.plan(2)
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
  subscribe(result, value => {
    t.is(value, 10)
  })
  t.true(instanceStub.rpc.sendAndObserveResponse.calledOnceWith('intent', ['add', 5]))
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
  subscribe(result, value => {
    t.deepEqual(value, networkDetails)
  })
  t.truthy(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('network'))
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
  subscribe(result, value => {
    t.deepEqual(value, ['accountX', 'accountY', 'accountZ'])
  })
  t.truthy(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('accounts'))
})

test('should send a getApps request for all apps and observe the response', t => {
  t.plan(3)

  const initialApps = [{
    appAddress: '0x123',
    appId: 'kernel',
    appImplementationAddress: '0xkernel',
    identifier: undefined,
    isForwarder: false,
    kernelAddress: undefined,
    name: 'Kernel'
  }]
  const endApps = [].concat(initialApps, {
    appAddress: '0x456',
    appId: 'counterApp',
    appImplementationAddress: '0xcounterApp',
    identifier: 'counter',
    isForwarder: false,
    kernelAddress: '0x123',
    name: 'Counter'
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
  let emitIndex = 0
  subscribe(result, value => {
    if (emitIndex === 0) {
      t.deepEqual(value, initialApps)
    } else if (emitIndex === 1) {
      t.deepEqual(value, endApps)
    } else {
      t.fail('too many emissions')
    }

    emitIndex++
  })

  t.true(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('get_apps'))
})

test('should send a getApps request for the app and observe the single response', t => {
  t.plan(2)

  const currentApp = {
    appAddress: '0x456',
    appId: 'counterApp',
    appImplementationAddress: '0xcounterApp',
    identifier: 'counter',
    isForwarder: false,
    kernelAddress: '0x123',
    name: 'Counter'
  }

  // arrange
  const getCurrentAppFn = Index.AppProxy.prototype.getCurrentApp
  const observable = of({
    jsonrpc: '2.0',
    id: 'uuid1',
    result: currentApp
  })
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponse: createDeferredStub(observable)
    }
  }
  // act
  const result = getCurrentAppFn.call(instanceStub)
  // assert
  subscribe(result, value => t.deepEqual(value, currentApp))
  t.true(instanceStub.rpc.sendAndObserveResponse.calledOnceWith('get_apps'))
})

test('should send an identify request', t => {
  t.plan(1)
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
  t.true(instanceStub.rpc.send.calledOnceWith('identify', ['ANT']))
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
  subscribe(result, value => {
    t.deepEqual(value, ['eventA', 'eventB'])
  })
  t.true(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('events', ['allEvents', {}]))
})

test('should return an handle for an external contract events', t => {
  t.plan(2)
  const fromBlock = 2

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
  // events from starting block
  const eventsObservable = result.events({ fromBlock })
  // assert
  subscribe(eventsObservable, value => {
    t.deepEqual(value, { name: 'eventA', value: 3000 })
  })
  t.true(
    instanceStub.rpc.sendAndObserveResponses.calledOnceWith(
      'external_events',
      ['0xextContract', [jsonInterfaceStub[0]], 'allEvents', { fromBlock }]
    )
  )
})

test('should return a handle for creating external calls', t => {
  t.plan(2)
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
  const callResult = result.grantPermission('0xbob', '0xcounter')

  // assert
  subscribe(callResult, value => {
    t.is(value, 'bob was granted permission for the counter app')
  })

  t.true(
    instanceStub.rpc.sendAndObserveResponse.calledOnceWith(
      'external_call',
      ['0xextContract', jsonInterfaceStub[0], '0xbob', '0xcounter']
    )
  )
})

test('should return a handle for creating external transaction intents', t => {
  t.plan(2)
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
  const intentResult = result.add(10)

  // assert
  subscribe(intentResult, value => {
    t.is(value, 10)
  })
  t.true(
    instanceStub.rpc.sendAndObserveResponse.calledOnceWith(
      'external_intent',
      ['0xextContract', jsonInterfaceStub[0], 10]
    )
  )
})

test('should return the state from cache', t => {
  t.plan(3)
  // arrange
  const stateFn = Index.AppProxy.prototype.state
  const stateObservable = new Subject()
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(stateObservable)
    }
  }
  // act
  const result = stateFn.call(instanceStub)
  // assert
  t.true(instanceStub.rpc.sendAndObserveResponses.calledOnceWith('cache', ['observe', 'state']))

  let counter = 0
  subscribe(result, value => {
    if (counter === 0) {
      t.deepEqual(value, { counter: 5 })
    } else if (counter === 1) {
      t.deepEqual(value, { counter: 6 })
    }
    counter++
  })
  // send state events
  stateObservable.next({
    id: 'uuid1',
    result: { counter: 5 }
  })
  stateObservable.next({
    id: 'uuid1',
    result: { counter: 6 }
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
  subscribe(result, value => {
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
  subscribe(result, value => {
    if (value.counter === 5) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 5 }
      ])
    }
    if (value.counter === 7) {
      t.deepEqual(value.actionHistory, [
        { event: 'Add', payload: 5 },
        { event: 'Add', payload: 2 }
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
  t.plan(2)
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
  subscribe(result, value => {
    t.deepEqual(value, 'success')
  })
  t.true(instanceStub.rpc.sendAndObserveResponse.calledOnceWith('call', ['transferEth', 10]))
})

test('should send a describeScript request and observe the response', t => {
  t.plan(2)
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
  subscribe(result, value => {
    t.deepEqual(value, 'script executed')
  })
  t.true(instanceStub.rpc.sendAndObserveResponse.calledOnceWith('describe_script', ['goto fail']))
})

test('should send a web3Eth function request and observe the response', t => {
  t.plan(2)
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
  subscribe(result, value => {
    t.deepEqual(value, ['accountA', 'accountB'])
  })
  t.true(instanceStub.rpc.sendAndObserveResponse.calledOnceWith('web3_eth', ['getAccounts', 5]))
})
