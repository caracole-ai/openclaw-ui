<template>
  <div class="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
    <h3 class="text-lg font-bold text-white mb-4">Coûts par Agent</h3>
    <div class="max-w-sm mx-auto">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="mt-4 text-center text-sm text-gray-300">
      Total : <span class="font-bold text-purple-400">${{ totalCost.toFixed(2) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js'
import { useTokens } from '~/composables/useTokens'

Chart.register(ArcElement, Tooltip, Legend, DoughnutController)

const { summary } = useTokens()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const agentCosts = computed(() => {
  if (!summary.value?.topAgents) return []
  return summary.value.topAgents
})

const totalCost = computed(() => {
  return agentCosts.value.reduce((sum, a) => sum + (a.cost || 0), 0)
})

const initChart = () => {
  if (!chartCanvas.value || !agentCosts.value.length) return

  const labels = agentCosts.value.map(a => a.agentId)
  const costs = agentCosts.value.map(a => a.cost || 0)

  const colors = [
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#6366f1',
  ]

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: costs,
        backgroundColor: colors,
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
            padding: 10,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const cost = context.parsed
              const total = totalCost.value
              const percentage = total > 0 ? ((cost / total) * 100).toFixed(1) : '0'
              return `${context.label}: $${cost.toFixed(2)} (${percentage}%)`
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

watch(agentCosts, () => {
  initChart()
})
</script>
