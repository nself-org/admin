import { GridPattern } from '@/components/GridPattern'

export function HeroPattern() {
  return (
    <div className="absolute inset-0 -z-10 mx-0 max-w-none overflow-hidden">
      <div className="absolute top-0 left-1/2 -ml-[608px] h-[400px] w-[1300px]">
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-40 dark:from-blue-600/30 dark:to-blue-400/30 dark:opacity-100"
          style={{
            maskImage: 'radial-gradient(farthest-side at top, white, transparent)',
          }}
        >
          <GridPattern
            width={72}
            height={56}
            x={-12}
            y={4}
            squares={[
              [4, 3],
              [2, 1],
              [7, 3],
              [10, 6],
            ]}
            className="absolute inset-x-0 h-[200%] w-full fill-black/40 stroke-black/50 dark:fill-white/10 dark:stroke-white/20"
            style={{
              top: '-50%',
              transform: 'skewY(-18deg)',
              mixBlendMode: 'overlay',
            }}
          />
        </div>
        <svg
          viewBox="0 0 1113 440"
          aria-hidden="true"
          className="absolute top-0 left-1/2 w-[1113px] fill-white dark:hidden"
          style={{
            marginLeft: '-556.5px',
            filter: 'blur(26px)',
          }}
        >
          <path d="M.016 439.5s-9.5-300 434-300S882.516 20 882.516 20V0h230.004v439.5H.016Z" />
        </svg>
      </div>
    </div>
  )
}
