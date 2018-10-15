const defaultOptions = {
  logger: console,
  forceTimeout: 30 * 1000,
  additionalSignals: []
}

/**
 * Gracefully shutdown the application when requested, rejecting any requests that come through.
 *
 * Based entirely from express-graceful-shutdown:
 * @link https://npm.im/express-graceful-shutdown
 *
 * @param {http.Server} server - The server to close when it is time to shut down.
 * @param {Object} [options] - Middleware options.
 * @param {Object} [options.logger] - Used to display the messages.
 * @param {Object} [options.forceTimeout] - When to forcefully shut the server down, in seconds.
 * @param {callback} [options.onShutdown] - An async function that is called when shutting down.
 * @param {string[]} [options.additionalSignals] - Signals to detect when shutting down.
 * @return {function} The created shutdown middleware
 */
function createShutdownMiddleware (server, options) {
  const {
    logger,
    onShutdown,
    forceTimeout,
    additionalSignals
  } = Object.assign({}, defaultOptions, options)

  let shuttingDown = false

  const gracefulShutdown = async signal => {
    if (shuttingDown) {
      return
    }

    logger.warn(`Received kill signal '${signal}'. Shutting down...`)

    shuttingDown = true
    setTimeout(() => {
      logger.error('Could not close connections in time. Forcefully shutting down...')
      process.exit(1)
    }, forceTimeout)

    if (onShutdown) {
      await onShutdown()
    }

    logger.info('Closing server connections...')
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

  additionalSignals.forEach(signal => {
    process.on(signal, () => gracefulShutdown(signal))
  })

  return async function shutdownMiddleware (ctx, next) {
    if (!shuttingDown) {
      await next()
      return
    }

    ctx.status = 503
    ctx.set('Connection', 'close')
    ctx.body = 'Server is in the process of shutting down'
  }
}

exports.createShutdownMiddleware = createShutdownMiddleware
