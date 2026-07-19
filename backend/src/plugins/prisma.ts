import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { prisma } from '../lib/prisma.js'
import type { PrismaClient } from '../lib/prisma.js'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma'
})
