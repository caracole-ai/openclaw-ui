<template>
  <div>
    <Breadcrumb />
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">🧪 Tests</h1>
        <p class="text-gray-500 mt-1">{{ testFiles.length }} fichiers de test</p>
      </div>
      
      <!-- Bouton Lancer Unit + Integration (sans E2E) -->
      <button
        @click="runAllTests"
        :disabled="running"
        class="px-6 py-3 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
        :class="running 
          ? 'bg-gray-300 text-gray-500 cursor-wait' 
          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'"
      >
        <span v-if="running">
          <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </span>
        <span v-else>▶️</span>
        Lancer Unit + Integration
      </button>
    </div>

    <!-- Progress bar for "all" tests (unit + integration, no e2e) -->
    <div 
      v-if="runningType === 'all'"
      class="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
    >
      <div class="flex items-center gap-3 mb-3">
        <div class="w-8 h-8 border-3 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
        <div>
          <div class="font-semibold text-green-800">Exécution Unit + Integration...</div>
          <div class="text-sm text-green-600">{{ runningMessage }}</div>
        </div>
      </div>
      <div class="relative h-3 bg-green-200 rounded-full overflow-hidden mb-3">
        <div 
          class="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-300"
          :style="{ width: `${runProgress}%` }"
        ></div>
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <span 
          v-for="(file, i) in fastTests.slice(0, 10)" 
          :key="file.path"
          class="px-2 py-1 text-xs rounded-full transition-all duration-300"
          :class="i < currentTestIndex ? 'bg-green-100 text-green-700' : i === currentTestIndex ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-gray-100 text-gray-500'"
        >
          {{ i < currentTestIndex ? '✓' : i === currentTestIndex ? '⏳' : '○' }} {{ file.name }}
        </span>
        <span v-if="fastTests.length > 10" class="px-2 py-1 text-xs text-gray-400">
          +{{ fastTests.length - 10 }} autres
        </span>
      </div>
    </div>

    <!-- Results summary -->
    <div v-if="lastResult && !running" class="mb-6 p-4 rounded-xl" :class="resultClass">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ lastResult.success ? '✅' : '❌' }}</span>
          <div>
            <div class="font-semibold">
              {{ lastResult.success ? 'Tous les tests passent !' : 'Certains tests ont échoué' }}
            </div>
            <div class="text-sm opacity-80">
              {{ lastResult.passed }} passés, {{ lastResult.failed }} échoués
              <span v-if="lastResult.duration"> · {{ lastResult.duration }}</span>
            </div>
          </div>
        </div>
        <button 
          @click="showOutput = !showOutput"
          class="text-sm underline opacity-70 hover:opacity-100"
        >
          {{ showOutput ? 'Masquer' : 'Voir' }} la sortie
        </button>
      </div>
      
      <!-- Output -->
      <pre 
        v-if="showOutput && lastResult.output" 
        class="mt-4 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-96"
      >{{ lastResult.output }}</pre>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
    </div>

    <!-- Test Accordions -->
    <div v-else class="space-y-4">
      
      <!-- Unit Tests Accordion -->
      <div class="bg-white border rounded-xl overflow-hidden shadow-sm">
        <!-- Accordion Header -->
        <div 
          class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          @click="toggleAccordion('unit')"
        >
          <div class="flex items-center gap-3">
            <span 
              class="transition-transform duration-200"
              :class="{ 'rotate-90': openAccordions.unit }"
            >▶</span>
            <span class="text-lg">📦</span>
            <span class="font-semibold text-gray-800">Tests Unitaires</span>
            <span class="px-2 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">
              {{ unitTests.length }} fichiers
            </span>
            <span 
              v-if="testResults.unit?.success" 
              class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"
            >
              ✅ {{ testResults.unit.passed }} tests
            </span>
            <span 
              v-else-if="testResults.unit?.success === false" 
              class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium"
            >
              ❌ {{ testResults.unit.failed }}/{{ testResults.unit.passed + testResults.unit.failed }} failed
            </span>
          </div>
          <button
            @click.stop="runTestsByType('unit')"
            :disabled="running"
            class="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            :class="running 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow'"
          >
            <span v-if="runningType === 'unit'" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>▶️</span>
            Lancer
          </button>
        </div>
        
        <!-- Progress bar inline (when running unit tests) -->
        <div 
          v-if="runningType === 'unit'"
          class="border-t p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="w-6 h-6 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
            <span class="text-sm text-blue-700">{{ runningMessage }}</span>
          </div>
          <div class="relative h-2 bg-blue-200 rounded-full overflow-hidden mb-3">
            <div 
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              :style="{ width: `${runProgress}%` }"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="(file, i) in unitTests" 
              :key="file.path"
              class="px-2 py-1 text-xs rounded-full transition-all duration-300"
              :class="i < currentTestIndex ? 'bg-green-100 text-green-700' : i === currentTestIndex ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-gray-100 text-gray-500'"
            >
              {{ i < currentTestIndex ? '✓' : i === currentTestIndex ? '⏳' : '○' }} {{ file.name }}
            </span>
          </div>
        </div>
        
        <!-- Accordion Content -->
        <div 
          v-show="openAccordions.unit && runningType !== 'unit'"
          class="border-t bg-gray-50 divide-y"
        >
          <div 
            v-for="file in unitTests" 
            :key="file.path"
            class="relative overflow-hidden transition-colors"
            :class="runningFile === file.path ? 'bg-blue-50' : 'hover:bg-white'"
          >
            <!-- Progress bar animée pour fichier en cours -->
            <div 
              v-if="runningFile === file.path"
              class="absolute inset-0 pointer-events-none"
            >
              <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-100 to-blue-200 transition-all duration-300"
                   :style="{ width: `${fileProgress}%` }"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            </div>
            
            <div class="relative flex items-center justify-between p-3 px-6">
              <div class="flex items-center gap-3">
                <span v-if="runningFile === file.path" class="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin"></span>
                <span v-else-if="fileResults[file.path]?.success" class="text-green-500">✅</span>
                <span v-else-if="fileResults[file.path]?.success === false" class="text-red-500">❌</span>
                <span v-else class="text-gray-300">○</span>
                <div>
                  <div class="font-medium" :class="runningFile === file.path ? 'text-blue-900' : 'text-gray-900'">{{ file.name }}</div>
                  <div class="text-xs" :class="runningFile === file.path ? 'text-blue-600' : 'text-gray-400'">
                    {{ runningFile === file.path ? 'Exécution en cours...' : `${file.testCount} tests` }}
                  </div>
                </div>
              </div>
              <button
                @click="runSingleTest(file.path)"
                :disabled="running"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50"
                :class="runningFile === file.path 
                  ? 'bg-blue-200 text-blue-700' 
                  : 'bg-white border hover:bg-gray-50'"
              >
                <span v-if="runningFile === file.path" class="flex items-center gap-1">
                  <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </span>
                <span v-else>▶️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Integration Tests Accordion -->
      <div class="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div 
          class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          @click="toggleAccordion('integration')"
        >
          <div class="flex items-center gap-3">
            <span 
              class="transition-transform duration-200"
              :class="{ 'rotate-90': openAccordions.integration }"
            >▶</span>
            <span class="text-lg">🔗</span>
            <span class="font-semibold text-gray-800">Tests d'Intégration</span>
            <span class="px-2 py-0.5 text-sm bg-gray-100 text-gray-600 rounded-full">
              {{ integrationTests.length }} fichiers
            </span>
            <span 
              v-if="testResults.integration?.success" 
              class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"
            >
              ✅ {{ testResults.integration.passed }} tests
            </span>
            <span 
              v-else-if="testResults.integration?.success === false" 
              class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium"
            >
              ❌ {{ testResults.integration.failed }}/{{ testResults.integration.passed + testResults.integration.failed }} failed
            </span>
          </div>
          <button
            @click.stop="runTestsByType('integration')"
            :disabled="running"
            class="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            :class="running 
              ? 'bg-gray-100 text-gray-400' 
              : 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm hover:shadow'"
          >
            <span v-if="runningType === 'integration'" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>▶️</span>
            Lancer
          </button>
        </div>
        
        <!-- Progress bar inline (when running integration tests) -->
        <div 
          v-if="runningType === 'integration'"
          class="border-t p-4 bg-gradient-to-r from-purple-50 to-indigo-50"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="w-6 h-6 border-2 border-purple-400 border-t-purple-600 rounded-full animate-spin"></div>
            <span class="text-sm text-purple-700">{{ runningMessage }}</span>
          </div>
          <div class="relative h-2 bg-purple-200 rounded-full overflow-hidden mb-3">
            <div 
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
              :style="{ width: `${runProgress}%` }"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="(file, i) in integrationTests" 
              :key="file.path"
              class="px-2 py-1 text-xs rounded-full transition-all duration-300"
              :class="i < currentTestIndex ? 'bg-green-100 text-green-700' : i === currentTestIndex ? 'bg-purple-100 text-purple-700 animate-pulse' : 'bg-gray-100 text-gray-500'"
            >
              {{ i < currentTestIndex ? '✓' : i === currentTestIndex ? '⏳' : '○' }} {{ file.name }}
            </span>
          </div>
        </div>
        
        <div 
          v-show="openAccordions.integration && runningType !== 'integration'"
          class="border-t bg-gray-50 divide-y"
        >
          <div 
            v-for="file in integrationTests" 
            :key="file.path"
            class="relative overflow-hidden transition-colors"
            :class="runningFile === file.path ? 'bg-purple-50' : 'hover:bg-white'"
          >
            <!-- Progress bar animée pour fichier en cours -->
            <div 
              v-if="runningFile === file.path"
              class="absolute inset-0 pointer-events-none"
            >
              <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-100 to-purple-200 transition-all duration-300"
                   :style="{ width: `${fileProgress}%` }"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            </div>
            
            <div class="relative flex items-center justify-between p-3 px-6">
              <div class="flex items-center gap-3">
                <span v-if="runningFile === file.path" class="w-4 h-4 border-2 border-purple-400 border-t-purple-600 rounded-full animate-spin"></span>
                <span v-else-if="fileResults[file.path]?.success" class="text-green-500">✅</span>
                <span v-else-if="fileResults[file.path]?.success === false" class="text-red-500">❌</span>
                <span v-else class="text-gray-300">○</span>
                <div>
                  <div class="font-medium" :class="runningFile === file.path ? 'text-purple-900' : 'text-gray-900'">{{ file.name }}</div>
                  <div class="text-xs" :class="runningFile === file.path ? 'text-purple-600' : 'text-gray-400'">
                    {{ runningFile === file.path ? 'Exécution en cours...' : `${file.testCount} tests` }}
                  </div>
                </div>
              </div>
              <button
                @click="runSingleTest(file.path)"
                :disabled="running"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50"
                :class="runningFile === file.path 
                  ? 'bg-purple-200 text-purple-700' 
                  : 'bg-white border hover:bg-gray-50'"
              >
                <span v-if="runningFile === file.path" class="flex items-center gap-1">
                  <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </span>
                <span v-else>▶️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- E2E Tests Accordion (grayed out - slow tests warning) -->
      <div v-if="e2eTests.length > 0" class="bg-gray-100 border border-gray-300 rounded-xl overflow-hidden shadow-sm opacity-75">
        <div 
          class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-200 transition-colors"
          @click="toggleAccordion('e2e')"
        >
          <div class="flex items-center gap-3">
            <span 
              class="transition-transform duration-200 text-gray-400"
              :class="{ 'rotate-90': openAccordions.e2e }"
            >▶</span>
            <span class="text-lg">🌐</span>
            <span class="font-semibold text-gray-500">Tests End-to-End</span>
            <span class="text-amber-500">⚠️</span>
            <span class="text-gray-400">🕐</span>
            <span class="px-2 py-0.5 text-sm bg-gray-200 text-gray-500 rounded-full">
              {{ e2eTests.length }} fichiers
            </span>
            <span class="text-xs text-gray-400 italic">~5 min</span>
            <span 
              v-if="testResults.e2e?.success" 
              class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"
            >
              ✅ {{ testResults.e2e.passed }} tests
            </span>
            <span 
              v-else-if="testResults.e2e?.success === false" 
              class="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full font-medium"
            >
              ❌ {{ testResults.e2e.failed }}/{{ testResults.e2e.passed + testResults.e2e.failed }} failed
            </span>
          </div>
          <button
            @click.stop="runTestsByType('e2e')"
            :disabled="running"
            class="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            :class="running 
              ? 'bg-gray-200 text-gray-400' 
              : 'bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow'"
          >
            <span v-if="runningType === 'e2e'" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>⚠️</span>
            Lancer (lent)
          </button>
        </div>
        
        <!-- Progress bar inline (when running e2e tests) -->
        <div 
          v-if="runningType === 'e2e'"
          class="border-t p-4 bg-gradient-to-r from-orange-50 to-amber-50"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="w-6 h-6 border-2 border-orange-400 border-t-orange-600 rounded-full animate-spin"></div>
            <span class="text-sm text-orange-700">{{ runningMessage }}</span>
          </div>
          <div class="relative h-2 bg-orange-200 rounded-full overflow-hidden mb-3">
            <div 
              class="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
              :style="{ width: `${runProgress}%` }"
            ></div>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="(file, i) in e2eTests" 
              :key="file.path"
              class="px-2 py-1 text-xs rounded-full transition-all duration-300"
              :class="i < currentTestIndex ? 'bg-green-100 text-green-700' : i === currentTestIndex ? 'bg-orange-100 text-orange-700 animate-pulse' : 'bg-gray-100 text-gray-500'"
            >
              {{ i < currentTestIndex ? '✓' : i === currentTestIndex ? '⏳' : '○' }} {{ file.name }}
            </span>
          </div>
        </div>
        
        <div 
          v-show="openAccordions.e2e && runningType !== 'e2e'"
          class="border-t bg-gray-50 divide-y"
        >
          <div 
            v-for="file in e2eTests" 
            :key="file.path"
            class="relative overflow-hidden transition-colors"
            :class="runningFile === file.path ? 'bg-orange-50' : 'hover:bg-white'"
          >
            <!-- Progress bar animée pour fichier en cours -->
            <div 
              v-if="runningFile === file.path"
              class="absolute inset-0 pointer-events-none"
            >
              <div class="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-100 to-orange-200 transition-all duration-300"
                   :style="{ width: `${fileProgress}%` }"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
            </div>
            
            <div class="relative flex items-center justify-between p-3 px-6">
              <div class="flex items-center gap-3">
                <span v-if="runningFile === file.path" class="w-4 h-4 border-2 border-orange-400 border-t-orange-600 rounded-full animate-spin"></span>
                <span v-else-if="fileResults[file.path]?.success" class="text-green-500">✅</span>
                <span v-else-if="fileResults[file.path]?.success === false" class="text-red-500">❌</span>
                <span v-else class="text-gray-300">○</span>
                <div>
                  <div class="font-medium" :class="runningFile === file.path ? 'text-orange-900' : 'text-gray-900'">{{ file.name }}</div>
                  <div class="text-xs" :class="runningFile === file.path ? 'text-orange-600' : 'text-gray-400'">
                    {{ runningFile === file.path ? 'Exécution en cours...' : `${file.testCount} tests` }}
                  </div>
                </div>
              </div>
              <button
                @click="runSingleTest(file.path)"
                :disabled="running"
                class="px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50"
                :class="runningFile === file.path 
                  ? 'bg-orange-200 text-orange-700' 
                  : 'bg-white border hover:bg-gray-50'"
              >
                <span v-if="runningFile === file.path" class="flex items-center gap-1">
                  <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </span>
                <span v-else>▶️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="testFiles.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
        <div class="text-4xl mb-2">🧪</div>
        <p class="text-gray-500">Aucun fichier de test trouvé</p>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface TestFile {
  name: string
  path: string
  type: 'unit' | 'integration' | 'e2e'
  testCount: number
}

