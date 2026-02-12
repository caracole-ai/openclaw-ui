<template>
  <div class="bg-white rounded-xl shadow-sm border">
    <!-- Header bar -->
    <div class="flex items-center justify-between px-5 py-4 border-b">
      <div class="min-w-0">
        <h3 class="font-semibold text-gray-900 truncate">{{ filename }}</h3>
        <p v-if="modifiedDate" class="text-xs text-gray-400 mt-0.5">
          Modifie le {{ formatDate(modifiedDate) }}
        </p>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0 ml-4">
        <!-- Toggle Preview / Edit -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          @click="previewMode = !previewMode"
        >
          <!-- Eye icon for preview -->
          <svg
            v-if="!previewMode"
            class="w-4 h-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fill-rule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clip-rule="evenodd"
            />
          </svg>
          <!-- Pencil icon for edit -->
          <svg
            v-else
            class="w-4 h-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          {{ previewMode ? 'Editer' : 'Preview' }}
        </button>

        <!-- Reset button -->
        <button
          v-if="isDirty"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          @click="resetContent"
        >
          <svg
            class="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clip-rule="evenodd"
            />
          </svg>
          Reinitialiser
        </button>

        <!-- Save button -->
        <button
          v-if="isDirty"
          type="button"
          :disabled="saving"
          class="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          :class="saving
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'"
          @click="saveContent"
        >
          <!-- Spinner -->
          <svg
            v-if="saving"
            class="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <!-- Save icon -->
          <svg
            v-else
            class="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
          Enregistrer
        </button>
      </div>
    </div>

    <!-- Content area -->
    <div class="relative">
      <!-- Loading skeleton -->
      <div v-if="loading" class="p-4 min-h-[400px]">
        <div class="animate-pulse space-y-3">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-full"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          <div class="h-4 bg-gray-200 rounded w-2/3"></div>
          <div class="h-4 bg-gray-200 rounded w-full"></div>
          <div class="h-4 bg-gray-200 rounded w-4/5"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="h-4 bg-gray-200 rounded w-full"></div>
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="fetchError"
        class="p-4 min-h-[400px] flex items-center justify-center"
      >
        <div class="text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <p class="text-sm font-medium text-red-800">Erreur de chargement</p>
          <p class="text-xs text-red-600 mt-1">{{ fetchError }}</p>
          <button
            type="button"
            class="mt-3 text-sm text-blue-600 hover:underline focus:outline-none"
            @click="fetchContent"
          >
            Reessayer
          </button>
        </div>
      </div>

      <!-- Edit mode -->
      <textarea
        v-else-if="!previewMode"
        ref="textareaRef"
        v-model="content"
        class="w-full min-h-[400px] p-4 font-mono text-sm text-gray-900 border-0 resize-y focus:outline-none focus:ring-0"
        :class="{ 'border-2 border-red-300': saveError }"
        :placeholder="`Contenu de ${filename}...`"
        spellcheck="false"
        @keydown.meta.s.prevent="saveContent"
        @keydown.ctrl.s.prevent="saveContent"
      ></textarea>

      <!-- Preview mode -->
      <div
        v-else
        class="p-6 min-h-[400px] prose-container overflow-y-auto"
        v-html="renderedMarkdown"
      ></div>
    </div>

    <!-- Status bar -->
    <div class="flex items-center justify-between px-5 py-2 border-t bg-gray-50 rounded-b-xl">
      <div class="flex items-center gap-4 text-xs text-gray-400">
        <span>{{ charCount }} caracteres</span>
        <span>{{ lineCount }} lignes</span>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="saveError"
          class="text-xs text-red-500 font-medium"
        >
          {{ saveError }}
        </span>
        <span
          v-if="isDirty"
          class="text-xs text-orange-500 font-medium"
        >
          Modifications non enregistrees
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
  agentId: string
  filename: string
}>()

const emit = defineEmits<{
  (e: 'saved', payload: { content: string; modified: string }): void
}>()

const { success: toastSuccess, error: toastError } = useToast()

// State
const content = ref('')
const originalContent = ref('')
const modifiedDate = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const fetchError = ref<string | null>(null)
const saveError = ref<string | null>(null)
const previewMode = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Computed
const isDirty = computed(() => content.value !== originalContent.value)

const charCount = computed(() => content.value.length)

const lineCount = computed(() => {
  if (!content.value) return 0
  return content.value.split('\n').length
})

// Markdown renderer (no external library, regex-based with XSS protection)
const renderedMarkdown = computed(() => renderMarkdown(content.value))

// Fetch content on mount and when props change
onMounted(() => {
  fetchContent()
})

watch(
  () => [props.agentId, props.filename],
  () => {
    fetchContent()
  }
)

async function fetchContent() {
  loading.value = true
  fetchError.value = null
  saveError.value = null

  try {
    const data = await $fetch<{ content: string; modified: string }>(
      `/api/agents/${props.agentId}/files/${props.filename}`
    )
    content.value = data.content
    originalContent.value = data.content
    modifiedDate.value = data.modified
  } catch (err: any) {
    const message = err?.data?.message || err?.statusMessage || err?.message || 'Erreur inconnue'
    fetchError.value = message
  } finally {
    loading.value = false
  }
}

