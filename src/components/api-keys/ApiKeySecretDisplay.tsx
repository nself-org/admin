'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Check, Copy, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useCallback, useState } from 'react'

interface ApiKeySecretDisplayProps {
  /** The secret key to display */
  secretKey: string
  /** The key name for display */
  keyName?: string
  /** Callback when the user dismisses the dialog */
  onDismiss: () => void
  /** Optional callback when copy is successful */
  onCopy?: () => void
}

export function ApiKeySecretDisplay({
  secretKey,
  keyName,
  onDismiss,
  onCopy,
}: ApiKeySecretDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)

  const maskedKey = `${'*'.repeat(Math.min(secretKey.length - 8, 40))}${secretKey.slice(-8)}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(secretKey)
      setIsCopied(true)
      onCopy?.()
      setTimeout(() => setIsCopied(false), 2000)
    } catch (_err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = secretKey
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setIsCopied(true)
        onCopy?.()
        setTimeout(() => setIsCopied(false), 2000)
      } catch (_fallbackErr) {
        // Silent fail
      }
      document.body.removeChild(textArea)
    }
  }, [secretKey, onCopy])

  const handleDismiss = () => {
    if (!hasConfirmed) return
    onDismiss()
  }

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert variant="warning">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Save Your API Key Now</AlertTitle>
        <AlertDescription>
          This is the <strong>only time</strong> you will be able to see this API key. Make sure to
          copy and store it securely. If you lose it, you will need to generate a new key.
        </AlertDescription>
      </Alert>

      {/* Key Name */}
      {keyName && (
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">API Key Name</p>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{keyName}</p>
        </div>
      )}

      {/* Secret Key Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Secret Key</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsRevealed(!isRevealed)}
          >
            {isRevealed ? (
              <>
                <EyeOff className="mr-1 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" />
                Reveal
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <code className="flex-1 break-all select-all">
              {isRevealed ? secretKey : maskedKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {isCopied ? (
                <>
                  <Check className="mr-1 h-4 w-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Use this key in the{' '}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">Authorization</code> header:
          <code className="ml-1 rounded bg-zinc-200 px-1 dark:bg-zinc-800">
            Bearer {'{'}your-key{'}'}
          </code>
        </p>
      </div>

      {/* Security Tips */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Security Best Practices
        </h4>
        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <li>- Store this key in a secure location (password manager, secrets vault)</li>
          <li>- Never commit API keys to version control</li>
          <li>- Use environment variables in your applications</li>
          <li>- Rotate keys regularly and revoke unused ones</li>
          <li>- Use IP whitelisting for additional security</li>
        </ul>
      </div>

      {/* Confirmation */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <Checkbox
          id="confirm"
          checked={hasConfirmed}
          onCheckedChange={(checked) => setHasConfirmed(checked === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="confirm" className="cursor-pointer">
            I have saved my API key
          </Label>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            I understand that this key will not be shown again and I have stored it securely.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Key
        </Button>
        <Button onClick={handleDismiss} disabled={!hasConfirmed}>
          Done
        </Button>
      </div>

      {!hasConfirmed && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          Please confirm that you have saved your API key before continuing.
        </p>
      )}
    </div>
  )
}
