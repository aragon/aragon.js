import { first } from 'rxjs/operators'

export default async function (request, proxy, wrapper) {
  const script = request.params[0]

  const describedPath = await wrapper.describeTransactionPath(
    wrapper.decodeTransactionPath(script)
  )

  // TODO: remove this once the app has enough information to get this information itself
  //       (see https://github.com/aragon/aragon.js/issues/194)
  // Add name and identifier decoration
  const identifiers = await wrapper.appIdentifiers.pipe(first()).toPromise()
  return Promise.all(
    describedPath.map(async (step) => {
      const app = await wrapper.getApp(step.to)

      if (app) {
        return {
          ...step,
          identifier: identifiers[step.to],
          name: app.name
        }
      }

      return step
    })
  )
}
