<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Idees</h1>
        <p class="text-sm text-gray-500 mt-1">{{ ideas.length }} idee{{ ideas.length > 1 ? 's' : '' }} dans le vault</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Filters -->
        <select
          v-model="filterStatut"
          class="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="a-explorer">A explorer</option>
          <option value="en-revue">En revue</option>
          <option value="approuvee">Approuvee</option>
          <option value="rejetee">Rejetee</option>
          <option value="promue">Promue</option>
        </select>
        <select
          v-model="filterEnergie"
          class="text-sm border rounded-lg px-3 py-1.5 text-gray-700 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Toutes les energies</option>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="basse">Basse</option>
        </select>
        <button
          @click="syncVault"
          :disabled="syncing"
          class="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          {{ syncing ? 'Sync...' : 'Sync vault' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="bg-white rounded-lg shadow-sm border p-4 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div class="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredIdeas.length === 0" class="text-center py-16">
      <div class="text-4xl mb-4">{{ filterStatut || filterEnergie ? '\U0001F50D' : '\U0001F4A1' }}</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ filterStatut || filterEnergie ? 'Aucune idee ne correspond aux filtres' : 'Aucune idee dans le vault' }}
      </h3>
      <p class="text-gray-500 text-sm">
        {{ filterStatut || filterEnergie ? 'Essayez de modifier les filtres' : 'Les idees apparaitront ici quand elles seront capturees via ideas-bot ou Obsidian' }}
      </p>
      <button
        v-if="filterStatut || filterEnergie"
        @click="filterStatut = ''; filterEnergie = ''"
        class="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >Reinitialiser les filtres</button>
    </div>

    <!-- Ideas grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <IdeaCard
        v-for="idea in filteredIdeas"
        :key="idea.id"
        :idea="idea"
        @select="openReview"
      />
    </div>

    <!-- Review modal -->
    <IdeaReviewModal
      v-if="selectedIdea"
      :idea="selectedIdea"
      :visible="!!selectedIdea"
      @close="selectedIdea = null"
      @updated="onIdeaUpdated"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Idea } from '~/types/idea'
import { useIdeas } from '~/composables/useIdeas'

useHead({ title: 'OpenClaw - Idees' })

const { ideas, fetchIdeas, loading } = useIdeas()
const selectedIdea = ref<Idea | null>(null)
const filterStatut = ref('')
const filterEnergie = ref('')
const syncing = ref(false)

const filteredIdeas = computed(() => {
  let result = ideas.value
  if (filterStatut.value) {
    result = result.filter(i => i.statut === filterStatut.value)
  }
  if (filterEnergie.value) {
    result = result.filter(i => i.energie === filterEnergie.value)
  }
  return result
})

function openReview(idea: Idea) {
  selectedIdea.value = idea
}

async function onIdeaUpdated() {
  await fetchIdeas()
  // Refresh the selected idea if still open
  if (selectedIdea.value) {
    selectedIdea.value = ideas.value.find(i => i.id === selectedIdea.value!.id) || null
  }
}

async function syncVault() {
  syncing.value = true
  try {
    await $fetch('/api/vault/sync', { method: 'POST' })
    await fetchIdeas()
  } catch (err) {
    console.error('Vault sync failed:', err)
  } finally {
    syncing.value = false
  }
}
</script>
