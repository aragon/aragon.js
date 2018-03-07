import 'babel-polyfill'
import Aragon from './'
import Web3 from 'web3'
import debug from 'debug'

const PrivateKeyProvider = require('truffle-privatekey-provider')
const { rpc, key } = require(require('homedir')()+'/.rinkebykey.json')
const rinkebyProvider = new PrivateKeyProvider(key, rpc)

const wrapper = new Aragon(
  '0x94b8a1c323ef9da0b9df74ba0edb45fd7ddd8151',
  { provider: rinkebyProvider,
    ensRegistryAddress: '0xaa0ccb537289d226941745c4dd7a819a750897d0',
    apm: {
      provider: rinkebyProvider,
    },
    from: '0x4cB3FD420555A09bA98845f0B816e45cFb230983',
  }
)

const log = debug('wrapper')

wrapper.templates.newDAO('multisig', 'B', [['0x2e0ecaae14bc77001ba0c0c2500c60af1e12c981', '0xbf2edcb9e51c37be45c731ead4e077cf1debc661'], 1]).then(console.log)
wrapper.templates.newDAO('democracy', 'J', [['0x2e0ecaae14bc77001ba0c0c2500c60af1e12c981', '0xbf2edcb9e51c37be45c731ead4e077cf1debc661'], [1,2], 5000000, 10000, 5000]).then(console.log)
