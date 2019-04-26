export function doIntentPathsMatch(intentPaths) {
  const individualPaths = intentPaths
    // Map each path to just be an array of destination addresses
    .map(path =>
      path.map(({ to }) => to)
    )
    // Take each array of destination addresses and create a single string
    .map(path => path.join('.'))

  // Check if they all match by seeing if a unique set of the individual path
  // strings is a single path
  return (new Set(individualPaths)).size === 1
}
