import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Observable } from 'rxjs/Rx'

const Index = proxyquire.noCallThru().load('./index', {
  '@aragon/messenger': {}
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should send an intent', async t => {
  t.plan(3)
  // arrange
  const observable = Observable.of({
    id: 'uuid1',
    result: 10
  })
  const rpc = {
    sendAndObserveResponse: sinon.stub()
      .returns(observable)
  }
  // act
  const contract = new Index.ContractAPI(rpc)
  // act
  const result = await contract.intent('add', 5)
  // assert
  t.is(result, 10)
  t.is(rpc.sendAndObserveResponse.getCall(0).args[0], 'intent')
  t.deepEqual(rpc.sendAndObserveResponse.getCall(0).args[1], ['add', 5])
})

test.skip('should return the network details as a promise', async t => {
  t.plan(2)
  // arrange
  const observable = Observable.of({
    id: 'uuid1',
    jsonrpc: '2.0',
    result: { id: 4, type: 'rinkeby' }
  }).delay(500)

  const rpc = {
    sendAndObserveResponses: sinon.stub()
      .returns(observable)
  }
  const networkAPI = new Index.NetworkAPI(rpc)
  // act
  const result = await networkAPI.get()
  // assert
  t.deepEqual(result, { id: 4, type: 'rinkeby' })
  t.is(rpc.sendAndObserveResponses.getCall(0).args[0], 'network')
})

test.skip('should emit network updates', async t => {
  t.plan(3)
  // arrange
  const observable = Observable.of(
    {
      id: 'uuid1',
      jsonrpc: '2.0',
      result: { id: 4, type: 'rinkeby' }
    },
    {
      id: 'uuid1',
      jsonrpc: '2.0',
      result: { id: 1, type: 'mainnet' }
    }
  ).delay(200)

  const rpc = {
    sendAndObserveResponses: sinon.stub()
      .returns(observable)
  }
  const networkAPI = new Index.NetworkAPI(rpc)
  // act
  let emitNumber = 0
  networkAPI.on('update', value => {
    // assert
    if (emitNumber === 0) t.deepEqual(value, { id: 4, type: 'rinkeby' })
    if (emitNumber === 1) t.deepEqual(value, { id: 1, type: 'mainnet' })
    emitNumber++
  })

  t.is(rpc.sendAndObserveResponses.getCall(0).args[0], 'network')

  // hack so the test doesn't finish prematurely
  await new Promise(resolve => setTimeout(resolve, 400))
})

test.skip('should return the accounts as an observable', t => {
  t.plan(3)
  // arrange
  const accountsFn = Index.AragonApp.prototype.accounts
  const observable = Observable.of({
    jsonrpc: '2.0',
    id: 'uuid1',
    result: ['accountX', 'accountY', 'accountZ']
  })
  const instanceStub = {
    rpc: {
      sendAndObserveResponses: sinon.stub()
        .returns(observable)
    }
  }
  // act
  const result = accountsFn.call(instanceStub)
  // assert
  // the call to sendAndObserveResponse is made before we subscribe
  t.truthy(instanceStub.rpc.sendAndObserveResponses.getCall(0))
  result.subscribe(value => {
    t.deepEqual(value, ['accountX', 'accountY', 'accountZ'])
  })
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'accounts')
})

test('should send an identify request', t => {
  t.plan(2)
  // arrange
  const identifyFn = Index.AragonApp.prototype.identify
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

test('should return the events observable', async t => {
  t.plan(3)
  // arrange
  const observable = Observable.of(
    {
      id: 'uuid1',
      result: 'eventA'
    }, {
      id: 'uuid3',
      result: 'eventB'
    }
  )
  const rpc = {
    sendAndObserveResponses: sinon.stub()
      .returns(observable)
  }
  // act
  const contract = new Index.ContractAPI(rpc)
  let emitNumber = 0
  contract.on('event', value => {
    if (emitNumber === 0) t.is(value, 'eventA')
    if (emitNumber === 1) t.is(value, 'eventB')
    emitNumber++
  })
  // hack so the test doesn't finish prematurely
  await new Promise(resolve => setTimeout(resolve, 400))

  // assert
  t.is(rpc.sendAndObserveResponses.getCall(0).args[0], 'events')
})

test.skip('should return an handle for an external contract events', t => {
  t.plan(7)
  // arrange
  const externalFn = Index.AragonApp.prototype.external
  const observableA = Observable.of({
    id: 'uuid1',
    result: { name: 'eventA', value: 3000 }
  })
  const observableB = Observable.of({
    id: 'uuid4',
    result: 'bob was granted permission for the counter app'
  })
  const jsonInterfaceStub = [
    { type: 'event', name: 'SetPermission' },
    { type: 'function', name: 'grantPermission', constant: true }
  ]
  const instanceStub = {
    rpc: {
      sendAndObserveResponses: sinon.stub()
        .returns(observableA),

      sendAndObserveResponse: sinon.stub()
        .returns(observableB)
    }
  }
  // act
  const result = externalFn.call(instanceStub, '0xextContract', jsonInterfaceStub)
  // assert
  // the call to sendAndObserveResponse should be defered until we subscribe
  t.falsy(instanceStub.rpc.sendAndObserveResponses.getCall(0))
  // events from block 2
  result.events(2).subscribe(value => {
    t.deepEqual(value, { name: 'eventA', value: 3000 })

    t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'external_events')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponses.getCall(0).args[1],
      ['0xextContract', [jsonInterfaceStub[0]], 2]
    )
  })
  result.grantPermission('0xbob', '0xcounter').subscribe(value => {
    t.is(value, 'bob was granted permission for the counter app')

    t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'external_call')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1],
      ['0xextContract', jsonInterfaceStub[1], '0xbob', '0xcounter']
    )
  })
})

