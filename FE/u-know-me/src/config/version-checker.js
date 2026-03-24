import { BUILD_VERSION } from '@/generated/build-version'

const VERSION_URL = '/version.json'

let isChecking = false
let hasReloaded = false

const fetchLatestVersion = async () => {
  const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })

  if (!response.ok) {
    throw new Error(`Version check failed: ${response.status}`)
  }

  const data = await response.json()
  return data.version
}

const reloadForNewVersion = () => {
  if (hasReloaded || typeof window === 'undefined') {
    return
  }

  hasReloaded = true
  window.location.reload()
}

const checkVersion = async () => {
  if (isChecking) {
    return
  }

  isChecking = true

  try {
    const latestVersion = await fetchLatestVersion()

    if (latestVersion && latestVersion !== BUILD_VERSION) {
      reloadForNewVersion()
    }
  } catch (error) {
    console.warn('Version check skipped:', error)
  } finally {
    isChecking = false
  }
}

export const startVersionChecker = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  checkVersion()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion()
    }
  })
}
