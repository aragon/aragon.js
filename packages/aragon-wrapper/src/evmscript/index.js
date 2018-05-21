// @flow
import abi from 'web3-eth-abi'

type CallScriptAction = {
  to: string,
  data: string
}

export const CALLSCRIPT_ID = '0x00000001'
export function encodeCallScript (actions: Array<CallScriptAction>): string {
  return actions.reduce((script, { to, data }) => {
    const address = abi.encodeParameter('address', to)
    const dataLength = abi.encodeParameter('uint256', (data.length - 2) / 2).toString('hex')

    return script + address.slice(26) + dataLength.slice(58) + data.slice(2)
  }, CALLSCRIPT_ID)
}
