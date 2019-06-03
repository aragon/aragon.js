import { map, filter } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  // filter out data items not meant to be viewable by the caller
  const getAppMetadata = returnValues => (
    returnValues
      .filter(action => action.to.includes(proxy.address))
  )

  return wrapper.appMetadata.pipe(
    // transform the observable into an event-like object
    // that only contains data for selected target applications
    map(dataArray => ({
      event: 'AppMetadata',
      returnValues: getAppMetadata(dataArray)
    })),
    // only emit observables that contain data
    filter(dataArray => dataArray.returnValues.length > 0)
  )
}
