import test from 'ava'
import sinon from 'sinon'
import { BehaviorSubject } from 'rxjs'

import { tryEvaluatingRadspec } from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should evaluate radspec with default ETH currency successfully', async (t) => {
  t.plan(0)

  // arrange
  const initialApps = [{
    appId: 'finance',
    functions: [{
      abi: {
        type: "function",
        name: "transfer",
        constant: false,
        payable: false,
        inputs: [{ type: "address"}, { type: "uint256" }],
        outputs: []
      },
      sig: 'transfer(address,uint256)',
      roles: [],
      notice: 'Transfer `@tokenAmount(self, $2)` to `$1` '
    }]
  }]
  const appsMock = new BehaviorSubject(initialApps)
  const networkMock = new BehaviorSubject({ type: 'rinkeby'})
  const wrapperStub = {
    apps: appsMock,
    network: networkMock,
    web3: { currentProvider: null }
  }

  const intentStub = {
    to: '0x960b236A07cf122663c4303350609A66A7B288C0',
    data: '0xa9059cbb00000000000000000000000031ab1f92344e3277ce9404e4e097dab7514e6d2700000000000000000000000000000000000000000000000821ab0d4414980000'
  }

  // act
  const result = await tryEvaluatingRadspec(intentStub, wrapperStub)
  console.log('result', result)

  
})


