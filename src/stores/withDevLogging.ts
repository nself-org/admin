// DEV ONLY - REMOVE FOR PRODUCTION
// Middleware to log all Zustand store actions

import { StateCreator, StoreMutatorIdentifier } from 'zustand'

type Logger = <
  T extends unknown,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>

type LoggerImpl = <T extends unknown>(
  f: StateCreator<T, [], []>,
  name?: string
) => StateCreator<T, [], []>

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (partial: any, replace?: any) => {
    const prevState = get()
    set(partial, replace)
    const nextState = get()

    // Log to DevLogger if available
    if (typeof window !== 'undefined' && (window as any).devLogger) {
      const devLogger = (window as any).devLogger

      // Find what changed
      const changes: any = {}
      for (const key in nextState) {
        if (prevState[key] !== nextState[key]) {
          changes[key] = {
            from: prevState[key],
            to: nextState[key],
          }
        }
      }

      devLogger.trackState(name || 'Store', 'State Change', changes)
    }
  }

  store.setState = loggedSet

  return f(loggedSet, get, store)
}

export const withDevLogging = loggerImpl as Logger
