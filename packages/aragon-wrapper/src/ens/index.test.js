import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'

test.beforeEach(t => {
  const ethjsEnsStub = sinon.stub()
  const ens = proxyquire.noCallThru().load('./index', {
    'ethjs-ens': ethjsEnsStub
  })

  t.context = {
    ens,
    ethjsEnsStub
  }
})

test.afterEach.always(() => {
  sinon.restore()
})

test('should lookup name', (t) => {
  const { ens, ethjsEnsStub } = t.context

  // arrange
  const options = {
    provider: {
      sendAsync: 2
    }
  }
  ethjsEnsStub.prototype.lookup = sinon.stub().returns('0x01')
  // act
  const result = ens.resolve('aragon.eth', options)
  // assert
  t.is(result, '0x01')
  t.is(ethjsEnsStub.prototype.lookup.getCall(0).args[0], 'aragon.eth')
  t.is(ethjsEnsStub.getCall(0).args[0], options)
})

test('should resolve address for node', (t) => {
  const { ens, ethjsEnsStub } = t.context

  // arrange
  const hackyOptions = {
    provider: {
      sendAsync: undefined
    }
  }
  ethjsEnsStub.prototype.resolveAddressForNode = sinon.stub().returns('0x02')
  // act
  const result = ens.resolve('node')
  // assert
  t.is(result, '0x02')
  t.is(ethjsEnsStub.prototype.resolveAddressForNode.getCall(0).args[0], 'node')
  t.deepEqual(ethjsEnsStub.getCall(0).args[0], hackyOptions)
})
