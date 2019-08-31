import { getRecommendedGasLimit } from '../utils/transactions'

// Maybe we can even do a simple markup language that aragon/aragon interprets
const templates = {
  democracy: {
    name: 'Democracy',
    appId: 'democracy-kit.aragonpm.eth'
  },
  multisig: {
    name: 'Multisig',
    appId: 'multisig-kit.aragonpm.eth'
  }
}

/**
 * @name Templates
 * @function
 * @description Factory for DAO templates.
 *
 * @param {string} from
 *        The address of the account using the factory.
 * @param {Object} options
 *        Template factory options.
 * @param {Object} options.apm
 *        aragonPM utilities
 * @param {Function} options.defaultGasPriceFn
 *        A factory function to provide the default gas price for transactions.
 *        It can return a promise of number string or a number string. The function
 *        has access to a recommended gas limit which can be used for custom
 *        calculations. This function can also be used to get a good gas price
 *        estimation from a 3rd party resource.
 * @param {Object} options.ens
 *        ENS resolution utilities
 * @param {Object} options.web3
 *        Web3 instance
 * @return {Object} Factory object
 */
const Templates = (from, { apm, defaultGasPriceFn, ens, web3 }) => {
  const newToken = async (template, { params, options = {} }) => {
    const [tokenName, tokenSymbol] = params
    const call = template.methods.newToken(tokenName, tokenSymbol)
    const receipt = await call.send({
      from,
      ...await applyCallGasOptions(call, options)
    })
    return receipt.events.DeployToken.returnValues
  }

  const newInstance = async (template, { params, options = {} }) => {
    const call = template.methods.newInstance(...params)
    const receipt = await call.send({
      from,
      ...await applyCallGasOptions(call, options)
    })
    return receipt.events.DeployInstance.returnValues
  }

  const applyCallGasOptions = async (call, txOptions = {}) => {
    if (!txOptions.gas) {
      const estimatedGasLimit = await call.estimateGas({ from })
      const recommendedGasLimit = await getRecommendedGasLimit(
        web3,
        estimatedGasLimit,
        { gasFuzzFactor: 1.1 }
      )
      txOptions.gas = recommendedGasLimit
    }

    if (!txOptions.gasPrice) {
      txOptions.gasPrice = await defaultGasPriceFn(txOptions.gas)
    }

    return txOptions
  }

  return {
    /**
     * Create a new DAO by sending two transactions:
     *
     *   1. Create a new token
     *   2. Create a new instance of a template (the token is cached in the template contract)
     *
     * @param {string} templateName name of the template to use
     * @param {Object} tokenParams parameters for the token creation transaction
     * @param {Array<string>} tokenParams.params array of [<Token name>, <Token symbol>]
     * @param {Object} [tokenParams.options={}] transaction options
     * @param {Object} instanceParams parameters for the DAO creation transaction
     * @param {Array<string>} tokenParams.params parameters for the template's `newDAO()` method
     * @param {Object} [instanceParams.options={}] transaction options
     * @return {Array<Object>} return values for `DeployEvent` and `DeployInstance`
     */
    newDAO: async (templateName, tokenParams, instanceParams) => {
      const tmplObj = templates[templateName]

      if (!tmplObj) throw new Error('No template found for that name')

      const templateRepoAddress = await ens.resolve(tmplObj.appId)
      const { contractAddress, abi } = await apm.fetchLatestRepoContent(templateRepoAddress)
      if (!contractAddress) {
        throw new Error(`No contract found on APM for template '${templateName}'`)
      }
      if (!abi) {
        throw new Error(`Could not fetch ABI for template '${templateName}'`)
      }

      const template = new web3.eth.Contract(abi, contractAddress)

      const token = await newToken(template, tokenParams)
      const instance = await newInstance(template, instanceParams)

      return [token, instance]
    }
  }
}

export default Templates
