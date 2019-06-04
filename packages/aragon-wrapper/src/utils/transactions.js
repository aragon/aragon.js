import { toBN } from 'web3-utils'
import { getAbi } from '../interfaces'

const DEFAULT_GAS_FUZZ_FACTOR = 1.5
const PREVIOUS_BLOCK_GAS_LIMIT_FACTOR = 0.95

export async function createDirectTransaction (sender, app, methodName, params, web3) {
  if (!app) {
    throw new Error(`Could not create transaction due to missing app artifact`)
  }

  const { proxyAddress: destination } = app

  const jsonInterface = app.abi
  if (!jsonInterface) {
    throw new Error(`No ABI specified in artifact for ${destination}`)
  }

  const methodABI = app.abi.find(
    (method) => method.name === methodName
  )
  if (!methodABI) {
    throw new Error(`${methodName} not found on ABI for ${destination}`)
  }

  let transactionOptions = {}

  // If an extra parameter has been provided, it is the transaction options if it is an object
  if (methodABI.inputs.length + 1 === params.length && typeof params[params.length - 1] === 'object') {
    const options = params.pop()
    transactionOptions = { ...transactionOptions, ...options }
  }

  // The direct transaction we eventually want to perform
  const directTransaction = {
    ...transactionOptions, // Options are overwriten by the values below
    from: sender,
    to: destination,
    data: web3.eth.abi.encodeFunctionCall(methodABI, params)
  }

  if (transactionOptions.token) {
    const { address: tokenAddress, value: tokenValue, approveSpender } = transactionOptions.token

    const erc20ABI = getAbi('standard/ERC20')
    const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress)
    const balance = await tokenContract.methods.balanceOf(sender).call()

    const tokenValueBN = toBN(tokenValue)

    if (toBN(balance).lt(tokenValueBN)) {
      throw new Error(`Balance too low. ${sender} balance of ${tokenAddress} token is ${balance} (attempting to send ${tokenValue})`)
    }

    const allowance = await tokenContract.methods.allowance(sender, destination).call()
    const allowanceBN = toBN(allowance)

    // If allowance is already greater than or equal to amount, there is no need to do an approve transaction
    if (allowanceBN.lt(tokenValueBN)) {
      if (allowanceBN.gt(toBN(0))) {
        // TODO: Actually handle existing approvals (some tokens fail when the current allowance is not 0)
        console.warn(`${sender} already approved ${destination}. In some tokens, approval will fail unless the allowance is reset to 0 before re-approving again.`)
      }

      // Aprrove the app unless an approveSpender is passed to approve a different contract
      const spender = approveSpender || destination
      const tokenApproveTransaction = {
        // TODO: should we include transaction options?
        from: sender,
        to: tokenAddress,
        data: tokenContract.methods.approve(spender, tokenValue).encodeABI()
      }

      directTransaction.pretransaction = tokenApproveTransaction
      delete transactionOptions.token
    }
  }

  return directTransaction
}

export function createForwarderTransactionBuilder (sender, directTransaction, web3) {
  const forwardMethod = new web3.eth.Contract(
    getAbi('aragon/Forwarder')
  ).methods['forward']

  return (forwarderAddress, script) => (
    {
      ...directTransaction, // Options are overwriten by the values below
      from: sender,
      to: forwarderAddress,
      data: forwardMethod(script).encodeABI()
    }
  )
}

export async function getRecommendedGasLimit (web3, estimatedGasLimit, { gasFuzzFactor = DEFAULT_GAS_FUZZ_FACTOR } = {}) {
  const latestBlock = await web3.eth.getBlock('latest')
  const latestBlockGasLimit = latestBlock.gasLimit

  const upperGasLimit = Math.round(latestBlockGasLimit * PREVIOUS_BLOCK_GAS_LIMIT_FACTOR)
  const bufferedGasLimit = Math.round(estimatedGasLimit * gasFuzzFactor)

  if (estimatedGasLimit > upperGasLimit) {
    // TODO: Consider whether we should throw an error rather than returning with a high gas limit
    return estimatedGasLimit
  } else if (bufferedGasLimit < upperGasLimit) {
    return bufferedGasLimit
  } else {
    return upperGasLimit
  }
}
