import uuidv4 from 'uuid/v4'
import signals from './signals'

export const encodeRequest = (method, params = []) => {
  return {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params
  }
}

export const encodeResponse = (id, result = null) => {
  let response = {
    jsonrpc: '2.0',
    id
  }

  if (result instanceof Error) {
    response.error = result.message || 'An error occurred'
  } else if (result === signals.complete) {
    response.completed = true
  } else {
    response.result = result
  }

  return response
}

export const isValidResponse = (response) => {
  return !!response &&
    response.jsonrpc === '2.0' &&
    (typeof response.id === 'string') &&
    (response.result !== undefined || response.error !== undefined || response.completed !== undefined)
}

export default {
  encodeRequest,
  encodeResponse,
  isValidResponse
}
