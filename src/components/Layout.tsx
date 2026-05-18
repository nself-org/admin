'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { BottomNavigation } from '@/components/BottomNavigation'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Logo } from '@/components/Logo'
import { Navigation } from '@/components/Navigation'
import { SectionProvider, type Section } from '@/components/SectionProvider'
import { SkipLink } from '@/components/SkipLink'
import { useAuth } from '@/contexts/AuthContext'

export function Layout({
  children,
  allSections,
}: {
  children: React.ReactNode
  allSections: Record<string, Array<Section>>
}) {
  let pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const isLoginPage = pathname === '/login'
  const isBuildPage = pathname === '/build'
  const isStartPage = pathname === '/start'
  const isSetupPage = pathname === '/init'
  const isInitPage = pathname.startsWith('/init')

  // Pages that should render without navigation
  const isFullscreenPage = isLoginPage || isBuildPage || isStartPage || isSetupPage || isInitPage

  useEffect(() => {
    // Redirect to login if not authenticated and not already on login page
    if (!isAuthenticated && !isLoginPage) {
      router.push('/login')
    }
    // Redirect to home if authenticated and on login page
    if (isAuthenticated && isLoginPage) {
      router.push('/')
    }
  }, [isAuthenticated, isLoginPage, router])

  // If on a fullscreen page, render children without navigation
  if (isFullscreenPage) {
    // For init page, add minimal header with theme toggle and logout
    if (isSetupPage && isAuthenticated) {
      return (
        <div className="min-h-screen">
          <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
            <Header minimal />
          </div>
          {children}
        </div>
      )
    }
    return <>{children}</>
  }

  // If not authenticated, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Normal authenticated layout
  return (
    <SectionProvider sections={allSections[pathname] ?? []}>
      <SkipLink />
      <div className="h-full lg:ml-72 xl:ml-80">
        <motion.header
          layoutScroll
          role="banner"
          className="contents lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex"
        >
          <div className="contents lg:pointer-events-auto lg:block lg:w-72 lg:overflow-y-auto lg:border-r lg:border-zinc-900/10 lg:px-6 lg:pt-4 lg:pb-8 xl:w-80 lg:dark:border-white/10">
            <div className="hidden lg:flex">
              <Link href="/" aria-label="Home">
                <Logo className="h-6" />
              </Link>
            </div>
            <Header />
            <Navigation className="hidden lg:mt-10 lg:block" />
          </div>
        </motion.header>
        <div className="relative flex h-full flex-col px-4 pt-14 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          <main id="main-content" role="main" className="flex-auto">
            {children}
          </main>
          <Footer />
        </div>
        <BottomNavigation />
      </div>
    </SectionProvider>
  )
}