test.skip('should return the state from cache', t => {
  t.plan(3)
  // arrange
  const stateFn = Index.AragonApp.prototype.state
  const observable = Observable.of({
    id: 'uuid1',
    result: { counter: 5 }
  })
  const instanceStub = {
    rpc: {
      sendAndObserveResponses: sinon.stub()
        .returns(observable)
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

test.skip('should create a store/state reducer', async t => {
  t.plan(2)
  // arrange
  const storeFn = Index.AragonApp.prototype.store
  const observableA = Observable.from([{
    actionHistory: [
      { event: 'Add', payload: 5 }
    ],
    counter: 5
  }, {
    // this will be ignored, but recalculated correctly because we still have the event
    actionHistory: [
      { event: 'Add', payload: 5 },
      { event: 'Add', payload: 2 }
    ],
    counter: 7
  }])
  const observableB = Observable.from([
    { event: 'Add', payload: 2 },
    { event: 'Add', payload: 10 }
  ])
  const instanceStub = {
    state: () => observableA,
    events: () => observableB,
    cache: sinon.stub().returnsArg(1) // should return 2nd argument
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
})

test('should perform a call to the contract and Promise.resolve the response', async t => {
  t.plan(3)
  // arrange
  const observable = Observable.of({
    id: 'uuid1',
    result: 'success'
  })
  const rpc = {
      sendAndObserveResponse: sinon.stub()
        .returns(observable)
  }
  // act
  const contract = new Index.ContractAPI(rpc)
  const result = await contract.call('getEthBalance', 10)
  // assert
  t.is(rpc.sendAndObserveResponse.getCall(0).args[0], 'call')
  t.deepEqual(rpc.sendAndObserveResponse.getCall(0).args[1], ['getEthBalance', 10])
  t.deepEqual(result, 'success')
})

test.skip('should listen for app contexts sent from the wrapper and return the first param', t => {
  t.plan(2)
  // arrange
  const contextFn = Index.AragonApp.prototype.context
  const observable = Observable.from([{
    id: 'uuid0',
    // this will get filtered out
    params: ['x', 'y']
  }, {
    id: 'uuid1',
    method: 'context',
    params: ['first', 'second']
  }, {
    id: 'uuid4',
    method: 'context',
    params: [1, 2]
  }])
  const instanceStub = {
    rpc: {
      requests: sinon.stub()
        .returns(observable)
    }
  }
  // act
  const result = contextFn.call(instanceStub)
  // assert
  result.subscribe(value => {
    t.true(value === 'first' || value === 1)
  })
})

test('should send a describeScript request and Promise.resolve the response', async t => {
  t.plan(3)
  // arrange
  const describeScriptFn = Index.AragonApp.prototype.describeScript
  const observable = Observable.of({
    id: 'uuid1',
    result: 'script executed'
  })
  const instanceStub = {
    rpc: {
      sendAndObserveResponse: sinon.stub()
        .returns(observable)
    }
  }
  // act
  const result = await describeScriptFn.call(instanceStub, 'goto fail')
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'describe_script')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['goto fail'])
  t.deepEqual(result, 'script executed')
})

test('should send a web3Eth function request and Promise.resolve the response', async t => {
  t.plan(3)
  // arrange
  const web3EthFn = Index.AragonApp.prototype.web3Eth
  const observable = Observable.of({
    id: 'uuid1',
    result: ['accountA', 'accountB']
  })
  const instanceStub = {
    rpc: {
      sendAndObserveResponse: sinon.stub()
        .returns(observable)
    }
  }
  // act
  const result = await web3EthFn.call(instanceStub, 'getAccounts', 5)
  // assert
  t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'web3_eth')
  t.deepEqual(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1], ['getAccounts', 5])
  t.deepEqual(result, ['accountA', 'accountB'])
})
