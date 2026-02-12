/**
 * Tests unitaires pour AgentCard
 * 
 * Note: Tests à réécrire - structure du composant modifiée
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentCard from '~/components/AgentCard.vue'

const mockAgent = {
  id: 'test-agent',
  name: 'Test Agent',
  status: 'online',
  team: 'code',
  totalTokens: 50000,
  maxPercentUsed: 45,
  model: 'claude-sonnet',
  sessions: []
}

describe('AgentCard', () => {
  it('rend sans erreur', () => {
    const wrapper = mount(AgentCard, {
      props: { agent: mockAgent },
      global: { 
        stubs: { 
          NuxtLink: { template: '<a><slot /></a>' },
          AgentStatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] }
        } 
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('affiche le nom de l\'agent', () => {
    const wrapper = mount(AgentCard, {
      props: { agent: mockAgent },
      global: { 
        stubs: { 
          NuxtLink: { template: '<a><slot /></a>' },
          AgentStatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] }
        } 
      }
    })
    expect(wrapper.text()).toContain('Test Agent')
  })

  it('affiche l\'ID de l\'agent', () => {
    const wrapper = mount(AgentCard, {
      props: { agent: mockAgent },
      global: { 
        stubs: { 
          NuxtLink: { template: '<a><slot /></a>' },
          AgentStatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] }
        } 
      }
    })
    // ID is in the link href, not displayed as text. Check the role instead.
    expect(wrapper.text()).toContain('code')
    expect(wrapper.html()).toContain('test-agent')
  })
})
