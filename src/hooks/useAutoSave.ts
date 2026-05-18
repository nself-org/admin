import { debounce } from 'lodash'
import { useCallback, useEffect, useRef } from 'react'

interface AutoSaveOptions {
  onSave: () => Promise<void> | void
  delay?: number
  enabled?: boolean
}

export function useAutoSave(data: any, { onSave, delay = 500, enabled = true }: AutoSaveOptions) {
  const isFirstRender = useRef(true)
  const saveInProgress = useRef(false)

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(async () => {
      if (saveInProgress.current) return

      try {
        saveInProgress.current = true
        await onSave()
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        saveInProgress.current = false
      }
    }, delay)
  ).current

  // Save on data changes (but skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (enabled) {
      debouncedSave()
    }

    return () => {
      debouncedSave.cancel()
    }
  }, [data, enabled, debouncedSave])

  // Save immediately function (for navigation, etc)
  const saveNow = useCallback(async () => {
    debouncedSave.cancel()
    if (!saveInProgress.current) {
      await onSave()
    }
  }, [debouncedSave, onSave])

  // Save on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      debouncedSave.cancel()
      if (!saveInProgress.current) {
        // Note: This will be synchronous, so async saves might not complete
        onSave()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [debouncedSave, onSave])

  return {
    saveNow,
    isSaving: saveInProgress.current,
  }
}
