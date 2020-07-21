import { toBN } from 'web3-utils'
import { getAbi } from '../interfaces'
import { findMethodAbiFragment } from './abi'

const DEFAULT_GAS_FUZZ_FACTOR = 1.5
const PREVIOUS_BLOCK_GAS_LIMIT_FACTOR = 0.95

export async function applyPretransaction (directTransaction, web3) {
  // Token allowance pretransaction
  if (directTransaction.token) {
    const {
      from,
      to,
      token: { address: tokenAddress, value: tokenValue, spender }
    } = directTransaction

    // Approve the transaction destination unless an spender is passed to approve a different contract
    const approveSpender = spender || to

    const erc20ABI = getAbi('standard/ERC20')
    const tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress)
    const balance = await tokenContract.methods.balanceOf(from).call()

    const tokenValueBN = toBN(tokenValue)

    if (toBN(balance).lt(tokenValueBN)) {
      throw new Error(`Balance too low. ${from} balance of ${tokenAddress} token is ${balance} (attempting to send ${tokenValue})`)
    }

    const allowance = await tokenContract.methods.allowance(from, approveSpender).call()
    const allowanceBN = toBN(allowance)

    // If allowance is already greater than or equal to amount, there is no need to do an approve transaction
    if (allowanceBN.lt(tokenValueBN)) {
      if (allowanceBN.gt(toBN(0))) {
        // TODO: Actually handle existing approvals (some tokens fail when the current allowance is not 0)
        console.warn(`${from} already approved ${approveSpender}. In some tokens, approval will fail unless the allowance is reset to 0 before re-approving again.`)
      }

      const tokenApproveTransaction = {
        // TODO: should we include transaction options?
        from,
        to: tokenAddress,
        data: tokenContract.methods.approve(approveSpender, tokenValue).encodeABI()
      }

      directTransaction.pretransaction = tokenApproveTransaction
      delete directTransaction.token
    }
  }

  return directTransaction
}

export async function applyForwardingFeePretransaction (forwardingTransaction, web3) {
  const { to: forwarder, from } = forwardingTransaction

  // Check if a token approval pretransaction is needed due to the forwarder requiring a fee
  const forwardFee = new web3.eth.Contract(
    getAbi('aragon/ForwarderFee'),
    forwarder
  ).methods['forwardFee']

  const feeDetails = { amount: toBN(0) }
  try {
    // Passing the EOA as `msg.sender` to the forwardFee call is useful for use cases where the fee differs relative to the account
    const feeResult = await forwardFee().call({ from }) // forwardFee() returns (address, uint256)
    feeDetails.tokenAddress = feeResult[0]
    feeDetails.amount = toBN(feeResult[1])
  } catch (err) {
    // Not all forwarders implement the `forwardFee()` interface
  }

  if (feeDetails.tokenAddress && feeDetails.amount.gt(toBN(0))) {
    // Needs a token approval pretransaction
    forwardingTransaction.token = {
      address: feeDetails.tokenAddress,
      spender: forwarder, // since it's a forwarding transaction, always show the real spender
      value: feeDetails.amount.toString()
    }
  }

  return applyPretransaction(forwardingTransaction, web3)
}

export async function createDirectTransaction (sender, destination, methodAbiFragment, params, web3) {
  let paramsIncludesTransactionOptions = false
  if (methodAbiFragment.type === 'fallback') {
    if (params.length > 1) {
      throw new Error('Could not create transaction to fallback function due to too many parameters', params)
    }

    paramsIncludesTransactionOptions = params.length === 1
  } else if (
    methodAbiFragment.inputs.length + 1 === params.length &&
    typeof params[params.length - 1] === 'object'
  ) {
    paramsIncludesTransactionOptions = true
  }

  let transactionOptions = {}
  if (paramsIncludesTransactionOptions) {
    const options = params.pop()
    transactionOptions = { ...transactionOptions, ...options }
  }

  // The direct transaction we eventually want to perform
  const directTransaction = {
    ...transactionOptions, // Options are overwriten by the values below
    from: sender,
    to: destination,
    data: web3.eth.abi.encodeFunctionCall(methodAbiFragment, params)
  }

  // Add any pretransactions specified
  return applyPretransaction(directTransaction, web3)
}

export async function createDirectTransactionForApp (sender, app, methodSignature, params, web3) {
  if (!app) {
    throw new Error('Could not create transaction due to missing app artifact')
  }

  const { proxyAddress: destination } = app

  if (!app.abi) {
    throw new Error(`No ABI specified in artifact for ${destination}`)
  }

  const methodAbiFragment = findMethodAbiFragment(app.abi, methodSignature)
  if (!methodAbiFragment) {
    throw new Error(`${methodSignature} not found on ABI for ${destination}`)
  }

  return createDirectTransaction(sender, destination, methodAbiFragment, params, web3)
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
