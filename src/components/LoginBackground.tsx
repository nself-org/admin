import { GridPattern } from '@/components/GridPattern'

export function LoginBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Even darker base background */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-zinc-950/50" />

      {/* Same pattern as HeroPattern but positioned for full screen and scaled */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex scale-150 items-center justify-center">
          <div className="relative h-[800px] w-[1600px]">
            {/* Even darker, subtler base glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0066CC] to-[#4A9EFF] opacity-10 blur-3xl dark:opacity-20" />

            {/* Grid pattern with even lower opacity for darker look */}
            <GridPattern
              width={72}
              height={56}
              x={0}
              y={0}
              squares={[
                [4, 3],
                [2, 1],
                [7, 3],
                [10, 6],
                [12, 4],
                [8, 8],
                [3, 5],
                [9, 2],
                [15, 6],
                [6, 7],
              ]}
              className="absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] fill-blue-500/3 stroke-blue-500/10 dark:fill-blue-400/3 dark:stroke-blue-400/10"
            />

            {/* Animated glowing lines effect */}
            <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066CC" stopOpacity="0" />
                  <stop offset="50%" stopColor="#4A9EFF" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0066CC" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Animated horizontal line */}
              <line
                x1="0"
                y1="200"
                x2="100%"
                y2="200"
                stroke="url(#glow-gradient)"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
                style={{ animationDuration: '3s' }}
              />

              {/* Animated vertical line */}
              <line
                x1="400"
                y1="0"
                x2="400"
                y2="100%"
                stroke="url(#glow-gradient)"
                strokeWidth="2"
                opacity="0.8"
                className="animate-pulse"
                style={{ animationDuration: '3s', animationDelay: '1.5s' }}
              />

              {/* Glowing box edges */}
              <rect
                x="288"
                y="168"
                width="72"
                height="56"
                fill="none"
                stroke="#4A9EFF"
                strokeWidth="1"
                opacity="0.3"
                className="animate-pulse"
                style={{ animationDuration: '4s', animationDelay: '0.5s' }}
              />

              <rect
                x="504"
                y="56"
                width="72"
                height="56"
                fill="none"
                stroke="#0066CC"
                strokeWidth="1"
                opacity="0.3"
                className="animate-pulse"
                style={{ animationDuration: '4s', animationDelay: '2s' }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Traveling glow effect along grid lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/3 h-px w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
          style={{
            animation: 'slide-horizontal 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute left-1/3 h-full w-px bg-gradient-to-b from-transparent via-blue-400/50 to-transparent"
          style={{
            animation: 'slide-vertical 8s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Subtle pulsing overlay for depth */}
      <div
        className="absolute inset-0 animate-pulse bg-gradient-to-t from-blue-900/10 via-transparent to-transparent"
        style={{ animationDuration: '6s' }}
      />

      {/* Very subtle center glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-blue-600/10 blur-3xl"
          style={{ animationDuration: '8s', animationDelay: '1s' }}
        />
      </div>

      <style jsx>{`
        @keyframes slide-horizontal {
          0%,
          100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }

        @keyframes slide-vertical {
          0%,
          100% {
            transform: translateY(-100%);
          }
          50% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  )
}
