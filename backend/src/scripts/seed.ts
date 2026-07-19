/**
 * Seed Clocksy with a demo team, one admin, and two employees.
 *
 * Requires DATABASE_URL in backend/.env and an applied migration.
 *
 * Usage:
 *   cd backend && npm run db:seed
 *
 * Test accounts (password for all: ClocksyTest123!):
 *   admin@clocksy.test  — admin
 *   alice@clocksy.test  — employee
 *   bob@clocksy.test    — employee
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, type UserRole } from '@prisma/client'

const prisma = new PrismaClient()

const TEAM_NAME = 'Clocksy Demo'
const PASSWORD = 'ClocksyTest123!'

const SEED_USERS: {
  email: string
  displayName: string
  role: UserRole
}[] = [
  { email: 'admin@clocksy.test', displayName: 'Admin User', role: 'admin' },
  { email: 'alice@clocksy.test', displayName: 'Alice Employee', role: 'employee' },
  { email: 'bob@clocksy.test', displayName: 'Bob Employee', role: 'employee' }
]

async function main(): Promise<void> {
  console.log('Seeding Clocksy demo data…')

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  // 1) Demo team (idempotent by name)
  const existingTeam = await prisma.team.findFirst({
    where: { name: TEAM_NAME }
  })
  const team =
    existingTeam ?? (await prisma.team.create({ data: { name: TEAM_NAME } }))
  console.log(`  ${existingTeam ? 'exists ' : 'created'}  team "${TEAM_NAME}"`)

  // 2) Users + memberships
  for (const seed of SEED_USERS) {
    const email = seed.email.toLowerCase()
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        displayName: seed.displayName,
        role: seed.role,
        teamId: team.id
      },
      update: {
        passwordHash,
        displayName: seed.displayName,
        role: seed.role,
        teamId: team.id
      }
    })
    console.log(`  upserted  ${email} (${seed.role})`)
  }

  // 3) Demo client + projects (idempotent by name within the team)
  const existingClient = await prisma.client.findFirst({
    where: { teamId: team.id, name: 'Acme Corp' }
  })
  const client =
    existingClient ??
    (await prisma.client.create({
      data: { teamId: team.id, name: 'Acme Corp' }
    }))
  console.log(`  ${existingClient ? 'exists ' : 'created'}  client "Acme Corp"`)

  const PROJECTS = ['Website Redesign', 'Mobile App', 'Internal Tools']
  for (const name of PROJECTS) {
    const existing = await prisma.project.findFirst({
      where: { teamId: team.id, name }
    })
    if (!existing) {
      await prisma.project.create({
        data: {
          teamId: team.id,
          name,
          clientId: name === 'Internal Tools' ? null : client.id
        }
      })
    }
    console.log(`  ${existing ? 'exists ' : 'created'}  project "${name}"`)
  }

  console.log('\nDone. Sign in with:')
  console.log('  admin@clocksy.test / ClocksyTest123!  (admin)')
  console.log('  alice@clocksy.test / ClocksyTest123!  (employee)')
  console.log('  bob@clocksy.test   / ClocksyTest123!  (employee)')
}

main()
  .catch((err) => {
    console.error('\nSeed failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
