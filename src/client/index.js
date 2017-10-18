import Messenger from '../rpc/Messenger'

const AppProxyHandler = {
  get (target, name, receiver) {
    if (name in target) {
      return target[name]
    }

    return function (...params) {
      return target.rpc.sendAndObserveResponse(
        'intent',
        [name, ...params]
      ).pluck('result')
    }
  }
}

class AppProxy {
  constructor (rpc = new Messenger()) {
    this.rpc = rpc
  }

  events () {
    return this.rpc.sendAndObserveResponses(
      'events'
    ).pluck('result')
  }

  cache (key, value) {
    this.rpc.send(
      'cache',
      ['set', key, value]
    )

    return value
  }

  state () {
    return this.rpc.sendAndObserveResponses(
      'cache',
      ['get', 'state']
    ).pluck('result')
  }

  store (reducer) {
    const initialState = this.state().take(1)

    return initialState
      .switchMap((initialState) =>
        this.events()
          .startWith(initialState)
          .scan(reducer)
          .map((state) => this.cache('state', state))
      )
  }

  call (method, ...params) {
    return this.rpc.sendAndObserveResponse(
      'call',
      [method, ...params]
    ).pluck('result')
  }
}

export default class Aragon {
  constructor (rpc) {
    return new Proxy(
      new AppProxy(rpc),
      AppProxyHandler
    )
  }
}
