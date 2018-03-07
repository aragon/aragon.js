import { templates as templateArtifacts } from '@aragon/templates-beta'
import { resolve as ensResolve } from '../ens'

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

const sleep = t => new Promise(r => setTimeout(() => r(), 1000 * t))

module.exports = (web3, apm, from) => {
  const newToken = async (template, name) => {
    const receipt = await template.methods.newToken(name, name).send({ from, gas: 4e6 })
    return receipt.events.DeployToken.returnValues
  }

  const newInstance = async (template, name, params) => {
    await sleep(2) // ensure newToken is submitted before
    const receipt = await template.methods.newInstance(name, ...params).send({ from, gas: 6.9e6 })
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

      return await Promise.all([
        newToken(template, organizationName),
        newInstance(template, organizationName, params),
      ])
    },

    isNameUsed: async (name) => {
      try {
        const addr = await ensResolve(`${name}.aragonid.eth`)
        return addr !== zeroAddress
      } catch (e) {
        return false
      }
    },
  }
}
