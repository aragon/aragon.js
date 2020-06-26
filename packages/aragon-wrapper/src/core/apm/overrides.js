import { addressesEqual } from '../../utils'

const MAINNET_AGENT_REPO = '0x52AC38791EF1561b172Ca89d7115F178d058E57b'
const MAINNET_UNLISTED_AGENT_V6 = '0x6C676c98a7442626a53b0b3B0f30B745B4B5aeb8'

const RINKEBY_AGENT_REPO = '0xca5BC2D3517A84e7028A9bc08fE0b1B856Ea2CA8'
const RINKEBY_UNLISTED_AGENT_V6 = '0x05087eD2aD442e252CF6c6c648f26b7298a17A88'

// This function is used to override how an app version should be loaded based on the base contract
// address (codeAddress).
// It may be useful in situations like:
//   - Resolving an unpublished app version to the latest published version
//   - Resolving an old app version to the latest published version (e.g. to force a frontend upgrade)
export function shouldOverrideAppWithLatestVersion (repoAddress, codeAddress) {
  if (
    // Unlisted Agent with ERC-1155 hotfix
    // May be published as Agent v6 in the future
    (addressesEqual(repoAddress, MAINNET_AGENT_REPO) &&
      addressesEqual(codeAddress, MAINNET_UNLISTED_AGENT_V6)) ||
    (addressesEqual(repoAddress, RINKEBY_AGENT_REPO) &&
      addressesEqual(codeAddress, RINKEBY_UNLISTED_AGENT_V6))
  ) {
    return true
  }

  return false
}
