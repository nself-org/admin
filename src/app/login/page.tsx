'use client'

import { LoginBackground } from '@/components/LoginBackground'
import { LogoIcon } from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { VERSION } from '@/lib/constants'
import { getCorrectRoute } from '@/lib/routing-logic'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Password strength calculation
function calculatePasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[@$!%*?&]/.test(password)) score += 1

  // Determine label and color
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' }
  if (score <= 6) return { score, label: 'Strong', color: 'bg-green-500' }
  return { score, label: 'Very Strong', color: 'bg-green-600' }
}

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    locked: boolean
    remainingSeconds: number
    attempts: number
  }>({ locked: false, remainingSeconds: 0, attempts: 0 })

  const router = useRouter()
  const { login, checkAuth } = useAuth()
  const passwordRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Password strength state
  const passwordStrength = isSetupMode
    ? calculatePasswordStrength(password)
    : { score: 0, label: '', color: '' }

  // Check if password needs to be set up
  useEffect(() => {
    const checkPasswordSetup = async () => {
      try {
        const response = await fetch('/api/auth/init')
        const data = await response.json()
        setIsSetupMode(!data.passwordExists)
      } catch (error) {
        console.error('Error checking password setup:', error)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkPasswordSetup()
  }, [])

  // Auto-focus password field when setup mode changes
  useEffect(() => {
    if (!isCheckingSetup && passwordRef.current) {
      passwordRef.current.focus()
    }
  }, [isCheckingSetup, isSetupMode])

  // Handle caps lock detection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true)
    } else {
      setCapsLockOn(false)
    }
  }

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitInfo.locked && rateLimitInfo.remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRateLimitInfo((prev) => {
          const newRemaining = prev.remainingSeconds - 1
          if (newRemaining <= 0) {
            if (timerRef.current) clearInterval(timerRef.current)
            return { locked: false, remainingSeconds: 0, attempts: 0 }
          }
          return { ...prev, remainingSeconds: newRemaining }
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [rateLimitInfo.locked, rateLimitInfo.remainingSeconds])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Check if rate limited
    if (rateLimitInfo.locked) {
      setError(
        `Too many attempts. Try again in ${rateLimitInfo.remainingSeconds} second${rateLimitInfo.remainingSeconds !== 1 ? 's' : ''}`,
      )
      return
    }

    setIsLoading(true)

    if (isSetupMode) {
      // Setup mode - set the password
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setIsLoading(false)
        return
      }

      // Validate password strength for setup
      if (passwordStrength.score < 3) {
        setError('Password is too weak. Please use a stronger password.')
        setIsLoading(false)
        return
      }

      try {
        // Get CSRF token
        const csrfResponse = await fetch('/api/auth/csrf')
        const { token: csrfToken } = await csrfResponse.json()

        const response = await fetch('/api/auth/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ password }),
        })

        const data = await response.json()

        if (response.ok) {
          // Password set successfully, now login
          const success = await login(password)
          if (success) {
            // Use centralized routing logic
            const routingResult = await getCorrectRoute()
            console.log('Post-setup routing:', routingResult.reason)
            router.push(routingResult.route)
          } else {
            setError('Password set but login failed. Please try again.')
            setIsSetupMode(false)
          }
        } else {
          setError(data.error || 'Failed to set password')
        }
      } catch (_error) {
        setError('Failed to set password. Please try again.')
      }
    } else {
      // Normal login mode
      try {
        // Get CSRF token
        const csrfResponse = await fetch('/api/auth/csrf')
        const { token: csrfToken } = await csrfResponse.json()

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ password, rememberMe }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          // Update AuthContext state before navigating. Without this,
          // isAuthenticated stays false (set when the page first mounted with
          // no cookie), and Layout's useEffect immediately redirects back to
          // /login when the pathname changes away from /login.
          await checkAuth()
          // Success - redirect
          const routingResult = await getCorrectRoute()
          console.log('Post-login routing:', routingResult.reason)
          router.push(routingResult.route)
        } else if (response.status === 429) {
          // Rate limited
          const retryAfter = data.retryAfter || 60
          setRateLimitInfo({
            locked: true,
            remainingSeconds: retryAfter,
            attempts: 5,
          })
          setError(
            `Too many login attempts. Please try again in ${retryAfter} seconds.`,
          )
          setPassword('')
        } else {
          // Invalid credentials
          setError(data.error || 'Invalid password')
          setPassword('')

          // Increment local attempt counter for UI feedback
          setRateLimitInfo((prev) => ({
            ...prev,
            attempts: prev.attempts + 1,
          }))
        }
      } catch (_error) {
        setError('Login failed. Please try again.')
        setPassword('')
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      {/* Non-pixelated pulsating blue background */}
      <LoginBackground />

      {/* Login Box with tilted underbox */}
      <div className="relative z-20 w-full max-w-md px-6">
        {/* Tilted navy underbox with glow - narrower width, rotated 10° right, darker blue */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-950 to-black shadow-2xl"
          style={{
            transform: 'rotate(10deg) scaleX(0.9) scaleY(0.95)',
            boxShadow:
              '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.3)',
          }}
        />

        {/* Main login box */}
        <div className="relative rounded-2xl border border-blue-500/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:bg-zinc-900/95">
          {/* Logo and Title */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <LogoIcon className="h-16 w-16" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {isSetupMode ? 'Welcome to nAdmin' : 'nAdmin'}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {isSetupMode
                ? 'Set your admin password. To reset, delete it from .env file.'
                : 'Enter your admin password to continue'}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username (fixed as admin) */}
            {!isSetupMode && (
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Username
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="username"
                    type="text"
                    value="admin"
                    disabled
                    className="w-full rounded-xl border-2 border-blue-500/20 bg-zinc-100/50 px-4 py-3 pl-12 text-zinc-500 backdrop-blur-sm dark:bg-zinc-800/30 dark:text-zinc-400"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {isSetupMode ? 'Set Password' : 'Password'}
                <span
                  className="text-red-600 dark:text-red-400"
                  aria-label="required"
                >
                  {' '}
                  *
                </span>
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label={isSetupMode ? 'Create password' : 'Password'}
                  aria-describedby={
                    error
                      ? 'password-error'
                      : capsLockOn
                        ? 'caps-lock-warning'
                        : undefined
                  }
                  aria-invalid={error ? 'true' : 'false'}
                  className="w-full rounded-xl border-2 border-blue-500/20 bg-white/50 px-4 py-3 pr-12 text-zinc-900 placeholder-zinc-500 shadow-inner backdrop-blur-sm transition-all focus:border-blue-500/50 focus:bg-white/70 focus:outline-none dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-400 dark:focus:bg-zinc-800/70"
                  placeholder={
                    isSetupMode
                      ? 'Create a strong password'
                      : 'Enter your password'
                  }
                  required
                  disabled={isCheckingSetup || rateLimitInfo.locked}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Caps Lock Warning */}
              {capsLockOn && (
                <div
                  id="caps-lock-warning"
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Caps Lock is ON</span>
                </div>
              )}

              {/* Password Strength Indicator (Setup Mode Only) */}
              {isSetupMode && password.length > 0 && (
                <div className="space-y-1.5" role="status" aria-live="polite">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Password strength:
                    </span>
                    <span
                      className={`font-medium ${
                        passwordStrength.score <= 2
                          ? 'text-red-600 dark:text-red-400'
                          : passwordStrength.score <= 4
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                    role="progressbar"
                    aria-valuenow={passwordStrength.score}
                    aria-valuemin={0}
                    aria-valuemax={7}
                    aria-label={`Password strength: ${passwordStrength.label}`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{
                        width: `${(passwordStrength.score / 7) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Use 12+ characters with uppercase, lowercase, numbers, and
                    symbols
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Setup Mode Only) */}
            {isSetupMode && (
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Confirm Password
                  <span
                    className="text-red-600 dark:text-red-400"
                    aria-label="required"
                  >
                    {' '}
                    *
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border-2 border-blue-500/20 bg-white/50 px-4 py-3 pr-12 text-zinc-900 placeholder-zinc-500 shadow-inner backdrop-blur-sm transition-all focus:border-blue-500/50 focus:bg-white/70 focus:outline-none dark:bg-zinc-800/50 dark:text-white dark:placeholder-zinc-400 dark:focus:bg-zinc-800/70"
                    placeholder="Re-enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {confirmPassword &&
                  password &&
                  password === confirmPassword && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Passwords match</span>
                    </div>
                  )}
              </div>
            )}

            {/* Remember Me Checkbox (Login Mode Only) */}
            {!isSetupMode && (
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
                  disabled={rateLimitInfo.locked}
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Remember me for 30 days
                </label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                id="password-error"
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {/* Rate Limit Warning */}
            {!isSetupMode &&
              rateLimitInfo.attempts >= 3 &&
              !rateLimitInfo.locked && (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {5 - rateLimitInfo.attempts} attempt
                    {5 - rateLimitInfo.attempts !== 1 ? 's' : ''} remaining
                    before temporary lockout
                  </span>
                </div>
              )}

            {/* Submit Button */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isLoading || rateLimitInfo.locked}
                className="flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-10 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:from-blue-700 hover:to-blue-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                style={{
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>
                      {isSetupMode ? 'Setting up...' : 'Signing in...'}
                    </span>
                  </>
                ) : rateLimitInfo.locked ? (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>Locked ({rateLimitInfo.remainingSeconds}s)</span>
                  </>
                ) : (
                  <span>{isSetupMode ? 'Set Password' : 'Sign In'}</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 border-t border-blue-500/10 pt-6">
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              nself Admin v{VERSION}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
