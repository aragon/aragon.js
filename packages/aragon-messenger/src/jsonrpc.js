import uuidv4 from 'uuid/v4'

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
