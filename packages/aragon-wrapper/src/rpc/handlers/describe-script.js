export default async function(request, proxy, wrapper) {
  const script = request.params[0]

  return wrapper.describeTransactionPath(wrapper.decodeTransactionPath(script))
}
