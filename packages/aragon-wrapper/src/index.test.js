import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Observable } from 'rxjs/Rx'

const aragonOSCoreStub = {
  getAragonOsInternalAppInfo: sinon.stub()
}
const messengerConstructorStub = sinon.stub()
const utilsStub = {
  makeAddressMapProxy: sinon.fake.returns({}),
  makeProxy: sinon.stub(),
  addressesEqual: Object.is
}
const Aragon = proxyquire.noCallThru().load('./index', {
  '@aragon/messenger': messengerConstructorStub,
  './core/aragonOS': aragonOSCoreStub,
  './utils': utilsStub
}).default

test.afterEach.always(() => {
  sinon.restore()
})

test('should get the accounts', async (t) => {
  // arrange
  const instance = new Aragon()
  instance.web3 = {
    eth: {
      getAccounts: sinon.stub().returns(['0x01', '0x02'])
    }
  }
  // act
  await instance.initAccounts(null)
  const accounts = await instance.getAccounts()
  // assert
  t.deepEqual(accounts, ['0x01', '0x02'])
})

test('should init the ACL correctly', async (t) => {
  t.plan(1)
  // arrange
  const setPermissionEvents = Observable.create(observer => {
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'add',
        allowed: true,
        entity: '0x1'
      }
    })
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        allowed: true,
        entity: '0x1'
      }
    })
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'add',
        allowed: true,
        entity: '0x2'
      }
    })
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        allowed: true,
        entity: '0x2'
      }
    })
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        allowed: false,
        entity: '0x2'
      }
    })
    // duplicate, should not affect the final result because we use a Set
    observer.next({
      event: 'SetPermission',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        allowed: false,
        entity: '0x2'
      }
    })
  })
  const changePermissionManagerEvents = Observable.create(observer => {
    observer.next({
      event: 'ChangePermissionManager',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        manager: 'manager'
      }
    })
  })
  const instance = new Aragon()
  instance.kernelProxy = {
    call: sinon.stub()
  }
  const aclProxyStub = {
    events: sinon.stub()
  }
  aclProxyStub.events.withArgs('SetPermission').returns(setPermissionEvents)
  aclProxyStub.events.withArgs('ChangePermissionManager').returns(changePermissionManagerEvents)
  utilsStub.makeProxy.returns(aclProxyStub)
  // act
  await instance.initAcl()
  // assert, tell ava to wait for the permissions observable to debounce
  return new Promise(resolve => {
    instance.permissions.subscribe(value => {
      t.deepEqual(value, {
        counter: {
          add: {
            allowedEntities: ['0x1', '0x2']
          },
          subtract: {
            allowedEntities: ['0x1'],
            manager: 'manager'
          }
        }
      })
      // The permissions observable debounces, so we should only get one value back
      setTimeout(resolve, 2000)
    })
  })
})

