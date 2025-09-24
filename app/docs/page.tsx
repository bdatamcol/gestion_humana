import Link from 'next/link'
import { 
  User, 
  Shield, 
  Bell, 
  Lock, 
  Code, 
  BookOpen, 
  ArrowRight,
  Rocket
} from 'lucide-react'

export default function DocsPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
          Gestión Humana Documentation
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400">
          Everything you need to know about using and managing the Gestión Humana platform.
        </p>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link 
          href="/docs/usuario"
          className="group relative rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
        >
          <div className="space-y-4">
            <div className="inline-flex rounded-lg bg-blue-50 p-2 dark:bg-blue-500/10">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                User Guide
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Learn how to use the platform as an employee
              </p>
            </div>
            <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
              Get started
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link 
          href="/docs/admin"
          className="group relative rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-200/10 dark:hover:border-zinc-700"
        >
          <div className="space-y-4">
            <div className="inline-flex rounded-lg bg-purple-50 p-2 dark:bg-purple-500/10">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Admin Guide
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Manage users, requests, and system settings
              </p>
            </div>
            <div className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400">
              Get started
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link 
          href="/docs/api"
          className="group relative rounded-xl border border-zinc-200 p-6 transition-colors hover:border-zinc-300 dark:border-zinc-200/10 dark:hover:border-zinc-700"
        >
          <div className="space-y-4">
            <div className="inline-flex rounded-lg bg-green-50 p-2 dark:bg-green-500/10">
              <Code className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                API Reference
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Integrate with our REST API
              </p>
            </div>
            <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
              Explore
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Features
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Discover what Gestión Humana can do for your organization.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Bell className="h-5 w-5 text-zinc-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Smart Notifications
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Real-time alerts for requests, approvals, and system updates
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-zinc-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Enterprise Security
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Role-based access control with encrypted data storage
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-zinc-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Comprehensive Documentation
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Detailed guides for users and administrators
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              Quick Start
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Get up and running in minutes.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                1
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Choose your role
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Select whether you're an employee or administrator
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                2
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Follow the guide
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Use our comprehensive guides to learn the platform
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                3
              </div>
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-white">
                  Start using
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Begin managing your HR processes efficiently
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}