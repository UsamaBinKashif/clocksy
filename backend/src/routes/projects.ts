import type { FastifyPluginAsync } from 'fastify'
import { serializeClient, serializeProject } from '../lib/serialize.js'

/**
 * Clients and projects. All rows are scoped to the caller's team. Reads are open
 * to any team member (the desktop app needs the project list for its picker);
 * writes are admin-only.
 */
const projectsRoutes: FastifyPluginAsync = async (app) => {
  async function requireTeam(userId: string): Promise<{
    teamId: string
    role: string
  } | null> {
    const me = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true, role: true }
    })
    if (!me?.teamId) return null
    return { teamId: me.teamId, role: me.role }
  }

  // ---- Projects ----

  app.get(
    '/projects',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            include_archived: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      const me = await requireTeam(request.user.sub)
      if (!me) return reply.code(403).send({ error: 'No team' })

      const { include_archived } = request.query as {
        include_archived?: boolean
      }

      const projects = await app.prisma.project.findMany({
        where: {
          teamId: me.teamId,
          ...(include_archived ? {} : { archived: false })
        },
        include: { client: true },
        orderBy: { name: 'asc' }
      })

      return { projects: projects.map(serializeProject) }
    }
  )

  app.post(
    '/projects',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            client_id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request, reply) => {
      const me = await requireTeam(request.user.sub)
      if (!me || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const body = request.body as { name: string; client_id?: string }

      if (body.client_id) {
        const client = await app.prisma.client.findFirst({
          where: { id: body.client_id, teamId: me.teamId },
          select: { id: true }
        })
        if (!client) return reply.code(400).send({ error: 'Invalid client_id' })
      }

      const project = await app.prisma.project.create({
        data: {
          teamId: me.teamId,
          name: body.name.trim(),
          clientId: body.client_id ?? null
        },
        include: { client: true }
      })

      return reply.code(201).send(serializeProject(project))
    }
  )

  app.patch(
    '/projects/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            client_id: { type: ['string', 'null'], format: 'uuid' },
            archived: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      const me = await requireTeam(request.user.sub)
      if (!me || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const { id } = request.params as { id: string }
      const body = request.body as {
        name?: string
        client_id?: string | null
        archived?: boolean
      }

      const existing = await app.prisma.project.findFirst({
        where: { id, teamId: me.teamId },
        select: { id: true }
      })
      if (!existing) return reply.code(404).send({ error: 'Not found' })

      if (body.client_id) {
        const client = await app.prisma.client.findFirst({
          where: { id: body.client_id, teamId: me.teamId },
          select: { id: true }
        })
        if (!client) return reply.code(400).send({ error: 'Invalid client_id' })
      }

      const project = await app.prisma.project.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.client_id !== undefined
            ? { clientId: body.client_id }
            : {}),
          ...(body.archived !== undefined ? { archived: body.archived } : {})
        },
        include: { client: true }
      })

      return serializeProject(project)
    }
  )

  app.delete(
    '/projects/:id',
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
      const me = await requireTeam(request.user.sub)
      if (!me || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const { id } = request.params as { id: string }
      const existing = await app.prisma.project.findFirst({
        where: { id, teamId: me.teamId },
        select: { id: true }
      })
      if (!existing) return reply.code(404).send({ error: 'Not found' })

      // Sessions keep their history; SetNull detaches the project reference.
      await app.prisma.project.delete({ where: { id } })
      return { ok: true }
    }
  )

  // ---- Clients ----

  app.get('/clients', async (request, reply) => {
    const me = await requireTeam(request.user.sub)
    if (!me) return reply.code(403).send({ error: 'No team' })

    const clients = await app.prisma.client.findMany({
      where: { teamId: me.teamId },
      orderBy: { name: 'asc' }
    })
    return { clients: clients.map(serializeClient) }
  })

  app.post(
    '/clients',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 }
          }
        }
      }
    },
    async (request, reply) => {
      const me = await requireTeam(request.user.sub)
      if (!me || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const body = request.body as { name: string }
      const client = await app.prisma.client.create({
        data: { teamId: me.teamId, name: body.name.trim() }
      })
      return reply.code(201).send(serializeClient(client))
    }
  )

  app.delete(
    '/clients/:id',
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
      const me = await requireTeam(request.user.sub)
      if (!me || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const { id } = request.params as { id: string }
      const existing = await app.prisma.client.findFirst({
        where: { id, teamId: me.teamId },
        select: { id: true }
      })
      if (!existing) return reply.code(404).send({ error: 'Not found' })

      await app.prisma.client.delete({ where: { id } })
      return { ok: true }
    }
  )
}

export default projectsRoutes
