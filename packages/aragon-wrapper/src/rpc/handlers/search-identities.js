export default function (request, proxy, wrapper) {
  const [searchTerm] = request.params

  if (searchTerm.length < 3) {
    // Empty response for requests with less than 3 chars
    return Promise.resolve([])
  }

  return wrapper.searchIdentities(searchTerm)
}
