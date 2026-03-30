/**
 * Custom server wrapper for graceful shutdown support
 * This file is used in the standalone Docker build
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3021', 10)

// Import graceful shutdown (when available)
let initializeGracefulShutdown
try {
  const shutdownModule = require('./src/lib/shutdown')
  initializeGracefulShutdown = shutdownModule.initializeGracefulShutdown
} catch (error) {
  console.warn('Graceful shutdown module not available:', error.message)
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let server

app.prepare().then(() => {
  server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  server.listen(port, hostname, (err) => {
    if (err) throw err

    // Initialize graceful shutdown handlers
    if (initializeGracefulShutdown) {
      initializeGracefulShutdown()

      // Register server close on shutdown
      const { onShutdown } = require('./src/lib/shutdown')
      onShutdown(() => {
        return new Promise((resolve) => {
          server.close(() => {
            resolve()
          })
        })
      })
    }
  })
})
