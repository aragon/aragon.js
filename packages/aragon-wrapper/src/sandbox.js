import Aragon from './'
import Web3 from 'web3'
import debug from 'debug'

const wrapper = new Aragon(
  '0x94b8a1c323ef9da0b9df74ba0edb45fd7ddd8151',
  {
    provider: new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws'),
    ensRegistryAddress: '0xf242918942086016bbeb036ce93a9b42124016ef'
  }
)

const log = debug('wrapper')
wrapper.init().then(() => {
  wrapper.permissions.subscribe(
    debug('permissions')
  )

  wrapper.apps.subscribe(
    debug('apps'),
    debug('apps')
  )

  wrapper.forwarders.subscribe(
    debug('forwarders'),
    debug('forwarders')
  )
}, log)
