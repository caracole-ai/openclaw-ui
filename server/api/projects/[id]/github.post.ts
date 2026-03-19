/**
 * POST /api/projects/:id/github
 * Create a GitHub repo for a project, add collaborator, and update vault.
 */
import { getDb } from '~/server/utils/db'
import { updateVaultFrontmatter, vaultConfig } from '~/server/utils/vault'
import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { DbProject } from '~/server/types/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as DbProject | undefined
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  if (project.github_repo && project.github_created) {
    throw createError({ statusCode: 409, statusMessage: 'GitHub repo already exists' })
  }

  const { projectsDir, githubOwner, githubCollaborator } = vaultConfig
  const repoName = id!
  const projectDir = join(projectsDir, repoName)

  try {
    // 1. Create local directory
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true })
    }

    // 2. Initialize git repo with README
    const readme = `# ${project.name}\n\n${project.description || ''}\n\n---\nCreated via OpenClaw Dashboard\n`
    writeFileSync(join(projectDir, 'README.md'), readme)
    writeFileSync(join(projectDir, '.gitignore'), `node_modules/\n.env\n.nuxt/\ndist/\n*.db\n`)

    execSync('git init && git add . && git commit -m "Initial commit"', {
      cwd: projectDir,
      stdio: 'pipe',
    })

    // 3. Create GitHub repo (private by default)
    execSync(`gh repo create ${githubOwner}/${repoName} --private --source=. --push`, {
      cwd: projectDir,
      stdio: 'pipe',
    })

    // 4. Add collaborator with admin access
    try {
      execSync(`gh api repos/${githubOwner}/${repoName}/collaborators/${githubCollaborator} -X PUT -f permission=admin`, {
        cwd: projectDir,
        stdio: 'pipe',
      })
    } catch (err) {
      console.warn(`[github] Failed to add collaborator ${githubCollaborator}:`, err)
    }

    const repoUrl = `https://github.com/${githubOwner}/${repoName}`

    // 5. Update DB
    db.prepare(`
      UPDATE projects SET github_repo = ?, github_created = 1, workspace = ?, updated_at = datetime('now') WHERE id = ?
    `).run(repoName, projectDir, id)

    // 6. Update vault file if exists
    if (project.vault_path) {
      try {
        updateVaultFrontmatter(project.vault_path, {
          github: { repo: repoName, url: repoUrl, created: true },
          workspace: projectDir,
        })
      } catch (err) {
        console.error('[github] Failed to update vault file:', err)
      }
    }

    // 7. Log event
    db.prepare('INSERT INTO events (id, type, actor, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
      `evt-${Date.now()}`,
      'project.github_created',
      'lio',
      JSON.stringify({ projectId: id, repo: repoName, url: repoUrl }),
      new Date().toISOString()
    )

    return {
      status: 'success',
      repo: repoName,
      url: repoUrl,
      workspace: projectDir,
    }
  } catch (error: any) {
    console.error('[github] Failed to create repo:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create GitHub repo: ${error.message}`,
    })
  }
})
