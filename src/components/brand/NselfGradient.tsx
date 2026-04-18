import '@/styles/brand.css'

interface NselfGradientProps {
  title: string
  subtitle?: string
  className?: string
}

/**
 * NselfGradient — indigo-to-purple gradient header/banner component.
 *
 * Renders the nSelf brand gradient (indigo #4F46E5 → #6366F1 → purple #7C3AED)
 * as a header or banner with a title and optional subtitle. Matches the brand
 * guide glass card aesthetic with a subtle bottom border glow.
 */
export function NselfGradient({
  title,
  subtitle,
  className = '',
}: NselfGradientProps) {
  return (
    <div
      className={`nself-gradient rounded-xl px-6 py-8 ${className}`}
      style={{
        boxShadow: '0 4px 24px rgba(99, 102, 241, 0.35)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.4)',
      }}
    >
      <h2
        className="text-2xl font-extrabold tracking-tight text-white"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: 'rgba(226, 232, 240, 0.8)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
