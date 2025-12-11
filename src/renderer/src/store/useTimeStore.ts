import { create } from 'zustand'

interface TimeState {
  times: Record<string, number>
  updateTimes: (newTimes: Record<string, number>) => void
}

export const useTimeStore = create<TimeState>((set) => ({
  times: {},
  updateTimes: (newTimes) =>
    set((state) => ({
      times: { ...state.times, ...newTimes }
    }))
}))
