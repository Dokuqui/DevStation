import fs from 'fs/promises'
import path from 'path'
import { BaseDetector } from './base'
import { Project } from '../../shared/types'

class CSharpDetectorImpl extends BaseDetector {
  async isMatch(folderPath: string): Promise<boolean> {
    try {
      const files = await fs.readdir(folderPath)
      return files.some((f) => f.endsWith('.csproj') || f.endsWith('.sln'))
    } catch {
      return false
    }
  }

  async parse(folderPath: string): Promise<Partial<Project>> {
    let files: string[] = []
    try {
      files = await fs.readdir(folderPath)
    } catch {
      return {} as Partial<Project>
    }

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
      const content = await this.readFile(folderPath, csproj)
      const isExe = /<OutputType>\s*(Exe|WinExe)\s*<\/OutputType>/i.test(content)
      const isWeb = content.includes('Microsoft.NET.Sdk.Web')

      if (isExe || isWeb) {
        scripts['run'] = 'dotnet run'
        scripts['watch'] = 'dotnet watch run'
      }
    }

    return {
      type: 'csharp',
      name,
      version: '1.0.0',
      scripts,
      runnerCommand: undefined,
      installCommand: 'dotnet restore'
    } as Partial<Project>
  }
}

export const CSharpDetector = new CSharpDetectorImpl()
