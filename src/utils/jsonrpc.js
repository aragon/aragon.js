import assert from './assert'
import uuidv4 from 'uuid/v4'

export const encodeRequest = (method, params = []) => {
  assert.ok(method, assert.typeAssertionMessage('method', 'string', method))

  return {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params
  }
}

export const encodeResponse = (id, result) => {
  assert.ok(id, assert.typeAssertionMessage('id', 'string', id))
  assert.ok(result !== undefined, assert.typeAssertionMessage('result', 'any', result))

  let response = {
    jsonrpc: '2.0',
    id
  }

  if (result instanceof Error) {
    response.error = result
  } else {
    response.result = result
  }

  return response
}

export const isValidResponse = (response) => {
  return !!response &&
    response.jsonrpc === '2.0' &&
    (typeof response.id === 'string') &&
    (response.result !== undefined || response.error !== undefined)
}

export default {
  encodeRequest,
  encodeResponse,
  isValidResponse
}
