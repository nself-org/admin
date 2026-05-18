'use client'

import { useState } from 'react'

interface UrlInputProps {
  value: string
  onChange: (value: string) => void
  onError?: (error: string | undefined) => void
  environment: string
  baseDomain: string
  placeholder?: string
  required?: boolean
  requireSubdomain?: boolean // For remote schemas that need subdomains in prod
  className?: string
}

export function UrlInput({
  value,
  onChange,
  onError,
  environment,
  baseDomain,
  placeholder,
  required = false,
  requireSubdomain = false,
  className = '',
}: UrlInputProps) {
  const [error, setError] = useState<string | undefined>()
  const [isFocused, setIsFocused] = useState(false)

  const validateUrl = (val: string): string | undefined => {
    if (!val) return required ? 'Required' : undefined

    // Check for invalid characters
    const cleanValue = val.replace(/[^a-z0-9.-]/g, '')
    if (cleanValue !== val) {
      return 'Contains invalid characters'
    }

    const isDev = environment === 'development' || environment === 'dev'

    if (isDev) {
      // Dev: allow subdomains (can have dots for multi-level like api.test)
      // but NOT full domains with TLDs
      const segments = val.split('.')

      // Check each segment
      for (const segment of segments) {
        if (!segment) {
          return 'Empty segment not allowed'
        }
        // Each segment must be valid subdomain format
        // eslint-disable-next-line security/detect-unsafe-regex
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(segment)) {
          return `Invalid segment: ${segment}`
        }
      }

      // In dev, we don't want full domains (no .com, .org, etc)
      // Just subdomains that will be under base domain
      const lastSegment = segments[segments.length - 1]
      // Common TLDs that indicate a full domain (not exhaustive, but covers common cases)
      const commonTlds = [
        'com',
        'org',
        'net',
        'io',
        'app',
        'dev',
        'co',
        'us',
        'uk',
        'ca',
        'au',
        'de',
        'fr',
        'jp',
        'cn',
        'in',
        'br',
        'mx',
      ]
      if (segments.length > 1 && commonTlds.includes(lastSegment)) {
        return 'Use subdomain only (will be under .' + baseDomain + ')'
      }
    } else {
      // Production/Staging: allow subdomain or full domain
      if (val.includes('.')) {
        // Full domain validation
        if (val.startsWith('.') || val.startsWith('-')) {
          return 'Cannot start with . or -'
        }
        if (val.endsWith('.')) {
          return undefined // Allow typing in progress
        }

        const parts = val.split('.')

        // Check minimum parts requirement
        const minParts = requireSubdomain ? 3 : 2
        if (parts.length < minParts) {
          return requireSubdomain
            ? 'Must be a subdomain (e.g., api.example.com)'
            : 'Invalid domain format'
        }

        // Validate each segment
        for (const part of parts) {
          if (!part) {
            return 'Empty domain segment'
          }
          // eslint-disable-next-line security/detect-unsafe-regex
          if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) {
            return `Invalid segment: ${part}`
          }
        }

        // Check TLD
        const lastPart = parts[parts.length - 1]
        if (lastPart.length < 2) {
          return 'Invalid top-level domain'
        }
      } else {
        // Single word - valid
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(val) && !/^[a-z0-9]$/.test(val)) {
          return 'Invalid format'
        }
      }
    }
    return undefined
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    // Clear error while typing
    if (error) {
      setError(undefined)
      onError?.(undefined)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Clean up and validate on blur
    const cleanValue = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '')
    const validationError = validateUrl(cleanValue)
    setError(validationError)
    onError?.(validationError)
    if (cleanValue !== value) {
      onChange(cleanValue)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  // Determine what to show on the right side of input
  const getRightLabel = () => {
    if (!value) {
      return required ? 'Required' : 'Optional'
    }
    if (error && !isFocused) {
      return 'Invalid'
    }

    const isDev = environment === 'development' || environment === 'dev'

    if (isDev) {
      // In dev mode, always show base domain suffix
      // since everything becomes a subdomain under it
      return `.${baseDomain}`
    } else {
      // Production/staging mode
      if (value.includes('.')) {
        // Full domain entered
        if (value.endsWith('.')) {
          return '...' // Still typing
        }
        return error ? '✗' : '✓'
      }
      // Single word - show base domain
      return `.${baseDomain}`
    }
  }

  const rightLabelColor = () => {
    if (error && !isFocused) {
      return 'text-red-500 dark:text-red-400'
    }
    if (value && value.includes('.') && !value.endsWith('.') && !error) {
      return 'text-green-600 dark:text-green-400'
    }
    return 'text-zinc-400 dark:text-zinc-500'
  }

  const isDev = environment === 'development' || environment === 'dev'
  const defaultPlaceholder = isDev ? 'api' : 'api.example.com'

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={`w-full px-3 py-2 ${
            value && value.includes('.') ? 'pr-10' : value ? 'pr-24' : 'pr-16'
          } focus:ring-opacity-20 rounded-lg border bg-white text-sm text-zinc-900 transition-all focus:ring-2 focus:outline-none dark:bg-zinc-800 dark:text-white ${
            error && !isFocused
              ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
              : 'border-zinc-300 focus:ring-blue-500 dark:border-zinc-600'
          } ${className}`}
          placeholder={placeholder || defaultPlaceholder}
        />
        <span
          className={`pointer-events-none absolute top-2.5 right-3 text-xs transition-all duration-200 ${rightLabelColor()}`}
        >
          {getRightLabel()}
        </span>
      </div>
      {error && !isFocused && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
