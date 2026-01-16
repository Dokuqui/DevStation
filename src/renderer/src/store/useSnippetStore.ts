import { Snippet } from '@renderer/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Folder {
  id: string
  name: string
  isOpen: boolean
}

interface SnippetState {
  snippets: Snippet[]
  folders: Folder[]
  activeSnippetId: string | null
  searchQuery: string

  addSnippet: (snippetOrType: Snippet | 'code' | 'note', folderId?: string | null) => void
  updateSnippet: (id: string, data: Partial<Snippet>) => void
  deleteSnippet: (id: string) => void
  setActiveSnippet: (id: string | null) => void
  setSearchQuery: (query: string) => void

  addFolder: (name: string) => void
  deleteFolder: (id: string) => void
  toggleFolder: (id: string) => void
  renameFolder: (id: string, newName: string) => void
  moveSnippet: (snippetId: string, folderId: string | null) => void
  importSnippets: (newSnippets: Snippet[]) => void
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: [],
      folders: [],
      activeSnippetId: null,
      searchQuery: '',

      addSnippet: (snippetOrType, folderId = null) =>
        set((state) => {
          let newSnippet: Snippet

          if (typeof snippetOrType === 'object') {
            newSnippet = snippetOrType
          } else {
            newSnippet = {
              id: crypto.randomUUID(),
              title: 'Untitled Snippet',
              type: snippetOrType,
              language: snippetOrType === 'code' ? 'javascript' : 'markdown',
              content: '',
              folderId: folderId,
              tags: [],
              favorite: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              linkedProjectIds: []
            }
          }

          return { snippets: [newSnippet, ...state.snippets] }
        }),

      updateSnippet: (id, data) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...data, updatedAt: Date.now() } : s
          )
        })),

      deleteSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
          activeSnippetId: state.activeSnippetId === id ? null : state.activeSnippetId
        })),

      setActiveSnippet: (id) => set({ activeSnippetId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      addFolder: (name) => {
        const newFolder: Folder = {
          id: crypto.randomUUID(),
          name,
          isOpen: true
        }
        set((state) => ({ folders: [...state.folders, newFolder] }))
      },

      deleteFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          snippets: state.snippets.map((s) => (s.folderId === id ? { ...s, folderId: null } : s))
        })),

      toggleFolder: (id) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, isOpen: !f.isOpen } : f))
        })),

      renameFolder: (id, newName) =>
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? { ...f, name: newName } : f))
        })),

      moveSnippet: (snippetId, folderId) =>
        set((state) => ({
          snippets: state.snippets.map((s) => (s.id === snippetId ? { ...s, folderId } : s))
        })),

      importSnippets: (newSnippets) => {
        set((state) => ({
          snippets: [...newSnippets, ...state.snippets]
        }))
      }
    }),
    {
      name: 'devstation-snippets-storage'
    }
  )
)
