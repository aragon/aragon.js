import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { defer, from, of } from 'rxjs'

const Index = proxyquire.noCallThru().load('./index', {
  '@aragon/rpc-messenger': {}
})

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
  t.plan(3)
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
  t.truthy(instanceStub.rpc.sendAndObserveResponses.getCall(0))
  result.subscribe(value => {
    t.deepEqual(value, networkDetails)
  })
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'network')
})

test('should return the accounts as an observable', t => {
  t.plan(3)
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
  t.truthy(instanceStub.rpc.sendAndObserveResponses.getCall(0))
  result.subscribe(value => {
    t.deepEqual(value, ['accountX', 'accountY', 'accountZ'])
  })
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'accounts')
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
  t.plan(6)
  // arrange
  const externalFn = Index.AppProxy.prototype.external
  const observableEvents = of({
    id: 'uuid1',
    result: { name: 'eventA', value: 3000 }
  })
  const observableCall = of({
    id: 'uuid4',
    result: 'bob was granted permission for the counter app'
  })
  const jsonInterfaceStub = [
    { type: 'event', name: 'SetPermission' },
    { type: 'function', name: 'grantPermission', constant: true }
  ]
  const instanceStub = {
    rpc: {
      // Mimic behaviour of @aragon/rpc-messenger
      sendAndObserveResponses: createDeferredStub(observableEvents),
      sendAndObserveResponse: createDeferredStub(observableCall)
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
  result.grantPermission('0xbob', '0xcounter').subscribe(value => {
    t.is(value, 'bob was granted permission for the counter app')

    t.is(instanceStub.rpc.sendAndObserveResponse.getCall(0).args[0], 'external_call')
    t.deepEqual(
      instanceStub.rpc.sendAndObserveResponse.getCall(0).args[1],
      ['0xextContract', jsonInterfaceStub[1], '0xbob', '0xcounter']
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

test('should create a store reducer', async t => {
  t.plan(2)
  // arrange
  const storeFn = Index.AppProxy.prototype.store
  const observableState = from([{
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
  const observableEvents = from([
    { event: 'Add', payload: 2 },
    { event: 'Add', payload: 10 }
  ])
  const instanceStub = {
    // Mimic behaviour of @aragon/rpc-messenger
    state: createDeferredStub(observableState),
    events: createDeferredStub(observableEvents),
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

test('should listen for app contexts sent from the wrapper and return the first param', t => {
  t.plan(2)
  // arrange
  const contextFn = Index.AppProxy.prototype.context
  const observable = from([{
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

test('should submit a new action', t => {
  t.plan(2)
  // arrange
  const newActionFn = Index.AppProxy.prototype.newForwardedAction
  const instanceStub = {
    rpc: {
      send: sinon.stub()
    }
  }
  // act
  newActionFn.call(instanceStub, '0', 'testScript')
  // assert
  t.is(instanceStub.rpc.send.getCall(0).args[0], 'update_forwarded_action')
  t.deepEqual(instanceStub.rpc.send.getCall(0).args[1], ['0', 'testScript'])
})

test('should update an action', t => {
  t.plan(4)
  // arrange
  const updateActionFn = Index.AppProxy.prototype.updateForwardedAction
  const instanceStub = {
    rpc: {
      send: sinon.stub()
    }
  }
  const instanceStub2 = {
    rpc: {
      send: sinon.stub()
    }
  }
  // act
  updateActionFn.call(instanceStub, '1', '0', 'testScript')
  // assert
  t.is(instanceStub.rpc.send.getCall(0).args[0], 'update_forwarded_action')
  t.deepEqual(instanceStub.rpc.send.getCall(0).args[1], ['1', 'testScript', '0'])

  // act
  updateActionFn.call(instanceStub2, '2', '1')
  // assert
  t.is(instanceStub2.rpc.send.getCall(0).args[0], 'update_forwarded_action')
  t.deepEqual(instanceStub2.rpc.send.getCall(0).args[1], ['2', '', '1'])
})

test('should return the forwardedActions observable', t => {
  t.plan(3)
  // arrange
  const getFwdActionsFn = Index.AppProxy.prototype.getForwardedActions
  const observable = of({
    event: 'uuid1',
    result: {
      event: 'ForwardedActions',
      returnValues: ['forwardedAction1', 'forwardedAction2']
    }
  })
  const instanceStub = {
    rpc: {
      sendAndObserveResponses: sinon.stub()
        .returns(observable)
    }
  }
  // act
  const result = getFwdActionsFn.call(instanceStub)
  // assert
  // the call to sendAndObserveResponse should not be defered until we subscribe,
  // since we are working with a BehaviorSubject and just want the latest and greatest
  t.truthy(instanceStub.rpc.sendAndObserveResponses.getCall(0))
  result.subscribe(value => {
    t.deepEqual(value, {
      event: 'ForwardedActions',
      returnValues: ['forwardedAction1', 'forwardedAction2']
    })
  })
  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'get_forwarded_actions')
})

test('should return the registerAppMetadata observable', t => {
  t.plan(3)
  // arrange
  const registerAppMetadataFn = Index.AppProxy.prototype.registerAppMetadata
  const instanceStub = {
    rpc: {
      send: sinon.stub()
    }
  }
  // act
  registerAppMetadataFn.call(instanceStub, '0xbeef', 'uuid1', 'QmrandomhashoceBBSBGmYiHVFQLHN8Uex6CeqExmp6Ggk', ['0xcafe'])
  // assert
  t.is(instanceStub.rpc.send.getCall(0).args[0], 'register_app_metadata')
  t.deepEqual(instanceStub.rpc.send.getCall(0).args[1], ['0xbeef', 'uuid1', 'QmrandomhashoceBBSBGmYiHVFQLHN8Uex6CeqExmp6Ggk', ['0xcafe']])
  // act and assert default 'to'
  registerAppMetadataFn.call(instanceStub, '0xbeef1', 'uuid2', 'QmrandomhashoceBBSBGmYiHVFQLHN8Uex6CeqExmp6GgK')
  t.deepEqual(instanceStub.rpc.send.getCall(1).args[1], ['0xbeef1', 'uuid2', 'QmrandomhashoceBBSBGmYiHVFQLHN8Uex6CeqExmp6GgK', ['*']])
})

test('should return appMetadata observable', t => {
  t.plan(3)

  // arrange
  const getAppMetadataFn = Index.AppProxy.prototype.getAppMetadata

  const observable = from([{
    event: 'AppMetadata',
    result: {
      from: '0xfed',
      to: [ '0xcafe', '0xdeaddead' ],
      dataId: 'u2',
      cid: 'Qmrandomhash'
    }
  }])
  const instanceStub = {
    rpc: {
      sendAndObserveResponses: sinon.stub().returns(observable)
    }
  }
  // act
  const result = getAppMetadataFn.call(instanceStub)
  // assert
  t.truthy(instanceStub.rpc.sendAndObserveResponses.getCall(0))

  result.subscribe(value => {
    t.deepEqual(value, {
      from: '0xfed',
      to: [ '0xcafe', '0xdeaddead' ],
      dataId: 'u2',
      cid: 'Qmrandomhash'
    })
  })

  t.is(instanceStub.rpc.sendAndObserveResponses.getCall(0).args[0], 'get_app_metadata')
})
