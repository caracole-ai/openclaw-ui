<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{{ skillName || 'Skill' }}</h2>
              <p v-if="skillPath" class="text-sm text-gray-500 mt-1">{{ skillPath }}</p>
            </div>
            <button
              @click="close"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Loading State -->
            <div v-if="loading" class="space-y-4 animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
              <div class="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ error }}</span>
              </div>
            </div>

            <!-- Markdown Content -->
            <div
              v-else-if="htmlContent"
              class="prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100"
              v-html="htmlContent"
            ></div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              @click="close"
              class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  skillId: string | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const htmlContent = ref<string | null>(null)
const skillName = ref<string | null>(null)
const skillPath = ref<string | null>(null)

// Watch for changes in skillId and isOpen
watch(() => [props.skillId, props.isOpen], async ([id, open]) => {
  if (!open || !id) {
    // Reset state when closed
    htmlContent.value = null
    skillName.value = null
    skillPath.value = null
    error.value = null
    return
  }

  // Fetch skill content
  loading.value = true
  error.value = null
  htmlContent.value = null

  try {
    const response = await $fetch(`/api/skills/${id}/content`)
    
    skillName.value = response.name
    skillPath.value = response.path

    // Parse markdown to HTML
    htmlContent.value = await marked.parse(response.content, {
      gfm: true,
      breaks: true,
    })
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load skill content'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function close() {
  emit('close')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
