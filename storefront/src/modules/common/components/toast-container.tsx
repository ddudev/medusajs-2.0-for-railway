'use client'

import { useEffect, useRef } from 'react'
import { toast as sonnerToast } from 'sonner'
import { useToasts } from '@lib/store/ui-store'
import { Toaster } from '@/components/ui/sonner'

/**
 * Toast notification container using Sonner
 * Syncs toasts from Zustand UI store to Sonner (keep existing showToast API)
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToasts()
  const shownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    toasts.forEach((toast) => {
      if (shownIdsRef.current.has(toast.id)) return
      shownIdsRef.current.add(toast.id)

      const options = {
        id: toast.id,
        duration: (toast.duration === Infinity ? undefined : (toast.duration || 3000)) as number | undefined,
        onDismiss: () => {
          removeToast(toast.id)
          shownIdsRef.current.delete(toast.id)
        },
        ...(toast.action && {
          action: {
            label: toast.action.label,
            onClick: () => {
              toast.action?.onClick()
              removeToast(toast.id)
              shownIdsRef.current.delete(toast.id)
            },
          },
        }),
      }

      switch (toast.type) {
        case 'success':
          sonnerToast.success(toast.message, options)
          break
        case 'error':
          sonnerToast.error(toast.message, options)
          break
        case 'warning':
          sonnerToast.warning(toast.message, options)
          break
        case 'info':
        default:
          sonnerToast.info(toast.message, options)
          break
      }
    })
  }, [toasts, removeToast])

  return <Toaster position="bottom-left" />
}
