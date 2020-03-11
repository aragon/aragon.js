// This function is used to override how an app version should be loaded based on the base contract
// address (codeAddress).
// It may be useful in situations like:
//   - Resolving an unpublished app version to the latest published version
//   - Resolving an old app version to the latest published version (e.g. to force a frontend upgrade)
export function shouldOverrideAppWithLatestVersion (repoAddress, codeAddress) {
  return false
}
