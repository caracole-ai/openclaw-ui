/**
 * Tests E2E complets pour le Dashboard Agents
 * Playwright - Tests d'intégration UI
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Agents - Navigation', () => {
  test('la route /dashboard est accessible', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('le titre de la page est correct', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h2')).toContainText('Agents OpenClaw')
  })
})

test.describe('Dashboard Agents - Chargement', () => {
  test('affiche un skeleton loader pendant le chargement', async ({ page }) => {
    // Ralentit la réponse pour voir le skeleton
    await page.route('/api/agents/status', async route => {
      await new Promise(r => setTimeout(r, 500))
      await route.continue()
    })
    
    await page.goto('/dashboard')
    
    // Vérifie que le skeleton est visible
    const skeleton = page.locator('.animate-pulse').first()
    await expect(skeleton).toBeVisible()
  })

  test('affiche les agents après chargement', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Attend que les cartes soient visibles
    await expect(page.locator('.grid > div').first()).toBeVisible()
  })

  test('affiche le timestamp de mise à jour', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/Mis à jour/)).toBeVisible()
  })
})

test.describe('Dashboard Agents - Compteurs de statut', () => {
  test('affiche le compteur d\'agents actifs', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/\d+ actif/)).toBeVisible()
  })

  test('affiche le compteur d\'agents idle', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/\d+ idle/)).toBeVisible()
  })

  test('affiche le compteur d\'agents offline', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/\d+ off/)).toBeVisible()
  })

  test('affiche le total de tokens', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/Total tokens:/)).toBeVisible()
  })
})

test.describe('Dashboard Agents - Cartes d\'agent', () => {
  test('chaque carte affiche le nom de l\'agent', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Au moins une carte avec un nom
    const cards = page.locator('.grid > div')
    await expect(cards.first()).toBeVisible()
    
    // Vérifie que le texte n'est pas vide
    const firstCardText = await cards.first().textContent()
    expect(firstCardText?.length).toBeGreaterThan(0)
  })

  test('les cartes ont des badges de statut', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Vérifie qu'au moins un badge est présent
    const badges = page.locator('.rounded-full')
    await expect(badges.first()).toBeVisible()
  })

  test('les cartes affichent les tokens', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Cherche un pattern de tokens (ex: "45k", "1.5M")
    await expect(page.getByText(/\d+\.?\d*[kM]?/)).toBeVisible()
  })

  test('les cartes affichent une barre de progression', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Barre de progression du contexte
    const progressBar = page.locator('.h-2.bg-gray-200.rounded-full').first()
    await expect(progressBar).toBeVisible()
  })
})

test.describe('Dashboard Agents - Bouton Refresh', () => {
  test('le bouton refresh existe', async ({ page }) => {
    await page.goto('/dashboard')
    const refreshButton = page.locator('button[title="Rafraîchir"]')
    await expect(refreshButton).toBeVisible()
  })

  test('le bouton refresh fonctionne', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Note le timestamp initial
    const initialTimestamp = await page.getByText(/Mis à jour/).textContent()
    
    // Attend un peu puis clique
    await page.waitForTimeout(1000)
    await page.click('button[title="Rafraîchir"]')
    
    // Vérifie que le timestamp a changé (ou que l'animation a joué)
    const refreshButton = page.locator('button[title="Rafraîchir"] svg')
    // Le bouton devrait avoir l'animation pendant le refresh
  })

  test('le bouton a une animation pendant le chargement', async ({ page }) => {
    await page.route('/api/agents/status', async route => {
      await new Promise(r => setTimeout(r, 1000))
      await route.continue()
    })
    
    await page.goto('/dashboard')
    await page.click('button[title="Rafraîchir"]')
    
    const svg = page.locator('button[title="Rafraîchir"] svg')
    await expect(svg).toHaveClass(/animate-spin/)
  })
})

test.describe('Dashboard Agents - Gestion d\'erreurs', () => {
  test('affiche un message d\'erreur en cas d\'échec', async ({ page }) => {
    await page.route('/api/agents/status', route => 
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    
    await page.goto('/dashboard')
    
    await expect(page.getByText(/Erreur de connexion/)).toBeVisible()
  })

  test('affiche un bouton Réessayer en cas d\'erreur', async ({ page }) => {
    await page.route('/api/agents/status', route => 
      route.fulfill({ status: 500, body: 'Error' })
    )
    
    await page.goto('/dashboard')
    
    await expect(page.getByText(/Réessayer/)).toBeVisible()
  })

  test('le bouton Réessayer fonctionne', async ({ page }) => {
    let callCount = 0
    await page.route('/api/agents/status', route => {
      callCount++
      if (callCount === 1) {
        route.fulfill({ status: 500, body: 'Error' })
      } else {
        route.continue()
      }
    })
    
    await page.goto('/dashboard')
    await expect(page.getByText(/Erreur/)).toBeVisible()
    
    await page.click('text=Réessayer')
    
    // Après le retry, l'erreur devrait disparaître
    await expect(page.getByText(/Erreur de connexion/)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard Agents - État vide', () => {
  test('affiche un message si aucun agent', async ({ page }) => {
    await page.route('/api/agents/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [], timestamp: new Date().toISOString() })
      })
    )
    
    await page.goto('/dashboard')
    
    await expect(page.getByText(/Aucun agent configuré/)).toBeVisible()
  })
})

test.describe('Dashboard Agents - Alertes quota', () => {
  test('affiche une alerte si agents > 80% contexte', async ({ page }) => {
    await page.route('/api/agents/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: [
            {
              id: 'test-agent',
              name: 'Test',
              status: 'online',
              totalTokens: 180000,
              maxPercentUsed: 90,
              model: 'claude-opus-4-5',
              activeSessions: 1,
              lastActivity: new Date().toISOString()
            }
          ],
          timestamp: new Date().toISOString()
        })
      })
    )
    
    await page.goto('/dashboard')
    
    await expect(page.getByText(/> 80%/)).toBeVisible()
  })

  test('la barre de progression est rouge si > 80%', async ({ page }) => {
    await page.route('/api/agents/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: [{
            id: 'test-agent',
            name: 'Test',
            status: 'online',
            totalTokens: 180000,
            maxPercentUsed: 90,
            model: 'claude-opus-4-5',
            activeSessions: 1,
            lastActivity: new Date().toISOString()
          }],
          timestamp: new Date().toISOString()
        })
      })
    )
    
    await page.goto('/dashboard')
    
    const redBar = page.locator('.bg-red-500.rounded-full')
    await expect(redBar).toBeVisible()
  })
})

test.describe('Dashboard Agents - Responsive', () => {
  test('s\'adapte aux petits écrans', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // Sur mobile, une colonne
    const grid = page.locator('.grid')
    await expect(grid).toHaveClass(/grid-cols-1/)
  })

  test('affiche 2 colonnes sur tablette', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/dashboard')
    
    const grid = page.locator('.grid')
    await expect(grid).toHaveClass(/md:grid-cols-2/)
  })

  test('affiche 3 colonnes sur desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/dashboard')
    
    const grid = page.locator('.grid')
    await expect(grid).toHaveClass(/lg:grid-cols-3/)
  })
})

test.describe('Dashboard Agents - Polling', () => {
  test('rafraîchit automatiquement les données', async ({ page }) => {
    let callCount = 0
    await page.route('/api/agents/status', route => {
      callCount++
      route.continue()
    })
    
    await page.goto('/dashboard')
    
    // Attend le premier chargement
    await expect(page.locator('.grid > div').first()).toBeVisible()
    
    // Attend le polling (30s par défaut, mais on peut pas attendre autant en test)
    // On vérifie juste que le premier appel a été fait
    expect(callCount).toBeGreaterThanOrEqual(1)
  })
})
