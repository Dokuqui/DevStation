import fs from 'fs/promises'
import path from 'path'
import { ProjectDetector } from './base'
import { Project } from '../../shared/types'

export const CSharpDetector: ProjectDetector = {
  async isMatch(folderPath: string) {
    try {
      const files = await fs.readdir(folderPath)
      return files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))
    } catch {
      return false
    }
  },

  async parse(folderPath: string) {
    const files = await fs.readdir(folderPath)
    const csproj = files.find((f) => f.endsWith('.csproj'))
    const sln = files.find((f) => f.endsWith('.sln'))

    let name = path.basename(folderPath)
    if (sln) name = path.basename(sln, '.sln')
    else if (csproj) name = path.basename(csproj, '.csproj')

    const scripts: Record<string, string> = {
      restore: 'dotnet restore',
      build: 'dotnet build',
      test: 'dotnet test',
      clean: 'dotnet clean'
    }

    if (csproj) {
      try {
        const content = await fs.readFile(path.join(folderPath, csproj), 'utf-8')

        const isExe = /<OutputType>\s*(Exe|WinExe)\s*<\/OutputType>/i.test(content)
        const isWeb = content.includes('Microsoft.NET.Sdk.Web')

        if (isExe || isWeb) {
          scripts['run'] = 'dotnet run'
          scripts['watch'] = 'dotnet watch run'
        }
      } catch {
        // ignore read error
      }
    }

    return {
      type: 'csharp',
      name: name,
      version: '1.0.0',
      scripts: scripts,
      runnerCommand: undefined,
      installCommand: 'dotnet restore'
    } as Partial<Project>
  }
}
