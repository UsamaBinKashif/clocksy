import type { FastifyPluginAsync } from 'fastify'
import { generateApiKey } from '../lib/apikey.js'

/**
 * API key management (admin-only). Keys are team-scoped and grant read access to
 * the public `/v1` API. The plaintext key is returned exactly once, on creation.
 */
const apiKeysRoutes: FastifyPluginAsync = async (app) => {
  async function requireAdminTeam(userId: string): Promise<string | null> {
    const me = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true, role: true }
    })
    if (!me?.teamId || me.role !== 'admin') return null
    return me.teamId
  }

  app.get('/api-keys', async (request, reply) => {
    const teamId = await requireAdminTeam(request.user.sub)
    if (!teamId) return reply.code(403).send({ error: 'Forbidden' })

    const keys = await app.prisma.apiKey.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    })

    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        created_at: k.createdAt.toISOString(),
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
        revoked_at: k.revokedAt?.toISOString() ?? null
      }))
    }
  })

  app.post(
    '/api-keys',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 }
          }
        }
      }
    },
    async (request, reply) => {
      const teamId = await requireAdminTeam(request.user.sub)
      if (!teamId) return reply.code(403).send({ error: 'Forbidden' })

      const { name } = request.body as { name: string }
      const { token, prefix, hashedKey } = await generateApiKey()

      const key = await app.prisma.apiKey.create({
        data: { teamId, name: name.trim(), prefix, hashedKey }
      })

      // `token` is returned only here and never persisted in plaintext.
      return reply.code(201).send({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        token,
        created_at: key.createdAt.toISOString()
      })
    }
  )

  app.delete(
    '/api-keys/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } }
        }
      }
    },
    async (request, reply) => {
      const teamId = await requireAdminTeam(request.user.sub)
      if (!teamId) return reply.code(403).send({ error: 'Forbidden' })

      const { id } = request.params as { id: string }
      const existing = await app.prisma.apiKey.findFirst({
        where: { id, teamId },
        select: { id: true }
      })
      if (!existing) return reply.code(404).send({ error: 'Not found' })

      await app.prisma.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() }
      })
      return { ok: true }
    }
  )
}

export default apiKeysRoutes
