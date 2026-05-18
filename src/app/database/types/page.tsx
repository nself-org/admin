'use client'

import { TableSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle,
  Code,
  Copy,
  Database,
  Download,
  FileCode,
  Loader2,
  RefreshCw,
  Settings,
  Terminal,
} from 'lucide-react'
import { Suspense, useState } from 'react'

type Language = 'typescript' | 'go' | 'python'

interface GenerationOptions {
  includeComments: boolean
  includeNullable: boolean
  useOptional: boolean
  generateValidation: boolean
  exportTypes: boolean
}

const LANGUAGE_CONFIGS: Record<
  Language,
  { name: string; extension: string; icon: string; color: string }
> = {
  typescript: {
    name: 'TypeScript',
    extension: '.ts',
    icon: 'TS',
    color: 'bg-blue-500/10 text-blue-500',
  },
  go: {
    name: 'Go',
    extension: '.go',
    icon: 'Go',
    color: 'bg-cyan-500/10 text-cyan-500',
  },
  python: {
    name: 'Python',
    extension: '.py',
    icon: 'Py',
    color: 'bg-yellow-500/10 text-yellow-500',
  },
}

function DatabaseTypesContent() {
  const [language, setLanguage] = useState<Language>('typescript')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [options, setOptions] = useState<GenerationOptions>({
    includeComments: true,
    includeNullable: true,
    useOptional: true,
    generateValidation: false,
    exportTypes: true,
  })

  const generateTypes = async () => {
    setIsGenerating(true)
    setLastOutput('')
    setGeneratedCode(null)

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'types',
          lang: language,
          includeComments: options.includeComments,
          includeNullable: options.includeNullable,
          useOptional: options.useOptional,
          generateValidation: options.generateValidation,
          exportTypes: options.exportTypes,
        }),
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        setLastOutput(data.details || data.error || `Error ${response.status}`)
        return
      }

      const code: string = data.data?.code || data.data?.output || ''
      const output: string = data.data?.output || `Generated ${language} types from schema.`
      setGeneratedCode(code || null)
      setLastOutput(output)
    } catch (error) {
      setLastOutput(
        error instanceof Error ? error.message : 'Generation failed',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadCode = () => {
    if (!generatedCode) return

    const config = LANGUAGE_CONFIGS[language]
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `types${config.extension}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Type Generation
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Generate TypeScript type definitions from your database schema
        </p>
      </div>
      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>nself CLI Integration</AlertTitle>
          <AlertDescription>
            This page executes{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              nself db types
            </code>{' '}
            to generate type definitions from your database schema. Supports
            TypeScript, Go, and Python.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle>Generation Options</CardTitle>
              </div>
              <CardDescription>
                Configure type generation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language Selector */}
              <div className="space-y-2">
                <Label>Target Language</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(LANGUAGE_CONFIGS) as Language[]).map((lang) => {
                    const config = LANGUAGE_CONFIGS[lang]
                    return (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang)
                          setGeneratedCode(null)
                        }}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                          language === lang
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        <Badge className={config.color}>{config.icon}</Badge>
                        <span className="font-medium">{config.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                  <div>
                    <p className="text-sm font-medium">Include Comments</p>
                    <p className="text-xs text-zinc-500">
                      Add JSDoc/docstring comments from column descriptions
                    </p>
                  </div>
                  <Switch
                    checked={options.includeComments}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeComments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                  <div>
                    <p className="text-sm font-medium">Handle Nullable</p>
                    <p className="text-xs text-zinc-500">
                      Mark nullable columns as optional types
                    </p>
                  </div>
                  <Switch
                    checked={options.includeNullable}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, includeNullable: checked })
                    }
                  />
                </div>

                {language === 'typescript' && (
                  <>
                    <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                      <div>
                        <p className="text-sm font-medium">
                          Use Optional Properties
                        </p>
                        <p className="text-xs text-zinc-500">
                          Use ? syntax instead of | null for optional fields
                        </p>
                      </div>
                      <Switch
                        checked={options.useOptional}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, useOptional: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                      <div>
                        <p className="text-sm font-medium">Export Types</p>
                        <p className="text-xs text-zinc-500">
                          Add export keyword to all type definitions
                        </p>
                      </div>
                      <Switch
                        checked={options.exportTypes}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, exportTypes: checked })
                        }
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-700">
                  <div>
                    <p className="text-sm font-medium">Generate Validation</p>
                    <p className="text-xs text-zinc-500">
                      Include Zod schemas (TS) or validation methods
                    </p>
                  </div>
                  <Switch
                    checked={options.generateValidation}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, generateValidation: checked })
                    }
                  />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateTypes}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code className="mr-2 h-4 w-4" />
                    Generate Types
                  </>
                )}
              </Button>

              {/* Command Preview */}
              <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Terminal className="h-4 w-4" />
                  <span>Command:</span>
                </div>
                <div className="mt-2">
                  $ nself db types --lang={language}
                  {options.includeComments && ' --comments'}
                  {options.generateValidation && ' --validation'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CLI Output */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                CLI Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80 rounded-lg bg-zinc-950 p-4">
                {lastOutput ? (
                  <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                    {lastOutput}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-500">
                    Generate types to see output here
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Generated Code */}
        {generatedCode && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  <CardTitle>Generated Code</CardTitle>
                  <Badge className={LANGUAGE_CONFIGS[language].color}>
                    {LANGUAGE_CONFIGS[language].name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCode}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedCode(null)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 rounded-lg bg-zinc-950 p-4">
                <pre className="font-mono text-sm text-zinc-300">
                  <code>{generatedCode}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function DatabaseTypesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DatabaseTypesContent />
    </Suspense>
  )
}
