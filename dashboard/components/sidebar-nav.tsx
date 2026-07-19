'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Camera,
  Clock,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/admin/employees', label: 'Employees', icon: Users },
      { href: '/admin/sessions', label: 'Sessions', icon: Clock },
      { href: '/admin/screenshots', label: 'Screenshots', icon: Camera },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 }
    ]
  },
  {
    label: 'Manage',
    items: [
      { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/api-keys', label: 'API keys', icon: KeyRound }
    ]
  }
]

export function SidebarNav(): JSX.Element {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-1 pb-1 text-xs font-medium text-text-muted">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-border bg-nav-active text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-nav-active hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
