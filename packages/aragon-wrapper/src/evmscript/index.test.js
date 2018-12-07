import test from 'ava'
import * as script from './'

test('encodeCallScript', t => {
  const callScript = script.encodeCallScript([
    {
      to: '0xcafe1a77e84698c83ca8931f54a755176ef75f2c',
      data: '0xcafe',
    },
    {
      to: '0xbeefbeef03c7e5a1c29e0aa675f8e16aee0a5fad',
      data: '0xbeef',
    },
  ])

  t.is(
    callScript.slice(0, 10),
    script.CALLSCRIPT_ID,
    'callscript should start with script ID 1'
  )
  t.is(
    callScript.slice(10, 50),
    'cafe1a77e84698c83ca8931f54a755176ef75f2c',
    'first part of callscript should be address for tx 1'
  )
  t.is(
    callScript.slice(50, 58),
    '00000002',
    'second part of callscript should be data length for tx 1'
  )
  t.is(
    callScript.slice(58, 62),
    'cafe',
    'third part of callscript should be data for tx 1'
  )
  t.is(
    callScript.slice(62, 102),
    'beefbeef03c7e5a1c29e0aa675f8e16aee0a5fad',
    'fourth part of callscript should be address for tx 2'
  )
  t.is(
    callScript.slice(102, 110),
    '00000002',
    'fifth part of callscript should be data length for tx 2'
  )
  t.is(
    callScript.slice(110, 114),
    'beef',
    'sixth part of callscript should be data for tx 2'
  )
})
