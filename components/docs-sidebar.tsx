'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  User, 
  Shield, 
  Bell, 
  Lock, 
  Code, 
  BookOpen,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  {
    title: 'Introduction',
    href: '/docs',
    icon: Home
  },
  {
    title: 'User Guide',
    href: '/docs/usuario',
    icon: User
  },
  {
    title: 'Admin Guide',
    href: '/docs/admin',
    icon: Shield
  },
  {
    title: 'Notifications',
    href: '/docs/notificaciones',
    icon: Bell
  },
  {
    title: 'Security',
    href: '/docs/seguridad',
    icon: Lock
  },
  {
    title: 'API Reference',
    href: '/docs/api',
    icon: Code
  }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm lg:hidden" />
      
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white px-4 pb-4 pt-20 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:inset-0 lg:z-auto lg:shadow-none lg:pt-0">
        <div className="lg:sticky lg:top-4">
          <div className="mb-8 px-2">
            <Link href="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-lg text-zinc-900 dark:text-white">
                Gestión Humana
              </span>
            </Link>
          </div>
          
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'group flex items-center gap-x-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                  )}
                >
                  <item.icon 
                    className={clsx(
                      'h-4 w-4',
                      isActive
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300'
                    )} 
                  />
                  <span className="flex-1">{item.title}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}