export default class ACL {
  constructor (kernelProxy, wrapper) {
    this.web3 = wrapper.web3
    this.proxy = kernelProxy

    this._state = this.proxy.events()
      .filter(
        ({ event }) => event === 'SetPermission'
      )
      .scan(
        (state, { returnValues: values }) => {
          if (!state[values.app]) state[values.app] = {}
          const currentPermissions = state[values.app][values.role] || []

          if (values.allowed) {
            state[values.app][values.role] = currentPermissions.concat([values.entity])
          } else {
            state[values.app][values.role] = currentPermissions
              .filter((entity) => entity !== values.entity)
          }

          return state
        }, {}
      )
  }

  state () {
    return this._state
  }

  canPerformAction (address, sig) {

  }

  getTransactionPath (address, sig) {

  }
}
