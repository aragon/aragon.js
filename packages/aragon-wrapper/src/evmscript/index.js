import abi from 'web3-eth-abi'

export const CALLSCRIPT_ID = '0x00000001'

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
