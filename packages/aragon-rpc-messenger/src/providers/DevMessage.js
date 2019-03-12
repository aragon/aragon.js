import Provider from './Provider'
import { filter } from 'rxjs/operators'
/**
 * A development message provider that communicates using an RxJS subject.
 *
 * Example:
 *
 * ```js
 * // Message bus used to pass messages between apps and the wrapper
 * const bus = new Subject()
 *
 * // Set up app
 * const app = new App(
 *   new Messenger(new DevMessage('app', 'wrapper', bus))
 * )
 *
 * // Run app
 * wrapper.runApp(
 *   new DevMessage('wrapper', 'app', bus),
 *   '0xbitconnect'
 * )
 * ```
 *
 * @class DevMessage
 * @extends {Provider}
 */
export default class DevMessage extends Provider {
  /**
   * Create a new development message provider.
   *
   * @param {string} id The ID of this specific entity (e.g. "wrapper")
   * @param {string} target The ID of the target entity to communicate with (e.g. "app")
   * @param {Subject} bus A shared RxJS subject used to communicate between different entities
   */
  constructor (id, target, bus) {
    super()
    this.id = id
    this.target = target
    this.bus = bus
  }

  messages () {
    return this.bus.pipe(
      filter(event => event.target === this.id)
    )
  }

  send (payload) {
    this.bus.next(
      Object.assign(payload, { target: this.target })
    )
  }
}
