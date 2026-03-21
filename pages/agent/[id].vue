<template>
  <div>
    <!-- Breadcrumb -->
    <Breadcrumb />

    <!-- Loading -->
    <div v-if="pending" class="max-w-7xl mx-auto px-4 py-8">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>

    <!-- Erreur -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 py-8">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 class="text-lg font-medium text-red-800">Agent non trouvé</h2>
        <p class="text-red-600 mt-2">{{ error.message }}</p>
        <NuxtLink to="/" class="inline-block mt-4 text-red-700 underline">
          Retour au dashboard
        </NuxtLink>
      </div>
    </div>

    <!-- Contenu -->
    <main v-else-if="agent" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header agent -->
      <div class="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/60 mb-6">
        <!-- Background gradient -->
        <div class="absolute inset-0 bg-gradient-to-br" :class="headerGradient"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_70%)]"></div>
        
        <div class="relative p-6 sm:p-8">
          <!-- Navigation flèches + status -->
          <div class="flex items-center justify-between mb-6">
            <NuxtLink
              v-if="prevAgent"
              :to="`/agent/${prevAgent.id}`"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all text-white/90 hover:text-white group"
            >
              <span class="text-lg group-hover:-translate-x-0.5 transition-transform">←</span>
              <span class="text-sm font-medium hidden sm:inline">{{ prevAgent.name }}</span>
            </NuxtLink>
            <div v-else class="w-24"></div>

            <AgentStatusBadge :status="agent.status" />

            <NuxtLink
              v-if="nextAgent"
              :to="`/agent/${nextAgent.id}`"
              class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all text-white/90 hover:text-white group"
            >
              <span class="text-sm font-medium hidden sm:inline">{{ nextAgent.name }}</span>
              <span class="text-lg group-hover:translate-x-0.5 transition-transform">→</span>
            </NuxtLink>
            <div v-else class="w-24"></div>
          </div>

          <!-- Bento: identity + stats -->
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            <!-- Identity -->
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <div 
                class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg ring-3 ring-white/30 shrink-0"
                :class="avatarClassHeader"
              >
                {{ agent.emoji || agent.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-2xl font-extrabold text-white tracking-tight">{{ agent.name }}</h1>
                  <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/20 text-white backdrop-blur-sm">
                    {{ agentTeam.icon }} {{ agentTeam.label }}
                  </span>
                  <span v-if="agent.role" class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/10 text-white/70">
                    {{ agent.role }}
                  </span>
                </div>
                <p class="text-white/50 font-mono text-xs mt-0.5">{{ agent.id }}</p>
                <p v-if="lastActivityText" class="text-white/40 text-[11px]">{{ lastActivityText }}</p>
              </div>
            </div>

            <!-- Stats bento grid compact -->
            <div class="grid grid-cols-4 sm:grid-cols-2 gap-2 shrink-0">
              <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 min-w-[80px]">
                <div class="text-[10px] text-white/50 font-medium uppercase tracking-wider leading-none">Sessions</div>
                <div class="text-lg font-bold text-white leading-tight mt-0.5">{{ liveStats.activeSessions }}</div>
              </div>
              <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 min-w-[80px]">
                <div class="text-[10px] text-white/50 font-medium uppercase tracking-wider leading-none">Tokens</div>
                <div class="text-lg font-bold text-white leading-tight mt-0.5">{{ formatTokens(liveStats.totalTokens) }}</div>
              </div>
              <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 min-w-[80px]">
                <div class="text-[10px] text-white/50 font-medium uppercase tracking-wider leading-none">Contexte</div>
                <div class="text-lg font-bold leading-tight mt-0.5" :class="percentClassHeader">{{ liveStats.maxPercentUsed }}%</div>
              </div>
              <div class="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 min-w-[80px] relative">
                <div class="text-[10px] text-white/50 font-medium uppercase tracking-wider leading-none">Modèle</div>
                <select
                  :value="agent.model"
                  @change="updateModel(($event.target as HTMLSelectElement).value)"
                  class="text-sm font-bold text-white leading-tight mt-0.5 bg-transparent border-none outline-none cursor-pointer appearance-none w-full pr-4"
                  style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27white%27%3e%3cpath d=%27M7 10l5 5 5-5z%27/%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0 center; background-size: 16px;"
                >
                  <option v-for="m in availableModels" :key="m.value" :value="m.value" class="text-gray-900">
                    {{ m.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="border-b">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-4 text-sm font-medium border-b-2 transition-colors"
              :class="activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Projets -->
          <div v-if="activeTab === 'projects'">
            <div v-if="agentProjects.length" class="space-y-3">
              <NuxtLink 
                v-for="project in agentProjects" 
                :key="project.id"
                :to="`/project/${project.id}`"
                class="block border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">
                      {{ project.type === 'writing' ? '✍️' : project.type === 'code' ? '💻' : '📁' }}
                    </span>
                    <div>
                      <div class="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {{ project.name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ getAgentRole(project) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span 
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="{
                        'bg-gray-100 text-gray-700': project.state === 'backlog',
                        'bg-blue-100 text-blue-700': project.state === 'planning',
                        'bg-amber-100 text-amber-700': project.state === 'build',
                        'bg-purple-100 text-purple-700': project.state === 'review',
                        'bg-emerald-100 text-emerald-700': project.state === 'delivery',
                        'bg-pink-100 text-pink-700': project.state === 'rex',
                        'bg-green-100 text-green-700': project.state === 'done'
                      }"
                    >
                      {{ project.state || project.status }}
                    </span>
                    <span class="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">→</span>
                  </div>
                </div>
                <!-- Progress bar -->
                <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-blue-500 rounded-full transition-all"
                    :style="{ width: `${project.progress || 0}%` }"
                  ></div>
                </div>
              </NuxtLink>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              <span class="text-4xl mb-2 block">📭</span>
              Aucun projet assigné à cet agent
            </div>
          </div>

          <!-- Tab: Skills -->
          <div v-if="activeTab === 'skills'" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Assigned Skills -->
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <span class="text-xl">✨</span>
                    Skills assignés
                  </h3>
                  <span class="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {{ agent.skills?.length || 0 }}
                  </span>
                </div>
                <div
                  @drop="handleSkillDrop($event, 'assigned')"
                  @dragover.prevent
                  @dragenter.prevent="dragOverZone = 'assigned'"
                  @dragleave="dragOverZone = null"
                  class="min-h-[300px] space-y-2 transition-all rounded-lg p-3"
                  :class="dragOverZone === 'assigned' ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white/50'"
                >
                  <div
                    v-for="skillId in agent.skills"
                    :key="'assigned-' + skillId"
                    draggable="true"
                    @dragstart="handleSkillDragStart($event, skillId, 'assigned')"
                    @dragend="handleSkillDragEnd"
                    class="flex items-center justify-between p-3 bg-white rounded-lg border-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] transition-all group"
                    :class="draggingSkill === skillId ? 'opacity-50 scale-95' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">📦</span>
                      <div>
                        <div class="font-semibold text-gray-900">{{ getSkillName(skillId) }}</div>
                        <div class="text-xs text-gray-500">{{ getSkillDescription(skillId) }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Drag →</span>
                      <button
                        @click.stop="removeSkill(skillId)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Retirer"
                      >✕</button>
                    </div>
                  </div>
                  <div v-if="!agent.skills || agent.skills.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span class="text-4xl mb-2">📭</span>
                    <span class="text-sm">Aucun skill assigné</span>
                    <span class="text-xs">← Glissez des skills ici</span>
                  </div>
                </div>
              </div>
              <!-- Available Skills -->
              <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-300 p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span class="text-xl">📚</span>
                    Skills disponibles
                  </h3>
                  <span class="px-2 py-1 text-xs font-bold bg-gray-600 text-white rounded-full">
                    {{ availableSkills.length }}
                  </span>
                </div>
                <div
                  @drop="handleSkillDrop($event, 'available')"
                  @dragover.prevent
                  @dragenter.prevent="dragOverZone = 'available'"
                  @dragleave="dragOverZone = null"
                  class="min-h-[300px] space-y-2 transition-all rounded-lg p-3 overflow-y-auto max-h-[500px]"
                  :class="dragOverZone === 'available' ? 'bg-gray-100 ring-2 ring-gray-400' : 'bg-white/50'"
                >
                  <div
                    v-for="skill in availableSkills"
                    :key="'available-' + skill.id"
                    draggable="true"
                    @dragstart="handleSkillDragStart($event, skill.id, 'available')"
                    @dragend="handleSkillDragEnd"
                    class="flex items-center justify-between p-3 bg-white rounded-lg border-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] transition-all group"
                    :class="draggingSkill === skill.id ? 'opacity-50 scale-95' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">📦</span>
                      <div>
                        <div class="font-semibold text-gray-900">{{ skill.name || skill.id }}</div>
                        <div v-if="skill.description" class="text-xs text-gray-500 line-clamp-1">{{ skill.description }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">← Drag</span>
                      <button
                        @click.stop="addSkill(skill.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Ajouter"
                      >+</button>
                    </div>
                  </div>
                  <div v-if="availableSkills.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span class="text-4xl mb-2">✅</span>
                    <span class="text-sm">Tous les skills sont assignés</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 border rounded-lg p-4">
              <div class="flex items-start gap-3 text-sm text-gray-600">
                <span class="text-xl">💡</span>
                <div>
                  <strong class="text-gray-900">Glissez-déposez</strong> les skills entre les deux colonnes pour les assigner ou les retirer.
                  Vous pouvez aussi utiliser les boutons <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-xs">+</span> et <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-xs">✕</span>.
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: MCPs -->
          <div v-if="activeTab === 'mcps'" class="space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Assigned MCPs -->
              <div class="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl border-2 border-purple-200 p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <span class="text-xl">🔌</span>
                    MCPs assignés
                  </h3>
                  <span class="px-2 py-1 text-xs font-bold bg-purple-600 text-white rounded-full">
                    {{ agent.mcps?.length || 0 }}
                  </span>
                </div>
                <div
                  @drop="handleMcpDrop($event, 'assigned')"
                  @dragover.prevent
                  @dragenter.prevent="mcpDragOverZone = 'assigned'"
                  @dragleave="mcpDragOverZone = null"
                  class="min-h-[300px] space-y-2 transition-all rounded-lg p-3"
                  :class="mcpDragOverZone === 'assigned' ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-white/50'"
                >
                  <div
                    v-for="mcpId in agent.mcps"
                    :key="'mcp-assigned-' + mcpId"
                    draggable="true"
                    @dragstart="handleMcpDragStart($event, mcpId, 'assigned')"
                    @dragend="handleMcpDragEnd"
                    class="flex items-center justify-between p-3 bg-white rounded-lg border-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] transition-all group"
                    :class="draggingMcp === mcpId ? 'opacity-50 scale-95' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">🔌</span>
                      <div>
                        <div class="font-semibold text-gray-900">{{ getMcpName(mcpId) }}</div>
                        <div class="text-xs text-gray-500">{{ getMcpDescription(mcpId) }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Drag →</span>
                      <button
                        @click.stop="removeMcp(mcpId)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Retirer"
                      >✕</button>
                    </div>
                  </div>
                  <div v-if="!agent.mcps || agent.mcps.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span class="text-4xl mb-2">📭</span>
                    <span class="text-sm">Aucun MCP assigné</span>
                    <span class="text-xs">← Glissez des MCPs ici</span>
                  </div>
                </div>
              </div>
              <!-- Available MCPs -->
              <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-gray-300 p-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span class="text-xl">📚</span>
                    MCPs disponibles
                  </h3>
                  <span class="px-2 py-1 text-xs font-bold bg-gray-600 text-white rounded-full">
                    {{ availableMcps.length }}
                  </span>
                </div>
                <div
                  @drop="handleMcpDrop($event, 'available')"
                  @dragover.prevent
                  @dragenter.prevent="mcpDragOverZone = 'available'"
                  @dragleave="mcpDragOverZone = null"
                  class="min-h-[300px] space-y-2 transition-all rounded-lg p-3 overflow-y-auto max-h-[500px]"
                  :class="mcpDragOverZone === 'available' ? 'bg-gray-100 ring-2 ring-gray-400' : 'bg-white/50'"
                >
                  <div
                    v-for="mcp in availableMcps"
                    :key="'mcp-available-' + mcp.id"
                    draggable="true"
                    @dragstart="handleMcpDragStart($event, mcp.id, 'available')"
                    @dragend="handleMcpDragEnd"
                    class="flex items-center justify-between p-3 bg-white rounded-lg border-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.02] transition-all group"
                    :class="draggingMcp === mcp.id ? 'opacity-50 scale-95' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">🔌</span>
                      <div>
                        <div class="font-semibold text-gray-900">{{ mcp.name || mcp.id }}</div>
                        <div v-if="mcp.description" class="text-xs text-gray-500 line-clamp-1">{{ mcp.description }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">← Drag</span>
                      <button
                        @click.stop="addMcp(mcp.id)"
                        class="w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Ajouter"
                      >+</button>
                    </div>
                  </div>
                  <div v-if="availableMcps.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span class="text-4xl mb-2">✅</span>
                    <span class="text-sm">Tous les MCPs sont assignés</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 border rounded-lg p-4">
              <div class="flex items-start gap-3 text-sm text-gray-600">
                <span class="text-xl">💡</span>
                <div>
                  <strong class="text-gray-900">Glissez-déposez</strong> les MCP servers entre les deux colonnes pour les assigner ou les retirer.
                  Les changements sont synchronisés avec Obsidian à la volée.
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Fichiers -->
          <div v-if="activeTab === 'files'">
            <div v-if="agent.files && Object.keys(agent.files).length" class="space-y-4">
              <div 
                v-for="(content, filename) in agent.files" 
                :key="filename"
                class="border rounded-lg overflow-hidden"
              >
                <div class="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <span class="font-mono text-sm font-medium">{{ filename }}</span>
                </div>
                <pre class="p-4 text-sm overflow-x-auto bg-gray-900 text-gray-100"><code>{{ content }}</code></pre>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucun fichier de configuration trouvé
            </div>
          </div>

          <!-- Tab: Sessions -->
          <div v-if="activeTab === 'sessions'">
            <div v-if="liveSessions.length" class="space-y-3">
              <div 
                v-for="session in liveSessions" 
                :key="session.sessionKey"
                class="border rounded-lg p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium font-mono text-sm">{{ formatSessionKey(session.sessionKey) }}</span>
                  <span class="text-sm text-gray-500">{{ formatTokens(session.totalTokens) }} tokens</span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span>{{ session.model || '-' }}</span>
                  <span>{{ session.percentUsed }}% contexte</span>
                </div>
                <!-- Token bar -->
                <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all"
                    :class="session.percentUsed >= 80 ? 'bg-red-500' : session.percentUsed >= 50 ? 'bg-yellow-500' : 'bg-blue-500'"
                    :style="{ width: `${Math.min(session.percentUsed, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucune session active
            </div>
          </div>

          <!-- Tab: Channels -->
          <div v-if="activeTab === 'channels'">
            <div v-if="agent.channels?.length" class="space-y-2">
              <div 
                v-for="channel in agent.channels" 
                :key="channel.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <span class="text-lg">{{ channel.type === 'channel' ? '#' : '💬' }}</span>
                  <span class="font-medium">{{ channel.displayName || channel.name }}</span>
                </div>
                <span class="text-sm text-gray-500">{{ channel.platform }}</span>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">
              Aucun channel connecté
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

const route = useRoute()
const agentId = computed(() => route.params.id as string)

const activeTab = ref('skills')
const tabs = [
  { id: 'skills', label: 'Skills' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'projects', label: 'Projets' },
  { id: 'files', label: 'Fichiers' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'channels', label: 'Channels' },
]

// Fetch all agents for prev/next navigation
const { data: agentsData } = await useFetch('/api/agents')
const agentsList = computed(() => (agentsData.value as any)?.agents || [])
const currentIndex = computed(() => agentsList.value.findIndex((a: any) => a.id === agentId.value))
const prevAgent = computed(() => currentIndex.value > 0 ? agentsList.value[currentIndex.value - 1] : null)
const nextAgent = computed(() => currentIndex.value >= 0 && currentIndex.value < agentsList.value.length - 1 ? agentsList.value[currentIndex.value + 1] : null)

// Fetch agent details (includes live session data)
const { data: agent, pending, error, refresh } = await useFetch(`/api/agents/${agentId.value}`)

// Soft-poll: only update live stats without re-rendering the full component
const liveOverride = ref<{ totalTokens: number; activeSessions: number; maxPercentUsed: number } | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
if (!import.meta.server) {
  pollTimer = setInterval(async () => {
    try {
      const fresh: any = await $fetch(`/api/agents/${agentId.value}`)
      liveOverride.value = {
        totalTokens: fresh.totalTokens || 0,
        activeSessions: fresh.activeSessions || 0,
        maxPercentUsed: fresh.maxPercentUsed || 0,
      }
    } catch {}
  }, 30_000) // 30s instead of 10s, and soft update only
  onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
}

// Projects come from the agent API (source of truth: SQLite)
const agentProjects = computed(() => agent.value?.projects || [])

// Fetch all skills
const { data: allSkillsData } = await useFetch('/api/skills')
const allSkills = computed(() => allSkillsData.value?.installed || [])

// Available skills (not yet assigned to this agent)
const availableSkills = computed(() => {
  const agentSkillIds = agent.value?.skills || []
  return allSkills.value.filter(skill => !agentSkillIds.includes(skill.id))
})

// Fetch all MCPs
const { data: allMcpsData } = await useFetch('/api/mcps')
const allMcps = computed(() => allMcpsData.value?.installed || [])

// Available MCPs (not yet assigned to this agent)
const availableMcps = computed(() => {
  const agentMcpIds = agent.value?.mcps || []
  return allMcps.value.filter(mcp => !agentMcpIds.includes(mcp.id))
})

// Live data now included in agent response
const liveStats = computed(() => liveOverride.value || ({
  totalTokens: agent.value?.totalTokens || 0,
  activeSessions: agent.value?.activeSessions || 0,
  maxPercentUsed: agent.value?.maxPercentUsed || 0,
}))
const liveSessions = computed(() => agent.value?.sessions || [])

// Model selection
const availableModels = [
  { value: 'anthropic/claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'anthropic/claude-opus-4-5', label: 'Opus 4.5' },
  { value: 'anthropic/claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'anthropic/claude-sonnet-4-5', label: 'Sonnet 4.5' },
  { value: 'anthropic/claude-haiku-4-5', label: 'Haiku 4.5' },
]

async function updateModel(newModel: string) {
  if (!agent.value || agent.value.model === newModel) return
  try {
    await $fetch(`/api/agents/${agentId.value}`, {
      method: 'PATCH',
      body: { model: newModel }
    })
    await refreshKeepScroll()
  } catch (err: any) {
    console.error('Failed to update model:', err)
    alert(`Erreur: ${err.message || 'Impossible de changer le modèle'}`)
  }
}

// ── Shared helpers ──
async function refreshKeepScroll() {
  const scrollY = window.scrollY
  await refresh()
  await nextTick()
  window.scrollTo({ top: scrollY, behavior: 'instant' })
}

// ── Skills Drag & Drop ──
const draggingSkill = ref<string | null>(null)
const dragOverZone = ref<'assigned' | 'available' | null>(null)
const dragSource = ref<'assigned' | 'available' | null>(null)

function handleSkillDragStart(event: DragEvent, skillId: string, source: 'assigned' | 'available') {
  draggingSkill.value = skillId
  dragSource.value = source
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', skillId)
  }
}

function handleSkillDragEnd() {
  draggingSkill.value = null
  dragOverZone.value = null
  dragSource.value = null
}

async function handleSkillDrop(event: DragEvent, targetZone: 'assigned' | 'available') {
  event.preventDefault()
  const skillId = event.dataTransfer?.getData('text/plain')
  if (!skillId || !dragSource.value) return
  if (dragSource.value === targetZone) { handleSkillDragEnd(); return }
  if (targetZone === 'assigned') { await addSkill(skillId) } else { await removeSkill(skillId) }
  handleSkillDragEnd()
}

async function addSkill(skillId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/skills`, { method: 'POST', body: { skillId } })
    await refreshKeepScroll()
  } catch (err: any) {
    console.error('Failed to add skill:', err)
    alert(`Erreur: ${err.message || 'Impossible d\'ajouter le skill'}`)
  }
}

async function removeSkill(skillId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/skills`, { method: 'DELETE', body: { skillId } })
    await refreshKeepScroll()
  } catch (err: any) {
    console.error('Failed to remove skill:', err)
    alert(`Erreur: ${err.message || 'Impossible de retirer le skill'}`)
  }
}

function getSkillName(skillId: string): string {
  const skill = allSkills.value.find(s => s.id === skillId)
  return skill?.name || skillId
}

function getSkillDescription(skillId: string): string {
  const skill = allSkills.value.find(s => s.id === skillId)
  return skill?.description ? skill.description.substring(0, 60) + (skill.description.length > 60 ? '...' : '') : ''
}

// ── MCPs Drag & Drop ──
const draggingMcp = ref<string | null>(null)
const mcpDragOverZone = ref<'assigned' | 'available' | null>(null)
const mcpDragSource = ref<'assigned' | 'available' | null>(null)

function handleMcpDragStart(event: DragEvent, mcpId: string, source: 'assigned' | 'available') {
  draggingMcp.value = mcpId
  mcpDragSource.value = source
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', mcpId)
  }
}

function handleMcpDragEnd() {
  draggingMcp.value = null
  mcpDragOverZone.value = null
  mcpDragSource.value = null
}

async function handleMcpDrop(event: DragEvent, targetZone: 'assigned' | 'available') {
  event.preventDefault()
  const mcpId = event.dataTransfer?.getData('text/plain')
  if (!mcpId || !mcpDragSource.value) return
  if (mcpDragSource.value === targetZone) { handleMcpDragEnd(); return }
  if (targetZone === 'assigned') { await addMcp(mcpId) } else { await removeMcp(mcpId) }
  handleMcpDragEnd()
}

async function addMcp(mcpId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/mcps`, { method: 'POST', body: { mcpId } })
    await refreshKeepScroll()
  } catch (err: any) {
    console.error('Failed to add MCP:', err)
    alert(`Erreur: ${err.message || 'Impossible d\'ajouter le MCP'}`)
  }
}

async function removeMcp(mcpId: string) {
  try {
    await $fetch(`/api/agents/${agentId.value}/mcps`, { method: 'DELETE', body: { mcpId } })
    await refreshKeepScroll()
  } catch (err: any) {
    console.error('Failed to remove MCP:', err)
    alert(`Erreur: ${err.message || 'Impossible de retirer le MCP'}`)
  }
}

function getMcpName(mcpId: string): string {
  const mcp = allMcps.value.find(m => m.id === mcpId)
  return mcp?.name || mcpId
}

function getMcpDescription(mcpId: string): string {
  const mcp = allMcps.value.find(m => m.id === mcpId)
  return mcp?.description ? mcp.description.substring(0, 60) + (mcp.description.length > 60 ? '...' : '') : ''
}

useHead({
  title: computed(() => `${agent.value?.name || agentId.value} - OpenClaw`)
})

// Set agent name in route meta for breadcrumb (only once, not reactive to avoid loops)
if (agent.value?.name) {
  route.meta.agentName = agent.value.name
}

const TEAM_GRADIENTS: Record<string, string> = {
  code: 'from-blue-600 via-indigo-600 to-violet-700',
  writing: 'from-purple-600 via-fuchsia-600 to-pink-600',
  system: 'from-orange-500 via-amber-600 to-yellow-600',
  free: 'from-emerald-500 via-teal-600 to-cyan-600',
}

const headerGradient = computed(() => {
  const team = agent.value?.team || 'unknown'
  return TEAM_GRADIENTS[team] || 'from-gray-600 via-slate-700 to-gray-800'
})

const avatarClassHeader = computed(() => 'bg-white/20 text-white backdrop-blur-sm')

const avatarClass = computed(() => {
  switch (agent.value?.status) {
    case 'online': return 'bg-green-100 text-green-700'
    case 'idle': return 'bg-yellow-100 text-yellow-700'
    case 'offline': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
})

const percentClass = computed(() => {
  const p = liveStats.value?.maxPercentUsed ?? 0
  if (p >= 80) return 'text-red-600'
  if (p >= 60) return 'text-yellow-600'
  return 'text-gray-900'
})

const percentClassHeader = computed(() => {
  const p = liveStats.value?.maxPercentUsed ?? 0
  if (p >= 80) return 'text-red-300'
  if (p >= 60) return 'text-yellow-300'
  return 'text-white'
})

// formatTokens, formatModel, formatAge, formatSessionKey are auto-imported from utils/format.ts

function getAgentRole(project: any): string {
  // Check team first
  const teamMember = project.team?.find((t: any) => t.agent === agentId.value)
  if (teamMember?.role) return teamMember.role
  
  // Check if owner
  if (project.owner === agentId.value) return 'owner'
  
  // Fallback
  return 'assigné'
}

// Get channel display name from context ID
function getChannelDisplayName(contextId: string): string {
  const channel = agent.value?.channels?.find((c: any) => c.name === contextId)
  return channel?.displayName || channel?.name || contextId
}

// Team & role from source of truth (agents.json fields)
const TEAM_MAP: Record<string, { label: string; icon: string; color: string }> = {
  code: { label: 'Code', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  writing: { label: 'Écriture', icon: '✍️', color: 'bg-purple-100 text-purple-700' },
  system: { label: 'System', icon: '🔧', color: 'bg-orange-100 text-orange-700' },
  free: { label: 'Libre', icon: '🌟', color: 'bg-yellow-100 text-yellow-700' },
}
const agentTeam = computed(() => {
  const team = agent.value?.team || 'unknown'
  return TEAM_MAP[team] || { label: team, icon: '❓', color: 'bg-gray-100 text-gray-700' }
})

// Format last activity — prefer live data
const lastActivityText = computed(() => {
  const ts = agent.value?.lastActivity
  if (!ts) return null
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffSeconds < 60) return `Actif il y a ${diffSeconds}s`
  if (diffMinutes < 60) return `Actif il y a ${diffMinutes}m`
  if (diffHours < 24) return `Actif il y a ${diffHours}h`
  return `Actif le ${date.toLocaleDateString('fr-FR')}`
})
</script>
