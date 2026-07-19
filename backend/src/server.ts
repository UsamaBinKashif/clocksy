import 'dotenv/config'
import { buildApp } from './app.js'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

const app = await buildApp()

const closeGracefully = (signal: NodeJS.Signals): void => {
  app.log.info(`Received ${signal}, shutting down`)
  void app.close().then(() => process.exit(0))
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, closeGracefully)
}

try {
  await app.listen({ port, host })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
