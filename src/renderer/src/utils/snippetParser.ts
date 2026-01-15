import { Snippet } from '@renderer/types'

interface VSCodeSnippet {
  prefix: string | string[]
  body: string | string[]
  description?: string
}

export const parseVSCodeSnippets = (
  jsonContent: string,
  language: string = 'javascript'
): Snippet[] => {
  try {
    const data: Record<string, VSCodeSnippet> = JSON.parse(jsonContent)
    const snippets: Snippet[] = []

    for (const [title, snippetData] of Object.entries(data)) {
      const content = Array.isArray(snippetData.body)
        ? snippetData.body.join('\n')
        : snippetData.body

      snippets.push({
        id: crypto.randomUUID(),
        title: title,
        content: content,
        type: 'code',
        language: language,
        tags: ['vscode-import'],
        folderId: null,
        linkedProjectIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favorite: false
      })
    }
    return snippets
  } catch (error) {
    console.error('Failed to parse VS Code snippets:', error)
    return []
  }
}
