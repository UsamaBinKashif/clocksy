import Fastify, { type FastifyInstance } from 'fastify'
import prismaPlugin from './plugins/prisma.js'
import storagePlugin from './plugins/storage.js'
import authPlugin from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import authRoutes from './routes/auth.js'
import sessionsRoutes from './routes/sessions.js'
import activityRoutes from './routes/activity.js'
import screenshotsRoutes from './routes/screenshots.js'
import reportsRoutes from './routes/reports.js'
import projectsRoutes from './routes/projects.js'
import settingsRoutes from './routes/settings.js'
import apiKeysRoutes from './routes/apikeys.js'
import publicRoutes from './routes/public.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info'
    }
  })

  await app.register(prismaPlugin)
  await app.register(storagePlugin)
  await app.register(authPlugin)

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(sessionsRoutes)
  await app.register(activityRoutes)
  await app.register(screenshotsRoutes)
  await app.register(reportsRoutes)
  await app.register(projectsRoutes)
  await app.register(settingsRoutes)
  await app.register(apiKeysRoutes)
  // Public API-key-authenticated routes (own auth hook; excluded from JWT gate).
  await app.register(publicRoutes)

  return app
}
