import { JSX, useEffect, useState, useRef } from 'react'
import styles from './SnippetManager.module.scss'
import { Folder, useSnippetStore } from '../../store/useSnippetStore'
import { useToastStore } from '../../store/useToastStore'
import {
  Search,
  Plus,
  FileCode,
  StickyNote,
  Trash2,
  Code2,
  Star,
  Loader2,
  Copy,
  Eye,
  Edit3,
  X,
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  XCircle,
  Check,
  FolderInput,
  Edit2,
  Upload,
  LayoutGrid,
  LinkIcon
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Editor, { useMonaco, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Project, Snippet } from '@renderer/types'
import { parseVSCodeSnippets } from '@renderer/utils/snippetParser'

loader.config({ monaco })

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'rust',
  'go',
  'html',
  'css',
  'sql',
  'bash',
  'json',
  'markdown',
  'yaml'
]

interface Props {
  projects?: Project[]
}

export function SnippetManager({ projects = [] }: Props): JSX.Element {
  const {
    snippets,
    folders,
    activeSnippetId,
    searchQuery,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    setActiveSnippet,
    setSearchQuery,
    addFolder,
    deleteFolder,
    toggleFolder,
    renameFolder,
    moveSnippet,
    importSnippets
  } = useSnippetStore()

  const addToast = useToastStore((state) => state.addToast)

  const [theme, setTheme] = useState<'vs-dark' | 'light'>(() =>
    document.body.classList.contains('light-mode') ? 'light' : 'vs-dark'
  )
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [newTag, setNewTag] = useState('')
  const [lastSnippetId, setLastSnippetId] = useState<string | null>(null)

  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [openMoveMenuId, setOpenMoveMenuId] = useState<string | null>(null)
  const moveMenuRef = useRef<HTMLDivElement>(null)

  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const linkMenuRef = useRef<HTMLDivElement>(null)

  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeSnippet = snippets.find((s) => s.id === activeSnippetId)

  if (activeSnippetId !== lastSnippetId) {
    setLastSnippetId(activeSnippetId || null)
    if (activeSnippet) {
      setViewMode(activeSnippet.type === 'note' ? 'preview' : 'edit')
    }
  }

  useEffect(() => {
    if (isCreatingFolder && folderInputRef.current) {
      folderInputRef.current.focus()
    }
  }, [isCreatingFolder])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node
      if (moveMenuRef.current && !moveMenuRef.current.contains(target)) {
        setOpenMoveMenuId(null)
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(target)) {
        setShowLinkMenu((prev) => {
          if (prev) return false
          return prev
        })
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLightNow = document.body.classList.contains('light-mode')
      setTheme(isLightNow ? 'light' : 'vs-dark')
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const monacoInstance = useMonaco()
  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.defineTheme('obsidian', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: { 'editor.background': '#09090b', 'editor.lineHighlightBackground': '#18181b' }
      })
      monacoInstance.editor.defineTheme('paper', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: { 'editor.background': '#fcfbf9' }
      })
    }
  }, [monacoInstance])

  useEffect(() => {
    if (renamingFolderId && renameInputRef.current) {
      renameInputRef.current.focus()
    }
  }, [renamingFolderId])

  const startCreateFolder = (): void => {
    setIsCreatingFolder(true)
    setNewFolderName('')
  }

  const confirmCreateFolder = (): void => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim())
      setIsCreatingFolder(false)
      setNewFolderName('')
    } else {
      setIsCreatingFolder(false)
    }
  }

  const cancelCreateFolder = (): void => {
    setIsCreatingFolder(false)
    setNewFolderName('')
  }

  const handleFolderInputKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') confirmCreateFolder()
    if (e.key === 'Escape') cancelCreateFolder()
  }

  const handleDeleteFolder = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation()
    if (confirm('Delete folder? Snippets will be moved to root.')) {
      deleteFolder(id)
    }
  }

  const handleAddSnippet = (type: 'code' | 'note', folderId?: string | null): void => {
    addSnippet(type, folderId)
  }

  const handleAddTag = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && newTag.trim() && activeSnippet) {
      const tags = activeSnippet.tags || []
      if (!tags.includes(newTag.trim())) {
        updateSnippet(activeSnippet.id, { tags: [...tags, newTag.trim()] })
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string): void => {
    if (activeSnippet) {
      updateSnippet(activeSnippet.id, { tags: activeSnippet.tags.filter((t) => t !== tagToRemove) })
    }
  }

  const handleCopy = (): void => {
    if (activeSnippet?.content) {
      navigator.clipboard.writeText(activeSnippet.content)
      addToast('Copied to clipboard', 'success')
    }
  }

  const toggleFavorite = (e: React.MouseEvent, id: string): void => {
    e.stopPropagation()
    const snippet = snippets.find((s) => s.id === id)
    if (snippet) updateSnippet(id, { favorite: !snippet.favorite })
  }

  const handleMoveSnippet = (
    e: React.MouseEvent,
    snippetId: string,
    folderId: string | null
  ): void => {
    e.stopPropagation()
    moveSnippet(snippetId, folderId)
    setOpenMoveMenuId(null)
  }

  const toggleMoveMenu = (e: React.MouseEvent, snippetId: string): void => {
    e.stopPropagation()
    setOpenMoveMenuId(openMoveMenuId === snippetId ? null : snippetId)
  }

  const startRenameFolder = (e: React.MouseEvent, folder: Folder): void => {
    e.stopPropagation()
    setRenamingFolderId(folder.id)
    setRenameValue(folder.name)
  }

  const confirmRename = (): void => {
    if (renamingFolderId && renameValue.trim()) {
      renameFolder(renamingFolderId, renameValue.trim())
      setRenamingFolderId(null)
      setRenameValue('')
    } else {
      cancelRename()
    }
  }

  const cancelRename = (): void => {
    setRenamingFolderId(null)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') confirmRename()
    if (e.key === 'Escape') cancelRename()
  }

  const handleImportClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lang = file.name.includes('py')
      ? 'python'
      : file.name.includes('rs')
        ? 'rust'
        : 'javascript'

    const parsed = parseVSCodeSnippets(text, lang)
    if (parsed.length > 0) {
      importSnippets(parsed)
      addToast(`Imported ${parsed.length} snippets!`, 'success')
    } else {
      addToast('Failed to parse snippets file', 'error')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleProjectLink = (projectId: string): void => {
    if (!activeSnippet) return

    const currentLinks = activeSnippet.linkedProjectIds || []
    const isLinked = currentLinks.includes(projectId)

    let newLinks
    if (isLinked) {
      newLinks = currentLinks.filter((id) => id !== projectId)
    } else {
      newLinks = [...currentLinks, projectId]
    }

    updateSnippet(activeSnippet.id, { linkedProjectIds: newLinks })
  }

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getSnippetsInFolder = (folderId: string | null): Snippet[] => {
    return filteredSnippets.filter((s) => s.folderId === (folderId || null))
  }

  const renderSnippetItem = (snippet: Snippet): JSX.Element => (
    <div
      key={snippet.id}
      className={`${styles.snippetItem} ${activeSnippetId === snippet.id ? styles.active : ''}`}
      onClick={() => setActiveSnippet(snippet.id)}
    >
      <div className={styles.itemHeader}>
        <span className={styles.itemTitle}>{snippet.title || 'Untitled'}</span>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div className={styles.moveWrapper}>
            <div
              onClick={(e) => toggleMoveMenu(e, snippet.id)}
              className={styles.iconBtnSmall}
              title="Move to folder..."
              style={{ opacity: 0.6, cursor: 'pointer' }}
            >
              <FolderInput size={12} />
            </div>

            {openMoveMenuId === snippet.id && (
              <div
                className={styles.moveMenu}
                ref={moveMenuRef}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`${styles.moveItem} ${snippet.folderId === null ? styles.current : ''}`}
                  onClick={(e) => handleMoveSnippet(e, snippet.id, null)}
                >
                  <FolderIcon size={12} /> Uncategorized
                  {snippet.folderId === null && <Check size={12} style={{ marginLeft: 'auto' }} />}
                </div>

                <div className={styles.moveDivider} />

                {folders.length > 0 ? (
                  folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`${styles.moveItem} ${snippet.folderId === folder.id ? styles.current : ''}`}
                      onClick={(e) => handleMoveSnippet(e, snippet.id, folder.id)}
                    >
                      <FolderIcon size={12} /> {folder.name}
                      {snippet.folderId === folder.id && (
                        <Check size={12} style={{ marginLeft: 'auto' }} />
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '8px',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic'
                    }}
                  >
                    No folders created
                  </div>
                )}
              </div>
            )}
          </div>

          <div onClick={(e) => toggleFavorite(e, snippet.id)} style={{ cursor: 'pointer' }}>
            <Star
              size={14}
              fill={snippet.favorite ? '#e11d48' : 'transparent'}
              color={snippet.favorite ? '#e11d48' : 'var(--text-muted)'}
            />
          </div>
        </div>
      </div>

      <div className={styles.itemMeta}>
        {snippet.type === 'code' ? <Code2 size={12} /> : <StickyNote size={12} />}
        <span className={styles.langBadge}>{snippet.language}</span>
        <span>• {formatDistanceToNow(snippet.updatedAt)}</span>
      </div>
    </div>
  )

  const editorTheme = theme === 'light' ? 'paper' : 'obsidian'

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button onClick={() => handleAddSnippet('code')}>
              <div>
                <Plus size={14} /> Code
              </div>
            </button>
            <button onClick={() => handleAddSnippet('note')}>
              <div>
                <Plus size={14} /> Note
              </div>
            </button>
            <button onClick={startCreateFolder} title="New Folder">
              <div>
                <FolderIcon size={14} />
              </div>
            </button>
            <button onClick={handleImportClick} title="Import VSCode Snippets">
              <div>
                <Upload size={14} />
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json,.code-snippets"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className={styles.list}>
          {isCreatingFolder && (
            <div className={styles.folderInputRow}>
              <FolderIcon size={16} />
              <input
                ref={folderInputRef}
                className={styles.newFolderInput}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={handleFolderInputKeyDown}
                onBlur={confirmCreateFolder}
                placeholder="Folder Name"
              />
              <button className={styles.iconBtnSmall} onClick={cancelCreateFolder}>
                <XCircle size={14} />
              </button>
            </div>
          )}

          {folders.map((folder) => (
            <div key={folder.id} className={styles.folderSection}>
              {renamingFolderId === folder.id ? (
                <div className={styles.folderInputRow}>
                  <FolderOpen size={16} color="var(--accent-primary)" />
                  <input
                    ref={renameInputRef}
                    className={styles.newFolderInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={confirmRename}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className={styles.iconBtnSmall}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      confirmRename()
                    }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className={styles.folderItem} onClick={() => toggleFolder(folder.id)}>
                  <div className={styles.folderHeader}>
                    {folder.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {folder.isOpen ? (
                      <FolderOpen size={16} color="var(--accent-primary)" />
                    ) : (
                      <FolderIcon size={16} />
                    )}
                    <span>{folder.name}</span>
                  </div>
                  <div className={styles.folderActions}>
                    <button
                      className={styles.iconBtnSmall}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddSnippet('code', folder.id)
                      }}
                      title="Add Snippet"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      className={styles.iconBtnSmall}
                      onClick={(e) => startRenameFolder(e, folder)}
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className={styles.iconBtnSmall}
                      onClick={(e) => handleDeleteFolder(e, folder.id)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}

              {folder.isOpen && !renamingFolderId && (
                <div className={styles.folderContent}>
                  {getSnippetsInFolder(folder.id).map(renderSnippetItem)}
                  {getSnippetsInFolder(folder.id).length === 0 && (
                    <div
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic'
                      }}
                    >
                      Empty folder
                    </div>
                  )}
                </div>
              )}
              {folder.isOpen && renamingFolderId === folder.id && (
                <div className={styles.folderContent}>
                  {getSnippetsInFolder(folder.id).map(renderSnippetItem)}
                </div>
              )}
            </div>
          ))}

          {getSnippetsInFolder(null).length > 0 && (
            <>
              <div className={styles.sectionTitle}>Uncategorized</div>
              {getSnippetsInFolder(null).map(renderSnippetItem)}
            </>
          )}

          {filteredSnippets.length === 0 && folders.length === 0 && !isCreatingFolder && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
              }}
            >
              No snippets found
            </div>
          )}
        </div>
      </aside>

      <main className={styles.editor}>
        {activeSnippet ? (
          <>
            <div className={styles.editorHeader}>
              <div className={styles.headerTop}>
                <input
                  type="text"
                  className={styles.titleInput}
                  value={activeSnippet.title}
                  onChange={(e) => updateSnippet(activeSnippet.id, { title: e.target.value })}
                  placeholder="Snippet Title..."
                />

                <div className={styles.headerControls}>
                  <div style={{ position: 'relative' }}>
                    <button
                      className={`${styles.iconBtn} ${showLinkMenu ? styles.active : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowLinkMenu(!showLinkMenu)
                      }}
                      title="Link to Project"
                    >
                      <LinkIcon size={16} />
                    </button>

                    {showLinkMenu && (
                      <div
                        className={styles.linkMenu}
                        ref={linkMenuRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={styles.linkMenuHeader}>Link to Project</div>
                        {projects.length > 0 ? (
                          projects.map((p) => {
                            const isLinked = activeSnippet.linkedProjectIds?.includes(p.id)
                            return (
                              <div
                                key={p.id}
                                className={`${styles.linkItem} ${isLinked ? styles.linked : ''}`}
                                onClick={() => toggleProjectLink(p.id)}
                              >
                                <LayoutGrid size={14} />
                                <span>{p.name}</span>
                                {isLinked && <Check size={14} className={styles.checkIcon} />}
                              </div>
                            )
                          })
                        ) : (
                          <div className={styles.emptyLink}>No projects found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }}
                  />
                  {activeSnippet.type === 'note' && (
                    <>
                      <button
                        className={`${styles.iconBtn} ${viewMode === 'edit' ? styles.active : ''}`}
                        onClick={() => setViewMode('edit')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${viewMode === 'preview' ? styles.active : ''}`}
                        onClick={() => setViewMode('preview')}
                      >
                        <Eye size={16} />
                      </button>
                      <div
                        style={{
                          width: 1,
                          height: 20,
                          background: 'var(--border)',
                          margin: '0 4px'
                        }}
                      />
                    </>
                  )}
                  <button className={styles.iconBtn} onClick={handleCopy}>
                    <Copy size={16} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => deleteSnippet(activeSnippet.id)}
                    style={{ color: 'var(--accent-danger)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.metaRow}>
                <div className={styles.tagsWrapper}>
                  {activeSnippet.tags?.map((tag) => (
                    <div key={tag} className={styles.tag}>
                      #{tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <input
                    className={styles.tagInput}
                    placeholder="+ Tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
                <select
                  className={styles.select}
                  value={activeSnippet.language}
                  onChange={(e) => updateSnippet(activeSnippet.id, { language: e.target.value })}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.contentArea}>
              {viewMode === 'preview' && activeSnippet.type === 'note' ? (
                <div className={styles.previewMode}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeSnippet.content || '*No content*'}
                  </ReactMarkdown>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={activeSnippet.language === 'note' ? 'markdown' : activeSnippet.language}
                  value={activeSnippet.content}
                  theme={editorTheme}
                  loading={
                    <div className={styles.editorLoader}>
                      <Loader2 className={styles.spin} size={32} />
                      <span>Loading Editor...</span>
                    </div>
                  }
                  onChange={(value) => updateSnippet(activeSnippet.id, { content: value || '' })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 20 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    automaticLayout: true,
                    wordWrap: 'on'
                  }}
                />
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <FileCode />
            <p>Select a snippet or create a new one</p>
          </div>
        )}
      </main>
    </div>
  )
}