function resetContent() {
  content.value = originalContent.value
  saveError.value = null
  previewMode.value = false
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

async function saveContent() {
  if (!isDirty.value || saving.value) return

  saving.value = true
  saveError.value = null

  try {
    const data = await $fetch<{ success: boolean; modified: string }>(
      `/api/agents/${props.agentId}/files/${props.filename}`,
      {
        method: 'PUT',
        body: { content: content.value }
      }
    )

    originalContent.value = content.value
    modifiedDate.value = data.modified
    emit('saved', { content: content.value, modified: data.modified })
    toastSuccess(`${props.filename} enregistre`)
  } catch (err: any) {
    const message = err?.data?.message || err?.statusMessage || err?.message || 'Erreur sauvegarde'
    saveError.value = message
    toastError(`Echec sauvegarde ${props.filename}`)
  } finally {
    saving.value = false
  }
}

// Date formatting
// formatDate → use formatDateFull from utils/format.ts (auto-imported)
const formatDate = formatDateFull

// ---- Markdown rendering ----
// Sanitize text to prevent XSS by escaping HTML entities
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderMarkdown(raw: string): string {
  if (!raw) return '<p class="text-gray-400 italic">Aucun contenu</p>'

  const escaped = escapeHtml(raw)
  const lines = escaped.split('\n')
  const htmlParts: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let codeBlockLang = ''
  let inList = false
  let listType: 'ul' | 'ol' = 'ul'
  let inBlockquote = false
  let blockquoteLines: string[] = []

  function closeList() {
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      const bqContent = blockquoteLines.join(' ')
      htmlParts.push(
        `<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3">${renderInline(bqContent)}</blockquote>`
      )
      inBlockquote = false
      blockquoteLines = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Fenced code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        closeList()
        closeBlockquote()
        inCodeBlock = true
        codeBlockLang = line.slice(3).trim()
        codeBlockContent = []
      } else {
        htmlParts.push(
          `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-3 font-mono text-sm"><code>${codeBlockContent.join('\n')}</code></pre>`
        )
        inCodeBlock = false
        codeBlockContent = []
        codeBlockLang = ''
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // Blockquotes
    if (line.startsWith('&gt; ') || line === '&gt;') {
      closeList()
      if (!inBlockquote) {
        inBlockquote = true
        blockquoteLines = []
      }
      blockquoteLines.push(line.replace(/^&gt;\s?/, ''))
      continue
    } else if (inBlockquote) {
      closeBlockquote()
    }

    // Empty line
    if (line.trim() === '') {
      closeList()
      closeBlockquote()
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      closeList()
      const level = headingMatch[1].length
      const text = renderInline(headingMatch[2])
      const classes: Record<number, string> = {
        1: 'text-2xl font-bold mb-4',
        2: 'text-xl font-semibold mb-3',
        3: 'text-lg font-medium mb-2',
        4: 'text-base font-medium mb-2',
        5: 'text-sm font-medium mb-1',
        6: 'text-sm font-medium mb-1 text-gray-600'
      }
      htmlParts.push(`<h${level} class="${classes[level] || ''}">${text}</h${level}>`)
      continue
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      closeList()
      htmlParts.push('<hr class="border-gray-200 my-4" />')
      continue
    }

    // Unordered list items
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        inList = true
        listType = 'ul'
        htmlParts.push('<ul class="list-disc pl-6 mb-3 space-y-1">')
      }
      htmlParts.push(`<li class="text-gray-700">${renderInline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list items
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        inList = true
        listType = 'ol'
        htmlParts.push('<ol class="list-decimal pl-6 mb-3 space-y-1">')
      }
      htmlParts.push(`<li class="text-gray-700">${renderInline(olMatch[1])}</li>`)
      continue
    }

    // Regular paragraph
    closeList()
    htmlParts.push(`<p class="mb-3 text-gray-700">${renderInline(line)}</p>`)
  }

  // Close any open blocks
  if (inCodeBlock) {
    htmlParts.push(
      `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-3 font-mono text-sm"><code>${codeBlockContent.join('\n')}</code></pre>`
    )
  }
  closeList()
  closeBlockquote()

  return htmlParts.join('\n')
}

// Render inline markdown elements: bold, italic, code, links
function renderInline(text: string): string {
  let result = text

  // Inline code (must come before bold/italic to avoid conflicts with backticks)
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')

  // Images (before links to avoid conflict)
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />'
  )

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // Bold + italic (***text***)
  result = result.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong class="font-bold"><em class="italic">$1</em></strong>')

  // Bold (**text**)
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')

  // Italic (*text*)
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')

  // Strikethrough (~~text~~)
  result = result.replace(/~~([^~]+)~~/g, '<del class="line-through text-gray-400">$1</del>')

  return result
}
</script>
