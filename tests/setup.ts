/**
 * Setup global pour les tests Vitest
 */

import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock de useNuxtApp
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $config: {
      public: {}
    }
  })
}))

// Mock de useFetch pour Nuxt
vi.mock('#imports', () => ({
  useFetch: vi.fn(),
  useAsyncData: vi.fn(),
  ref: vi.fn((val) => ({ value: val })),
  computed: vi.fn((fn) => ({ value: fn() })),
  onMounted: vi.fn(),
  onUnmounted: vi.fn()
}))

// Configuration globale de test-utils
config.global.stubs = {
  NuxtLink: true,
  ClientOnly: true
}

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
