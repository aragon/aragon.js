import test from 'ava'
import getForwardedActions from './get-forwarded-actions'
import { from } from 'rxjs'

test('should receive and filter the forwardedActions registry', async (t) =>{
  t.plan(2)

  const forwardedActionsObservable = from([
    [{
      currentApp: '0xbeefbeef',
      actionId: '1',
      target: '0xdeaddead',
      evmScript: '0x00000001abc',
      state:  0,
    },
    {
      currentApp: '0xfed',
      actionId: '1',
      target: '0xdeaddead',
      evmScript: '0x00000001xyz',
      state:  2,
    }],
    [{
      currentApp: '0xbeefbeef',
      actionId: '1',
      target: '0xdeaddead',
      evmScript: '0x00000001abc',
      state:  0,
    },
    {
      currentApp: '0xbeefbeef',
      actionId: '1',
      target: '0xbeefdead',
      evmScript: '0x00000001abc',
      state:  0,
    },
    {
      currentApp: '0xfed',
      actionId: '1',
      target: '0xdeaddead',
      evmScript: '0x00000001xyz',
      state:  2,
    }],
    [{
      currentApp: '0xbeefbeef',
      actionId: '1',
      target: '0xbeefdead',
      evmScript: '0x00000001abc',
      state:  0,
    },
    {
      currentApp: '0xbeefbeef',
      actionId: '1',
      evmScript: '0x00000001abc',
      state:  0,
    }]
  ])

  const mockProxy = { address: '0xdeaddead' }
  const mockWrapper = { forwardedActions: forwardedActionsObservable }

  getForwardedActions(null, mockProxy, mockWrapper).subscribe(value => {
    t.deepEqual(value, {
      event: 'ForwardedActions',
      returnValues: [{
        currentApp: '0xbeefbeef',
        actionId: '1',
        target: '0xdeaddead',
        evmScript: '0x00000001abc',
        state:  0,
      },
      {
        currentApp: '0xfed',
        actionId: '1',
        target: '0xdeaddead',
        evmScript: '0x00000001xyz',
        state:  2,
      }]}
    )
  })
})