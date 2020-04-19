import {
    pluck,
} from 'rxjs/operators'


class ExternalTarget {
    constructor (rpc, address, jsonInterface) {
        this.rpc = rpc
        this.address = address
        this.jsonInterface = jsonInterface
        this.eventsInterface = jsonInterface.filter((item) => item.type === 'event')
    }
    events (options = {}) {
        return this.rpc.sendAndObserveResponses(
          'external_events',
          [this.address, this.eventsInterface, 'allEvents', options]
        ).pipe(
          pluck('result')
        )
    }
    pastEvents (options = {}) {
        return this.rpc.sendAndObserveResponse(
          'external_past_events',
          [this.address, this.eventsInterface, 'allEvents', options]
        ).pipe(
          pluck('result')
        )
    }
}

export default class ExternalProxy {
    /**
     * Create proxy in order to handle external actions.
     *
     * @param {Object} [provider=MessagePortMessage] The provider used to send and receive messages to and from the wrapper.
     */
    constructor (rpc, address, jsonInterface) {
      return new Proxy(
        new ExternalTarget(rpc, address, jsonInterface),
        ExternalProxyHandler
      )
    }
}
  
const ExternalProxyHandler = {
    get (target, name, receiver) {
        if (name in target) {
            return target[name]
        }
        const callMethod = target.jsonInterface.filter(
            (item) => item.type === 'function' && item.constant && item.name === name
        )
        if (callMethod.length === 1) {
            return externalCalls(target.address, callMethod[0], target.rpc)
        }
        const intentMethod = target.jsonInterface.filter(
            (item) => item.type === 'function' && !item.constant && item.name === name
        )
        if (intentMethod.length === 1) {
            return externalInitents(target.address, intentMethod[0], target.rpc)
        }
    }
}

function externalCalls(address, methodJsonDescription, rpc) {
    return (...params) => rpc.sendAndObserveResponse(
        'external_call',
        [address, methodJsonDescription, ...params]
    ).pipe(
        pluck('result')
    )
}

function externalInitents(address, methodJsonDescription, rpc) {
    return (...params) => rpc.sendAndObserveResponse(
        'external_intent',
        [address, methodJsonDescription, ...params]
    ).pipe(
        pluck('result')
    )
}