const Web3 = require('web3')
const Aragon = require('./build/wrapper').default

const node = process.env.npm_package_config_rpc

const start = async () => {
  const wrapper = new Aragon(process.env.npm_package_config_dao, new Web3.providers.HttpProvider(node))
  try {
    await wrapper.initACL()
    setTimeout(async () => {
      try {
        console.log('gogogo')
        await wrapper.acl().stateObservable().subscribe(
          function (x) {
          console.log('Next: %s', x)
        })
      } catch (e) {
        console.log('exception thrown 2', e)
      }
    }, 1000)
  } catch (e) {
    console.log('exception thrown', e)
  }
}

const keepAlive = () => {
  (function wait () {
    if (true) setTimeout(wait, 1000)
  })()
}

start()
keepAlive()
