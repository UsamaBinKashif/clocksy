import { PrismaClient } from '@prisma/client'

/**
 * Single shared Prisma client for the process. Reused across requests; the
 * connection pool is managed by Prisma.
 */
export const prisma = new PrismaClient()

export type { PrismaClient }
