import { map } from 'rxjs/operators'

export default function (request, proxy, wrapper) {
  const [
    from,
    dataId
  ] = request.params
  // filter out data items not meant to be viewable by the caller
  const getEntry = metadataRegistry => (
    metadataRegistry[`${from},${dataId}`]
  )

  return wrapper.appMetadata.pipe(
    // emit observable that contains data queried
    map(metadataObject => getEntry(metadataObject))
  )
}
