import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  timestamp: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const now = Date.now()

    set((state) => {
      const isDuplicate = state.toasts.some(
        (t) => t.message === message && t.type === type && now - t.timestamp < 2000
      )

      if (isDuplicate) return state

      const id = crypto.randomUUID()
      const newToast = { id, message, type, timestamp: now }

      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, 4000)

      return { toasts: [...state.toasts, newToast] }
    })
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}))
