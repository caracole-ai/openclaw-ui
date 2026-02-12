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

// Re-export format utils as globals (Nuxt auto-imports them)
import {
  formatTokens, formatCost, formatDate, formatDateFull, formatDateShort,
  formatFileSize, formatModel, formatAge, formatAgeSince, formatSessionKey
} from '../utils/format'

// @ts-ignore - inject as globals for component tests
globalThis.formatTokens = formatTokens
// @ts-ignore
globalThis.formatCost = formatCost
// @ts-ignore
globalThis.formatDate = formatDate
// @ts-ignore
globalThis.formatDateFull = formatDateFull
// @ts-ignore
globalThis.formatDateShort = formatDateShort
// @ts-ignore
globalThis.formatFileSize = formatFileSize
// @ts-ignore
globalThis.formatModel = formatModel
// @ts-ignore
globalThis.formatAge = formatAge
// @ts-ignore
globalThis.formatAgeSince = formatAgeSince
// @ts-ignore
globalThis.formatSessionKey = formatSessionKey

// Mock de useFetch pour Nuxt + auto-imported utils
vi.mock('#imports', () => ({
  useFetch: vi.fn(),
  useAsyncData: vi.fn(),
  ref: vi.fn((val) => ({ value: val })),
  computed: vi.fn((fn) => ({ value: fn() })),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
  // Format utils (auto-imported by Nuxt in runtime)
  formatTokens,
  formatCost,
  formatDate,
  formatDateFull,
  formatDateShort,
  formatFileSize,
  formatModel,
  formatAge,
  formatAgeSince,
  formatSessionKey,
}))

// Configuration globale de test-utils
config.global.stubs = {
  NuxtLink: true,
  ClientOnly: true
}

// Provide auto-imported utils to Vue component instances
config.global.mocks = {
  formatTokens,
  formatCost,
  formatDate,
  formatDateFull,
  formatDateShort,
  formatFileSize,
  formatModel,
  formatAge,
  formatAgeSince,
  formatSessionKey,
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
