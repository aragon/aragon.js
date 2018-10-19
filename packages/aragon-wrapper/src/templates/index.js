import { templates as templateArtifacts } from '@aragon/templates-beta'
import { toWei } from 'web3-utils'
import { resolve as ensResolve } from '../ens'

const zeroAddress = '0x0000000000000000000000000000000000000000'

// TODO: Load template info dynamically from APM content package.
// Maybe we can even do a simple markup language that aragon/aragon interprets
const templates = {
  democracy: {
    name: 'Democracy',
    abi: templateArtifacts['DemocracyTemplate'].abi,
    appId: 'democracy-template.aragonpm.eth',
    params: [
      'name', // string
      'holders', // array of addresses
      'stakes', // array of token balances (token has 18 decimals, 1 token = 10^18)
      'supportNeeded', // percentage in with 10^18 base (1% = 10^16, 100% = 10^18)
      'minAcceptanceQuorum', // percentage in with 10^18 base
      'voteDuration' // in seconds
    ]
  },
  multisig: {
    name: 'Multisig',
    abi: templateArtifacts['MultisigTemplate'].abi,
    appId: 'multisig-template.aragonpm.eth',
    params: [
      'name', // string
      'signers', // array of addresses
      'neededSignatures' // number of signatures need, must be > 0 and <= signers.length
    ]
  }
}

const Templates = (web3, apm, from) => {
  const minGasPrice = toWei('20', 'gwei')
  const newToken = async (template, { params, options = {} }) => {
    const [tokenName, tokenSymbol] = params
    const call = template.methods.newToken(tokenName, tokenSymbol)
    const receipt = await call.send({
      from,
      gasPrice: minGasPrice,
      ...options
    })
    return receipt.events.DeployToken.returnValues
  }

  const newInstance = async (template, { params, options = {} }) => {
    const call = template.methods.newInstance(...params)
    const receipt = await call.send({
      from,
      gasPrice: minGasPrice,
      ...options
    })
    return receipt.events.DeployInstance.returnValues
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

      const contractAddress = await apm.getLatestVersionContract(tmplObj.appId)

      if (!contractAddress) throw new Error('No template contract found for that appId')

      const template = new web3.eth.Contract(
        tmplObj.abi,
        contractAddress
      )

      const token = await newToken(template, tokenParams)
      const instance = await newInstance(template, instanceParams)

      return [token, instance]
    }
  }
}

// opts will be passed to the ethjs-ens constructor and
// should at least contain `provider` and `registryAddress`.
export const isNameUsed = async (name, opts = {}) => {
  try {
    const addr = await ensResolve(`${name}.aragonid.eth`, opts)
    return addr !== zeroAddress
  } catch (err) {
    if (err.message === 'ENS name not defined.') {
      return false
    }
    throw new Error(`ENS couldn’t resolve the domain: ${name}.aragonid.eth`)
  }
}

export default Templates
