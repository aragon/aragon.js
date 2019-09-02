// Simple key-value configuration store
const CONFIGURATION = {
}

export function getConfiguration (key) {
  return key ? CONFIGURATION[key] : CONFIGURATION
}

export function setConfiguration (key, value) {
  CONFIGURATION[key] = value
}
