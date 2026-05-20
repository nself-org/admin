import { Providers } from '@/app/providers'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorSuppressor } from '@/components/ErrorSuppressor'
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette'
import { GlobalDataProvider } from '@/components/GlobalDataProvider'
import { Layout } from '@/components/Layout'
import { ProjectStateWrapper } from '@/components/ProjectStateWrapper'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { PWARegister } from '@/components/PWARegister'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/contexts/AuthContext'
import '@/styles/tailwind.css'
import { type Metadata, type Viewport } from 'next'

// Force per-request server rendering on every page so the CSP nonce generated
// by middleware is injected into every inline <script> tag at runtime.
// Without this, Next.js statically pre-generates pages during `next build`,
// producing inline scripts WITHOUT the nonce.  The production CSP
// (script-src 'self' 'nonce-<random>') then blocks those scripts, React
// hydration never fires, and the AuthProvider spinner blocks all page content
// permanently.  The login page already has this directive; this root-layout
// directive propagates it to all child pages in one place.
export const dynamic = 'force-dynamic'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Inter } from 'next/font/google'
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#030712',
}

export const metadata: Metadata = {
  title: {
    template: '%s - nAdmin',
    default: 'nAdmin - nself Administration Overview',
  },
  description: 'Web-based administration interface for the nself CLI backend stack',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'nAdmin',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Empty sections for now since we're not using MDX
  const allSections = {}
  const messages = await getMessages()

  return (
    // For RTL languages, set dir="rtl" on the html element. Currently English-only (ltr).
    <html lang="en" dir="ltr" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body className="flex min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100 bg-fixed font-sans antialiased dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <ErrorSuppressor />
        <PWARegister />
        <PWAInstallPrompt />
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Providers>
                  <NextIntlClientProvider messages={messages}>
                    <ProjectStateWrapper>
                      <GlobalDataProvider>
                        <GlobalCommandPalette />
                        <div className="w-full">
                          <Layout allSections={allSections}>{children}</Layout>
                        </div>
                      </GlobalDataProvider>
                    </ProjectStateWrapper>
                  </NextIntlClientProvider>
                </Providers>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
