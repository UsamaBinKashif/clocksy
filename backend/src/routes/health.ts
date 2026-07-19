import type { FastifyInstance } from 'fastify'

/**
 * Liveness probe. Unauthenticated on purpose so deploy platforms
 * (Railway/Render) can health-check the service.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string' }
            }
          }
        }
      }
    },
    async () => ({ status: 'ok' })
  )
}
