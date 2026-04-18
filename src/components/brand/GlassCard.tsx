import '@/styles/brand.css'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  elevated?: boolean
}

/**
 * GlassCard — reusable glass morphism card with nSelf brand styling.
 *
 * Renders a semi-transparent surface with backdrop blur and an indigo border,
 * matching the nSelf brand guide (primary #6366F1, bg #0F0F1A).
 *
 * @param glow     - adds an indigo outer glow ring (use for highlighted/active cards)
 * @param elevated - uses the elevated surface colour (#16213E) instead of card (#1A1A2E)
 */
export function GlassCard({
  children,
  className = '',
  glow = false,
  elevated = false,
}: GlassCardProps) {
  const base = elevated
    ? 'glass-card-elevated'
    : glow
      ? 'glass-card-glow'
      : 'glass-card'

  return <div className={`${base} ${className}`}>{children}</div>
}
