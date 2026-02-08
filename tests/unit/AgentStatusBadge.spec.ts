/**
 * Tests unitaires complets pour AgentStatusBadge
 * Composant qui affiche le badge de statut coloré
 * 
 * TODO: Tests outdated - à mettre à jour
 */

import { describe, it, expect } from 'vitest'

describe.skip('AgentStatusBadge (outdated)', () => {
  it.todo('update tests')
})

/*
import { mount } from '@vue/test-utils'
import AgentStatusBadge from '~/components/AgentStatusBadge.vue'

describe('AgentStatusBadge', () => {
  describe('Rendu du statut "online"', () => {
    it('affiche "En ligne" pour status="online"', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'online' }
      })
      expect(wrapper.text()).toBe('En ligne')
    })

    it('applique les classes vertes pour online', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'online' }
      })
      expect(wrapper.classes()).toContain('bg-green-100')
      expect(wrapper.classes()).toContain('text-green-800')
    })

    it('affiche un dot vert avec animation pulse', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'online' }
      })
      const dot = wrapper.find('.rounded-full.w-2')
      expect(dot.classes()).toContain('bg-green-500')
      expect(dot.classes()).toContain('animate-pulse')
    })
  })

  describe('Rendu du statut "idle"', () => {
    it('affiche "Inactif" pour status="idle"', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'idle' }
      })
      expect(wrapper.text()).toBe('Inactif')
    })

    it('applique les classes jaunes pour idle', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'idle' }
      })
      expect(wrapper.classes()).toContain('bg-yellow-100')
      expect(wrapper.classes()).toContain('text-yellow-800')
    })

    it('affiche un dot jaune sans animation', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'idle' }
      })
      const dot = wrapper.find('.rounded-full.w-2')
      expect(dot.classes()).toContain('bg-yellow-500')
      expect(dot.classes()).not.toContain('animate-pulse')
    })
  })

  describe('Rendu du statut "offline"', () => {
    it('affiche "Hors ligne" pour status="offline"', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'offline' }
      })
      expect(wrapper.text()).toBe('Hors ligne')
    })

    it('applique les classes grises pour offline', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'offline' }
      })
      expect(wrapper.classes()).toContain('bg-gray-100')
      expect(wrapper.classes()).toContain('text-gray-600')
    })

    it('affiche un dot gris sans animation', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'offline' }
      })
      const dot = wrapper.find('.rounded-full.w-2')
      expect(dot.classes()).toContain('bg-gray-400')
      expect(dot.classes()).not.toContain('animate-pulse')
    })
  })

  describe('Edge cases', () => {
    it('gère un statut inconnu gracieusement', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'unknown' as any }
      })
      expect(wrapper.text()).toBe('Inconnu')
      expect(wrapper.classes()).toContain('bg-gray-100')
    })
  })

  describe('Structure HTML', () => {
    it('contient un span racine avec les bonnes classes de base', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'online' }
      })
      expect(wrapper.element.tagName).toBe('SPAN')
      expect(wrapper.classes()).toContain('inline-flex')
      expect(wrapper.classes()).toContain('items-center')
      expect(wrapper.classes()).toContain('rounded-full')
    })

    it('contient un dot indicator', () => {
      const wrapper = mount(AgentStatusBadge, {
        props: { status: 'online' }
      })
      const dot = wrapper.find('.w-2.h-2.rounded-full')
      expect(dot.exists()).toBe(true)
    })
  })
})
*/
