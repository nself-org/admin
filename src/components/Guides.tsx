import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

const guides = [
  {
    href: '/init',
    name: 'Setup Wizard',
    description: 'Configure your nself stack with the interactive setup wizard.',
  },
  {
    href: '/doctor',
    name: 'System Health',
    description: 'Run comprehensive diagnostics and health checks.',
  },
  {
    href: '/quickstart',
    name: 'Quick Start',
    description: 'Get up and running with nself in minutes.',
  },
  {
    href: '/monitor',
    name: 'Monitoring',
    description: 'Monitor system metrics, logs, and service health in real-time.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Quick Start
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{guide.name}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{guide.description}</p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
