import Provider from './Provider'

export default class DevMessage extends Provider {
  constructor (id, target, bus) {
    super()
    this.id = id
    this.target = target
    this.bus = bus
  }

  messages () {
    return this.bus
      .filter((event) => event.target === this.id)
  }

  send (payload) {
    this.bus.next(
      Object.assign(payload, { target: this.target })
    )
  }
}
