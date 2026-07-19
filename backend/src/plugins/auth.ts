import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { verifyToken } from '../lib/jwt.js'

export interface AuthUser {
  sub: string
  email?: string
  role?: string
  team_id: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

// `/v1` is the public API — it authenticates with an API key in its own hook,
// so the user-JWT gate must not run for it.
const PUBLIC_PATH_PREFIXES = ['/health', '/auth/login', '/v1']

function isPublicPath(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('user', null as unknown as AuthUser)

  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicPath(request.url)) return

      const token = getBearerToken(request.headers.authorization)
      if (!token) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      try {
        const claims = await verifyToken(token)
        request.user = {
          sub: claims.sub,
          email: typeof claims.email === 'string' ? claims.email : undefined,
          role: typeof claims.role === 'string' ? claims.role : undefined,
          team_id:
            typeof claims.team_id === 'string' ? claims.team_id : null
        }
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
    }
  )
}

export default fp(authPlugin, {
  name: 'auth'
})
