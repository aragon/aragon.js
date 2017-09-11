import Web3 from 'web3'
import assert from './utils/assert'

// NOTE: How do we handle breaking changes in app reducers + events?
// NOTE: How do we handle event signature collissions?

/**
 * This is the kernel proxy (aka. "the DAO" in the context of the user).
 * 
 * All transactions are routed through the proxy to the kernel and
 * eventually to the app responsible for handling the transaction.
 * 
 * The proxy also acts as the shell around any events that might be
 * fired from apps and the kernel (e.g. ACL events), and is thus
 * the event store for a specific DAO.
 * 
 * A DAO's storage is also tied to the kernel proxy. Apps and the
 * kernel write to the kernel proxy storage.
 * 
 * @export
 * @class Proxy
 */
export default class Proxy {
  /**
   * Creates an instance of the kernel proxy.
   *
   * @param {any} address The address of the kernel proxy.
   * @param {any} web3
   * @memberof Proxy
   */
  constructor (address, web3) {
    assert.isAddress(address)

    this.address = address
    this.web3 = web3

    // This Subject emits an object of known events
    this.knownEvents = new Subject()
      .scan(
        (knownEvents, eventInterface) => knownEvents.set(
          Web3.eth.abi.encodeEventSignature(eventInterface),
          eventInterface
        ),
        new Map()
      )

    // Uses a subcription to logs directly instead of
    // `web3.eth.Contract.events.allEvents` since the topics
    // we want to get may vary over time, because apps can be
    // added or removed during the lifetime of the organisation
    this.events = Observable.fromEvent(
      () => this.web3.eth.subscribe('logs', {
        address: this.address
      })
    ).withLatestFrom(this.knownEvents)
      .filter(
        ([log, knownEvents]) => knownEvents.has(log.topics[0])
      ).map(
        // Decode logs into usable events
        ([log, knownEvents]) => Web3.eth.abi.decodeLog(
          knownEvents.get(log.topics[0]),
          log.data,
          log.topics.slice(1)
        )
      )
  }

  // TODO: Validate event JSON interface
  registerEvent (jsonInterface) {
    this.knownEvents.next(jsonInterface)
  }
}
