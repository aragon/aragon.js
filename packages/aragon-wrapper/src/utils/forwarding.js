export const FORWARD_SIG = '0xd948d468' // function forward(bytes)

/**
 * Tells if the given calldata (as a bytes string) is a valid invocation of
 * `forward(bytes)`.
 *
 * It will return true only if the given calldata starts with the forward
 * function signature and follows with at least an empty bytes array properly
 * ABI encoded following the convention [offset][length][data].
 *
 * @param {string} calldata Calldata encoded as an array of bytes
 * @returns {boolean}
 */
export function isValidForwardCall (calldata) {
  // Drop the 0x starting notation if there is one
  calldata = calldata.replace(/^0x/, '')
  // First 4 bytes represent the function selector
  const selector = calldata.substring(0, 8)
  // Drop selector and grab the argument data
  const evmscriptData = calldata.substring(8)
  // Since arrays of bytes are encoded following the [offset][length][data]
  // format, we expect it to have at least two words length (empty data scenario)
  return `0x${selector}` === FORWARD_SIG && evmscriptData.length >= 128
}

/**
 * Parse the evmscript of a forward call following the byte ABI encoding
 * convention [offset][length][data].
 *
 * @param {string} calldata Calldata encoded as an array of bytes
 * @returns {string} Array of bytes representing the forwarded evmscript
 */
export function parseForwardCall (calldata) {
  // Drop the 0x starting notation if there is one
  calldata = calldata.replace(/^0x/, '')
  // Drop function selector and grab the argument data (of type bytes)
  const evmscriptData = calldata.substring(8)
  // Parse first word of the bytes array to get data offset
  // (it's stored as bytes so we need to parse in hex first and then multiply by 2)
  const offset = parseInt(`0x${evmscriptData.substring(0, 64)}`, 16) * 2
  // The first word in the data is its length (uint256); actual data starts after
  const startIndex = offset + 64
  // Parse length of the data stored
  // (it's stored as bytes so we need to parse in hex first and then multiply by 2)
  const dataLength = parseInt(`0x${evmscriptData.substring(offset, startIndex)}`, 16) * 2
  // Grab the data stored in the bytes array
  return `0x${evmscriptData.substring(startIndex, startIndex + dataLength)}`
}
