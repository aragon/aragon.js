export default function (request, proxy, wrapper) {
  const [operation, address] = request.params
  if (operation === 'resolve') {
    return wrapper.resolveAddressIdentity(address)
  }

  if (operation === 'modify') {
    return wrapper.requestAddressIdentityModification(address)
  }

  return Promise.reject(
    new Error('Invalid address identity operation')
  )
}
