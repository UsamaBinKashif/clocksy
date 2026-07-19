import { redirect } from 'next/navigation'
import { getRole } from '@/lib/profiles'

/**
 * Entry point — middleware also redirects `/`, but this covers cases where a
 * layout renders before the middleware redirect is applied.
 */
export default async function RootPage(): Promise<never> {
  const role = await getRole()
  redirect(role === 'admin' ? '/admin' : '/me')
}
