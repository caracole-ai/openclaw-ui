/**
 * Tests E2E - Dashboard Projects
 * Features: filtres, toggle vue, stale indicator, kanban
 */
import { test, expect } from '@playwright/test'

// Mock data pour les tests
const mockProjects = [
  {
    id: 'proj-1',
    name: 'Projet Stale',
    description: 'Un projet sans update depuis 48h',
    type: 'code',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    team: ['amelia-dev'],
    lead: 'amelia-dev',
    phases: [],
    progress: 30,
    updates: [],
    staleHours: 48,
    isStale: true
  },
  {
    id: 'proj-2',
    name: 'Projet Actif',
    description: 'Un projet récemment mis à jour',
    type: 'writing',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    team: ['taylor-qa', 'winston-architecte'],
    lead: 'winston-architecte',
    phases: [
      { name: 'Phase 1', status: 'completed' },
      { name: 'Phase 2', status: 'in-progress' }
    ],
    progress: 60,
    updates: [],
    staleHours: 2,
    isStale: false
  },
  {
    id: 'proj-3',
    name: 'Projet Terminé',
    description: 'Un projet complété',
    type: 'code',
    status: 'completed',
    createdAt: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    team: ['claudio-openclaw'],
    lead: 'claudio-openclaw',
    phases: [],
    progress: 100,
    updates: [],
    staleHours: 96,
    isStale: false // completed = jamais stale
  }
]

