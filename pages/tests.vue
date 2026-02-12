<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">🧪 Tests</h1>
        <p class="text-sm text-gray-500 mt-1">Validation unitaire et end-to-end du système</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="lastRun" class="text-xs text-gray-400">
          Dernier run : {{ formatTime(lastRun) }}
        </span>
        <button
          @click="runAll"
          :disabled="running"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg v-if="running" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{{ running ? 'En cours...' : '▶ Lancer tous les tests' }}</span>
        </button>
      </div>
    </div>

    <!-- Summary bar -->
    <div v-if="summary" class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg border p-4 text-center">
        <div class="text-3xl font-bold text-gray-900">{{ summary.total }}</div>
        <div class="text-sm text-gray-500">Total</div>
      </div>
      <div class="bg-white rounded-lg border p-4 text-center" :class="summary.pass > 0 ? 'border-green-200 bg-green-50' : ''">
        <div class="text-3xl font-bold text-green-600">{{ summary.pass }}</div>
        <div class="text-sm text-gray-500">✅ Pass</div>
      </div>
      <div class="bg-white rounded-lg border p-4 text-center" :class="summary.fail > 0 ? 'border-red-200 bg-red-50' : ''">
        <div class="text-3xl font-bold" :class="summary.fail > 0 ? 'text-red-600' : 'text-gray-400'">{{ summary.fail }}</div>
        <div class="text-sm text-gray-500">❌ Fail</div>
      </div>
      <div class="bg-white rounded-lg border p-4 text-center">
        <div class="text-3xl font-bold text-gray-400">{{ summary.skip || 0 }}</div>
        <div class="text-sm text-gray-500">⏭ Skip</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div v-if="summary && summary.total > 0" class="mb-8">
      <div class="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        <div class="bg-green-500 transition-all duration-500" :style="{ width: `${(summary.pass / summary.total) * 100}%` }" />
        <div class="bg-red-500 transition-all duration-500" :style="{ width: `${(summary.fail / summary.total) * 100}%` }" />
        <div class="bg-gray-300 transition-all duration-500" :style="{ width: `${((summary.skip || 0) / summary.total) * 100}%` }" />
      </div>
    </div>

    <!-- Unit Test Suites -->
    <div v-if="suites.length" class="space-y-6 mb-10">
      <h2 class="text-lg font-semibold text-gray-900">📦 Tests unitaires</h2>
      <div v-for="suite in suites" :key="suite.id" class="bg-white rounded-lg border overflow-hidden">
        <button
          @click="toggleSuite(suite.id)"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">{{ suite.icon }}</span>
            <span class="font-medium text-gray-900">{{ suite.name }}</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="suiteBadgeClass(suite)">
              {{ suitePassCount(suite) }}/{{ suite.tests.length }}
            </span>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform" :class="{ 'rotate-180': openSuites.has(suite.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openSuites.has(suite.id)" class="border-t divide-y">
          <div
            v-for="test in suite.tests"
            :key="test.id"
            class="flex items-center justify-between px-5 py-3 text-sm"
            :class="test.status === 'fail' ? 'bg-red-50' : ''"
          >
            <div class="flex items-center gap-3">
              <span>{{ statusIcon(test.status) }}</span>
              <span class="text-gray-700">{{ test.name }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="test.message" class="text-xs text-red-500 max-w-xs truncate">{{ test.message }}</span>
              <span v-if="test.durationMs" class="text-xs text-gray-400">{{ test.durationMs }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- E2E Tests -->
    <div v-if="e2eResults.length" class="space-y-6">
      <h2 class="text-lg font-semibold text-gray-900">🌐 Tests end-to-end (endpoints)</h2>
      <div class="bg-white rounded-lg border overflow-hidden">
        <button
          @click="e2eOpen = !e2eOpen"
          class="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-xl">🌐</span>
            <span class="font-medium text-gray-900">API Endpoints</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="e2eBadgeClass">
              {{ e2ePass }}/{{ e2eResults.length }}
            </span>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform" :class="{ 'rotate-180': e2eOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="e2eOpen" class="border-t divide-y">
          <div
            v-for="r in e2eResults"
            :key="r.path"
            class="flex items-center justify-between px-5 py-3 text-sm"
            :class="r.status === 'fail' ? 'bg-red-50' : ''"
          >
            <div class="flex items-center gap-3">
              <span>{{ statusIcon(r.status) }}</span>
              <code class="text-gray-700 font-mono text-xs">{{ r.path }}</code>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="r.detail" class="text-xs text-green-600">{{ r.detail }}</span>
              <span v-if="r.message" class="text-xs text-red-500 max-w-xs truncate">{{ r.message }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded font-mono" :class="r.httpStatus < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                {{ r.httpStatus || '—' }}
              </span>
              <span v-if="r.durationMs" class="text-xs text-gray-400">{{ r.durationMs }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!running && !suites.length && !e2eResults.length" class="text-center py-20">
      <span class="text-6xl mb-4 block">🧪</span>
      <h2 class="text-xl font-medium text-gray-700 mb-2">Prêt à tester</h2>
      <p class="text-gray-500 mb-6">Lance les tests pour vérifier que tout est bien câblé</p>
      <button
        @click="runAll"
        class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        ▶ Lancer tous les tests
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

useHead({ title: 'Tests - OpenClaw' })

interface TestResult {
  id: string
  suite: string
  name: string
  status: 'pass' | 'fail' | 'skip'
  message?: string
  durationMs?: number
}

interface Suite {
  id: string
  name: string
  icon: string
  tests: TestResult[]
}

interface E2EResult {
  path: string
  status: 'pass' | 'fail'
  httpStatus?: number
  durationMs?: number
  detail?: string
  message?: string
}

const running = ref(false)
const lastRun = ref<string | null>(null)
const suites = ref<Suite[]>([])
const e2eResults = ref<E2EResult[]>([])
const openSuites = ref(new Set<string>())
const e2eOpen = ref(false)

const summary = computed(() => {
  const unitTests = suites.value.flatMap(s => s.tests)
  const allPass = unitTests.filter(t => t.status === 'pass').length + e2eResults.value.filter(r => r.status === 'pass').length
  const allFail = unitTests.filter(t => t.status === 'fail').length + e2eResults.value.filter(r => r.status === 'fail').length
  const allSkip = unitTests.filter(t => t.status === 'skip').length
  const total = unitTests.length + e2eResults.value.length
  if (total === 0) return null
  return { total, pass: allPass, fail: allFail, skip: allSkip }
})

const e2ePass = computed(() => e2eResults.value.filter(r => r.status === 'pass').length)

const e2eBadgeClass = computed(() => {
  if (!e2eResults.value.length) return 'bg-gray-100 text-gray-600'
  const allPass = e2eResults.value.every(r => r.status === 'pass')
  return allPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
})

async function runAll() {
  running.value = true
  suites.value = []
  e2eResults.value = []

  try {
    // Run unit tests
    const unitRes = await $fetch<{ suites: Suite[]; timestamp: string }>('/api/tests/suites')
    suites.value = unitRes.suites
    lastRun.value = unitRes.timestamp

    // Auto-open suites with failures
    for (const s of unitRes.suites) {
      if (s.tests.some(t => t.status === 'fail')) {
        openSuites.value.add(s.id)
      }
    }

    // Run e2e tests
    const e2eRes = await $fetch<{ results: E2EResult[] }>('/api/tests/endpoints')
    e2eResults.value = e2eRes.results

    // Auto-open e2e if failures
    if (e2eRes.results.some(r => r.status === 'fail')) {
      e2eOpen.value = true
    }
  } catch (e: any) {
    console.error('Test run failed:', e)
  } finally {
    running.value = false
  }
}

function toggleSuite(id: string) {
  if (openSuites.value.has(id)) {
    openSuites.value.delete(id)
  } else {
    openSuites.value.add(id)
  }
}

function suitePassCount(suite: Suite) {
  return suite.tests.filter(t => t.status === 'pass').length
}

function suiteBadgeClass(suite: Suite) {
  const allPass = suite.tests.every(t => t.status !== 'fail')
  return allPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
}

function statusIcon(status: string) {
  if (status === 'pass') return '✅'
  if (status === 'fail') return '❌'
  return '⏭'
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>
