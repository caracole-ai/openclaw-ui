<template>
  <div class="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-6">
    <h3 class="text-lg font-bold text-white mb-4">Activité des Agents</h3>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController } from 'chart.js'
import type { Agent } from '~/types/agent'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController)

const props = defineProps<{
  agents: Agent[]
}>()

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const initChart = () => {
  if (!chartCanvas.value) return

  const labels = props.agents.map(a => a.name)
  const projects = props.agents.map(a => a.projects?.length ?? 0)
  const skills = props.agents.map(a => a.skills?.length ?? 0)

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Projets',
          data: projects,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Skills',
          data: skills,
          backgroundColor: '#10b981',
          borderRadius: 4,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Count'
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
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
