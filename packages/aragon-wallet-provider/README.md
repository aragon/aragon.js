# Aragon Wallet Provider

This is a wallet provider for Smart Organizations made with Aragon. It can be used anywhere you can inject a provider to allow you to act as the Smart Organization. It can be used in a truffle configuration, and can be concatenated with itself to path a transaction through several Smart Organizations.


## Truffle Usage

You can easily use this within a Truffle configuration. For instance:

truffle-config.js
```javascript
const Web3WsProvider = require('web3-providers-ws')
const AragonProvider = require('test-wallet-provider')

let developmentProvider, developmentDAO = {}

developmentProvider = new Web3WsProvider(`ws://localhost:8545`)
const providerForNetwork = () => (
    () => {
      return new AragonProvider(
        developmentProvider,
        "0x5f6f7e8cc7346a11ca2def8f827b7a0b612c56a1",
        "0xCb0FF465e3847606603A51cc946353A41Fea54c0",
        "0x037D0f69250A5B21c8902c9efd71f467Df8680bE")
    }
  )

module.exports = {
  networks: {
    development: {
      network_id: '*',
      provider: developmentProvider
    },
    app: {
      provider: providerForNetwork(),
      network_id: '*'
    }
  }
}

```

## Parameters

- `subProvider`: `provider`. The provider making the underlying calls. This can be another Aragon provider if you want to path a transaction through multiple daos.
- `ens`: `address`. The ethereum address of the ens for the dao.
- `dao`: `address`. The ethereum address for the dao
- `forwardingAddress`: `address`, The address that will be the final address executing transactions sent.
