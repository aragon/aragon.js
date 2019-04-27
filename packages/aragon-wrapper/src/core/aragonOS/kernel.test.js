import test from 'ava'
import sinon from 'sinon'
import { soliditySha3 } from 'web3-utils'
import * as kernel from './kernel'

test.afterEach.always(() => {
  sinon.restore()
})

// Kernel.setApp(APP_BASES_NAMESPACE, namehash('voting.aragonpm.eth'), '0x7FB5C052A391953De579b0ed7dC87aD59a9A5473')
const SET_APP_TX_DATA = '0xae5b2540f1f3eb40f5bc1ad1344716ced8b8a0431d840b5783aea1fd01786bc26f35ac0f9fa3927f639745e587912d4b0fea7ef9013bf93fb907d29faeab57417ba6e1d40000000000000000000000007fb5c052a391953de579b0ed7dc87ad59a9a5473'
// Kernel.initialize('0xd95677b5b3bc3c89c4c2c3ab702b0aa5d5cb28af', '0x0000000000000000000000000000000000000000')
const INITIALIZE_TX_DATA = '0x485cc955000000000000000000000000d95677b5b3bc3c89c4c2c3ab702b0aa5d5cb28af0000000000000000000000000000000000000000000000000000000000000000'

test('aragonOS/kernel: decodeKernelSetAppParameters', async (t) => {
  t.plan(4)
  // arrange
  const setAppData = SET_APP_TX_DATA
  const notSetAppData = INITIALIZE_TX_DATA
  // act
  const decodedData = kernel.decodeKernelSetAppParameters(setAppData)
  // assert
  t.is(decodedData.namespace, '0xf1f3eb40f5bc1ad1344716ced8b8a0431d840b5783aea1fd01786bc26f35ac0f')
  t.is(decodedData.appId, '0x9fa3927f639745e587912d4b0fea7ef9013bf93fb907d29faeab57417ba6e1d4')
  t.is(decodedData.appAddress, '0x7FB5C052A391953De579b0ed7dC87aD59a9A5473')

  t.throws(
    () => kernel.decodeKernelSetAppParameters(notSetAppData),
    {
      instanceOf: Error
    }
  )
})

test('aragonOS/kernel: getKernelNamespace', async (t) => {
  t.plan(3)
  // arrange
  // soliditySha3('core')
  const coreNamespaceHash = '0xc681a85306374a5ab27f0bbc385296a54bcd314a1948b6cf61c4ea1bc44bb9f8'
  // act
  const result = kernel.getKernelNamespace(coreNamespaceHash)
  const emptyResult = kernel.getKernelNamespace()
  // assert
  t.is(result.hash, coreNamespaceHash)
  t.is(result.name, 'Core')
  t.is(emptyResult, null)
})

test('aragonOS/kernel: isKernelAppCodeNamespace', async (t) => {
  t.plan(2)
  // arrange
  const appCodeNamespace = soliditySha3('base')
  // act
  const result = kernel.isKernelAppCodeNamespace(appCodeNamespace)
  const emptyResult = kernel.isKernelAppCodeNamespace()
  // assert
  t.true(result)
  t.false(emptyResult)
})

test('aragonOS/kernel: isKernelSetAppIntent', async (t) => {
  t.plan(3)

  // arrange
  const kernelApp = {
    proxyAddress: '0x123',
    functions: [
      {
        sig: 'initialize(address,address)',
        roles: [],
        notice: 'Initializes a kernel instance along with its ACL and sets `_permissionsCreator` as the entity that can create other permissions'
      },
      {
        sig: 'setApp(bytes32,bytes32,address)',
        roles: [
          'APP_MANAGER_ROLE'
        ],
        notice: 'Set the resolving address of `_appId` in namespace `_namespace` to `_app`'
      }
    ]
  }
  const setAppIntent = {
    to: '0x123',
    data: SET_APP_TX_DATA
  }
  const initializeIntent = {
    to: '0x123',
    data: INITIALIZE_TX_DATA
  }
  const otherAppIntent = {
    to: '0x456',
    // vote(0, true)
    data: '0xc9d27afe00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001'
  }

  // act
  const setAppResult = kernel.isKernelSetAppIntent(kernelApp, setAppIntent)
  const initializeResult = kernel.isKernelSetAppIntent(kernelApp, initializeIntent)
  const otherAppResult = kernel.isKernelSetAppIntent(kernelApp, otherAppIntent)

  // assert
  t.true(setAppResult)
  t.false(initializeResult)
  t.false(otherAppResult)
})
