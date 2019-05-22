export default function (request, proxy, wrapper) {
  const [searchTerm] = request.params

  if (searchTerm.length < 3) {
    return Promise.reject(
      new Error('Minimum of 3 characters required for search')
    )
  }

  return wrapper.searchIdentities(searchTerm)
}
