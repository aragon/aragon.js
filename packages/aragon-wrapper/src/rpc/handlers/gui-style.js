export default function (request, proxy, wrapper) {
  const [operation] = request.params

  if (operation === 'observe') {
    return wrapper.guiStyle
  }

  return Promise.reject(
    new Error('Invalid guiStyle operation')
  )
}
