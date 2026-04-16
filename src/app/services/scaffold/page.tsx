'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  Loader2,
  Package,
  Search,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// -- Types --

interface TemplateInfo {
  id: string
  name: string
  language: string
  category: string
  description: string
}

interface CLIOutput {
  command: string
  output: string
  success: boolean
  timestamp: string
}

// -- Template Data --

const TEMPLATES: TemplateInfo[] = [
  // JavaScript / TypeScript
  {
    id: 'express',
    name: 'Express',
    language: 'JavaScript',
    category: 'js',
    description: 'Minimal and flexible Node.js web framework',
  },
  {
    id: 'fastify',
    name: 'Fastify',
    language: 'TypeScript',
    category: 'js',
    description: 'Fast and low overhead web framework for Node.js',
  },
  {
    id: 'nestjs',
    name: 'NestJS',
    language: 'TypeScript',
    category: 'js',
    description: 'Progressive Node.js framework for scalable server-side apps',
  },
  {
    id: 'hono',
    name: 'Hono',
    language: 'TypeScript',
    category: 'js',
    description: 'Ultrafast web framework for the Edge',
  },
  {
    id: 'bullmq',
    name: 'BullMQ',
    language: 'TypeScript',
    category: 'js',
    description: 'Premium message queue for Node.js based on Redis',
  },
  {
    id: 'koa',
    name: 'Koa',
    language: 'JavaScript',
    category: 'js',
    description: 'Next generation web framework by the Express team',
  },
  {
    id: 'adonis',
    name: 'AdonisJS',
    language: 'TypeScript',
    category: 'js',
    description: 'Full-featured TypeScript web framework',
  },
  {
    id: 'strapi',
    name: 'Strapi',
    language: 'JavaScript',
    category: 'js',
    description: 'Open-source headless CMS',
  },
  {
    id: 'keystone',
    name: 'Keystone',
    language: 'TypeScript',
    category: 'js',
    description: 'Headless CMS and application platform',
  },
  {
    id: 'remix',
    name: 'Remix',
    language: 'TypeScript',
    category: 'js',
    description: 'Full stack web framework with nested routing',
  },
  {
    id: 'next',
    name: 'Next.js',
    language: 'TypeScript',
    category: 'js',
    description: 'React framework for production applications',
  },
  {
    id: 'nuxt',
    name: 'Nuxt',
    language: 'TypeScript',
    category: 'js',
    description: 'Vue.js framework for universal applications',
  },
  {
    id: 'astro',
    name: 'Astro',
    language: 'TypeScript',
    category: 'js',
    description: 'All-in-one web framework for content-driven websites',
  },
  {
    id: 'sveltekit',
    name: 'SvelteKit',
    language: 'TypeScript',
    category: 'js',
    description: 'Full stack Svelte framework',
  },
  // Python
  {
    id: 'fastapi',
    name: 'FastAPI',
    language: 'Python',
    category: 'python',
    description: 'Modern, fast web framework for building APIs with Python',
  },
  {
    id: 'flask',
    name: 'Flask',
    language: 'Python',
    category: 'python',
    description: 'Lightweight WSGI web application framework',
  },
  {
    id: 'django',
    name: 'Django',
    language: 'Python',
    category: 'python',
    description: 'High-level Python web framework for rapid development',
  },
  {
    id: 'celery',
    name: 'Celery',
    language: 'Python',
    category: 'python',
    description: 'Distributed task queue for async processing',
  },
  {
    id: 'streamlit',
    name: 'Streamlit',
    language: 'Python',
    category: 'python',
    description: 'Build data apps in minutes with Python',
  },
  {
    id: 'litestar',
    name: 'Litestar',
    language: 'Python',
    category: 'python',
    description: 'Production-ready ASGI framework',
  },
  {
    id: 'sanic',
    name: 'Sanic',
    language: 'Python',
    category: 'python',
    description: 'Async Python web server and framework',
  },
  {
    id: 'tornado',
    name: 'Tornado',
    language: 'Python',
    category: 'python',
    description: 'Python web framework and async networking library',
  },
  // Go
  {
    id: 'gin',
    name: 'Gin',
    language: 'Go',
    category: 'go',
    description: 'High-performance HTTP web framework written in Go',
  },
  {
    id: 'fiber',
    name: 'Fiber',
    language: 'Go',
    category: 'go',
    description: 'Express-inspired web framework built on Fasthttp',
  },
  {
    id: 'echo',
    name: 'Echo',
    language: 'Go',
    category: 'go',
    description: 'High performance, minimalist Go web framework',
  },
  {
    id: 'grpc-go',
    name: 'gRPC',
    language: 'Go',
    category: 'go',
    description: 'High-performance RPC framework for Go',
  },
  {
    id: 'chi',
    name: 'Chi',
    language: 'Go',
    category: 'go',
    description: 'Lightweight, idiomatic router for Go HTTP services',
  },
  {
    id: 'mux',
    name: 'Gorilla Mux',
    language: 'Go',
    category: 'go',
    description: 'Powerful HTTP router and URL matcher for Go',
  },
  {
    id: 'buffalo',
    name: 'Buffalo',
    language: 'Go',
    category: 'go',
    description: 'Rapid web development framework for Go',
  },
  // Rust
  {
    id: 'actix',
    name: 'Actix Web',
    language: 'Rust',
    category: 'rust',
    description: 'Powerful, pragmatic web framework for Rust',
  },
  {
    id: 'axum',
    name: 'Axum',
    language: 'Rust',
    category: 'rust',
    description: 'Ergonomic and modular web framework built with Tokio',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    language: 'Rust',
    category: 'rust',
    description: 'Web framework for Rust with focus on usability',
  },
  {
    id: 'warp',
    name: 'Warp',
    language: 'Rust',
    category: 'rust',
    description: 'Composable web server framework for Rust',
  },
  // Java
  {
    id: 'spring-boot',
    name: 'Spring Boot',
    language: 'Java',
    category: 'java',
    description: 'Convention-over-configuration Spring framework',
  },
  {
    id: 'quarkus',
    name: 'Quarkus',
    language: 'Java',
    category: 'java',
    description: 'Supersonic Subatomic Java for cloud-native apps',
  },
  {
    id: 'micronaut',
    name: 'Micronaut',
    language: 'Java',
    category: 'java',
    description: 'Modern JVM-based full-stack framework',
  },
  // PHP
  {
    id: 'laravel',
    name: 'Laravel',
    language: 'PHP',
    category: 'php',
    description: 'Elegant PHP web application framework',
  },
  {
    id: 'slim',
    name: 'Slim',
    language: 'PHP',
    category: 'php',
    description: 'Micro framework for PHP web applications and APIs',
  },
  {
    id: 'symfony',
    name: 'Symfony',
    language: 'PHP',
    category: 'php',
    description: 'High-performance PHP framework for web apps',
  },
  // Ruby
  {
    id: 'rails',
    name: 'Ruby on Rails',
    language: 'Ruby',
    category: 'ruby',
    description: 'Full-stack web framework optimized for productivity',
  },
  {
    id: 'sinatra',
    name: 'Sinatra',
    language: 'Ruby',
    category: 'ruby',
    description: 'DSL for quickly creating web applications in Ruby',
  },
  {
    id: 'hanami',
    name: 'Hanami',
    language: 'Ruby',
    category: 'ruby',
    description: 'Modern web framework for Ruby',
  },
  // C#
  {
    id: 'dotnet-api',
    name: '.NET Web API',
    language: 'C#',
    category: 'csharp',
    description: 'Build HTTP services with ASP.NET Core',
  },
  {
    id: 'dotnet-grpc',
    name: '.NET gRPC',
    language: 'C#',
    category: 'csharp',
    description: 'gRPC services with ASP.NET Core',
  },
  // Elixir
  {
    id: 'phoenix',
    name: 'Phoenix',
    language: 'Elixir',
    category: 'elixir',
    description: 'Productive web framework for reliable systems',
  },
  {
    id: 'plug',
    name: 'Plug',
    language: 'Elixir',
    category: 'elixir',
    description: 'Composable modules for web applications in Elixir',
  },
]

