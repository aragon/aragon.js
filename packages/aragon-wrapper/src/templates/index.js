import { templates as templateArtifacts } from '@aragon/templates-beta'
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
    ],
  },
  multisig: {
    name: 'Multisig',
    abi: templateArtifacts['MultisigTemplate'].abi,
    appId: 'multisig-template.aragonpm.eth',
    params: [
      'name', // string
      'signers', // array of addresses
      'neededSignatures', // number of signatures need, must be > 0 and <= signers.length
    ],
  },
}

const Templates = (web3, apm, from) => {
  const minGasPrice = web3.utils.toWei('20', 'gwei')
  const newToken = async (template, name) => {
    const receipt = await template.methods.newToken(name, name).send({ from, gas: 4e6, gasPrice: minGasPrice })
    return receipt.events.DeployToken.returnValues
  }

  const newInstance = async (template, name, params) => {
    const receipt = await template.methods.newInstance(name, ...params).send({ from, gas: 6.6e6, gasPrice: minGasPrice })
    return receipt.events.DeployInstance.returnValues
  }

  return {
    newDAO: async (templateName, organizationName, params) => {
      const tmplObj = templates[templateName]

      if (!tmplObj) throw new Error("No template found for that name")

      const contractAddress = await apm.getLatestVersionContract(tmplObj.appId)

      if (!contractAddress) throw new Error("No template contract found for that appId")

      const template = new web3.eth.Contract(
        tmplObj.abi,
        contractAddress
      )

      const token = await newToken(template, organizationName)
      const instance = await newInstance(template, organizationName, params)

      return [token, instance]
    },
  }
}

// opts will be passed to the ethjs-ens constructor and
// should at least contain `provider` and `registryAddress`.
export const isNameUsed = async (name, opts = {} ) => {
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
