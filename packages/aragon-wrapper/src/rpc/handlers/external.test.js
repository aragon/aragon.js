import test from 'ava'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import Web3 from 'web3'

import { events, externalIntent } from './external'
import * as configurationKeys from '../../configuration/keys'

test.beforeEach(t => {
  const configurationStub = {
    getConfiguration: sinon.stub()
  }
  const external = proxyquire('./external', {
    '../../configuration': configurationStub
  })

  const web3 = new Web3()
  const { keccak256, padLeft } = web3.utils

  const externalContractAddress = '0xd6ae8250b8348c94847280928c79fb3b63ca453e'
  const permissionsCreator = '0x7ffC57839B00206D1ad20c69A1981b489f772031'
  const app = { proxyAddress: externalContractAddress }
  const jsonInterfaceStub = [
    {
      type: 'function',
      name: 'add',
      constant: false,
      inputs: [{ name: 'number', type: 'uint8' }]
    }
  ]
  const txOpts = {
    gasPrice: 1,
    description: 'custom description'
  }

  const wrapper = {
    web3,
    applyTransactionGas: (tx) => Promise.resolve(tx),
    performTransactionPath: sinon.stub(),
    getAccounts: () => Promise.resolve([permissionsCreator]),
    getExternalTransactionPath: () => Promise.resolve([txObject]),
    getApp: (appAddress) => new Promise(resolve => {
      if (appAddress === app.proxyAddress) resolve(app)
      else resolve(null)
    })
  }

  const functionSig = keccak256('add(uint8)').slice(0, 10)

  const txObject = {
    ...txOpts,
    to: externalContractAddress,
    from: permissionsCreator,
    data: `${functionSig}${padLeft(permissionsCreator.slice(2), 64).toLowerCase()}`
  }

  t.context = {
    external,
    configurationStub,
    app,
    externalContractAddress,
    functionSig,
    jsonInterfaceStub,
    permissionsCreator,
    txOpts,
    txObject,
    wrapper,
    web3
  }
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should return an observable from the contract events', async (t) => {
  const { external } = t.context

  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      'allEvents': sinon.stub().returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should return the correct tx path from external tx intent', async t => {
  t.plan(2)
  // arrange
  const {
    externalContractAddress,
    functionSig,
    jsonInterfaceStub,
    permissionsCreator,
    txOpts,
    wrapper,
    web3
  } = t.context

  const requestFromExternalInstalledApp = {
    jsonrpc: '2.0',
    id: 'uuid4',
    method: 'external_intent',
    params: [
      externalContractAddress,
      jsonInterfaceStub,
      permissionsCreator,
      txOpts
    ]
  }

  // request from external, non-aragon app
  const requestFromExternalNonInstalledApp = {
    jsonrpc: '2.0',
    id: 'uuid4',
    method: 'external_intent',
    params: [
      '0x000000',
      jsonInterfaceStub,
      permissionsCreator,
      txOpts
    ]
  }
  // act
  await externalIntent(requestFromExternalInstalledApp, null, wrapper)
  await externalIntent(requestFromExternalNonInstalledApp, null, wrapper)

  const expected = {
    ...txOpts,
    to: externalContractAddress,
    from: permissionsCreator,
    data: `${functionSig}${web3.utils.padLeft(permissionsCreator.slice(2), 64).toLowerCase()}`
  }

  // assert
  t.deepEqual(wrapper.performTransactionPath.getCall(0).args[0], [{
    ...expected,
    external: true,
  }])

  t.deepEqual(wrapper.performTransactionPath.getCall(1).args[0], [{
    ...expected,
    external: true,
  }])
})

test('should not apply a delay to events if not configured', async (t) => {
  const { external, configurationStub } = t.context

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      'allEvents': sinon.stub().returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  // Set a delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(0)
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  const startTime = Date.now()
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
    // Hard to say exactly how much time this will take, but 20ms seems safe
    // (this should be immediate)
    t.true((Date.now() - startTime) < 20)
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should apply a delay to events if configured', async (t) => {
  const { external, configurationStub } = t.context
  const delayTime = 1000

  t.plan(2)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      'allEvents': sinon.stub().returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  // Set a delay
  configurationStub.getConfiguration.withArgs(configurationKeys.SUBSCRIPTION_EVENT_DELAY).returns(delayTime)
  const result = external.events(requestStub, null, { web3: web3Stub })
  // assert
  // Since we've added the delay, we need to tell ava to wait until we're done subscribing
  return new Promise(resolve => {
    const startTime = Date.now()
    result.subscribe(value => {
      t.deepEqual(value, { event: 'pay_fee', amount: 5 })
      t.true((Date.now() - startTime) > delayTime)
      resolve()
    })

    eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
  })
})
