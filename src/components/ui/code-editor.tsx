'use client'

import { cn } from '@/lib/utils'
import Editor, { Monaco } from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import * as React from 'react'

/**
 * Code editor component using Monaco Editor
 *
 * @example
 * ```tsx
 * <CodeEditor
 *   value={code}
 *   onChange={setCode}
 *   language="typescript"
 *   height="400px"
 * />
 * ```
 */

export interface CodeEditorProps {
  /** Editor content */
  value?: string
  /** Change handler */
  onChange?: (value: string | undefined) => void
  /** Programming language */
  language?:
    | 'javascript'
    | 'typescript'
    | 'json'
    | 'html'
    | 'css'
    | 'python'
    | 'sql'
    | 'yaml'
    | 'markdown'
    | 'bash'
    | 'dockerfile'
  /** Editor height */
  height?: string
  /** Read-only mode */
  readOnly?: boolean
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean
  /** Show minimap (default: false) */
  showMinimap?: boolean
  /** Enable word wrap (default: true) */
  wordWrap?: boolean
  /** Class name */
  className?: string
}

export function CodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  height = '400px',
  readOnly = false,
  showLineNumbers = true,
  showMinimap = false,
  wordWrap = true,
  className,
}: CodeEditorProps) {
  const { theme } = useTheme()
  const [isReady, setIsReady] = React.useState(false)

  const handleEditorDidMount = (editor: unknown, monaco: Monaco) => {
    setIsReady(true)

    // Custom theme configuration if needed
    monaco.editor.defineTheme('nself-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b',
      },
    })

    monaco.editor.defineTheme('nself-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
      },
    })
  }

  const editorTheme = React.useMemo(() => {
    if (!isReady) return undefined
    return theme === 'dark' ? 'nself-dark' : 'nself-light'
  }, [theme, isReady])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800',
        className
      )}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme={editorTheme}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: showMinimap },
          lineNumbers: showLineNumbers ? 'on' : 'off',
          wordWrap: wordWrap ? 'on' : 'off',
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'ui-monospace, monospace',
          tabSize: 2,
          automaticLayout: true,
          renderWhitespace: 'selection',
          bracketPairColorization: {
            enabled: true,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-white text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
