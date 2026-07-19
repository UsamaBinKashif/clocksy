import type { FastifyPluginAsync } from 'fastify'
import type { Prisma } from '@prisma/client'
import {
  serializeActivityLog,
  serializeProfile,
  serializeProject,
  serializeScreenshot,
  serializeSession
} from '../lib/serialize.js'

const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/reports/team',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const profile = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, teamId: true }
      })

      if (!profile || profile.role !== 'admin' || !profile.teamId) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const query = request.query as { from?: string; to?: string }

      const members = await app.prisma.user.findMany({
        where: { teamId: profile.teamId },
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          teamId: true,
          role: true
        }
      })

      const startedAtFilter: Prisma.DateTimeFilter = {}
      if (query.from) startedAtFilter.gte = new Date(query.from)
      if (query.to) startedAtFilter.lte = new Date(query.to)

      const [sessions, projects] = await Promise.all([
        app.prisma.session.findMany({
          where: {
            userId: { in: members.map((m) => m.id) },
            ...(query.from || query.to ? { startedAt: startedAtFilter } : {})
          },
          include: { project: { include: { client: true } } },
          orderBy: { startedAt: 'desc' }
        }),
        app.prisma.project.findMany({
          where: { teamId: profile.teamId },
          include: { client: true },
          orderBy: { name: 'asc' }
        })
      ])

      return {
        team_id: profile.teamId,
        members: members.map(serializeProfile),
        sessions: sessions.map(serializeSession),
        projects: projects.map(serializeProject)
      }
    }
  )

  app.get(
    '/reports/employee/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const requesterId = request.user.sub
      const { id: employeeId } = request.params as { id: string }
      const query = request.query as { from?: string; to?: string }

      const [requester, employee] = await Promise.all([
        app.prisma.user.findUnique({
          where: { id: requesterId },
          select: { role: true, teamId: true }
        }),
        app.prisma.user.findUnique({
          where: { id: employeeId },
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            teamId: true,
            role: true
          }
        })
      ])

      const isSelf = requesterId === employeeId
      const isTeamAdmin =
        requester?.role === 'admin' &&
        requester.teamId != null &&
        requester.teamId === employee?.teamId

      if (!isSelf && !isTeamAdmin) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const startedAtFilter: Prisma.DateTimeFilter = {}
      if (query.from) startedAtFilter.gte = new Date(query.from)
      if (query.to) startedAtFilter.lte = new Date(query.to)

      const sessions = await app.prisma.session.findMany({
        where: {
          userId: employeeId,
          ...(query.from || query.to ? { startedAt: startedAtFilter } : {})
        },
        include: { project: { include: { client: true } } },
        orderBy: { startedAt: 'desc' }
      })

      const sessionIds = sessions.map((s) => s.id)

      let activityLogs: Awaited<
        ReturnType<typeof app.prisma.activityLog.findMany>
      > = []
      let screenshots: Awaited<
        ReturnType<typeof app.prisma.screenshot.findMany>
      > = []

      if (sessionIds.length > 0) {
        ;[activityLogs, screenshots] = await Promise.all([
          app.prisma.activityLog.findMany({
            where: { sessionId: { in: sessionIds } },
            orderBy: { bucketStart: 'asc' }
          }),
          app.prisma.screenshot.findMany({
            where: { sessionId: { in: sessionIds } },
            orderBy: { takenAt: 'asc' }
          })
        ])
      }

      return {
        employee: employee ? serializeProfile(employee) : null,
        sessions: sessions.map(serializeSession),
        activity_logs: activityLogs.map(serializeActivityLog),
        screenshots: screenshots.map(serializeScreenshot)
      }
    }
  )

  /**
   * Recent screenshots across the whole team (admin-only). Powers the team
   * screenshot gallery without N+1 per-employee report fetches.
   */
  app.get(
    '/reports/team/screenshots',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 200 }
          }
        }
      }
    },
    async (request, reply) => {
      const profile = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { role: true, teamId: true }
      })
      if (!profile || profile.role !== 'admin' || !profile.teamId) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const query = request.query as {
        from?: string
        to?: string
        limit?: number
      }

      const members = await app.prisma.user.findMany({
        where: { teamId: profile.teamId },
        select: { id: true, displayName: true }
      })
      const nameById = new Map(members.map((m) => [m.id, m.displayName]))

      const takenAtFilter: Prisma.DateTimeFilter = {}
      if (query.from) takenAtFilter.gte = new Date(query.from)
      if (query.to) takenAtFilter.lte = new Date(query.to)

      const screenshots = await app.prisma.screenshot.findMany({
        where: {
          userId: { in: members.map((m) => m.id) },
          ...(query.from || query.to ? { takenAt: takenAtFilter } : {})
        },
        orderBy: { takenAt: 'desc' },
        take: query.limit ?? 60
      })

      return {
        screenshots: screenshots.map((shot) => ({
          ...serializeScreenshot(shot),
          user_name: nameById.get(shot.userId) ?? 'Unknown'
        }))
      }
    }
  )
}

export default reportsRoutes
