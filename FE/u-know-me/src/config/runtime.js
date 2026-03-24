const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '')

const resolveConfiguredUrl = (value, fallback) => {
  if (value === '') {
    return fallback
  }
  return value || fallback
}

const getBrowserOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : ''

const getBrowserOriginWithPort = port => {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.origin)
  url.port = port
  return url.origin
}

const getBrowserWsOrigin = () => getBrowserOrigin().replace(/^http/i, 'ws')
const getBrowserWsOriginWithPort = port =>
  getBrowserOriginWithPort(port).replace(/^http/i, 'ws')

const isDevelopment = process.env.NODE_ENV === 'development'

const joinUrl = (baseUrl, path = '') => {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl)
  if (!path) {
    return normalizedBaseUrl
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBaseUrl}${normalizedPath}`
}

export const FRONTEND_BASE_URL = trimTrailingSlash(
  resolveConfiguredUrl(
    process.env.VUE_APP_FRONTEND_URL,
    getBrowserOrigin() || 'http://localhost:3000'
  )
)

export const BACKEND_BASE_URL = trimTrailingSlash(
  resolveConfiguredUrl(
    process.env.VUE_APP_BACKEND_URL,
    isDevelopment
      ? getBrowserOrigin() || 'http://localhost:3000'
      : getBrowserOriginWithPort('8888') || 'http://localhost:8888'
  )
)

export const BACKEND_WS_BASE_URL = trimTrailingSlash(
  resolveConfiguredUrl(
    process.env.VUE_APP_BACKEND_WS_URL,
    isDevelopment
      ? getBrowserWsOrigin() || 'ws://localhost:3000'
      : getBrowserWsOriginWithPort('8888') || BACKEND_BASE_URL.replace(/^http/i, 'ws')
  )
)

export const buildFrontendUrl = (path = '') => joinUrl(FRONTEND_BASE_URL, path)
export const buildBackendUrl = (path = '') => joinUrl(BACKEND_BASE_URL, path)
export const buildBackendWsUrl = (path = '') => joinUrl(BACKEND_WS_BASE_URL, path)