interface TestResult {
  success: boolean
  passed: number
  failed: number
  duration?: string
  output?: string
}

const testFiles = ref<TestFile[]>([])
const loading = ref(true)
const running = ref(false)
const lastResult = ref<TestResult | null>(null)
const showOutput = ref(false)
const runProgress = ref(0)
const currentTestIndex = ref(0)
const runningMessage = ref('Initialisation...')
const runningType = ref<'unit' | 'integration' | 'e2e' | 'all' | null>(null)
const runningFile = ref<string | null>(null)
const fileProgress = ref(0)

// Accordion state
const openAccordions = ref<Record<string, boolean>>({
  unit: true,
  integration: false,
  e2e: false
})

// Results by type and by file
const testResults = ref<Record<string, TestResult>>({})
const fileResults = ref<Record<string, { success: boolean }>>({})

let progressInterval: ReturnType<typeof setInterval> | null = null

function toggleAccordion(type: 'unit' | 'integration' | 'e2e') {
  openAccordions.value[type] = !openAccordions.value[type]
}

const unitTests = computed(() => testFiles.value.filter(f => f.type === 'unit'))
const integrationTests = computed(() => testFiles.value.filter(f => f.type === 'integration'))
const e2eTests = computed(() => testFiles.value.filter(f => f.type === 'e2e'))
// Fast tests = unit + integration (no e2e)
const fastTests = computed(() => testFiles.value.filter(f => f.type !== 'e2e'))

