import nselfIcon from '@/images/nself-icon.svg'
import Image from 'next/image'

export function LogoContent({ className = '' }: { className?: string }) {
  return (
    <div className={`group flex items-center gap-2 ${className}`}>
      <Image
        src={nselfIcon}
        alt="nself"
        width={32}
        height={32}
        className="rounded-lg transition-transform group-hover:scale-105"
      />
      <span className="text-xl font-bold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
        nAdmin
      </span>
    </div>
  )
}

export function Logo(props: React.ComponentPropsWithoutRef<'div'>) {
  return <LogoContent {...props} />
}

export function LogoIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0066CC', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#4A9EFF', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="32" y="32" width="448" height="448" rx="64" fill="url(#gradient)" />
      <path
        d="M128 192 L224 256 L128 320"
        stroke="white"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line
        x1="256"
        y1="320"
        x2="384"
        y2="320"
        stroke="white"
        strokeWidth="32"
        strokeLinecap="round"
      />
    </svg>
  )
}
