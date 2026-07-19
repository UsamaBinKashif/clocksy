import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import type { Prisma } from '@prisma/client'
import { prefixFromToken, verifyApiKey } from '../lib/apikey.js'
import { serializeProject } from '../lib/serialize.js'

/**
 * Public read-only Web API for external tools. Mounted under `/v1` and
 * authenticated with a team API key (Bearer token or `x-api-key` header) rather
 * than a user JWT. The `/v1` prefix is excluded from the global JWT hook.
 */
declare module 'fastify' {
  interface FastifyRequest {
    apiTeamId?: string
  }
}

function getPresentedKey(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (header) {
    const [scheme, token] = header.split(' ')
    if (scheme?.toLowerCase() === 'bearer' && token) return token
  }
  const alt = request.headers['x-api-key']
  if (typeof alt === 'string' && alt) return alt
  return null
}

/** Tracked seconds for a session: wall clock minus paused, capped at >= 0. */
function trackedSeconds(session: {
  startedAt: Date
  endedAt: Date | null
  pausedSeconds: number
}): number {
  const end = session.endedAt ? session.endedAt.getTime() : Date.now()
  const raw = (end - session.startedAt.getTime()) / 1000 - session.pausedSeconds
  return Math.max(0, Math.floor(raw))
}

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.decorateRequest('apiTeamId', undefined)

  // API-key auth for every /v1 route.
  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = getPresentedKey(request)
      const prefix = token ? prefixFromToken(token) : null
      if (!token || !prefix) {
        return reply.code(401).send({ error: 'Missing or malformed API key' })
      }

      const candidates = await app.prisma.apiKey.findMany({
        where: { prefix, revokedAt: null }
      })

      let matched: (typeof candidates)[number] | null = null
      for (const candidate of candidates) {
        if (await verifyApiKey(token, candidate.hashedKey)) {
          matched = candidate
          break
        }
      }

      if (!matched) {
        return reply.code(401).send({ error: 'Invalid API key' })
      }

      request.apiTeamId = matched.teamId
      // Fire-and-forget usage stamp.
      void app.prisma.apiKey
        .update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined)
    }
  )

  app.get(
    '/v1/time-entries',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            project_id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request) => {
      const teamId = request.apiTeamId as string
      const query = request.query as {
        from?: string
        to?: string
        project_id?: string
      }

      const startedAtFilter: Prisma.DateTimeFilter = {}
      if (query.from) startedAtFilter.gte = new Date(query.from)
      if (query.to) startedAtFilter.lte = new Date(query.to)

      const sessions = await app.prisma.session.findMany({
        where: {
          teamId,
          ...(query.project_id ? { projectId: query.project_id } : {}),
          ...(query.from || query.to ? { startedAt: startedAtFilter } : {})
        },
        include: {
          project: { include: { client: true } },
          user: { select: { id: true, displayName: true, email: true } }
        },
        orderBy: { startedAt: 'desc' }
      })

      return {
        time_entries: sessions.map((s) => ({
          id: s.id,
          user_id: s.userId,
          user_name: s.user.displayName,
          user_email: s.user.email,
          project_id: s.projectId,
          project_name: s.project?.name ?? null,
          client_name: s.project?.client?.name ?? null,
          status: s.status,
          started_at: s.startedAt.toISOString(),
          ended_at: s.endedAt?.toISOString() ?? null,
          tracked_seconds: trackedSeconds(s)
        }))
      }
    }
  )

  app.get('/v1/projects', async (request) => {
    const teamId = request.apiTeamId as string
    const projects = await app.prisma.project.findMany({
      where: { teamId },
      include: { client: true },
      orderBy: { name: 'asc' }
    })
    return { projects: projects.map(serializeProject) }
  })
}

export default publicRoutes
