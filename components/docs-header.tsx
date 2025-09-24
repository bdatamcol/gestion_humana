'use client'

import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/60">
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to App</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}