const resultClass = computed(() => {
  if (!lastResult.value) return ''
  return lastResult.value.success 
    ? 'bg-green-50 border border-green-200 text-green-800'
    : 'bg-red-50 border border-red-200 text-red-800'
})

async function fetchTests() {
  loading.value = true
  try {
    const response = await fetch('/api/tests')
    const data = await response.json()
    testFiles.value = data.files
  } catch (error) {
    console.error('Failed to fetch tests:', error)
  } finally {
    loading.value = false
  }
}

async function runTests(type?: 'unit' | 'integration' | 'e2e' | 'all') {
  running.value = true
  runningType.value = type || 'all'
  showOutput.value = false
  runProgress.value = 0
  currentTestIndex.value = 0
  
  const typeLabels = {
    unit: 'Tests unitaires',
    integration: 'Tests d\'intégration', 
    e2e: 'Tests end-to-end',
    all: 'Tous les tests'
  }
  runningMessage.value = `Démarrage ${typeLabels[type || 'all']}...`
  
  // Filter files for progress animation (all = unit + integration, no e2e)
  const relevantFiles = type && type !== 'all' 
    ? testFiles.value.filter(f => f.type === type)
    : fastTests.value
  const totalFiles = relevantFiles.length
  
  progressInterval = setInterval(() => {
    if (runProgress.value < 90) {
      runProgress.value += Math.random() * 8
      currentTestIndex.value = Math.min(
        Math.floor((runProgress.value / 100) * totalFiles),
        totalFiles - 1
      )
      const messages = type === 'e2e' 
        ? ['Lancement du navigateur...', 'Navigation...', 'Capture d\'écran...', 'Assertions...']
        : ['Compilation...', 'Exécution...', 'Vérification...', 'Finalisation...']
      runningMessage.value = messages[Math.floor(currentTestIndex.value / 2) % messages.length]
    }
  }, 200)
  
  try {
    const response = await fetch('/api/tests/run', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type || 'all' })
    })
    const result = await response.json()
    lastResult.value = result
    
    // Save result by type - ONLY update the type that was run
    if (type && type !== 'all') {
      testResults.value[type] = result
      // Mark all files of this type as passed/failed
      relevantFiles.forEach(f => {
        fileResults.value[f.path] = { success: result.success }
      })
    } else {
      // For "all", update unit + integration (not e2e - too slow)
      testResults.value.unit = result
      testResults.value.integration = result
      // Mark unit + integration files
      fastTests.value.forEach(f => {
        fileResults.value[f.path] = { success: result.success }
      })
    }
    
    runProgress.value = 100
    currentTestIndex.value = totalFiles
  } catch (error) {
    console.error('Failed to run tests:', error)
    lastResult.value = { success: false, passed: 0, failed: 1, output: String(error) }
  } finally {
    runningType.value = null
    if (progressInterval) clearInterval(progressInterval)
    running.value = false
  }
}

