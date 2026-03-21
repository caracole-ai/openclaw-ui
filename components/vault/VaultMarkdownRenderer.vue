<template>
  <div
    ref="container"
    class="vault-markdown prose prose-sm max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-blue-600"
    v-html="html"
    @click="handleClick"
  ></div>
</template>

<script setup lang="ts">
defineProps<{
  html: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const container = ref<HTMLElement | null>(null)

function handleClick(event: MouseEvent) {
  // Event delegation for wikilinks
  const target = event.target as HTMLElement
  const wikiEl = target.closest('[data-wiki]') as HTMLElement | null
  if (wikiEl) {
    event.preventDefault()
    const path = wikiEl.getAttribute('data-wiki')
    if (path) {
      emit('navigate', path)
    }
  }
}
</script>

<style scoped>
/* Wikilinks */
.vault-markdown :deep(.vault-wikilink) {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  transition: background 150ms ease;
}
.vault-markdown :deep(.vault-wikilink:hover) {
  background: rgba(79, 70, 229, 0.12);
}
.vault-markdown :deep(.vault-wikilink-unresolved) {
  color: #9ca3af;
  text-decoration: line-through;
}

/* Callouts */
.vault-markdown :deep(.vault-callout) {
  border-left: 4px solid #6366f1;
  background: #f8fafc;
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  margin: 16px 0;
}
.vault-markdown :deep(.vault-callout-title) {
  font-weight: 600;
  margin-bottom: 4px;
}
.vault-markdown :deep(.vault-callout-info) {
  border-left-color: #3b82f6;
  background: #eff6ff;
}
.vault-markdown :deep(.vault-callout-warning) {
  border-left-color: #f59e0b;
  background: #fffbeb;
}
.vault-markdown :deep(.vault-callout-tip) {
  border-left-color: #10b981;
  background: #ecfdf5;
}
.vault-markdown :deep(.vault-callout-danger) {
  border-left-color: #ef4444;
  background: #fef2f2;
}
.vault-markdown :deep(.vault-callout-note) {
  border-left-color: #6366f1;
  background: #eef2ff;
}
.vault-markdown :deep(.vault-callout-success) {
  border-left-color: #10b981;
  background: #ecfdf5;
}
.vault-markdown :deep(.vault-callout-question) {
  border-left-color: #8b5cf6;
  background: #f5f3ff;
}
.vault-markdown :deep(.vault-callout-example) {
  border-left-color: #6366f1;
  background: #eef2ff;
}

/* Tasks */
.vault-markdown :deep(.vault-task) {
  list-style: none;
}
.vault-markdown :deep(.vault-task input[type="checkbox"]) {
  margin-right: 6px;
  accent-color: #6366f1;
}
.vault-markdown :deep(.vault-task-done) {
  color: #9ca3af;
  text-decoration: line-through;
}

/* Code blocks — light theme */
.vault-markdown :deep(pre) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
}
.vault-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 0.8125rem;
  color: #334155;
}
/* Inline code */
.vault-markdown :deep(:not(pre) > code) {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8125rem;
  font-weight: 500;
}
/* Tables */
.vault-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.vault-markdown :deep(th) {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #334155;
}
.vault-markdown :deep(td) {
  border-bottom: 1px solid #f1f5f9;
  padding: 8px 12px;
  color: #475569;
}
.vault-markdown :deep(tr:hover td) {
  background: #f8fafc;
}
/* Blockquotes */
.vault-markdown :deep(blockquote) {
  border-left: 3px solid #c7d2fe;
  background: #eef2ff;
  padding: 10px 16px;
  border-radius: 0 6px 6px 0;
  color: #4338ca;
}
.vault-markdown :deep(blockquote p) {
  margin: 0;
}

/* Dataview placeholder */
.vault-markdown :deep(.vault-dataview-placeholder) {
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 16px 0;
  background: #f9fafb;
}
.vault-markdown :deep(.vault-dataview-title) {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 8px;
}
.vault-markdown :deep(.vault-dataview-code) {
  font-size: 0.75rem;
  background: #f3f4f6 !important;
  color: #374151 !important;
  padding: 8px !important;
  border-radius: 4px;
}
.vault-markdown :deep(.vault-dataview-note) {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 8px;
  margin-bottom: 0;
}
</style>
