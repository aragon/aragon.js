import Proxy from './Proxy'

export default class ACL {
  constructor(kernelProxy, wrapper) {
    this.wrapper = wrapper
    this.web3 = wrapper.web3
    this.kernel = kernelProxy
  }

  async init() {
    const aclAddr = await this.kernel.contract.methods.acl().call()
    this.acl = this.aclProxy(aclAddr)
    console.log('events')
    const eventObs = await this.acl.events()

    eventObs.subscribe(x => console.log('x', x.event))

    this._state = eventObs.scan(
        (state, { returnValues: values }) => {
          console.log('scan values', values)

          if (!state[values.app]) state[values.app] = {}
          const currentPermissions = state[values.app][values.role] || []

          if (values.allowed) {
            state[values.app][values.role] = currentPermissions.concat([values.entity])
          } else {
            state[values.app][values.role] = currentPermissions
              .filter((entity) => entity !== values.entity)
          }

          console.log('scan state', state)
          return state
        }, {}
      )

      this._state.last().subscribe(x => console.log('xa', x))
  }

  aclProxy(address) {
    return new Proxy(address, require('../../abi/aragon/ACL.json'), this.wrapper)
  }

  async canPerformAction(who, where, what, how, state = false) {
    if (!state) {
      return this.acl.contract.methods.hasPermission(who, where, what, how).call()
    } else {
      const state = this.state()
      return state[who][where][what]
    }
  }

  stateObservable() {
    return this._state
  }

  async state() {
    //return new Promise((r, s) => this._state.last().subscribe(r, s))
  }

  getTransactionPath(address, sig) {

  }
}