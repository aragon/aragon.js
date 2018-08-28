import test from 'ava'
import sinon from 'sinon'
import proxyquire from 'proxyquire'
import { Observable } from 'rxjs/Rx'

const makeProxyStub = sinon.stub()
const Aragon = proxyquire.load('./index', {
  '@aragon/messenger': {
    '@noCallThru': true
  },
  './utils': {
    makeProxy: makeProxyStub
  }
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
  await instance.initAccounts()
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
  })
  const changePermissionManagerEvents = Observable.create(observer => {
    observer.next({
      event: 'ChangePermissionManager',
      returnValues: {
        app: 'counter',
        role: 'subtract',
        manager: 'manager',
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
  makeProxyStub.returns(aclProxyStub)
  // act
  await instance.initAcl()
  // assert
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
  })
})

test('should init the apps correctly', async (t) => {
  t.plan(2)
  // arrange
  const instance = new Aragon()
  instance.permissions = Observable.create((observer) => {
    observer.next({
      '0x123': 'some permissions',
      '0x456': 'some permissions',
      '0x789': 'some permissions'
    })
  })
  instance.kernelProxy = { address: '0x123' }
  instance.getAppProxyValues = (appAddress) => ({
    kernelAddress: '0x123',
    appId: appAddress === '0x456' ? 'counterApp' : 'votingApp',
    proxyAddress: appAddress
  })
  instance.apm.getLatestVersionForContract = (appId) => Promise.resolve({
    abi: `abi for ${appId}`,
  })
  // act
  await instance.initApps()
  // assert
  instance.appsWithoutIdentifiers.subscribe(value => {
    t.deepEqual(value, [
      {
        appId: 'counterApp',
        kernelAddress: '0x123',
        abi: 'abi for counterApp',
        proxyAddress: '0x456'
      }, {
        appId: 'votingApp',
        kernelAddress: '0x123',
        abi: 'abi for votingApp',
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
        appId: 'counterApp',
        kernelAddress: '0x123',
        abi: 'abi for counterApp',
        proxyAddress: '0x456',
        identifier: 'CNT'
      }, {
        appId: 'votingApp',
        kernelAddress: '0x123',
        abi: 'abi for votingApp',
        proxyAddress: '0x789'
      }
    ])
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

// runApp
// getPermissionManager 
// getApp 
// calculateTransactionPath 
// rpc/handlers/external.js
// rpc/handlers/index
