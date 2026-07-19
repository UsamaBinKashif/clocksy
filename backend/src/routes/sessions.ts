import type { FastifyPluginAsync } from 'fastify'

const sessionsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/sessions/start',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            client_at: { type: 'string' },
            resume: { type: 'boolean' },
            project_id: { type: 'string', format: 'uuid' }
          }
        },
        response: {
          200: {
            type: 'object',
            required: ['session_id', 'status'],
            properties: {
              session_id: { type: 'string' },
              status: { type: 'string' },
              started_at: { type: 'string' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const body = (request.body ?? {}) as {
        client_at?: string
        resume?: boolean
        project_id?: string
      }

      // Resume path: reopen the latest paused session for this user.
      if (body.resume) {
        const paused = await app.prisma.session.findFirst({
          where: { userId, status: 'paused' },
          orderBy: { startedAt: 'desc' }
        })

        if (paused) {
          const updated = await app.prisma.session.update({
            where: { id: paused.id },
            data: { status: 'active' }
          })
          return {
            session_id: updated.id,
            status: updated.status,
            started_at: updated.startedAt.toISOString()
          }
        }
      }

      const profile = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { teamId: true }
      })

      // Only accept a project that belongs to the caller's team.
      let projectId: string | null = null
      if (body.project_id && profile?.teamId) {
        const project = await app.prisma.project.findFirst({
          where: { id: body.project_id, teamId: profile.teamId },
          select: { id: true }
        })
        if (!project) {
          return reply.code(400).send({ error: 'Invalid project_id' })
        }
        projectId = project.id
      }

      const session = await app.prisma.session.create({
        data: {
          userId,
          teamId: profile?.teamId ?? null,
          projectId,
          status: 'active',
          clientAt: body.client_at ? new Date(body.client_at) : null
        }
      })

      return reply.code(200).send({
        session_id: session.id,
        status: session.status,
        started_at: session.startedAt.toISOString()
      })
    }
  )

  app.post(
    '/sessions/pause',
    {
      schema: {
        body: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            client_at: { type: 'string' },
            paused_seconds: { type: 'number' }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const body = request.body as {
        session_id: string
        paused_seconds?: number
      }

      const session = await app.prisma.session.findFirst({
        where: { id: body.session_id, userId }
      })
      if (!session) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      if (session.status === 'ended') {
        return reply.code(409).send({ error: 'Session already ended' })
      }

      const updated = await app.prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'paused',
          pausedSeconds:
            typeof body.paused_seconds === 'number'
              ? Math.max(session.pausedSeconds, Math.floor(body.paused_seconds))
              : session.pausedSeconds
        }
      })

      return {
        session_id: updated.id,
        status: updated.status,
        paused_seconds: updated.pausedSeconds
      }
    }
  )

  app.post(
    '/sessions/stop',
    {
      schema: {
        body: {
          type: 'object',
          required: ['session_id'],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            client_at: { type: 'string' },
            paused_seconds: { type: 'number' }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const body = request.body as {
        session_id: string
        paused_seconds?: number
      }

      const session = await app.prisma.session.findFirst({
        where: { id: body.session_id, userId }
      })
      if (!session) {
        return reply.code(403).send({ error: 'Forbidden' })
      }
      if (session.status === 'ended') {
        return {
          session_id: session.id,
          status: session.status,
          ended_at: session.endedAt?.toISOString() ?? null
        }
      }

      const updated = await app.prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'ended',
          endedAt: new Date(),
          pausedSeconds:
            typeof body.paused_seconds === 'number'
              ? Math.floor(body.paused_seconds)
              : session.pausedSeconds
        }
      })

      return {
        session_id: updated.id,
        status: updated.status,
        ended_at: updated.endedAt?.toISOString() ?? null
      }
    }
  )

  /**
   * Ethical-monitoring: an employee may delete their own session and all of its
   * data (activity logs + screenshots cascade). Screenshot blobs in storage are
   * removed best-effort first. Admins cannot delete other people's data here.
   */
  app.delete(
    '/sessions/:id',
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
      const userId = request.user.sub
      const { id } = request.params as { id: string }

      const session = await app.prisma.session.findFirst({
        where: { id, userId },
        select: { id: true }
      })
      if (!session) return reply.code(404).send({ error: 'Not found' })

      const shots = await app.prisma.screenshot.findMany({
        where: { sessionId: id },
        select: { storagePath: true }
      })
      await Promise.allSettled(
        shots.map((s) => app.storage.delete(s.storagePath))
      )

      // activity_logs + screenshots cascade via the FK relations.
      await app.prisma.session.delete({ where: { id } })

      return { ok: true }
    }
  )
}

export default sessionsRoutes
