<template>
  <div class="inline-flex flex-col items-start gap-1.5">
    <button
      type="button"
      :disabled="state !== 'idle'"
      class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
      :class="buttonClasses"
      @click="verify"
    >
      <!-- Spinner (loading) -->
      <svg
        v-if="state === 'loading'"
        class="w-3.5 h-3.5 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>

      <!-- Checkmark (success) -->
      <svg
        v-else-if="state === 'success'"
        class="w-3.5 h-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>

      <!-- X mark (failed) -->
      <svg
        v-else-if="state === 'failed'"
        class="w-3.5 h-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>

      <!-- Shield icon (idle) -->
      <svg
        v-else
        class="w-3.5 h-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.351-.166-2A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
      </svg>

      <span>{{ buttonLabel }}</span>
    </button>

    <!-- Verification checks detail -->
    <div
      v-if="lastResult && (state === 'success' || state === 'failed')"
      class="flex flex-wrap gap-1"
    >
      <span
        v-for="check in checkItems"
        :key="check.key"
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        :class="check.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
        :title="check.label"
      >
        <svg
          v-if="check.passed"
          class="w-2.5 h-2.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <svg
          v-else
          class="w-2.5 h-2.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        {{ check.shortLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SkillVerification } from '~/types/skill'

const props = defineProps<{
  agentId: string
  skillId: string
}>()

const emit = defineEmits<{
  (e: 'verified', result: SkillVerification): void
}>()

type ButtonState = 'idle' | 'loading' | 'success' | 'failed'

const state = ref<ButtonState>('idle')
const lastResult = ref<SkillVerification | null>(null)
let resetTimer: ReturnType<typeof setTimeout> | null = null

const buttonLabel = computed(() => {
  switch (state.value) {
    case 'loading': return 'Verification...'
    case 'success': return 'Verifie'
    case 'failed': return 'Echec'
    default: return 'Verifier'
  }
})

const buttonClasses = computed(() => {
  switch (state.value) {
    case 'loading':
      return 'bg-blue-50 text-blue-700 opacity-50 cursor-not-allowed focus:ring-blue-300'
    case 'success':
      return 'bg-green-50 text-green-700 cursor-default focus:ring-green-300'
    case 'failed':
      return 'bg-red-50 text-red-700 cursor-default focus:ring-red-300'
    default:
      return 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-300'
  }
})

const checkItems = computed(() => {
  if (!lastResult.value) return []
  const checks = lastResult.value.checks
  return [
    { key: 'inAssignments', passed: checks.inAssignments, label: 'Present dans les assignments', shortLabel: 'Assign.' },
    { key: 'symlinkExists', passed: checks.symlinkExists, label: 'Symlink existant', shortLabel: 'Symlink' },
    { key: 'frontmatterInjected', passed: checks.frontmatterInjected, label: 'Frontmatter injecte', shortLabel: 'Front.' },
    { key: 'dependenciesMet', passed: checks.dependenciesMet, label: 'Dependances satisfaites', shortLabel: 'Deps' },
  ]
})

async function verify() {
  if (state.value !== 'idle') return

  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }

  state.value = 'loading'

  try {
    const result = await $fetch<SkillVerification>(
      `/api/skills/verify/${props.agentId}/${props.skillId}`
    )

    lastResult.value = result
    state.value = result.verified ? 'success' : 'failed'
    emit('verified', result)
  } catch {
    state.value = 'failed'
    lastResult.value = null
  }

  resetTimer = setTimeout(() => {
    state.value = 'idle'
  }, 3000)
}
</script>
