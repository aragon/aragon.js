export default async function (request, proxy, wrapper) {
  const notifications = wrapper.notifications
  notifications.next({
    title: request.params[0],
    body: request.params[1],
    context: request.params[2],
    app: proxy.address,
    acknowledge: function () {
      // TODO
    }
  })
}
