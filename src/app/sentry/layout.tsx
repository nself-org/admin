import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ɳSentry',
}

export default function SentryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
