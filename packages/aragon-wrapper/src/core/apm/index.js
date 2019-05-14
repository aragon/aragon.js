import { getAppInfo } from '../../interfaces'

export function getApmAppInfo (appId) {
  return getAppInfo(appId, 'apm')
}
