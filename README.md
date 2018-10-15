# koa-shutdown

Ensure that during shutdown [Koa](https://github.com/koajs/koa) returns correctly with a `HTTP 503 Service Unavailable`. Based off [`express-graceful-shutdown`](https://github.com/serby/express-graceful-shutdown) with the middleware adapted for Koa.

```js
const shutdown = require('@tastespuds/koa-shutdown');
const http = require('http');
const Koa = require('koa');

const app = new Koa();
const server = http.createServer(app.callback());

app.use(shutdown.createShutdownMiddleware(server));

app.use(ctx => {
  ctx.status = 200;
  ctx.body = { foo: 'bar' };
});

server.listen(0, 'localhost', () => {
  const { address, port } = server.address();
  console.log('Listening on http://%s:%d', address, port);
});
```

## Install

```
npm install @tastespuds/koa-shutdown --save
```

## Module Properties

```
shutdown.createShutdownMiddleware(server, options) => async function middleware(ctx, next)
```

| Argument | Description |
| ---- | ---- |
| `server` | [`http.server`](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_class_http_server) |
| `options` | Optional options |
| `options.logger` | A logger that provides `info`, `warn` and `error` methods, defaults to `console` |
| `options.onShutdown` | Async callback for other connections that need closing (e.g. database) |
| `options.forceTimeout` | Milliseconds to wait for `server.close()` to finish, defaults to `30000` |
| `options.additionalSignals` | Allows you to add more signals to close on |
