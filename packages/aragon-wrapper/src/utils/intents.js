import {
  decodeKernelSetAppParameters,
  isKernelAppCodeNamespace,
  isKernelSetAppIntent
} from '../core/aragonOS/kernel'

export function doIntentPathsMatch (intentPaths) {
  const individualPaths = intentPaths
    // Map each path to just be an array of destination addresses
    .map(path =>
      path.map(({ to }) => to)
    )
    // Ignore the final intent target, as the path is everything "before" that target
    .map(path => path.slice(0, -1))
    // Take each array of destination addresses and create a single string
    .map(path => path.join('.'))

  // Check if they all match by seeing if a unique set of the individual path
  // strings is a single path
  // Also make sure that there was indeed an actual path found
  return (new Set(individualPaths)).size === 1 && Boolean(individualPaths[0])
}

export async function filterAndDecodeAppUpgradeIntents (intents, wrapper) {
  const kernelApp = await wrapper.getApp(wrapper.kernelProxy.address)

  return intents
    // Filter for setApp() calls to the kernel
    .filter((intent) => isKernelSetAppIntent(kernelApp, intent))
    // Try to decode setApp() params
    .map((intent) => {
      try {
        return decodeKernelSetAppParameters(intent.data)
      } catch (_) {}

      return {}
    })
    // Filter for changes to APP_BASES_NAMESPACE
    .filter(({ namespace }) => isKernelAppCodeNamespace(namespace))
}
