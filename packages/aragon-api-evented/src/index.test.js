import test from 'ava'
import sinon from 'sinon'
import { of } from 'rxjs'
import * as Index from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should send an intent', async t => {
  t.plan(3)
  // arrange
  const observable = of({
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
  const observable = of(
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

test('should perform a call to the contract and Promise.resolve the response', async t => {
  t.plan(3)
  // arrange
  const observable = of({
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

test('should send a describeScript request and Promise.resolve the response', async t => {
  t.plan(3)
  // arrange
  const describeScriptFn = Index.AragonApp.prototype.describeScript
  const observable = of({
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
  const observable = of({
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
