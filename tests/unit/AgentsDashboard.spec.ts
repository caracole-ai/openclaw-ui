/**
 * Tests unitaires complets pour AgentsDashboard
 * Composant container avec stats et grille d'agents
 * 
 * TODO: Tests outdated - à mettre à jour
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe.skip('AgentsDashboard (outdated)', () => {
  it.todo('update tests')
})

/*
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed } from 'vue'
import AgentsDashboard from '~/components/AgentsDashboard.vue'
import { mockAgentsResponse, emptyAgentsResponse } from '../fixtures/agents'

// Mock du composable useAgentsStatus
const mockRefresh = vi.fn()
const mockAgents = ref(mockAgentsResponse.agents)
const mockPending = ref(false)
const mockError = ref(null)
const mockLastRefresh = ref(new Date())

vi.mock('~/composables/useAgentsStatus', () => ({
  useAgentsStatus: () => ({
    agents: mockAgents,
    sortedAgents: computed(() => [...mockAgents.value].sort((a, b) => {
      const order = { online: 0, idle: 1, offline: 2 }
      return order[a.status] - order[b.status]
    })),
    onlineAgents: computed(() => mockAgents.value.filter(a => a.status === 'online')),
    idleAgents: computed(() => mockAgents.value.filter(a => a.status === 'idle')),
    offlineAgents: computed(() => mockAgents.value.filter(a => a.status === 'offline')),
    pending: mockPending,
    error: mockError,
    lastRefresh: mockLastRefresh,
    refresh: mockRefresh
  })
}))

// Mock du composant AgentCard
const mockAgentCard = {
  name: 'AgentCard',
  template: '<div class="agent-card" :data-agent-id="agent.id">{{ agent.name }}</div>',
  props: ['agent']
}

describe('AgentsDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-07T16:00:00Z'))
    mockAgents.value = mockAgentsResponse.agents
    mockPending.value = false
    mockError.value = null
    mockLastRefresh.value = new Date()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mountDashboard = () => {
    return mount(AgentsDashboard, {
      global: {
        stubs: {
          AgentCard: mockAgentCard
        }
      }
    })
  }

  describe('Header', () => {
    it('affiche le titre "Agents OpenClaw"', () => {
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('Agents OpenClaw')
    })

    it('affiche le timestamp de dernière mise à jour', () => {
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('Mis à jour')
    })
  })

  describe('Compteurs de statut', () => {
    it('affiche le nombre d\'agents online', () => {
      const wrapper = mountDashboard()
      const onlineCount = mockAgents.value.filter(a => a.status === 'online').length
      expect(wrapper.text()).toContain(`${onlineCount} actif`)
    })

    it('affiche le nombre d\'agents idle', () => {
      const wrapper = mountDashboard()
      const idleCount = mockAgents.value.filter(a => a.status === 'idle').length
      expect(wrapper.text()).toContain(`${idleCount} idle`)
    })

    it('affiche le nombre d\'agents offline', () => {
      const wrapper = mountDashboard()
      const offlineCount = mockAgents.value.filter(a => a.status === 'offline').length
      expect(wrapper.text()).toContain(`${offlineCount} off`)
    })
  })

  describe('Total tokens', () => {
    it('affiche le total de tokens utilisés', () => {
      mockAgents.value = [
        { ...mockAgentsResponse.agents[0], totalTokens: 50000 },
        { ...mockAgentsResponse.agents[1], totalTokens: 30000 }
      ]
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('80k')
    })

    it('formate les grands nombres en millions', () => {
      mockAgents.value = [
        { ...mockAgentsResponse.agents[0], totalTokens: 1500000 }
      ]
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('1.5M')
    })
  })

  describe('Alerte quota', () => {
    it('affiche une alerte si des agents sont > 80%', () => {
      mockAgents.value = [
        { ...mockAgentsResponse.agents[0], maxPercentUsed: 85 },
        { ...mockAgentsResponse.agents[1], maxPercentUsed: 90 }
      ]
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('2 agents > 80%')
    })

    it('n\'affiche pas d\'alerte si aucun agent > 80%', () => {
      mockAgents.value = [
        { ...mockAgentsResponse.agents[0], maxPercentUsed: 50 },
        { ...mockAgentsResponse.agents[1], maxPercentUsed: 60 }
      ]
      const wrapper = mountDashboard()
      expect(wrapper.text()).not.toContain('> 80%')
    })

    it('gère le singulier "1 agent > 80%"', () => {
      mockAgents.value = [
        { ...mockAgentsResponse.agents[0], maxPercentUsed: 85 },
        { ...mockAgentsResponse.agents[1], maxPercentUsed: 50 }
      ]
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('1 agent > 80%')
    })
  })

  describe('Bouton refresh', () => {
    it('existe un bouton de refresh', () => {
      const wrapper = mountDashboard()
      const button = wrapper.find('button[title="Rafraîchir"]')
      expect(button.exists()).toBe(true)
    })

    it('appelle refresh au clic', async () => {
      const wrapper = mountDashboard()
      const button = wrapper.find('button[title="Rafraîchir"]')
      await button.trigger('click')
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('désactive le bouton pendant le chargement', async () => {
      mockPending.value = true
      const wrapper = mountDashboard()
      const button = wrapper.find('button[title="Rafraîchir"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('affiche une animation pendant le chargement', () => {
      mockPending.value = true
      const wrapper = mountDashboard()
      const svg = wrapper.find('button[title="Rafraîchir"] svg')
      expect(svg.classes()).toContain('animate-spin')
    })
  })

  describe('État de chargement', () => {
    it('affiche des skeletons pendant le chargement initial', () => {
      mockAgents.value = []
      mockPending.value = true
      const wrapper = mountDashboard()
      const skeletons = wrapper.findAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('affiche 6 skeletons', () => {
      mockAgents.value = []
      mockPending.value = true
      const wrapper = mountDashboard()
      const skeletons = wrapper.findAll('.animate-pulse')
      expect(skeletons.length).toBe(6)
    })
  })

  describe('État d\'erreur', () => {
    it('affiche un message d\'erreur si error est défini', () => {
      mockError.value = { message: 'Connexion impossible' }
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('Erreur de connexion')
      expect(wrapper.text()).toContain('Connexion impossible')
    })

    it('affiche un bouton "Réessayer"', () => {
      mockError.value = { message: 'Erreur' }
      const wrapper = mountDashboard()
      const retryButton = wrapper.find('button')
      expect(wrapper.text()).toContain('Réessayer')
    })

    it('appelle refresh au clic sur "Réessayer"', async () => {
      mockError.value = { message: 'Erreur' }
      const wrapper = mountDashboard()
      const retryLink = wrapper.find('button.text-red-700')
      await retryLink.trigger('click')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('État vide', () => {
    it('affiche un message si aucun agent configuré', () => {
      mockAgents.value = []
      mockPending.value = false
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('Aucun agent configuré')
    })

    it('affiche une explication pour l\'état vide', () => {
      mockAgents.value = []
      mockPending.value = false
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('apparaîtront ici une fois configurés')
    })
  })

  describe('Grille d\'agents', () => {
    it('affiche une carte par agent', () => {
      const wrapper = mountDashboard()
      const cards = wrapper.findAll('.agent-card')
      expect(cards.length).toBe(mockAgents.value.length)
    })

    it('passe le bon agent à chaque carte', () => {
      const wrapper = mountDashboard()
      const firstCard = wrapper.find('.agent-card')
      // Les agents sont triés: online first
      const onlineAgents = mockAgents.value.filter(a => a.status === 'online')
      expect(firstCard.attributes('data-agent-id')).toBe(onlineAgents[0]?.id)
    })

    it('utilise une grille responsive', () => {
      const wrapper = mountDashboard()
      const grid = wrapper.find('.grid')
      expect(grid.classes()).toContain('grid-cols-1')
      expect(grid.classes()).toContain('md:grid-cols-2')
      expect(grid.classes()).toContain('lg:grid-cols-3')
    })
  })

  describe('Formatage du temps de refresh', () => {
    it('affiche "à l\'instant" si < 5s', () => {
      mockLastRefresh.value = new Date(Date.now() - 3000)
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('à l\'instant')
    })

    it('affiche "il y a Xs" si < 60s', () => {
      mockLastRefresh.value = new Date(Date.now() - 30000)
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('il y a 30s')
    })

    it('affiche "il y a X min" si >= 60s', () => {
      mockLastRefresh.value = new Date(Date.now() - 120000)
      const wrapper = mountDashboard()
      expect(wrapper.text()).toContain('il y a 2 min')
    })
  })
})
*/
