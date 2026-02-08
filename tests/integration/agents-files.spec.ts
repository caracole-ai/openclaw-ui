/**
 * Tests d'intégration - Vérification des fichiers pour tous les agents
 * Ce test appelle vraiment l'API et vérifie que les fichiers sont retournés
 * 
 * REQUIRES: Server running on localhost:3333
 * Run with: npm run dev (in another terminal)
 * 
 * NOTE: Skipped by default - run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest'

// Skip if not running integration tests explicitly
const runIntegration = process.env.RUN_INTEGRATION === 'true'

// Increase timeout for API calls
const TEST_TIMEOUT = 30000 // 30s
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const API_BASE = 'http://localhost:3333'

interface AgentConfig {
  id: string
  workspaceDir: string
}

interface AgentFilesResponse {
  agent: { id: string; name: string }
  files: Record<string, string | null>
}

let allAgents: AgentConfig[] = []

beforeAll(async () => {
  // Récupérer la liste des agents depuis openclaw
  const { stdout } = await execAsync('openclaw status --json')
  const data = JSON.parse(stdout)
  allAgents = data.agents.agents.map((a: any) => ({
    id: a.id,
    workspaceDir: a.workspaceDir
  }))
})

describe.skipIf(!runIntegration)('Intégration: Fichiers agents', { timeout: TEST_TIMEOUT }, () => {
  
  it('tous les agents configurés retournent des fichiers', async () => {
    const results: { id: string; filesCount: number; status: string }[] = []
    
    for (const agent of allAgents) {
      try {
        const response = await fetch(`${API_BASE}/api/agents/${agent.id}`)
        
        if (!response.ok) {
          results.push({ id: agent.id, filesCount: 0, status: `HTTP ${response.status}` })
          continue
        }
        
        const data: AgentFilesResponse = await response.json()
        const filesWithContent = Object.entries(data.files || {})
          .filter(([_, content]) => content !== null)
        
        results.push({
          id: agent.id,
          filesCount: filesWithContent.length,
          status: filesWithContent.length > 0 ? '✅' : '⚠️ No files'
        })
      } catch (e) {
        results.push({ id: agent.id, filesCount: 0, status: `❌ Error: ${e}` })
      }
    }
    
    // Afficher le rapport
    console.table(results)
    
    // Vérifier qu'au moins 90% des agents ont des fichiers
    const withFiles = results.filter(r => r.filesCount > 0)
    const percentage = (withFiles.length / results.length) * 100
    
    console.log(`\n${withFiles.length}/${results.length} agents ont des fichiers (${percentage.toFixed(0)}%)`)
    
    expect(percentage).toBeGreaterThanOrEqual(90)
  })

  it('chaque agent a au minimum IDENTITY.md ou SOUL.md', async () => {
    const missing: string[] = []
    
    for (const agent of allAgents) {
      try {
        const response = await fetch(`${API_BASE}/api/agents/${agent.id}`)
        if (!response.ok) continue
        
        const data: AgentFilesResponse = await response.json()
        const files = data.files || {}
        
        const hasIdentity = files['IDENTITY.md'] !== null
        const hasSoul = files['SOUL.md'] !== null
        
        if (!hasIdentity && !hasSoul) {
          missing.push(agent.id)
        }
      } catch {
        // Ignorer les erreurs réseau
      }
    }
    
    if (missing.length > 0) {
      console.warn('⚠️ Agents sans IDENTITY.md ni SOUL.md:', missing)
    }
    
    expect(missing.length).toBe(0)
  })

  it('les fichiers retournés ne sont pas vides', async () => {
    const emptyFiles: { agent: string; file: string }[] = []
    
    for (const agent of allAgents.slice(0, 5)) { // Test sur les 5 premiers pour la perf
      try {
        const response = await fetch(`${API_BASE}/api/agents/${agent.id}`)
        if (!response.ok) continue
        
        const data: AgentFilesResponse = await response.json()
        
        for (const [filename, content] of Object.entries(data.files || {})) {
          if (content !== null && content.trim().length === 0) {
            emptyFiles.push({ agent: agent.id, file: filename })
          }
        }
      } catch {
        // Ignorer
      }
    }
    
    if (emptyFiles.length > 0) {
      console.warn('⚠️ Fichiers vides trouvés:', emptyFiles)
    }
    
    expect(emptyFiles.length).toBe(0)
  })
})

describe.skipIf(!runIntegration)('Intégration: Stats agents', { timeout: TEST_TIMEOUT }, () => {
  
  it('les stats sont calculées correctement', async () => {
    // Tester avec un agent connu pour avoir des sessions
    const response = await fetch(`${API_BASE}/api/agents/orchestrator`)
    
    if (response.ok) {
      const data = await response.json()
      
      expect(data.stats).toBeDefined()
      expect(typeof data.stats.totalTokensUsed).toBe('number')
      expect(typeof data.stats.totalSessions).toBe('number')
      expect(data.stats.maxPercentUsed).toBeGreaterThanOrEqual(0)
      expect(data.stats.maxPercentUsed).toBeLessThanOrEqual(100)
    }
  })
})

describe.skipIf(!runIntegration)('Intégration: Gestion erreurs', { timeout: TEST_TIMEOUT }, () => {
  
  it('retourne 404 pour un agent inexistant', async () => {
    const response = await fetch(`${API_BASE}/api/agents/agent-qui-nexiste-pas-12345`)
    expect(response.status).toBe(404)
  })
})