function runAllTests() {
  runTests('all')
}

function runTestsByType(type: 'unit' | 'integration' | 'e2e') {
  runTests(type)
}

async function runSingleTest(path: string) {
  running.value = true
  runningFile.value = path
  fileProgress.value = 0
  showOutput.value = false
  
  // Animation de progression pour le fichier
  const fileProgressInterval = setInterval(() => {
    if (fileProgress.value < 90) {
      fileProgress.value += Math.random() * 15
    }
  }, 150)
  
  try {
    const response = await fetch('/api/tests/run', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    })
    const result = await response.json()
    lastResult.value = result
    
    // Marquer le fichier comme passé/échoué
    fileResults.value[path] = { success: result.success }
    fileProgress.value = 100
    
    // Petit délai pour voir la barre à 100%
    await new Promise(r => setTimeout(r, 300))
  } catch (error) {
    console.error('Failed to run test:', error)
    lastResult.value = { success: false, passed: 0, failed: 1, output: String(error) }
    fileResults.value[path] = { success: false }
  } finally {
    clearInterval(fileProgressInterval)
    runningFile.value = null
    fileProgress.value = 0
    running.value = false
  }
}

onMounted(fetchTests)

useHead({
  title: 'Tests - OpenClaw'
})
</script>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
</style>
