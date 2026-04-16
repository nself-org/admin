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
  description:
    'Web-based administration interface for the nself CLI backend stack',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Empty sections for now since we're not using MDX
  const allSections = {}

  return (
    <html
      lang="en"
      className={`h-full ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100 bg-fixed font-sans antialiased dark:from-gray-950 dark:via-gray-950 dark:to-gray-950">
        <ErrorSuppressor />
        <PWARegister />
        <PWAInstallPrompt />
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Providers>
                  <ProjectStateWrapper>
                    <GlobalDataProvider>
                      <GlobalCommandPalette />
                      <div className="w-full">
                        <Layout allSections={allSections}>{children}</Layout>
                      </div>
                    </GlobalDataProvider>
                  </ProjectStateWrapper>
                </Providers>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
