'use client'

import { motion, useMotionTemplate, useMotionValue, type MotionValue } from 'framer-motion'

import { GridPattern } from '@/components/GridPattern'
import { Cpu, HardDrive, MemoryStick, Network } from 'lucide-react'

interface ResourcesProps {
  systemMetrics?: {
    cpu: { usage: number }
    memory: { used: number; total: number }
    disk: { used: number; total: number }
    network: { rx: number; tx: number }
  }
  dockerMetrics?: {
    cpu: { usage: number }
    memory: { used: number; total: number }
    storage: { used: number; total: number }
    network: { rx: number; tx: number }
  }
}

function ResourcePattern({
  mouseX,
  mouseY,
  y,
  squares,
}: {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
  y: number
  squares: Array<[x: number, y: number]>
}) {
  let maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`
  let style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl mask-[linear-gradient(white,transparent)] transition duration-300 group-hover:opacity-50">
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/2 stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
          y={y}
          squares={squares}
        />
      </div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-100 to-blue-50 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-blue-950/30 dark:to-blue-900/20"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/50 stroke-black/70 dark:fill-white/2.5 dark:stroke-white/10"
          y={y}
          squares={squares}
        />
      </motion.div>
    </div>
  )
}

function ResourceCard({
  title,
  value,
  percentage,
  description,
  icon: Icon,
  pattern,
}: {
  title: string
  value: string | number
  percentage: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  pattern: { y: number; squares: Array<[x: number, y: number]> }
}) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-blue-50/50 dark:bg-white/2.5 dark:hover:bg-blue-950/20"
    >
      <ResourcePattern {...pattern} mouseX={mouseX} mouseY={mouseY} />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 transition-colors duration-300 ring-inset group-hover:ring-blue-500/20 dark:ring-white/10 dark:group-hover:ring-blue-400/30" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 transition-colors duration-300 group-hover:bg-blue-500/20 dark:bg-blue-400/10 dark:group-hover:bg-blue-400/20">
            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
          <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  )
}

export function Resources({ systemMetrics, dockerMetrics }: ResourcesProps) {
  const cpuUsage = dockerMetrics?.cpu.usage || 0
  const memoryPercentage = systemMetrics?.memory.total
    ? Math.round(((dockerMetrics?.memory.used || 0) / systemMetrics.memory.total) * 100)
    : 0
  const diskPercentage = systemMetrics?.disk.total
    ? Math.round(((dockerMetrics?.storage.used || 0) / systemMetrics.disk.total) * 100)
    : 0
  const totalNetwork = (
    (dockerMetrics?.network.rx || 0) + (dockerMetrics?.network.tx || 0)
  ).toFixed(0)

  return (
    <div className="mb-8">
      <div className="not-prose grid grid-cols-2 gap-8 sm:grid-cols-4">
        {/* Docker CPU */}
        <ResourceCard
          title="CPU Usage"
          value={`${cpuUsage.toFixed(1)}%`}
          percentage={cpuUsage}
          description="of system CPU"
          icon={Cpu}
          pattern={{
            y: 16,
            squares: [
              [0, 1],
              [1, 3],
            ],
          }}
        />

        {/* Docker RAM */}
        <ResourceCard
          title="Memory"
          value={`${memoryPercentage}%`}
          percentage={memoryPercentage}
          description={`${dockerMetrics?.memory.used || 0}GB / ${systemMetrics?.memory.total || 0}GB`}
          icon={MemoryStick}
          pattern={{
            y: -6,
            squares: [
              [-1, 2],
              [1, 3],
            ],
          }}
        />

        {/* Docker Storage */}
        <ResourceCard
          title="Storage"
          value={`${diskPercentage}%`}
          percentage={diskPercentage}
          description={`${dockerMetrics?.storage.used || 0}GB / ${systemMetrics?.disk.total || 0}GB`}
          icon={HardDrive}
          pattern={{
            y: 32,
            squares: [
              [0, 2],
              [1, 4],
            ],
          }}
        />

        {/* Docker Network */}
        <ResourceCard
          title="Network"
          value={totalNetwork}
          percentage={Math.min(parseFloat(totalNetwork) / 10, 100)}
          description="MB transferred"
          icon={Network}
          pattern={{ y: 22, squares: [[0, 1]] }}
        />
      </div>
    </div>
  )
}
