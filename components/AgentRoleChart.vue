<template>
  <div class="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
    <h3 class="text-lg font-bold text-white mb-4">Répartition par Rôle</h3>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js'
import type { Agent } from '~/types/agent'

Chart.register(ArcElement, Tooltip, Legend, DoughnutController)

const props = defineProps<{
  agents: Agent[]
}>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const initChart = () => {
  if (!chartCanvas.value) return

  // Compter les agents par rôle
  const roleCounts = props.agents.reduce((acc, agent) => {
    acc[agent.role] = (acc[agent.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const labels = Object.keys(roleCounts)
  const data = Object.values(roleCounts)

  const colors: Record<string, string> = {
    orchestrator: '#8b5cf6',
    architect: '#3b82f6',
    developer: '#10b981',
    config: '#f59e0b',
  }

  const backgroundColors = labels.map(label => colors[label] || '#6b7280')

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e5e7eb',
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
              const percentage = ((context.parsed / total) * 100).toFixed(1)
              return `${context.label}: ${context.parsed} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

onMounted(() => {
  initChart()
})

watch(() => props.agents, () => {
  initChart()
})
</script>
