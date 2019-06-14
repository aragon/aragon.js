import test from 'ava'
import getAppMetadata from './get-app-metadata'
import { from } from 'rxjs'

test.only('should receive and filter the app metadata registry', async (t) => {
  t.plan(1)

  const getAppMetadataObservable = from([
    [{
      from: '0x73a',
      to: [ '0xdeadcafe' ],
      dataId: 'u1',
      cid: 'Qmrandomhash'
    },
    {
      from: '0xfed',
      to: [ '0xcafe', '0xdeaddead' ],
      dataId: 'u2',
      cid: 'Qmrandomhash'
    },
    {
      from: '0xfed1',
      to: ['*'],
      dataId: 'u32',
      cid: 'Qmrandomhash2'
    }]
  ])

  const mockProxy = { address: '0xdeaddead' }
  const mockWrapper = { appMetadata: getAppMetadataObservable }

  getAppMetadata(null, mockProxy, mockWrapper).subscribe(value => {
    t.deepEqual(value, {
      event: 'AppMetadata',
      returnValues: [{
        from: '0xfed',
        to: [ '0xcafe', '0xdeaddead' ],
        dataId: 'u2',
        cid: 'Qmrandomhash'
      },
      {
        from: '0xfed1',
        to: ['*'],
        dataId: 'u32',
        cid: 'Qmrandomhash2'
      }]
    })
  })
})
