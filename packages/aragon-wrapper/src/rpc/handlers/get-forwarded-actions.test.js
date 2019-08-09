import test from 'ava'
import getForwardedActions from './get-forwarded-actions'
import { from } from 'rxjs'

test('should receive and filter the forwardedActions registry', async (t) => {
  t.plan(2)

  const mockProxy = { address: '0xdeaddead' }
  const forwardedActionsObservable = from([
    {
      [mockProxy.address]: {
        pending: [{ // first value
          currentApp: '0xbeefbeef',
          actionId: '1',
          target: '0xdeaddead',
          evmScript: '0x00000001abc',
          state: 0
        },
        {
          currentApp: '0xfed',
          actionId: '1',
          target: '0xdeaddead',
          evmScript: '0x00000001xyz',
          state: 2
        }]
      }
    },
    {
      '0xbeefdead': { pending: [{ // should filter out this entry
        currentApp: '0xbeefbeef',
        actionId: '1',
        target: '0xbeefdead',
        evmScript: '0x00000001abc',
        state: 0
      }]
      },
      [mockProxy.address]: { pending: [{ // second value
        currentApp: '0xbeefbeef',
        actionId: '1',
        target: '0xdeaddead',
        evmScript: '0x00000001abc',
        state: 0
      },
      {
        currentApp: '0xfed',
        actionId: '1',
        target: '0xdeaddead',
        evmScript: '0x00000001xyz',
        state: 2
      }] }
    },
    {
      '0xbeefdead': { pending: [{ // should not emit an observable for this value
        currentApp: '0xbeefbeef',
        actionId: '1',
        target: '0xbeefdead', // target address mismatch
        evmScript: '0x00000001abc',
        state: 0
      },
      { // missing a target address
        currentApp: '0xbeefbeef',
        actionId: '2',
        evmScript: '0x00000001abc',
        state: 0
      }]
      }
    }

  ])

  const mockWrapper = { forwardedActions: forwardedActionsObservable }

  getForwardedActions(null, mockProxy, mockWrapper).subscribe(value => {
    t.deepEqual(value, {
      event: 'ForwardedActions',
      returnValues: {
        pending: [{
          currentApp: '0xbeefbeef',
          actionId: '1',
          target: '0xdeaddead',
          evmScript: '0x00000001abc',
          state: 0
        },
        {
          currentApp: '0xfed',
          actionId: '1',
          target: '0xdeaddead',
          evmScript: '0x00000001xyz',
          state: 2
        }]
      }
    })
  })
})
