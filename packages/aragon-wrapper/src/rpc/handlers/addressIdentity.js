export default function (request, proxy, wrapper) {
  const [operation, address, providerName] = request
  if (operation === 'resolve') {
    return wrapper.resolveAddressIdentity(address, providerName)
  }

  if (operation === 'modify') {
    return wrapper.requestAddressIdentityModification(address, providerName)
  }

  return Promise.reject(
    new Error('Invalid address identity operation')
  )
}
