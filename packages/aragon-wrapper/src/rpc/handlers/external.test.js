import test from 'ava'
import sinon from 'sinon'
import { EventEmitter } from 'events'
import Web3 from 'web3'

import { events, intent } from './external'

test.afterEach.always(() => {
  sinon.restore()
})

test('should return an observable from the contract events', async (t) => {
  t.plan(1)
  // arrange
  const eventEmitter = new EventEmitter()
  const contract = {
    events: {
      'allEvents': sinon.stub().withArgs(8).returns(eventEmitter)
    }
  }
  const web3Stub = {
    eth: {
      Contract: sinon.stub().withArgs('addr', 'ji').returns(contract)
    }
  }
  const requestStub = {
    params: ['addr', 'ji', 8]
  }
  // act
  const result = events(requestStub, null, { web3: web3Stub })
  // assert
  result.subscribe(value => {
    t.deepEqual(value, { event: 'pay_fee', amount: 5 })
  })

  eventEmitter.emit('data', { event: 'pay_fee', amount: 5 })
})

test('should create transaction intent', async (t) => {
  t.plan(1)

  const web3 = new Web3()
  const { keccak256, padLeft } = web3.utils

  const externalContractAddress = '0xd6ae8250b8348c94847280928c79fb3b63ca453e'
  const permissionsCreator = '0x7ffC57839B00206D1ad20c69A1981b489f772031'

  const wrapper = {
    web3,
    applyTransactionGas: (tx) => Promise.resolve(tx),
    performTransactionPath: sinon.stub(),
    getAccounts: () => Promise.resolve([permissionsCreator])
  }

  const methodABI = {
    'constant': false,
    'inputs': [
      {
        'name': '_permissionsCreator',
        'type': 'address'
      }
    ],
    'name': 'initialize',
    'outputs': [],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
  }
  const txOpts = {
    gasPrice: 1,
    description: 'custom description'
  }

  const request = {
    jsonrpc: '2.0',
    id: 'uuid4',
    method: 'external_intent',
    params: [
      externalContractAddress,
      methodABI,
      permissionsCreator,
      txOpts
    ]
  }

  await intent(request, null, wrapper)

  const functionSig = keccak256('initialize(address)').slice(0, 10)
  const expected = {
    ...txOpts,
    external: true,
    to: externalContractAddress,
    from: permissionsCreator,
    data: `${functionSig}${padLeft(permissionsCreator.slice(2), 64).toLowerCase()}`
  }

  t.deepEqual(wrapper.performTransactionPath.getCall(0).args[0], [expected])
})
