/**
 * Tests unitaires - ProjectCard.vue
 * Features testées : state badges, progress bar, team display
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectCard from '~/components/ProjectCard.vue'
import type { Project, ProjectState } from '~/types/project'

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
  state: 'build',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  team: [{ agent: 'agent-1', role: null }],
  agents: ['agent-1'],
  assignees: ['agent-1'],
  phases: [],
  progress: 50,
  updates: [],
  ...overrides
})

describe('ProjectCard', () => {
  describe('State Badge', () => {
    const stateCases: { state: ProjectState; label: string }[] = [
      { state: 'backlog', label: 'Backlog' },
      { state: 'planning', label: 'Planning' },
      { state: 'build', label: 'Build' },
      { state: 'review', label: 'Review' },
      { state: 'delivery', label: 'Delivery' },
      { state: 'rex', label: 'REX' },
      { state: 'done', label: 'Done' },
    ]

    stateCases.forEach(({ state, label }) => {
      it(`affiche le badge ${state} avec le label "${label}"`, () => {
        const project = createProject({ state })
        
        const wrapper = mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
        
        expect(wrapper.text()).toContain(label)
      })
    })
  })

  describe('Progress Bar (phases-based)', () => {
    it('calcule la progression à partir des phases complétées', () => {
      const project = createProject({
        phases: [
          { name: 'Phase 1', status: 'completed' },
          { name: 'Phase 2', status: 'in-progress' },
          { name: 'Phase 3', status: 'pending' },
        ]
      })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // 1/3 completed = 33%
      expect(wrapper.text()).toContain('33%')
    })

    it('utilise le progress DB si pas de phases', () => {
      const project = createProject({ phases: [], progress: 75 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('75%')
    })

    it('calcule le progress par index de state si pas de phases ni progress', () => {
      const project = createProject({ state: 'review', phases: [], progress: 0 })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      // review = index 3 / 6 = 50%
      expect(wrapper.text()).toContain('50%')
    })
  })

  describe('Border par state', () => {
    const borderCases: { state: ProjectState; borderClass: string }[] = [
      { state: 'backlog', borderClass: 'border-l-gray-400' },
      { state: 'planning', borderClass: 'border-l-blue-500' },
      { state: 'build', borderClass: 'border-l-amber-500' },
      { state: 'review', borderClass: 'border-l-violet-500' },
      { state: 'delivery', borderClass: 'border-l-emerald-500' },
      { state: 'rex', borderClass: 'border-l-pink-500' },
      { state: 'done', borderClass: 'border-l-green-600' },
    ]

    borderCases.forEach(({ state, borderClass }) => {
      it(`bordure ${borderClass} pour state ${state}`, () => {
        const project = createProject({ state })
        
        const wrapper = mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
        
        const link = wrapper.find('a')
        expect(link.classes()).toContain(borderClass)
      })
    })
  })

  describe('Team display', () => {
    it('affiche le nombre d\'agents', () => {
      const project = createProject({ agents: ['agent-1', 'agent-2', 'agent-3'] })
      
      const wrapper = mount(ProjectCard, {
        props: { project },
        global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
      })
      
      expect(wrapper.text()).toContain('3 agents')
    })
  })

  describe('Robustesse champs undefined', () => {
    it('ne crash pas si agents est undefined', () => {
      const project = createProject()
      // @ts-ignore
      project.agents = undefined
      
      expect(() => {
        mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
      }).not.toThrow()
    })

    it('ne crash pas si phases est undefined', () => {
      const project = createProject()
      // @ts-ignore
      project.phases = undefined
      
      expect(() => {
        mount(ProjectCard, {
          props: { project },
          global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } }
        })
      }).not.toThrow()
    })
  })
})
