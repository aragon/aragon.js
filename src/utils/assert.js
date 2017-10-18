export const assert = (predicate, message) => {
  if (!predicate) throw new Error(message)
}

export const typeAssertionMessage = (variableName, type, value) => {
  return `Expected ${variableName} to be of type ${type}, encountered value: ${value}`
}

export default {
  ok: assert,
  typeAssertionMessage
}
