const fs = require('fs')
const http = require('http')
const path = require('path')

const HOST = '0.0.0.0'
const PORT = Number(process.env.PORT || 3000)
const DIST_DIR = path.join(__dirname, 'dist')
const INDEX_FILE = path.join(DIST_DIR, 'index.html')

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.unityweb': 'application/octet-stream',
  '.vrm': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
}

const REVALIDATE_HEADERS = {
  'Cache-Control': 'public, no-cache, must-revalidate',
}

const IMMUTABLE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
}

const HASHED_ASSET_PATTERN = /\.[0-9a-f]{8,}\./i
const VERSION_FILE_NAME = 'version.json'

const createEtag = stats => `W/"${stats.size}-${Math.floor(stats.mtimeMs)}"`

const isHtmlFile = filePath => path.extname(filePath).toLowerCase() === '.html'

const isHashedAsset = filePath => HASHED_ASSET_PATTERN.test(path.basename(filePath))

const isVersionFile = filePath => path.basename(filePath) === VERSION_FILE_NAME

const getCacheHeaders = filePath => {
  if (isVersionFile(filePath)) {
    return NO_STORE_HEADERS
  }

  if (isHtmlFile(filePath)) {
    return NO_STORE_HEADERS
  }

  if (isHashedAsset(filePath)) {
    return IMMUTABLE_CACHE_HEADERS
  }

  return REVALIDATE_HEADERS
}

const shouldReturnNotModified = (request, etag, lastModified) => {
  const ifNoneMatch = request.headers['if-none-match']
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true
  }

  const ifModifiedSince = request.headers['if-modified-since']
  return ifModifiedSince && ifModifiedSince === lastModified
}

const sendError = (response, statusCode) => {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...NO_STORE_HEADERS,
  })
  response.end(statusCode === 404 ? 'Not Found' : 'Internal Server Error')
}

const streamFile = (request, response, filePath, stats, statusCode = 200) => {
  const etag = createEtag(stats)
  const lastModified = stats.mtime.toUTCString()
  const headers = {
    'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'X-Served-By': 'u-know-me-front-tar',
    ETag: etag,
    'Last-Modified': lastModified,
    ...getCacheHeaders(filePath),
  }

  if (shouldReturnNotModified(request, etag, lastModified)) {
    response.writeHead(304, headers)
    response.end()
    return
  }

  response.writeHead(statusCode, {
    ...headers,
  })

  const stream = fs.createReadStream(filePath)
  stream.on('error', () => sendError(response, 500))
  stream.pipe(response)
}

const resolveFilePath = requestPath => {
  const relativePath = decodeURIComponent(requestPath).replace(/^\/+/, '')
  const resolvedPath = path.resolve(DIST_DIR, relativePath)

  if (!resolvedPath.startsWith(DIST_DIR)) {
    return null
  }

  return resolvedPath
}

http
  .createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`)
    const isRootRequest = requestUrl.pathname === '/'
    const filePath = isRootRequest ? INDEX_FILE : resolveFilePath(requestUrl.pathname)

    if (!filePath) {
      sendError(response, 400)
      return
    }

    fs.stat(filePath, (error, stats) => {
      if (!error && stats.isFile()) {
        streamFile(request, response, filePath, stats)
        return
      }

      if (!path.extname(requestUrl.pathname)) {
        fs.stat(INDEX_FILE, (indexError, indexStats) => {
          if (!indexError && indexStats.isFile()) {
            streamFile(request, response, INDEX_FILE, indexStats)
            return
          }

          sendError(response, 500)
        })
        return
      }

      sendError(response, 404)
    })
  })
  .listen(PORT, HOST, () => {
    console.log(`u-know-me front server listening on http://${HOST}:${PORT}`)
  })
