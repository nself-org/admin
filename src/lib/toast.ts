/**
 * Custom toast wrapper with auto-dismiss durations
 * Built on top of sonner toast library
 */

import { toast as sonnerToast } from 'sonner'

const DURATIONS = {
  success: 3000, // 3 seconds
  info: 4000, // 4 seconds
  warning: 5000, // 5 seconds
  error: 7000, // 7 seconds - longer to read error details
}

type ToastOptions = Parameters<typeof sonnerToast>[1]

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, {
      duration: DURATIONS.success,
      ...options,
    }),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, {
      duration: DURATIONS.error,
      ...options,
    }),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, {
      duration: DURATIONS.info,
      ...options,
    }),

  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.warning(message, {
      duration: DURATIONS.warning,
      ...options,
    }),

  // Generic toast with custom duration
  message: (message: string, options?: ToastOptions) => sonnerToast(message, options),

  // Promise toast (for async operations)
  promise: sonnerToast.promise,

  // Dismiss a toast
  dismiss: sonnerToast.dismiss,

  // Custom toast with full control
  custom: sonnerToast.custom,

  // Loading toast
  loading: sonnerToast.loading,
}
