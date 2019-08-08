import { map, filter } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  // filter out data items not meant to be viewable by the caller
  const getAppMetadata = metadataRegistry => (
    Object.values(metadataRegistry)
      .filter(action => action.to.includes('*') || action.to.includes(proxy.address))
  )

  return wrapper.appMetadata.pipe(
    // transform the observable into an event-like object
    // that only contains data for selected target applications
    map(appMetadataObject => ({
      event: 'AppMetadata',
      returnValues: getAppMetadata(appMetadataObject)
    })),
    // only emit observables that contain data
    filter(metadataEvent => metadataEvent.returnValues.length > 0)
  )
}
