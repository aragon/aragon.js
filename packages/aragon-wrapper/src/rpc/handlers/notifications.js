export default async function (request, proxy, wrapper) {
  const [
    title,
    body,
    context,
    date
  ] = request.params
  wrapper.sendNotification(
    proxy.address,
    title,
    body,
    context,
    date
  )
}
