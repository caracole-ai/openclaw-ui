/**
 * POST /api/tests/run - Run tests
 * Body: { path?: string } - optional specific test file to run
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const PROJECT_DIR = process.cwd()

interface TestResult {
  success: boolean
  passed: number
  failed: number
  duration?: string
  output?: string
}

function parseVitestOutput(output: string): { passed: number; failed: number; duration?: string } {
  let passed = 0
  let failed = 0
  let duration: string | undefined

  // Parse "Tests  X passed" or "X passed | Y failed"
  const passedMatch = output.match(/(\d+)\s*passed/i)
  const failedMatch = output.match(/(\d+)\s*failed/i)
  const durationMatch = output.match(/Duration\s+([\d.]+\s*[ms]+)/i)

  if (passedMatch) passed = parseInt(passedMatch[1], 10)
  if (failedMatch) failed = parseInt(failedMatch[1], 10)
  if (durationMatch) duration = durationMatch[1]

  return { passed, failed, duration }
}

export default defineEventHandler(async (event): Promise<TestResult> => {
  const body = await readBody(event).catch(() => ({}))
  const specificPath = body?.path
  const testType = body?.type as 'unit' | 'integration' | 'e2e' | 'all' | undefined

  try {
    // Build command based on type
    let command: string
    
    if (specificPath) {
      command = `npm run test:unit -- --reporter=verbose "${specificPath}"`
    } else if (testType === 'unit') {
      command = 'npm run test:unit -- --reporter=verbose tests/unit'
    } else if (testType === 'integration') {
      command = 'npm run test:unit -- --reporter=verbose tests/integration'
    } else if (testType === 'e2e') {
      command = 'npm run test:e2e -- --reporter=list 2>&1 || echo "E2E requires: npx playwright install"'
    } else {
      // all = unit + integration
      command = 'npm run test:unit -- --reporter=verbose'
    }

    console.log(`[POST /api/tests/run] Running: ${command}`)

    // E2E tests need much more time (5 minutes)
    // Integration tests also need more time (2 minutes)
    const timeout = testType === 'e2e' ? 300000 : testType === 'integration' ? 120000 : 60000
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_DIR,
      timeout,
      env: { ...process.env, FORCE_COLOR: '0' }
    })

    const output = stdout + '\n' + stderr
    const { passed, failed, duration } = parseVitestOutput(output)

    return {
      success: failed === 0,
      passed,
      failed,
      duration,
      output
    }
  } catch (error: any) {
    // Tests failed but we still have output
    const output = (error.stdout || '') + '\n' + (error.stderr || '')
    const { passed, failed, duration } = parseVitestOutput(output)

    return {
      success: false,
      passed,
      failed: failed || 1,
      duration,
      output: output || error.message
    }
  }
})
