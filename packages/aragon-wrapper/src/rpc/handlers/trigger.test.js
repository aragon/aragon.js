import test from 'ava'
import { triggerSubscribe } from './trigger'
import { from } from 'rxjs'

test('should receive and filter through correct trigger events', async t => {
  t.plan(1)
  const mockProxy = { address: '0xdeaddead' }
  const triggerEventObservable = from([
    {
      origin: '0x0',
      frontendEvent: {
        event: 'TriggerTest',
        returnValues: {
          testVal: 1
        }
      }
    },
    {
      origin: mockProxy.address,
      frontendEvent: {
        event: 'TriggerTest',
        returnValues: {
          testVal: 1
        }
      }
    }
  ])

  const mockWrapper = { trigger: triggerEventObservable }
  triggerSubscribe(null, mockProxy, mockWrapper).subscribe(value => {
    t.deepEqual(value, {
      event: 'TriggerTest',
      returnValues: {
        testVal: 1
      }
    })
  })
})
