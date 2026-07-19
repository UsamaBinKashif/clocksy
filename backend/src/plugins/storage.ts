import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { storage, type StorageService } from '../lib/storage.js'

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService
  }
}

const storagePlugin: FastifyPluginAsync = async (app) => {
  app.decorate('storage', storage)
}

export default fp(storagePlugin, {
  name: 'storage'
})
