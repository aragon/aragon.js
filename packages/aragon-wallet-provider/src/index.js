var ProviderEngine = require("web3-provider-engine");
var HookedSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var initAragonJS = require('./utils/aragonjs-wrapper');

function AragonProvider(subProvider, ens, dao, forwardingAddress) {
  this.addresses = [forwardingAddress];
  this.subProvider = subProvider;
  this.wrapper = {}
  this.accounts = []

  this.subProvider.send({
    jsonrpc: '2.0',
    method: 'eth_accounts',
    id: Math.floor(Math.random()*1000000),
    params: []
  },(err,accounts) => {
    this.accounts = accounts.result

    initAragonJS(dao, ens, {
      accounts: this.accounts,
      provider: this.subProvider,
      onTransaction: transaction => {
        this.transactionPaths = transaction
      }
    })
    .then((initializedWrapper) => {
      this.wrapper = initializedWrapper
    })
  })
};

AragonProvider.prototype.send = function (payload, callback) {
  payload.id = Math.floor(Math.random()*1000000)
  switch(payload.method){
    case 'eth_accounts':
      callback(null,{ ...payload, result: this.addresses});
      break;
    case 'eth_estimateGas':
    case 'eth_sendTransaction':
      this.wrapper.calculateForwardingPath(
        this.accounts[0],
        payload.params[0].to,
        payload.params[0],
        [payload.params[0].from])
      .then(result => {
        payload.params[0] = result[0]
        this.subProvider.send(payload,callback)
      })
      break;
    default:
      this.subProvider.send(payload,callback);
  }
};


/**
 Will add the error and end event to timeout existing calls

 @method addDefaultEvents
 */
AragonProvider.prototype.addDefaultEvents = function(){
    return this.subProvider.addDefaultEvents();
};

/**
 Will parse the response and make an array out of it.

 @method _parseResponse
 @param {String} data
 */
AragonProvider.prototype._parseResponse = function(data) {
    return this.subProvider._parseResponse(data);
};


/**
 Adds a callback to the responseCallbacks object,
 which will be called if a response matching the response Id will arrive.

 @method _addResponseCallback
 */
AragonProvider.prototype._addResponseCallback = function(payload, callback) {
    return this.subProvider._addResponseCallback(payload, callback);
};

/**
 Timeout all requests when the end/error event is fired

 @method _timeout
 */
AragonProvider.prototype._timeout = function() {
    return this.subProvider._timeout();
};


/**
 Subscribes to provider events.provider

 @method on
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
AragonProvider.prototype.on = function (type, callback) {
    return this.subProvider.on(type, callback);
};

// TODO add once

/**
 Removes event listener

 @method removeListener
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 @param {Function} callback   the callback to call
 */
AragonProvider.prototype.removeListener = function (type, callback) {
    return this.subProvider.removeListener(type, callback);
};

/**
 Removes all event listeners

 @method removeAllListeners
 @param {String} type    'notifcation', 'connect', 'error', 'end' or 'data'
 */
AragonProvider.prototype.removeAllListeners = function (type) {
    return this.subProvider.removeAllListeners(type);
};

/**
 Resets the providers, clears all callbacks

 @method reset
 */
AragonProvider.prototype.reset = function () {
    return this.subProvider.reset();
};

AragonProvider.prototype.disconnect = function () {
    return this.subProvider.disconnect();
};

module.exports = AragonProvider;
