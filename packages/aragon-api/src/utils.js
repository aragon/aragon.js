export function debug (...params) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(...params)
  }
}

// Get the best icon for the given size.
// Set size to -1 to get the largest one, or to 0 to get the smallest one.
export function getIconBySize (icons, size = -1) {
  // Collect the sizes and sort them
  const sizes = icons
    .map((icon, i) => {
      const width = parseInt(icon.sizes.split('x')[1], 10)
      return [i, isNaN(width) ? -1 : width]
    })
    .filter(size => size[1] !== -1)
    .sort((a, b) => a[1] - b[1])

  // No valid size found
  if (sizes.length === 0) {
    return null
  }

  // No rendering size provided: return the largest icon.
  if (size === -1) {
    return icons[sizes[sizes.length - 1][0]]
  }

  // Find the first icon that is equal or larger than the provided size,
  // or the largest one otherwise.
  const iconIndex = (sizes.find(iconSize => iconSize[1] >= size) ||
    sizes[sizes.length - 1])[0]
  return icons[iconIndex]
}
