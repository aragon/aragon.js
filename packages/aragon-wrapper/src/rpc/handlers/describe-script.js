import { first } from 'rxjs/operators'

export default async function (request, proxy, wrapper) {
  const script = request.params[0]

  const describedPath = await wrapper.describeTransactionPath(
    wrapper.decodeTransactionPath(script)
  )

  // Add name and identifier decoration
  // TODO: deprecate this now that the app has enough information to get this information itself
  // through getApps()
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
