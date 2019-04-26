import abi from 'web3-eth-abi'
import { makeRepoProxy } from '../core/apm/repo'
import { getKernelNamespace } from '../core/aragonOS'
import { findMethodOnAppFromData } from '../utils'

/**
 * Attempt to describe a setApp() intent. Only describes the APP_BASE namespace.
 *
 * @param  {string} description
 * @return {Promise<string>} Description, if one could be made.
 */
export async function tryDescribingUpdateAppIntent (intent, wrapper) {
  // Strip 0x prefix + bytes4 sig to get parameter data
  const txData = intent.data.substring(10)
  const types = [
    {
      type: 'bytes32',
      name: 'namespace'
    }, {
      type: 'bytes32',
      name: 'appId'
    }, {
      type: 'address',
      name: 'appAddress'
    }
  ]
  const { appId, appAddress, namespace } = abi.decodeParameters(types, txData)

  const kernelNamespace = getKernelNamespace(namespace)
  if (!kernelNamespace || kernelNamespace.name !== 'App code') {
    return
  }

  // Fetch aragonPM information
  const repo = await makeRepoProxy(appId, wrapper.apm, wrapper.web3)
  const latestVersion = (await repo.call('getLatestForContractAddress', appAddress))
    .semanticVersion
    .join('.')

  return `Upgrade ${appId} app instances to v${latestVersion}.`
}

/**
 * Attempt to parse a complete organization upgrade intent
 *
 * @param  {string} description
 * @return {Promise<Object>} Description and annotated description
 */
export async function tryDescribingUpgradeOrganizationBasket (intents, wrapper) {
  const allKernel = intents.every(({ to }) => wrapper.isKernelAddress(to))
  if (!allKernel) return

  const kernelApp = await wrapper.getApp(intents[0].to)
  const allSetApp = intents.every(({ data }) => {
    const intentMethod = findMethodOnAppFromData(data, kernelApp)
    return intentMethod && intentMethod.sig === 'setApp(bytes32,bytes32,address)'
  })

  // Just assume for now updating all four apps (finance, token manager, vault, voting)
  if (allSetApp && intents.length === 4) {
    return {
      description: 'Upgrade organization to Aragon 0.7 Bella',
      to: intents[0].to,
      name: kernelApp.name,
      identifier: kernelApp.identifier
    }
  }
}
