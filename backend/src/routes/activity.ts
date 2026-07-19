import type { FastifyPluginAsync } from 'fastify'

interface ActivityItem {
  session_id: string
  bucket_start: string
  keyboard_count: number
  mouse_count: number
  is_idle?: boolean
  client_at?: string
}

const activityRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/activity',
    {
      schema: {
        body: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: [
              'session_id',
              'bucket_start',
              'keyboard_count',
              'mouse_count'
            ],
            properties: {
              session_id: { type: 'string', format: 'uuid' },
              bucket_start: { type: 'string' },
              keyboard_count: { type: 'integer', minimum: 0 },
              mouse_count: { type: 'integer', minimum: 0 },
              is_idle: { type: 'boolean' },
              client_at: { type: 'string' }
            }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['inserted'],
            properties: {
              inserted: { type: 'integer' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const items = request.body as ActivityItem[]

      const sessionIds = [...new Set(items.map((item) => item.session_id))]

      const owned = await app.prisma.session.findMany({
        where: { id: { in: sessionIds }, userId },
        select: { id: true }
      })
      if (owned.length !== sessionIds.length) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const result = await app.prisma.activityLog.createMany({
        data: items.map((item) => ({
          sessionId: item.session_id,
          userId,
          bucketStart: new Date(item.bucket_start),
          keyboardCount: item.keyboard_count,
          mouseCount: item.mouse_count,
          isIdle: item.is_idle ?? false,
          clientAt: item.client_at ? new Date(item.client_at) : null
        }))
      })

      return { inserted: result.count }
    }
  )
}

export default activityRoutes
