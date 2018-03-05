import { templates as templateArtifacts } from '@aragon/templates-beta'
import { resolve as ensResolve } from '../ens'

const zeroAddress = '0x0000000000000000000000000000000000000000'

const templates = {
  democracy: {
    name: 'Democracy',
    abi: templateArtifacts['DemocracyTemplate'].abi,
    appId: 'democracy-template.aragonpm.eth',
    params: ['name', 'tokenSymbol', 'holders', 'supportNeeded', 'minAcceptanceQuorum', 'voteDuration'],
  },
  multisig: {
    name: 'Multisig',
    abi: templateArtifacts['MultisigTemplate'].abi,
    appId: 'multisig-template.aragonpm.eth',
    params: ['name', 'signers', 'neededSignatures'],
  },
}

/**
* holders: { address: string, stake: number }
const newDemocracyDAO = async (name, tokenSymbol, holders, supportNeeded, minAcceptanceQuorum, voteDuration, web3, network) => {
    template.methods.newInstance(name, tokenSymbol, holders.map(h => h.address), holders.map(h => h.stake), supportNeeded, minAcceptanceQuorum, voteDuration)
  ]
}
*/

module.exports = (web3, apm, from) => {

  const newToken = async (template, name) => {
    console.log(template.methods.newToken)
    const receipt = await template.methods.newToken(name, name).send({ from, gas: 4e6 })
    return receipt.events.DeployToken.returnValues
  }

  const newInstance = async (template, name, params) => {
    const receipt = await template.methods.newInstance(name, ...params).send({ from, gas: 6.9e6 })
    console.log(receipt)
    return receipt.events.DeployDAO.returnValues
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
