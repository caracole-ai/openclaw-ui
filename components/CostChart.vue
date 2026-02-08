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
import { ref, onMounted, watch, computed } from 'vue';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

const props = defineProps<{
  agents: any[];
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const totalCost = computed(() => {
  return props.agents.reduce((sum, a) => sum + (a.metrics.cost || 0), 0);
});

const initChart = () => {
  if (!chartCanvas.value) return;
  
  const labels = props.agents.map(a => a.name);
  const costs = props.agents.map(a => a.metrics.cost || 0);
  
  // Couleurs funky
  const colors = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#ec4899', // pink
    '#6366f1', // indigo
  ];
  
  if (chartInstance) {
    chartInstance.destroy();
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
              const cost = context.parsed;
              const percentage = ((cost / totalCost.value) * 100).toFixed(1);
              return `${context.label}: $${cost.toFixed(2)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
};

onMounted(() => {
  initChart();
});

watch(() => props.agents, () => {
  initChart();
});
</script>
