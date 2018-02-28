import templates from '@aragon/templates-beta'
import { resolve as ensResolve } from '../ens'

const zeroAddress = '0x0000000000000000000000000000000000000000'

const newToken = async (template, name) => {
  return await template.methods.newToken(name)
}

/**
* holders: { address: string, stake: number }
*/
const newDemocracyDAO = async (name, tokenSymbol, holders, supportNeeded, minAcceptanceQuorum, voteDuration, web3, network) => {
  const template = new web3.eth.Contract(
    templates[network].DemocracyTemplate.abi,
    templates[network].DemocracyTemplate.address
  )

  return await Promise.all([
    newToken(template, name),
    template.methods.newInstance(name, tokenSymbol, holders.map(h => h.address), holders.map(h => h.stake), supportNeeded, minAcceptanceQuorum, voteDuration)
  ]
}

const newMultisigDAO = async (name, signers, neededSignatures, web3, network) => {
  const template = new web3.eth.Contract(
    templates[network].MultisigTemplate.abi,
    templates[network].MultisigTemplate.address
  )

  return await Promise.all([
    newToken(template, name),
    template.methods.newInstance(name, signers, neededSignatures)
  ]
}

const isNameUsed = async (name) => {
  try {
    const addr = await ensResolve(`${name}.aragonid.eth`)
    return addr !== zeroAddress
  } catch (e) {
    return false
  }
}

export default { newDemocracyDAO, isNameUsed, newMultisigDAO }
