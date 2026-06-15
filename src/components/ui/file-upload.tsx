'use client'

import { cn } from '@/lib/utils'
import { File, Upload, X } from 'lucide-react'
import * as React from 'react'
import { Button } from './button'

/**
 * File upload component with drag-and-drop support
 *
 * @example
 * ```tsx
 * <FileUpload
 *   accept=".json,.csv"
 *   maxSize={5 * 1024 * 1024} // 5MB
 *   onChange={(files) => console.log(files)}
 *   multiple
 * />
 * ```
 */

export interface FileUploadProps {
  /** Accepted file types */
  accept?: string
  /** Allow multiple files */
  multiple?: boolean
  /** Maximum file size in bytes */
  maxSize?: number
  /** Maximum number of files */
  maxFiles?: number
  /** Change handler */
  onChange?: (files: File[]) => void
  /** Disabled state */
  disabled?: boolean
  /** Class name */
  className?: string
}

export function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  onChange,
  disabled = false,
  className,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([])
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  const validateFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return []

    const validFiles: File[] = []
    const errors: string[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!file) continue

      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large (max ${formatBytes(maxSize)})`)
        continue
      }

      validFiles.push(file)
    }

    // Check max files
    if (validFiles.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`)
      return []
    }

    if (errors.length > 0) {
      setError(errors.join(', '))
      setTimeout(() => setError(''), 5000)
      return []
    }

    return validFiles
  }

  const handleFiles = (fileList: FileList | null) => {
    const validFiles = validateFiles(fileList)
    if (validFiles.length > 0) {
      const newFiles = multiple ? [...files, ...validFiles] : validFiles
      setFiles(newFiles)
      onChange?.(newFiles)
      setError('')
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onChange?.(newFiles)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800'
            : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <Upload
          className={cn(
            'mb-4 h-10 w-10',
            isDragging ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'
          )}
        />
        <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {accept ? `Accepts: ${accept}` : 'All file types accepted'} • Max {formatBytes(maxSize)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="File upload"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-red-500" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Selected Files ({files.length})
          </p>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-sm text-zinc-900 dark:text-zinc-50">{file.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({formatBytes(file.size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFile(index)
                  }}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
