import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

/**
 * API key format: `clk_<48 hex chars>`. The first 8 hex chars are stored in
 * plaintext as a `prefix` so we can look up candidate rows cheaply; the full key
 * is bcrypt-hashed. The plaintext key is shown to the user exactly once.
 */
const KEY_PREFIX = 'clk_'

export interface GeneratedKey {
  /** Full plaintext key — returned to the caller once and never stored. */
  token: string
  /** Indexable lookup prefix stored alongside the hash. */
  prefix: string
  /** bcrypt hash of the full token. */
  hashedKey: string
}

export async function generateApiKey(): Promise<GeneratedKey> {
  const raw = randomBytes(24).toString('hex') // 48 hex chars
  const token = `${KEY_PREFIX}${raw}`
  const prefix = raw.slice(0, 8)
  const hashedKey = await bcrypt.hash(token, 10)
  return { token, prefix, hashedKey }
}

/** Extracts the lookup prefix from a presented token, or null if malformed. */
export function prefixFromToken(token: string): string | null {
  if (!token.startsWith(KEY_PREFIX)) return null
  const raw = token.slice(KEY_PREFIX.length)
  if (raw.length < 8) return null
  return raw.slice(0, 8)
}

export function verifyApiKey(token: string, hashedKey: string): Promise<boolean> {
  return bcrypt.compare(token, hashedKey)
}
