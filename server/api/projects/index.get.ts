/**
 * GET /api/projects - List all projects
 * 
 * Merges two sources:
 * 1. projects.json (manual/tracked projects)
 * 2. ~/.openclaw/projects/active/* (filesystem projects from project-helper.sh)
 */

import { readFile, readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import type { ProjectsResponse, ProjectsData, Project } from '~/types/projects'

const PROJECTS_FILE = process.env.HOME + '/.openclaw/projects/projects.json'
const SYNC_SCRIPT = process.env.HOME + '/.openclaw/scripts/sync-projects.sh'

/**
 * Sync projects.json from filesystem folders (source of truth)
 * Runs on each API call to ensure consistency
 */
function syncProjectsJson(): void {
  if (existsSync(SYNC_SCRIPT)) {
    try {
      execSync(SYNC_SCRIPT, { stdio: 'ignore', timeout: 5000 })
    } catch (e) {
      console.warn('[projects] sync-projects.sh failed:', e)
    }
  }
}
const PROJECTS_ACTIVE_DIR = process.env.HOME + '/.openclaw/projects/active'
const PROJECTS_ARCHIVED_DIR = process.env.HOME + '/.openclaw/projects/archived'

/**
 * Load filesystem projects from active/ and archived/ directories
 * Converts them to the Project type format
 */
async function loadFilesystemProjects(): Promise<Project[]> {
  const projects: Project[] = []
  
  for (const [dir, isArchived] of [[PROJECTS_ACTIVE_DIR, false], [PROJECTS_ARCHIVED_DIR, true]] as const) {
    if (!existsSync(dir)) continue
    
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      
      const projectPath = join(dir, entry.name)
      const contributorsPath = join(projectPath, 'contributors.json')
      const conceptPath = join(projectPath, 'CONCEPT.md')
      
      try {
        // Read contributors.json for metadata
        let metadata: any = {}
        if (existsSync(contributorsPath)) {
          const data = await readFile(contributorsPath, 'utf-8')
          metadata = JSON.parse(data)
        }
        
        // Get description from CONCEPT.md first paragraph
        let description = ''
        if (existsSync(conceptPath)) {
          const concept = await readFile(conceptPath, 'utf-8')
          // Extract first meaningful paragraph (skip headers)
          const lines = concept.split('\n').filter(l => l.trim() && !l.startsWith('#'))
          description = lines.slice(0, 2).join(' ').slice(0, 200)
        }
        
        // Get folder stats for dates
        const stats = await stat(projectPath)
        
        // Determine status: from metadata, or inferred from directory
        let status: 'planning' | 'in-progress' | 'review' | 'paused' | 'completed' | 'archived' = 
          metadata.status || (isArchived ? 'archived' : 'in-progress')
        
        const project: Project = {
          id: `fs-${entry.name}`, // Prefix to distinguish from manual projects
          name: metadata.name || entry.name,
          description: description || `Projet délibération: ${entry.name}`,
          type: 'hybrid', // Default for delib projects
          status,
          createdAt: metadata.created || stats.birthtime.toISOString(),
          updatedAt: metadata.lastActivity || stats.mtime.toISOString(),
          team: metadata.contributors || [],
          phases: [],
          progress: metadata.progress ?? (isArchived ? 100 : 50),
          updates: [],
          workspace: projectPath,
          // Extra fields for delib projects
          tags: ['délibération'],
          ...(metadata.channelId && { 
            repository: `mattermost://channel/${metadata.channelId}` // Hacky but works for link
          })
        }
        
        projects.push(project)
      } catch (e) {
        console.warn(`[projects] Could not load ${entry.name}:`, e)
      }
    }
  }
  
  return projects
}

export default defineEventHandler(async (): Promise<ProjectsResponse> => {
  try {
    // Sync projects.json from filesystem (source of truth)
    syncProjectsJson()
    
    // Load projects from projects.json (synced from filesystem by sync-projects.sh)
    // Single source of truth - no more dual loading
    let allProjects: Project[] = []
    if (existsSync(PROJECTS_FILE)) {
      const data = await readFile(PROJECTS_FILE, 'utf-8')
      const projectsData: ProjectsData = JSON.parse(data)
      allProjects = projectsData.projects
    }

    // Calculate staleHours for each project
    const now = Date.now()
    const enrichedProjects = allProjects.map(project => {
      const updatedAt = new Date(project.updatedAt).getTime()
      const staleHours = Math.floor((now - updatedAt) / (1000 * 60 * 60))
      const isStale = staleHours > 24 && !['completed', 'archived', 'paused'].includes(project.status)
      return { ...project, staleHours, isStale }
    })

    // Sort by: stale first, then status priority, then updatedAt
    const statusPriority: Record<string, number> = {
      'in-progress': 0,
      'review': 1,
      'planning': 2,
      'paused': 3,
      'completed': 4,
      'archived': 5
    }

    const sortedProjects = enrichedProjects.sort((a, b) => {
      // Stale projects first (attention needed)
      if (a.isStale && !b.isStale) return -1
      if (!a.isStale && b.isStale) return 1
      
      // Then by status priority
      const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99)
      if (statusDiff !== 0) return statusDiff
      
      // Then by updatedAt
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return {
      projects: sortedProjects,
      total: sortedProjects.length,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('[/api/projects] Error:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load projects',
      data: { error: error.message }
    })
  }
})