const LANGUAGE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'js', label: 'JS / TS' },
  { id: 'python', label: 'Python' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'java', label: 'Java' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'csharp', label: 'C#' },
  { id: 'elixir', label: 'Elixir' },
]

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    TypeScript:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Python:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    Go: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    Rust: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    Java: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    PHP: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    Ruby: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    'C#': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    Elixir: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  }
  return (
    colors[language] ||
    'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
  )
}

// -- Helper Components --

function CommandPreview({ command }: { command: string }) {
  if (!command) return null
  return (
    <div className="rounded-lg bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Terminal className="h-3.5 w-3.5" />
        <span>Command Preview</span>
      </div>
      <pre className="mt-1 font-mono text-sm text-green-400">{command}</pre>
    </div>
  )
}

// -- Main Component --

function ServiceScaffoldContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(
    null,
  )
  const [serviceName, setServiceName] = useState('')
  const [scaffolding, setScaffolding] = useState(false)
  const [cliOutputs, setCliOutputs] = useState<CLIOutput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [commandPreview, setCommandPreview] = useState('')

  // -- Filtering --

  const filteredTemplates = TEMPLATES.filter((t) => {
    const matchesSearch =
      searchQuery.trim().length === 0 ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // -- Helpers --

  const addOutput = useCallback(
    (command: string, output: string, success: boolean) => {
      setCliOutputs((prev) => [
        {
          command,
          output,
          success,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 49),
      ])
    },
    [],
  )

  // -- Actions --

  const handleScaffold = async () => {
    if (!selectedTemplate || !serviceName.trim()) return

    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/
    if (!namePattern.test(serviceName)) {
      setError(
        'Service name must start with a letter and contain only letters, numbers, hyphens, and underscores',
      )
      return
    }

    setScaffolding(true)
    setError(null)
    const cmd = `nself service scaffold --template=${selectedTemplate.id} --name=${serviceName}`
    setCommandPreview(cmd)

    try {
      const response = await fetch('/api/services/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate.id,
          name: serviceName,
        }),
      })
      const json = await response.json()
      const output =
        json.data?.output || json.details || json.error || '(no output)'
      addOutput(cmd, output, json.success)

      if (!json.success) {
        setError(json.error || 'Failed to scaffold service')
      }
    } catch (_err) {
      addOutput(cmd, 'Connection error', false)
      setError('Failed to connect to scaffold API')
    } finally {
      setScaffolding(false)
      setCommandPreview('')
    }
  }

  const handleInit = async () => {
    if (!serviceName.trim()) return

    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/
    if (!namePattern.test(serviceName)) {
      setError(
        'Service name must start with a letter and contain only letters, numbers, hyphens, and underscores',
      )
      return
    }

    setScaffolding(true)
    setError(null)
    const cmd = `nself service init --name=${serviceName}`
    setCommandPreview(cmd)

    try {
      const response = await fetch('/api/services/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: serviceName }),
      })
      const json = await response.json()
      const output =
        json.data?.output || json.details || json.error || '(no output)'
      addOutput(cmd, output, json.success)

      if (!json.success) {
        setError(json.error || 'Failed to initialize service')
      }
    } catch (_err) {
      addOutput(cmd, 'Connection error', false)
      setError('Failed to connect to init API')
    } finally {
      setScaffolding(false)
      setCommandPreview('')
    }
  }

  // -- Computed --

  const scaffoldCommand = selectedTemplate
    ? `nself service scaffold --template=${selectedTemplate.id}${serviceName ? ` --name=${serviceName}` : ' --name=<service-name>'}`
    : ''

  // -- Render --

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
            Service Scaffolding
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Create new services from 40+ templates across multiple languages and
            frameworks
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Service Name + Scaffold Controls */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="serviceName"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Service Name
              </label>
              <Input
                id="serviceName"
                placeholder="my-api-service"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleScaffold}
                disabled={
                  !selectedTemplate || !serviceName.trim() || scaffolding
                }
              >
                {scaffolding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                {scaffolding ? 'Scaffolding...' : 'Scaffold from Template'}
              </Button>
              <Button
                variant="outline"
                onClick={handleInit}
                disabled={!serviceName.trim() || scaffolding}
              >
                {scaffolding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Init Blank
              </Button>
            </div>
          </div>

          {/* Selected template info */}
          {selectedTemplate && (
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                Selected template:{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {selectedTemplate.name}
                </strong>{' '}
                ({selectedTemplate.language})
              </span>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="ml-2 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
              >
                Clear
              </button>
            </div>
          )}

          {/* Command Preview */}
          {(commandPreview || scaffoldCommand) && (
            <div className="mt-4">
              <CommandPreview command={commandPreview || scaffoldCommand} />
            </div>
          )}
        </div>

        {/* Search + Language Filter */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setCategoryFilter(filter.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template Count */}
        <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Showing {filteredTemplates.length} of {TEMPLATES.length} templates
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-900/20 dark:ring-blue-400/20'
                    : 'border-zinc-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {template.name}
                  </h3>
                  <Badge
                    className={`text-[10px] ${getLanguageColor(template.language)}`}
                  >
                    {template.language}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {template.description}
                </p>
                {isSelected && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Selected
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <Search className="mx-auto mb-4 h-8 w-8 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* CLI Output Panel */}
        {cliOutputs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <Terminal className="h-4 w-4" />
                CLI Output
              </h2>
              <button
                onClick={() => setCliOutputs([])}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
            <ScrollArea className="h-64 rounded-xl border border-zinc-200 bg-zinc-900 shadow-sm dark:border-zinc-700">
              <div className="p-4">
                {cliOutputs.map((entry, idx) => (
                  <div
                    key={idx}
                    className="mb-3 border-b border-zinc-800 pb-3 last:mb-0 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {entry.success ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="font-mono text-green-400">
                        $ {entry.command}
                      </span>
                      <span className="ml-auto text-zinc-500">
                        {entry.timestamp}
                      </span>
                    </div>
                    <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                      {entry.output || '(no output)'}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </>
  )
}

export default function ServiceScaffoldPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ServiceScaffoldContent />
    </Suspense>
  )
}
