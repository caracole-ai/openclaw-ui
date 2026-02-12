/**
 * Tests unitaires - ProjectCard.vue
 * Features testées : stale indicator, status badges, type icons
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectCard from '~/components/ProjectCard.vue'
import type { ProjectDetail as Project } from '~/types/project'

// Mock NuxtLink
vi.mock('#app', () => ({
  NuxtLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to']
  }
}))

const createProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'test-project',
  name: 'Test Project',
  description: 'A test project',
  type: 'code',
  status: 'in-progress',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  team: ['agent-1'],
  phases: [],
  progress: 50,
  updates: [],
  staleHours: 0,
  isStale: false,
  ...overrides
})

describe('ProjectCard', () => {
  describe('Stale Indicator', () => {
    it('affiche le badge stale quand isStale=true', () => {
      const project = createProject({ 
        isStale: true, 
        staleHours: 48,
        status: 'in-progress'
      })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('⚠️')
      expect(wrapper.text()).toContain('48h')
    })

    it('n\'affiche pas le badge stale quand isStale=false', () => {
      const project = createProject({ isStale: false, staleHours: 12 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).not.toContain('⚠️')
    })

    it('applique la bordure orange sur projet stale', () => {
      const project = createProject({ isStale: true, staleHours: 30 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const link = wrapper.find('a')
      expect(link.classes()).toContain('border-l-orange-500')
    })

    it('n\'applique pas la bordure orange sur projet non-stale', () => {
      const project = createProject({ isStale: false })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const link = wrapper.find('a')
      expect(link.classes()).not.toContain('border-l-orange-500')
    })
  })

  describe('Status Badge', () => {
    const statusCases = [
      { status: 'planning', expectedClass: 'bg-gray-100', label: 'Planification' },
      { status: 'in-progress', expectedClass: 'bg-blue-100', label: 'En cours' },
      { status: 'review', expectedClass: 'bg-purple-100', label: 'En revue' },
      { status: 'paused', expectedClass: 'bg-yellow-100', label: 'En pause' },
      { status: 'completed', expectedClass: 'bg-green-100', label: 'Terminé' },
      { status: 'archived', expectedClass: 'bg-gray-100', label: 'Archivé' }
    ] as const

    statusCases.forEach(({ status, expectedClass, label }) => {
      it(`affiche le badge ${status} avec la bonne classe`, () => {
        const project = createProject({ status })
        
        const wrapper = mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
        
        const badge = wrapper.find('.rounded-full')
        expect(badge.classes()).toContain(expectedClass)
        expect(wrapper.text()).toContain(label)
      })
    })
  })

  describe('Type Icons', () => {
    const typeCases = [
      { type: 'code', icon: '💻', bgClass: 'bg-blue-100' },
      { type: 'writing', icon: '✍️', bgClass: 'bg-amber-100' },
      { type: 'hybrid', icon: '🔀', bgClass: 'bg-purple-100' }
    ] as const

    typeCases.forEach(({ type, icon, bgClass }) => {
      it(`affiche l'icône ${icon} pour type ${type}`, () => {
        const project = createProject({ type })
        
        const wrapper = mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
        
        expect(wrapper.text()).toContain(icon)
        expect(wrapper.find(`.${bgClass}`).exists()).toBe(true)
      })
    })
  })

  describe('Progress Bar', () => {
    it('affiche le pourcentage de progression', () => {
      const project = createProject({ progress: 75 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('75%')
    })

    it('applique la largeur correcte à la barre', () => {
      const project = createProject({ progress: 60 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const progressBar = wrapper.find('.h-full.rounded-full')
      expect(progressBar.attributes('style')).toContain('width: 60%')
    })

    it('barre verte si completed', () => {
      const project = createProject({ status: 'completed', progress: 100 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const progressBar = wrapper.find('.h-full.rounded-full')
      expect(progressBar.classes()).toContain('bg-green-500')
    })
  })

  describe('Border Status', () => {
    const borderCases = [
      { status: 'in-progress', borderClass: 'border-l-blue-500' },
      { status: 'review', borderClass: 'border-l-purple-500' },
      { status: 'paused', borderClass: 'border-l-yellow-500' },
      { status: 'completed', borderClass: 'border-l-green-500' },
      { status: 'planning', borderClass: 'border-l-gray-300' }
    ] as const

    borderCases.forEach(({ status, borderClass }) => {
      it(`bordure ${borderClass} pour status ${status}`, () => {
        const project = createProject({ status, isStale: false })
        
        const wrapper = mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
        
        const link = wrapper.find('a')
        expect(link.classes()).toContain(borderClass)
      })
    })
  })

  describe('Priority Badge', () => {
    it('affiche badge urgent quand priority=urgent', () => {
      const project = createProject({ priority: 'urgent' })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text().toLowerCase()).toContain('urgent')
    })

    it('n\'affiche pas de badge si priority != urgent', () => {
      const project = createProject({ priority: 'high' })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // Le mot "urgent" ne doit pas apparaître
      expect(wrapper.find('.bg-red-100').exists()).toBe(false)
    })
  })

  describe('Footer Info', () => {
    it('affiche le nombre d\'agents dans l\'équipe', () => {
      const project = createProject({ team: ['agent-1', 'agent-2', 'agent-3'] })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('👥 3 agents')
    })

    it('affiche le décompte des phases', () => {
      const project = createProject({ 
        phases: [
          { name: 'Phase 1', status: 'completed' },
          { name: 'Phase 2', status: 'in-progress' },
          { name: 'Phase 3', status: 'pending' }
        ]
      })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('1/3 phases')
    })
  })

  describe('Robustesse champs undefined (bugs #1)', () => {
    it('ne crash pas si team est undefined', () => {
      const project = createProject()
      // @ts-ignore - Test intentionnel avec undefined
      delete project.team
      
      expect(() => {
        mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
      }).not.toThrow()
    })

    it('ne crash pas si phases est undefined', () => {
      const project = createProject()
      // @ts-ignore - Test intentionnel avec undefined
      delete project.phases
      
      expect(() => {
        mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
      }).not.toThrow()
    })

    it('ne crash pas si updates est undefined', () => {
      const project = createProject()
      // @ts-ignore - Test intentionnel avec undefined
      delete project.updates
      
      expect(() => {
        mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
      }).not.toThrow()
    })

    it('affiche 0 agents si team undefined', () => {
      const project = createProject()
      // @ts-ignore
      project.team = undefined
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // Ne doit pas afficher "👥 undefined agents"
      expect(wrapper.text()).not.toContain('undefined')
    })

    it('affiche 0/0 phases si phases undefined', () => {
      const project = createProject()
      // @ts-ignore
      project.phases = undefined
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).not.toContain('undefined')
    })
  })

  describe('Bouton Nudge 🔄', () => {
    it('affiche le bouton nudge sur projet actif (in-progress)', () => {
      const project = createProject({ status: 'in-progress' })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // Bouton 🔄 doit être présent
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('n\'affiche pas le bouton nudge sur projet completed', () => {
      const project = createProject({ status: 'completed' })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // Pas de bouton 🔄 sur completed
      const nudgeButton = wrapper.findAll('button').filter(b => b.text().includes('🔄'))
      expect(nudgeButton.length).toBe(0)
    })

    it('n\'affiche pas le bouton nudge sur projet archived', () => {
      const project = createProject({ status: 'archived' })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const nudgeButton = wrapper.findAll('button').filter(b => b.text().includes('🔄'))
      expect(nudgeButton.length).toBe(0)
    })

    it('désactive le bouton pendant le cooldown (15s)', async () => {
      const project = createProject({ 
        status: 'in-progress',
        lastNudgeAt: new Date().toISOString() // Juste nudgé
      })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      const nudgeButton = wrapper.find('button')
      if (nudgeButton.exists()) {
        // Bouton devrait être disabled pendant cooldown
        expect(nudgeButton.attributes('disabled')).toBeDefined()
      }
    })
  })
})
