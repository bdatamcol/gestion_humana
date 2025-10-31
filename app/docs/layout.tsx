import { DocsHeader } from '@/components/docs-header'
import { Sidebar } from '@/components/docs-sidebar'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full">
      <DocsHeader />
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}