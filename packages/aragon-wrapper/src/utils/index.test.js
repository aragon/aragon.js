import test from 'ava'
import sinon from 'sinon'
import * as utils from './index'

test.afterEach.always(() => {
  sinon.restore()
})

test('should enhance an object to lookup eth addresses easier', async (t) => {
  // arrange
  const bobAddress = '0x0000000000000000000000000000000000000aBc'
  const bobPermissions = ['read', 'write']
  // act
  const permissions = utils.makeAddressMapProxy({})
  permissions[bobAddress] = bobPermissions
  // assert
  t.is(permissions['0x0000000000000000000000000000000000000ABC'], bobPermissions)
  t.is(permissions['0x0000000000000000000000000000000000000abc'], bobPermissions)
  t.is(permissions['0x0000000000000000000000000000000000000aBc'], bobPermissions)
  // addresses with invalid checksums
  // (the checksum is checked if the address has both upper and lowercase letters)
  t.is(permissions['0x0000000000000000000000000000000000000aBC'], undefined)
  t.is(permissions['0x0000000000000000000000000000000000000abC'], undefined)
  t.is(permissions['0x0000000000000000000000000000000000000ABc'], undefined)
})

test('should initialise the proxy with its keys in lowercase', async (t) => {
  // arrange
  const dianeAddress = '0x0000000000000000000000000000000000000ABC'
  const dianePermissions = ['read', 'write']
  // act
  const permissions = utils.makeAddressMapProxy({
    [dianeAddress]: dianePermissions
  })
  // permissions[bobAddress] = bobPermissions
  // assert
  t.is(permissions['0x0000000000000000000000000000000000000ABC'], dianePermissions)
  t.is(permissions['0x0000000000000000000000000000000000000abc'], dianePermissions)
  t.is(permissions['0x0000000000000000000000000000000000000aBc'], dianePermissions)
})