test.describe('Projects Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock l'API projects
    await page.route('/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: mockProjects,
          total: mockProjects.length,
          timestamp: new Date().toISOString()
        })
      })
    })
  })

  test.describe('Stale Indicator', () => {
    test('affiche le badge stale orange pour les projets > 24h', async ({ page }) => {
      await page.goto('/')
      
      // Attendre que les projets soient chargés
      await expect(page.locator('text=Projet Stale')).toBeVisible()
      
      // Le projet stale doit avoir le badge ⚠️
      const staleCard = page.locator('.border-l-orange-500')
      await expect(staleCard).toBeVisible()
      await expect(staleCard).toContainText('48h')
    })

    test('n\'affiche pas le badge stale sur les projets récents', async ({ page }) => {
      await page.goto('/')
      
      await expect(page.locator('text=Projet Actif')).toBeVisible()
      
      // Le projet actif ne doit pas avoir la bordure orange
      const activeCard = page.locator('a:has-text("Projet Actif")')
      await expect(activeCard).not.toHaveClass(/border-l-orange-500/)
    })

    test('le projet completed n\'est jamais marqué stale', async ({ page }) => {
      await page.goto('/')
      
      const completedCard = page.locator('a:has-text("Projet Terminé")')
      await expect(completedCard).toBeVisible()
      await expect(completedCard).not.toHaveClass(/border-l-orange-500/)
    })
  })

  test.describe('Filtres', () => {
    test('filtre par status "stale" affiche uniquement les projets stale', async ({ page }) => {
      await page.goto('/')
      
      // Sélectionner le filtre stale
      await page.selectOption('select:has-text("Tous les status")', 'stale')
      
      // Seul le projet stale doit être visible
      await expect(page.locator('text=Projet Stale')).toBeVisible()
      await expect(page.locator('text=Projet Actif')).not.toBeVisible()
      await expect(page.locator('text=Projet Terminé')).not.toBeVisible()
    })

    test('filtre par status "completed" affiche uniquement les terminés', async ({ page }) => {
      await page.goto('/')
      
      await page.selectOption('select:has-text("Tous les status")', 'completed')
      
      await expect(page.locator('text=Projet Terminé')).toBeVisible()
      await expect(page.locator('text=Projet Stale')).not.toBeVisible()
    })

    test('filtre par agent affiche les projets de cet agent', async ({ page }) => {
      await page.goto('/')
      
      // Sélectionner amelia-dev
      await page.selectOption('select:has-text("Tous les agents")', 'amelia-dev')
      
      // Seul le projet où amelia est assignée
      await expect(page.locator('text=Projet Stale')).toBeVisible()
      await expect(page.locator('text=Projet Actif')).not.toBeVisible()
    })

    test('combinaison de filtres', async ({ page }) => {
      await page.goto('/')
      
      // Filtre in-progress + winston
      await page.selectOption('select:has-text("Tous les status")', 'in-progress')
      await page.selectOption('select:has-text("Tous les agents")', 'winston-architecte')
      
      // Seul Projet Actif (in-progress + winston dans team)
      await expect(page.locator('text=Projet Actif')).toBeVisible()
      await expect(page.locator('text=Projet Stale')).not.toBeVisible()
    })

    test('empty state quand filtres sans résultats', async ({ page }) => {
      await page.goto('/')
      
      // Filtre qui ne matche rien
      await page.selectOption('select:has-text("Tous les status")', 'paused')
      
      await expect(page.locator('text=Aucun projet avec ces filtres')).toBeVisible()
    })

    test('bouton réinitialiser les filtres', async ({ page }) => {
      await page.goto('/')
      
      await page.selectOption('select:has-text("Tous les status")', 'paused')
      
      await expect(page.locator('text=Aucun projet avec ces filtres')).toBeVisible()
      
      await page.click('text=Réinitialiser les filtres')
      
      // Tous les projets visibles
      await expect(page.locator('text=Projet Stale')).toBeVisible()
      await expect(page.locator('text=Projet Actif')).toBeVisible()
    })
  })

  test.describe('Toggle Vue Cards/Kanban', () => {
    test('vue cards par défaut', async ({ page }) => {
      await page.goto('/')
      
      // Les cards doivent être visibles
      await expect(page.locator('.grid.grid-cols-1')).toBeVisible()
    })

    test('switch vers vue kanban', async ({ page }) => {
      await page.goto('/')
      
      // Click sur le bouton kanban (▤)
      await page.click('button:has-text("▤")')
      
      // Le composant Kanban doit apparaître (colonnes par status)
      await expect(page.locator('text=En cours')).toBeVisible()
      await expect(page.locator('text=Terminé')).toBeVisible()
    })

    test('retour vers vue cards', async ({ page }) => {
      await page.goto('/')
      
      await page.click('button:has-text("▤")') // Kanban
      await page.click('button:has-text("▦")') // Cards
      
      await expect(page.locator('.grid.grid-cols-1')).toBeVisible()
    })
  })

  test.describe('Status Badges', () => {
    test('badge vert pour completed', async ({ page }) => {
      await page.goto('/')
      
      const completedBadge = page.locator('a:has-text("Projet Terminé") .bg-green-100')
      await expect(completedBadge).toBeVisible()
      await expect(completedBadge).toContainText('Terminé')
    })

    test('badge bleu pour in-progress', async ({ page }) => {
      await page.goto('/')
      
      const inProgressBadge = page.locator('a:has-text("Projet Actif") .bg-blue-100')
      await expect(inProgressBadge).toBeVisible()
      await expect(inProgressBadge).toContainText('En cours')
    })
  })

  test.describe('Type Icons', () => {
    test('icône 💻 pour type code', async ({ page }) => {
      await page.goto('/')
      
      const codeProject = page.locator('a:has-text("Projet Stale")')
      await expect(codeProject).toContainText('💻')
    })

    test('icône ✍️ pour type writing', async ({ page }) => {
      await page.goto('/')
      
      const writingProject = page.locator('a:has-text("Projet Actif")')
      await expect(writingProject).toContainText('✍️')
    })
  })

  test.describe('Progress Bar', () => {
    test('affiche le pourcentage correct', async ({ page }) => {
      await page.goto('/')
      
      const activeProject = page.locator('a:has-text("Projet Actif")')
      await expect(activeProject).toContainText('60%')
    })
  })

  test.describe('Navigation', () => {
    test('click sur card navigue vers la page détail', async ({ page }) => {
      await page.goto('/')
      
      await page.click('a:has-text("Projet Actif")')
      
      await expect(page).toHaveURL(/\/project\/proj-2/)
    })
  })
})
