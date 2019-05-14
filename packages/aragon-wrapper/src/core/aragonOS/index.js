import { getAppInfo, hasAppInfo } from '../../interfaces'

function getAragonOsInternalAppInfo (appId) {
  const appInfo = getAppInfo(appId, 'aragon')

  return appInfo && {
    ...appInfo,
    isAragonOsInternalApp: true
  }
}

function isAragonOsInternalApp (appId) {
  return hasAppInfo(appId, 'aragon')
}

export {
  getAragonOsInternalAppInfo,
  isAragonOsInternalApp
}
