'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Toast notification types
export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// UI store state interface
interface UIStore {
  // Cart drawer state
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  // Toast notifications
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void

  // Quick view modal
  quickViewProductId: string | null
  openQuickView: (productId: string) => void
  closeQuickView: () => void

  // Loading operations (for coordinating loading states)
  loadingOperations: Set<string>
  startLoading: (operationId: string) => void
  stopLoading: (operationId: string) => void
  isOperationLoading: (operationId: string) => boolean
}

/**
 * Zustand store for UI-only state
 * Uses persist middleware to save cart drawer state across sessions
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // ===== Cart Drawer =====
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),

      closeCart: () => set({ isCartOpen: false }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      // ===== Toast Notifications =====
      toasts: [],

      showToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`
        
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }],
        }))

        // Auto-remove toast after duration (default 3 seconds)
        if (toast.duration !== Infinity) {
          setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((t) => t.id !== id),
            }))
          }, toast.duration || 3000)
        }
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      // ===== Quick View Modal =====
      quickViewProductId: null,

      openQuickView: (productId) => set({ quickViewProductId: productId }),

      closeQuickView: () => set({ quickViewProductId: null }),

      // ===== Loading Operations =====
      loadingOperations: new Set(),

      startLoading: (operationId) =>
        set((state) => ({
          loadingOperations: new Set(state.loadingOperations).add(operationId),
        })),

      stopLoading: (operationId) =>
        set((state) => {
          const newSet = new Set(state.loadingOperations)
          newSet.delete(operationId)
          return { loadingOperations: newSet }
        }),

      isOperationLoading: (operationId) => get().loadingOperations.has(operationId),
    }),
    {
      name: 'ui-store',
      // Only persist cart drawer state (don't persist toasts or modals)
      partialize: (state) => ({
        isCartOpen: state.isCartOpen,
      }),
    }
  )
)

/**
 * Helper hooks for specific UI state
 */
export const useCartDrawer = () => {
  const isCartOpen = useUIStore((state) => state.isCartOpen)
  const openCart = useUIStore((state) => state.openCart)
  const closeCart = useUIStore((state) => state.closeCart)
  const toggleCart = useUIStore((state) => state.toggleCart)

  return { isCartOpen, openCart, closeCart, toggleCart }
}

export const useToasts = () => {
  const toasts = useUIStore((state) => state.toasts)
  const showToast = useUIStore((state) => state.showToast)
  const removeToast = useUIStore((state) => state.removeToast)
  const clearToasts = useUIStore((state) => state.clearToasts)

  return { toasts, showToast, removeToast, clearToasts }
}

export const useQuickView = () => {
  const quickViewProductId = useUIStore((state) => state.quickViewProductId)
  const openQuickView = useUIStore((state) => state.openQuickView)
  const closeQuickView = useUIStore((state) => state.closeQuickView)

  return { quickViewProductId, openQuickView, closeQuickView }
}
