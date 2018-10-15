const http = require('http')

beforeEach(() => {
  global.console = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  global.process = {
    on: jest.fn(),
    exit: jest.fn()
  }

  global.setTimeout = jest.fn()
})

describe('module', () => {
  let createMiddleware

  it('contains a createShutdownMiddleware function', () => {
    const { createShutdownMiddleware } = require('./')
    createMiddleware = createShutdownMiddleware

    expect(typeof createMiddleware).toBe('function')
  })

  describe('createShutdownMiddleware', () => {
    it('attaches to process signals SIGINT and SIGTERM', () => {
      const server = http.createServer()
      const middleware = createMiddleware(server)
      expect(global.process.on.mock.calls.length).toBe(2)
      expect(global.process.on.mock.calls[0][0]).toBe('SIGINT')
      expect(global.process.on.mock.calls[1][0]).toBe('SIGTERM')
    })

    it('adds more signals via additionalSignals', () => {
      const server = http.createServer()
      const middleware = createMiddleware(server, {
        additionalSignals: ['SIGUSR2']
      })

      expect(global.process.on.mock.calls.length).toBe(3)
      expect(global.process.on.mock.calls[2][0]).toBe('SIGUSR2')
    })

    it('moves on to the next middleware if its not shutting down', () => {
      expect.assertions(1)

      const ctx = {
        set: jest.fn()
      }
      const next = jest.fn()
      const server = http.createServer()
      const middleware = createMiddleware(server)

      return expect(middleware(ctx, next)).resolves.toBe()
    })

    it('responds with a 503 if its shutting down', async () => {
      const ctx = {
        set: jest.fn()
      }
      const next = jest.fn()
      const server = http.createServer()
      const middleware = createMiddleware(server)

      global.process.on.mock.calls[0][1]()

      await middleware(ctx, next)

      expect(ctx.body).toBe('Server is in the process of shutting down')
      expect(ctx.status).toBe(503)
      expect(ctx.set).toHaveBeenCalledWith('Connection', 'close')
      expect(global.process.exit).toHaveBeenCalledTimes(0)
    })

    it('closes process if server takes too long', async () => {
      const ctx = { set: jest.fn() }
      const next = jest.fn()
      const server = http.createServer()
      server.close = jest.fn()

      const middleware = createMiddleware(server)

      await global.process.on.mock.calls[0][1]()

      expect(global.setTimeout).toHaveBeenCalledTimes(1)
      expect(global.setTimeout.mock.calls[0][1]).toBe(30000)
      global.setTimeout.mock.calls[0][0]()

      expect(global.process.exit).toHaveBeenCalledTimes(1)
      expect(global.process.exit).toHaveBeenCalledWith(1)
    })

    it('closes process if server has closed', async () => {
      const ctx = { set: jest.fn() }
      const next = jest.fn()
      const server = http.createServer()
      server.close = jest.fn()

      const middleware = createMiddleware(server)

      await global.process.on.mock.calls[0][1]()
      server.close.mock.calls[0][0]()

      expect(global.process.exit).toHaveBeenCalledTimes(1)
      expect(global.process.exit).toHaveBeenCalledWith(0)
    })

    it('uses forceTimeout when provided', async () => {
      const ctx = { set: jest.fn() }
      const next = jest.fn()
      const server = http.createServer()
      server.close = jest.fn()

      const middleware = createMiddleware(server, {
        forceTimeout: 123456
      })

      await global.process.on.mock.calls[0][1]()

      expect(global.setTimeout).toHaveBeenCalledTimes(1)
      expect(global.setTimeout.mock.calls[0][1]).toBe(123456)
    })

    it('uses onShutdown when provided', async () => {
      const ctx = { set: jest.fn() }
      const next = jest.fn()
      const server = http.createServer()
      server.close = jest.fn()

      const onShutdown = jest.fn().mockResolvedValue()
      const middleware = createMiddleware(server, {
        onShutdown
      })

      await global.process.on.mock.calls[0][1]()
      server.close.mock.calls[0][0]()

      expect(onShutdown).toHaveBeenCalledTimes(1)
    })
  })
})
