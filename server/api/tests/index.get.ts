/**
 * GET /api/tests - List all test files
 */

import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const TESTS_DIR = process.cwd() + '/tests'

interface TestFile {
  name: string
  path: string
  type: 'unit' | 'integration' | 'e2e'
  testCount: number
}

async function countTests(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, 'utf-8')
    // Count it(), test(), describe() calls
    const itMatches = content.match(/\bit\s*\(/g) || []
    const testMatches = content.match(/\btest\s*\(/g) || []
    return itMatches.length + testMatches.length
  } catch {
    return 0
  }
}

async function scanDir(dir: string, type: 'unit' | 'integration' | 'e2e'): Promise<TestFile[]> {
  const fullPath = join(TESTS_DIR, dir)
  if (!existsSync(fullPath)) return []

  const files: TestFile[] = []
  const entries = await readdir(fullPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      const filePath = join(fullPath, entry.name)
      const testCount = await countTests(filePath)
      files.push({
        name: entry.name.replace('.spec.ts', ''),
        path: `tests/${dir}/${entry.name}`,
        type,
        testCount
      })
    }
  }

  return files
}

export default defineEventHandler(async () => {
  try {
    const [unit, integration, e2e] = await Promise.all([
      scanDir('unit', 'unit'),
      scanDir('integration', 'integration'),
      scanDir('e2e', 'e2e')
    ])

    const files = [...unit, ...integration, ...e2e]

    return {
      files,
      total: files.length,
      counts: {
        unit: unit.length,
        integration: integration.length,
        e2e: e2e.length
      }
    }
  } catch (error: any) {
    console.error('[GET /api/tests] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to list tests',
      data: { error: error.message }
    })
  }
})
