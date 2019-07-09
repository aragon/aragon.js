import abi from 'web3-eth-abi'

export const CALLSCRIPT_ID = '0x00000001'
export const FORWARD_SIG = '0xd948d468' // function forward(bytes)

/**
 * Encode a call script
 *
 * ```
 * CallScriptAction {
 *   to: string;
 *   data: string;
 * }
 * ```
 *
 * Example:
 *
 * input:
 * [
 *  { to: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, data: 0x11111111 },
 *  { to: 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, data: 0x2222222222 }
 * ]
 *
 * output:
 * 0x00000001
 *   aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000411111111
 *   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb000000052222222222
 *
 *
 * @param {Array<CallScriptAction>} actions
 * @returns {string}
 */
export function encodeCallScript (actions) {
  return actions.reduce((script, { to, data }) => {
    const address = abi.encodeParameter('address', to)
    const dataLength = abi.encodeParameter('uint256', (data.length - 2) / 2).toString('hex')

    return script + address.slice(26) + dataLength.slice(58) + data.slice(2)
  }, CALLSCRIPT_ID)
}

/**
 * Tells if a given script is a forward call.
 * It will return true only if the given script starts with a forward signature and follow with
 * at least an empty bytes array properly encoded following the convention [offset][length][data]
 *
 * @param {String} scriptData representing a script data encoded as an array of bytes
 * @returns {boolean}
 */
export function isValidForwardEncodedScript (scriptData) {
  // drop the 0x starting notation if there is one
  scriptData = scriptData.replace('0x', '')
  // first 4 bytes of a script represent its selector
  const selector = scriptData.substring(0, 8)
  // drop selector and grab the call data
  const scriptCallData = scriptData.substring(8)
  // since array of bytes are encoded following the [offset][length][data] format
  // we expect it to have at least two words length (empty data scenario)
  return `0x${selector}` === FORWARD_SIG && scriptCallData.length >= 128
}

/**
 * Parse the data of a raw forward call following the convention [offset][length][data]
 *
 * @param {String} script representing an encoded array of bytes
 * @returns {string} array of bytes representing the data of the given script
 */
export function parseForwardData (script) {
  // drop the 0x starting notation if there is one
  script = script.replace('0x', '')
  // drop forward selector and grab the following data
  const callData = script.substring(8)
  // parse first word of the array of bytes, note it is stored as bytes so we need to parse in hex first and then multiply by 2
  const offset = parseInt(`0x${callData.substring(0, 64)}`, 16) * 2
  // the second word tells the length of the data stored in the bytes array
  const startIndex = offset + 64
  // parse length of the data stored, note it is stored as bytes so we need to parse in hex first and then multiply by 2 again
  const dataLength = parseInt(`0x${callData.substring(offset, startIndex)}`, 16) * 2
  // grab the data stored in the bytes array
  return `0x${callData.substring(startIndex, startIndex + dataLength)}`
}
