const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '')

const joinUrl = (baseUrl, path = '') => {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl)
  if (!path) {
    return normalizedBaseUrl
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

export const FRONTEND_BASE_URL = trimTrailingSlash(
  process.env.VUE_APP_FRONTEND_URL || 'http://localhost:3000'
)

export const BACKEND_BASE_URL = trimTrailingSlash(
  process.env.VUE_APP_BACKEND_URL || 'http://localhost:8080'
)

export const BACKEND_WS_BASE_URL = trimTrailingSlash(
  process.env.VUE_APP_BACKEND_WS_URL || BACKEND_BASE_URL.replace(/^http/i, 'ws')
)

export const OPENVIDU_SERVER_URL = trimTrailingSlash(
  process.env.VUE_APP_OPENVIDU_URL || 'https://openvidu.imoneleft.synology.me'
)

export const OPENVIDU_SERVER_SECRET =
  process.env.VUE_APP_OPENVIDU_SECRET || 'MY_SECRET'

export const buildFrontendUrl = (path = '') => joinUrl(FRONTEND_BASE_URL, path)
export const buildBackendUrl = (path = '') => joinUrl(BACKEND_BASE_URL, path)
export const buildBackendWsUrl = (path = '') => joinUrl(BACKEND_WS_BASE_URL, path)
