import Web3 from 'web3'

export const assert = (predicate, message) => {
  if (!predicate) throw new Error(message)
}

export const typeAssertionMessage = (variableName, type, value) => {
  return `Expected ${variableName} to be of type ${type}, encountered value: ${value}`
}

export const isAddress = (variableName, value) => {
  assert(
    Web3.utils.isAddress(value),
    typeAssertionMessage(variableName, 'ETHAddress', value)
  )
}

export const isHex = (variableName, value) => {
  assert(
    Web3.utils.isHex(value),
    typeAssertionMessage(variableName, 'HexValue', value)
  )
}

export default {
  ok: assert,
  isAddress,
  isHex
}
