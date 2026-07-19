import type { FastifyPluginAsync } from 'fastify'

interface TeamSettings {
  screenshots_enabled: boolean
  screenshot_min_interval_sec: number
  screenshot_max_interval_sec: number
}

/**
 * Team-level capture settings. Any team member can read them (the desktop app
 * fetches them at session start); only admins can change them.
 */
const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/settings', async (request, reply) => {
    const me = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { teamId: true }
    })
    if (!me?.teamId) return reply.code(403).send({ error: 'No team' })

    const team = await app.prisma.team.findUnique({
      where: { id: me.teamId },
      select: {
        screenshotsEnabled: true,
        screenshotMinIntervalSec: true,
        screenshotMaxIntervalSec: true
      }
    })
    if (!team) return reply.code(404).send({ error: 'Not found' })

    const settings: TeamSettings = {
      screenshots_enabled: team.screenshotsEnabled,
      screenshot_min_interval_sec: team.screenshotMinIntervalSec,
      screenshot_max_interval_sec: team.screenshotMaxIntervalSec
    }
    return settings
  })

  app.put(
    '/settings',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            screenshots_enabled: { type: 'boolean' },
            screenshot_min_interval_sec: { type: 'integer', minimum: 30 },
            screenshot_max_interval_sec: { type: 'integer', minimum: 30 }
          }
        }
      }
    },
    async (request, reply) => {
      const me = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { teamId: true, role: true }
      })
      if (!me?.teamId || me.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      const body = request.body as Partial<TeamSettings>

      const min =
        body.screenshot_min_interval_sec ??
        (
          await app.prisma.team.findUnique({
            where: { id: me.teamId },
            select: { screenshotMinIntervalSec: true }
          })
        )?.screenshotMinIntervalSec ??
        600
      const max = body.screenshot_max_interval_sec ?? min

      if (max < min) {
        return reply
          .code(400)
          .send({ error: 'Max interval must be >= min interval' })
      }

      const team = await app.prisma.team.update({
        where: { id: me.teamId },
        data: {
          ...(body.screenshots_enabled !== undefined
            ? { screenshotsEnabled: body.screenshots_enabled }
            : {}),
          ...(body.screenshot_min_interval_sec !== undefined
            ? { screenshotMinIntervalSec: body.screenshot_min_interval_sec }
            : {}),
          ...(body.screenshot_max_interval_sec !== undefined
            ? { screenshotMaxIntervalSec: body.screenshot_max_interval_sec }
            : {})
        },
        select: {
          screenshotsEnabled: true,
          screenshotMinIntervalSec: true,
          screenshotMaxIntervalSec: true
        }
      })

      const settings: TeamSettings = {
        screenshots_enabled: team.screenshotsEnabled,
        screenshot_min_interval_sec: team.screenshotMinIntervalSec,
        screenshot_max_interval_sec: team.screenshotMaxIntervalSec
      }
      return settings
    }
  )
}

export default settingsRoutes
