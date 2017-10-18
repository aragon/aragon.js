import { Observable } from 'rxjs/Rx'

export default class PostMessage {
  constructor (target = window.parent) {
    this.target = target
  }

  messages () {
    return Observable.fromEvent(window, 'message')
      .filter((event) =>
        event.source === this.target)
      .pluck('data')
  }

  send (payload) {
    this.target.postMessage(payload, '*')
  }
}
