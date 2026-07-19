import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { signToken } from '../lib/jwt.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string
        password: string
      }

      const user = await app.prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
      })

      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const token = await signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        team_id: user.teamId
      })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          display_name: user.displayName,
          avatar_url: user.avatarUrl,
          team_id: user.teamId,
          role: user.role
        }
      }
    }
  )

  app.get('/auth/me', async (request, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: request.user.sub }
    })

    if (!user) {
      return reply.code(404).send({ error: 'Not found' })
    }

    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      avatar_url: user.avatarUrl,
      team_id: user.teamId,
      role: user.role
    }
  })

  /**
   * Ethical-monitoring: an employee can erase all of their own tracked data
   * (every session, and the activity logs + screenshots that cascade from it),
   * including the screenshot blobs in storage. The account itself is kept.
   */
  app.delete('/me/data', async (request) => {
    const userId = request.user.sub

    const shots = await app.prisma.screenshot.findMany({
      where: { userId },
      select: { storagePath: true }
    })
    await Promise.allSettled(
      shots.map((s) => app.storage.delete(s.storagePath))
    )

    const deleted = await app.prisma.session.deleteMany({ where: { userId } })

    return { ok: true, sessions_deleted: deleted.count }
  })
}

export default authRoutes