const kernelAddress = '0x123'
const appInitTestCases = [
  [
    'with kernel in permissions',
    {
      [kernelAddress]: 'some permissions',
      '0x456': 'some permissions',
      '0x789': 'some permissions'
    }
  ],
  [
    'without kernel in permissions',
    {
      '0x456': 'some permissions',
      '0x789': 'some permissions'
    }
  ]
]
appInitTestCases.forEach(([ testName, permissionsObj ]) => {
  test(`should init the apps correctly - ${testName}`, async (t) => {
    t.plan(2)
    // arrange
    const instance = new Aragon()
    instance.permissions = Observable.create((observer) => {
      observer.next(permissionsObj)
    })
    const appIds = {
      '0x123': 'kernel',
      '0x456': 'counterApp',
      '0x789': 'votingApp'
    }
    aragonOSCoreStub.getAragonOsInternalAppInfo.withArgs(appIds[kernelAddress]).returns({
      abi: 'abi for kernel',
      isAragonOsInternalApp: true
    })
    instance.kernelProxy = { address: '0x123' }
    instance.getProxyValues = async (appAddress) => ({
      appId: appIds[appAddress],
      codeAddress: '0x',
      kernelAddress: '0x123',
      proxyAddress: appAddress
    })
    instance.apm.getLatestVersionForContract = (appId) => Promise.resolve({
      abi: `abi for ${appId}`
    })
    // act
    await instance.initApps()
    // assert
    instance.appsWithoutIdentifiers.subscribe(value => {
      t.deepEqual(value, [
        {
          abi: 'abi for kernel',
          appId: 'kernel',
          codeAddress: '0x',
          isAragonOsInternalApp: true,
          kernelAddress: '0x123',
          proxyAddress: '0x123'
        }, {
          abi: 'abi for counterApp',
          appId: 'counterApp',
          codeAddress: '0x',
          kernelAddress: '0x123',
          proxyAddress: '0x456'
        }, {
          abi: 'abi for votingApp',
          appId: 'votingApp',
          codeAddress: '0x',
          kernelAddress: '0x123',
          proxyAddress: '0x789'
        }
      ])
    })

    // hack: wait 200ms for the subscribe callback above to be called,
    // otherwise it will emit with the identifier set below
    await new Promise(resolve => setTimeout(resolve, 200))

    // act
    await instance.setAppIdentifier('0x456', 'CNT')
    // assert
    instance.apps.subscribe(value => {
      t.deepEqual(value, [
        {
          abi: 'abi for kernel',
          appId: 'kernel',
          codeAddress: '0x',
          isAragonOsInternalApp: true,
          kernelAddress: '0x123',
          proxyAddress: '0x123'
        }, {
          abi: 'abi for counterApp',
          appId: 'counterApp',
          codeAddress: '0x',
          kernelAddress: '0x123',
          proxyAddress: '0x456',
          identifier: 'CNT'
        }, {
          abi: 'abi for votingApp',
          appId: 'votingApp',
          codeAddress: '0x',
          kernelAddress: '0x123',
          proxyAddress: '0x789'
        }
      ])
    })
  })
})

test('should init the forwarders correctly', async (t) => {
  t.plan(1)
  // arrange
  const instance = new Aragon()
  instance.apps = Observable.create((observer) => {
    observer.next([
      {
        appId: 'counterApp',
        isForwarder: true
      }, {
        appId: 'votingApp',
        isForwarder: false
      }
    ])
  })
  // act
  await instance.initForwarders()
  // assert
  instance.forwarders.subscribe(value => {
    t.deepEqual(value, [
      {
        appId: 'counterApp',
        isForwarder: true
      }
    ])
  })
})

test('should init the notifications correctly', async (t) => {
  t.plan(7)
  // arrange
  const instance = new Aragon()
  instance.cache.get = sinon.stub()
    .withArgs('notifications').returns([
      {
        read: true,
        title: 'send'
      }, {
        read: false,
        title: 'receive'
      }
    ])
  instance.cache.set = sinon.stub()
  // act
  await instance.initNotifications()
  // assert
  instance.notifications.subscribe(value => {
    t.is(value[0].read, true)
    t.is(value[0].title, 'send')

    t.is(value[1].read, false)
    t.is(value[1].title, 'receive')
    // only the receive notification should get an acknowledge fn attached
    t.is('acknowledge' in value[1], true)
  })

  t.is(instance.cache.set.getCall(0).args[0], 'notifications')
  t.is(instance.cache.set.getCall(0).args[1].length, 2)
})

test('should send notifications correctly', async (t) => {
  t.plan(12)
  // arrange
  const instance = new Aragon()
  // act
  await instance.initNotifications()
  await instance.sendNotification('counterApp', 'add')
  await instance.sendNotification('counterApp', 'subtract', null, null, new Date(2))

  // assert
  instance.notifications.subscribe(value => {
    t.is(value[0].app, 'counterApp')
    t.is(value[0].title, 'subtract')
    t.is(value[0].read, false)
    t.is(value[0].body, null)
    t.is(value[0].context, null)
    // uuidv4
    t.is(value[0].id.length, 36)

    t.is(value[1].app, 'counterApp')
    t.is(value[1].title, 'add')
    t.is(value[1].read, false)
    t.is(value[1].body, undefined)
    t.deepEqual(value[1].context, {})
    t.is(value[1].id.length, 36)
  })
})

