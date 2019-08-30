import * as radspec from 'radspec'
import { makeRepoProxy } from '../core/apm/repo'
import { findAppMethodFromData, knownAppIds } from '../utils/apps'
import { filterAndDecodeAppUpgradeIntents } from '../utils/intents'

/**
 * Attempt to describe intent via radspec.
 *
 * @param  {Object} intent transaction intent
 * @param  {Object} wrapper
 * @return {Promise<Object>} Decorated intent with description, if one could be made
 */
export async function tryEvaluatingRadspec (intent, wrapper) {
  const app = await wrapper.getApp(intent.to)
  const method = findAppMethodFromData(app, intent.data)

  let evaluatedNotice
  if (method && method.notice) {
    try {
      evaluatedNotice = await radspec.evaluate(
        method.notice,
        {
          abi: app.abi,
          transaction: intent
        },
        { ethNode: wrapper.web3.currentProvider }
      )
    } catch (err) { }
  }

  return {
    ...intent,
    description: evaluatedNotice
  }
}

/**
 * Attempt to describe a setApp() intent. Only describes the APP_BASE namespace.
 *
 * @param  {Object} intent transaction intent
 * @param  {Object} wrapper
 * @return {Promise<Object>} Decorated intent with description, if one could be made
 */
export async function tryDescribingUpdateAppIntent (intent, wrapper) {
  const upgradeIntentParams = (await filterAndDecodeAppUpgradeIntents([intent], wrapper))[0]
  if (!upgradeIntentParams) return

  const { appId, appAddress } = upgradeIntentParams
  // Fetch aragonPM information
  const repo = await makeRepoProxy(appId, wrapper.apm, wrapper.web3)
  const latestVersion = (await repo.call('getLatestForContractAddress', appAddress))
    .semanticVersion
    .join('.')

  return {
    ...intent,
    description: `Upgrade ${appId} app instances to v${latestVersion}`
  }
}

/**
 * Attempt to parse a complete organization upgrade intent
 *
 * @param  {Array<Object>} intents intent basket
 * @param  {Object} wrapper
 * @return {Promise<Object>} Decorated intent with description, if one could be made
 */
export async function tryDescribingUpgradeOrganizationBasket (intents, wrapper) {
  const upgradedKnownAppIds = (await filterAndDecodeAppUpgradeIntents(intents, wrapper))
    .map(({ appId }) => appId)
    // Take intersection with knownAppIds
    .filter(
      appId => knownAppIds.includes(appId)
    )

  if (
    // All intents are for upgrading known apps
    intents.length === upgradedKnownAppIds.length &&
    // All known apps are being upgraded
    knownAppIds.length === upgradedKnownAppIds.length
  ) {
    return {
      description: 'Upgrade organization to Aragon 0.8 Camino',
      from: intents[0].from,
      to: intents[0].to
    }
  }
}
