import type { FastifyPluginAsync } from 'fastify'
import { STORAGE_BUCKET } from '../lib/storage.js'

const screenshotsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Issues a short-lived presigned PUT URL so the desktop app can upload a
   * JPEG straight to object storage under the caller's own uid prefix.
   */
  app.post(
    '/screenshots/upload-url',
    {
      schema: {
        body: {
          type: 'object',
          required: ['session_id', 'file_name'],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            file_name: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const body = request.body as { session_id: string; file_name: string }

      const session = await app.prisma.session.findFirst({
        where: { id: body.session_id, userId },
        select: { id: true }
      })
      if (!session) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      // Sanitise the file name; keys are always scoped to the caller's uid.
      const safeName = body.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const key = `${userId}/${body.session_id}/${safeName}`
      const url = await app.storage.getUploadUrl(key, 'image/jpeg', 300)

      return { url, key, bucket: STORAGE_BUCKET }
    }
  )

  /**
   * Registers metadata after the desktop has uploaded a JPEG to object storage
   * at storage_path.
   */
  app.post(
    '/screenshots/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['session_id', 'taken_at', 'storage_path'],
          properties: {
            session_id: { type: 'string', format: 'uuid' },
            taken_at: { type: 'string' },
            storage_path: { type: 'string', minLength: 1 },
            activity_percent: { type: 'number' }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const body = request.body as {
        session_id: string
        taken_at: string
        storage_path: string
        activity_percent?: number
      }

      const session = await app.prisma.session.findFirst({
        where: { id: body.session_id, userId },
        select: { id: true }
      })
      if (!session) {
        return reply.code(403).send({ error: 'Forbidden' })
      }

      // Path must be under the caller's uid prefix.
      const expectedPrefix = `${userId}/`
      if (!body.storage_path.startsWith(expectedPrefix)) {
        return reply.code(400).send({ error: 'Invalid storage_path' })
      }

      const row = await app.prisma.screenshot.create({
        data: {
          sessionId: body.session_id,
          userId,
          takenAt: new Date(body.taken_at),
          storagePath: body.storage_path,
          activityPercent: body.activity_percent ?? 0
        }
      })

      return {
        id: row.id,
        storage_path: row.storagePath,
        bucket: STORAGE_BUCKET
      }
    }
  )

  app.get(
    '/screenshots/:id/url',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.user.sub
      const { id } = request.params as { id: string }

      const shot = await app.prisma.screenshot.findUnique({ where: { id } })
      if (!shot) {
        return reply.code(404).send({ error: 'Not found' })
      }

      const isOwner = shot.userId === userId
      if (!isOwner) {
        const [profile, owner] = await Promise.all([
          app.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, teamId: true }
          }),
          app.prisma.user.findUnique({
            where: { id: shot.userId },
            select: { teamId: true }
          })
        ])

        const isTeamAdmin =
          profile?.role === 'admin' &&
          profile.teamId != null &&
          profile.teamId === owner?.teamId

        if (!isTeamAdmin) {
          return reply.code(403).send({ error: 'Forbidden' })
        }
      }

      const url = await app.storage.getUrl(shot.storagePath, 60)

      return { url, expires_in: 60 }
    }
  )

  /**
   * Ethical-monitoring: an employee may delete their own screenshot. The blob is
   * removed from storage first, then the metadata row. Only the owner can delete.
   */
  app.delete(
    '/screenshots/:id',
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

      const shot = await app.prisma.screenshot.findFirst({
        where: { id, userId },
        select: { id: true, storagePath: true }
      })
      if (!shot) return reply.code(404).send({ error: 'Not found' })

      try {
        await app.storage.delete(shot.storagePath)
      } catch {
        // best-effort blob removal; metadata is still deleted below
      }
      await app.prisma.screenshot.delete({ where: { id } })

      return { ok: true }
    }
  )
}

export default screenshotsRoutes