test('should run the app and reply to a request', async (t) => {
  // Note: This is not a "real" unit test because the rpc handlers are not mocked
  t.plan(4)
  // arrange
  const requestsStub = Observable.create((observer) => {
    observer.next({
      id: 'uuid1',
      method: 'cache',
      params: ['get', 'settings']
    })
  })
  const messengerStub = {
    sendResponse: sinon.stub(),
    requests: () => requestsStub
  }
  messengerConstructorStub.withArgs('someMessageProvider').returns(messengerStub)
  const instance = new Aragon()
  instance.cache.observe = sinon.stub()
    .withArgs('0x789.settings')
    .returns(Observable.create((observer) => {
      observer.next('user settings for the voting app')
    }))
  instance.appsWithoutIdentifiers = Observable.create((observer) => {
    observer.next([
      {
        appId: 'some other app with a different proxy',
        proxyAddress: '0x456'
      }, {
        appId: 'votingApp',
        kernelAddress: '0x123',
        abi: 'abi for votingApp',
        proxyAddress: '0x789'
      }
    ])
  })
  utilsStub.makeProxyFromABI = (proxyAddress) => ({ address: proxyAddress })
  instance.kernelProxy = { initializationBlock: 0 }
  // act
  const result = await instance.runApp('someMessageProvider', '0x789')
  // assert
  t.true(result.shutdown !== undefined)
  t.true(result.setContext !== undefined)
  /**
   * What we're testing here is that the request for getting the cache (messenger.requests())
   * is handled by the appropriate requestHandler.
   */
  t.is(messengerStub.sendResponse.getCall(0).args[0], 'uuid1')
  t.is(messengerStub.sendResponse.getCall(0).args[1], 'user settings for the voting app')
})

test('should get the app from a proxy address', async (t) => {
  t.plan(1)
  // arrange
  const instance = new Aragon()
  instance.apps = Observable.create((observer) => {
    observer.next([
      {
        appId: 'some other app with a different proxy',
        proxyAddress: '0x456'
      }, {
        appId: 'votingApp',
        kernelAddress: '0x123',
        abi: 'abi for votingApp',
        proxyAddress: '0x789'
      }
    ])
  })
  // act
  const result = await instance.getApp('0x789')
  // assert
  t.deepEqual(result, {
    appId: 'votingApp',
    kernelAddress: '0x123',
    abi: 'abi for votingApp',
    proxyAddress: '0x789'
  })
})

test('should get the permission manager', async (t) => {
  t.plan(1)
  // arrange
  const instance = new Aragon()
  instance.permissions = Observable.create(observer => {
    observer.next({
      counter: {
        add: {
          allowedEntities: ['0x1', '0x2']
        },
        subtract: {
          allowedEntities: ['0x1'],
          manager: 'im manager'
        }
      }
    })
  })
  // act
  const result = await instance.getPermissionManager('counter', 'subtract')
  // assert
  t.is(result, 'im manager')
})

test('should throw if no ABI is found, when calculating the transaction path', async (t) => {
  t.plan(1)
  // arrange
  const instance = new Aragon()
  instance.permissions = Observable.create(observer => {
    observer.next({
      counter: {
        add: {
          allowedEntities: ['0x1', '0x2']
        },
        subtract: {
          allowedEntities: ['0x1'],
          manager: 'im manager'
        }
      }
    })
  })
  instance.forwarders = Observable.create(observer => {
    observer.next([
      {
        appId: 'forwarderA',
        proxyAddress: '0x999'
      }
    ])
  })
  instance.apps = Observable.create(observer => {
    observer.next([
      {
        appId: 'counterApp',
        kernelAddress: '0x123',
        abi: 'abi for counterApp',
        proxyAddress: '0x456'
      }, {
        appId: 'votingApp',
        kernelAddress: '0x123',
        // abi: 'abi for votingApp',
        proxyAddress: '0x789'
      }
    ])
  })
  // act
  return instance.calculateTransactionPath(null, '0x789')
    .catch(err => {
      // assert
      t.is(err.message, 'No ABI specified in artifact for 0x789')
      /*
       * Note: This test also "asserts" that the permissions object, the app object and the
       * forwarders array does not throw any errors when they are being extracted from their observables.
       */
    })
})
