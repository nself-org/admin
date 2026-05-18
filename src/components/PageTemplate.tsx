import { HeroPattern } from '@/components/HeroPattern'

interface PageTemplateProps {
  title?: string
  description: string
  children?: React.ReactNode
}

export function PageTemplate({ title = 'Page', description, children }: PageTemplateProps) {
  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
            {title}
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>

        {children || (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="py-12 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="h-8 w-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                Coming Soon
              </h2>
              <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
                This feature is currently under development. Check back soon for updates.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
