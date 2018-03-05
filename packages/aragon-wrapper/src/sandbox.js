import 'babel-polyfill'
import Aragon from './'
import Web3 from 'web3'
import debug from 'debug'

const wrapper = new Aragon(
  '0x94b8a1c323ef9da0b9df74ba0edb45fd7ddd8151',
  { provider: new Web3.providers.HttpProvider('http://localhost:8545'),
    ensRegistryAddress: '0x2e0ecaae14bc77001ba0c0c2500c60af1e12c980',
    apm: {
      provider: new Web3.providers.HttpProvider('http://localhost:8545'),
    },
    from: '0x1f7402f55e142820ea3812106d0657103fc1709e',
  }
)

const log = debug('wrapper')

// wrapper.templates.newDAO('multisig', 'bareto', [['0x2e0ecaae14bc77001ba0c0c2500c60af1e12c980', '0xbf2edcb9e51c37be45c731ead4e077cf1debc66a'], 2]).then(console.log)
wrapper.templates.newDAO('democracy', 'LOLOLO', [['0x2e0ecaae14bc77001ba0c0c2500c60af1e12c980', '0xbf2edcb9e51c37be45c731ead4e077cf1debc66a'], [1,2], 10, 5, 500]).then(console.log)
