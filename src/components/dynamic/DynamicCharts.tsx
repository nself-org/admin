'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const LoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
  </div>
)

export const DynamicLineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), {
  loading: LoadingFallback,
  ssr: false,
})

export const DynamicBarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), {
  loading: LoadingFallback,
  ssr: false,
})

export const DynamicAreaChart = dynamic(() => import('recharts').then((mod) => mod.AreaChart), {
  loading: LoadingFallback,
  ssr: false,
})

export const DynamicPieChart = dynamic(() => import('recharts').then((mod) => mod.PieChart), {
  loading: LoadingFallback,
  ssr: false,
})
