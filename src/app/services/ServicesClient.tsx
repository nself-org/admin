'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Lazy load the heavy services page component
const ServicesContent = dynamic(() => import('./page').then((mod) => ({ default: mod.default })), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  ),
  ssr: false, // Disable SSR for this component
})

export default function ServicesClient() {
  // The page component handles its own data fetching
  return <ServicesContent />
}
