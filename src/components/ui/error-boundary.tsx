'use client'

/**
 * Global React Error Boundary
 * Catches React errors and displays user-friendly error UI
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { reportError } from '@/lib/error-logging'
import { formatErrorForLogging, getErrorMessage } from '@/lib/errors/utils'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Log formatted error
    const formattedError = formatErrorForLogging(error)
    console.error('Formatted error:', formattedError)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Send error to logging service
    void reportError(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const errorMessage = getErrorMessage(this.state.error)
      const isDev = process.env.NODE_ENV === 'development'

      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-6 w-6" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                An unexpected error occurred. Try refreshing the page or contact support if the
                problem persists.
              </p>

              {errorMessage && (
                <div className="border-destructive/20 bg-destructive/10 rounded-md border p-4">
                  <p className="text-destructive font-mono text-sm">{errorMessage}</p>
                </div>
              )}

              {isDev && this.state.error && (
                <details className="border-border bg-muted rounded-md border p-4">
                  <summary className="cursor-pointer font-medium">Technical Details</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Error:</p>
                      <pre className="bg-background mt-1 overflow-auto rounded p-2 text-xs">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <p className="text-sm font-medium">Stack Trace:</p>
                        <pre className="bg-background mt-1 overflow-auto rounded p-2 text-xs">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <p className="text-sm font-medium">Component Stack:</p>
                        <pre className="bg-background mt-1 overflow-auto rounded p-2 text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
