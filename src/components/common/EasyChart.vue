<template>
  <div :class="uniqueId" class="easy-chart">
    <div :id="uniqueId" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

interface Props {
  options: Record<string, any>
}

interface Emits {
  (e: 'onEasyChartClick', index: number[]): void
  (e: 'onEasyChartClickPie', dataIndex: number): void
  (e: 'onEasyChartClickLegend', params: any): void
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({})
})

const emit = defineEmits<Emits>()

const charts = ref<echarts.ECharts | null>(null)

const uniqueId = computed(() => {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz'
  let [len, maxPos, id] = [9, chars.length, '']
  for (let i = 0; i < len; i++) {
    id += chars.charAt(Math.floor(Math.random() * maxPos))
  }
  return id
})

const initChart = () => {
  const chartElement = document.getElementById(uniqueId.value)
  if (!chartElement) return false

  charts.value = echarts.init(chartElement)

  charts.value.getZr().on('click', (params: any) => {
    const pointInPixel = [params.offsetX, params.offsetY]

    if (charts.value?.containPixel('grid', pointInPixel)) {
      const index = charts.value.convertFromPixel({ seriesIndex: 0 }, [params.offsetX, params.offsetY])
      emit('onEasyChartClick', index)
    }

    if (params.target?.dataIndex !== undefined) {
      emit('onEasyChartClickPie', params.target.dataIndex)
    }
  })

  charts.value.on('legendselectchanged', (params: any) => {
    emit('onEasyChartClickLegend', params)
  })

  return true
}

const hasValidOption = (opt: Record<string, any>): boolean => {
  return opt && Object.keys(opt).length > 0 && Array.isArray(opt.series) && opt.series.length > 0
}

const drawChart = () => {
  if (!hasValidOption(props.options)) return

  if (!charts.value) {
    if (!initChart()) return
  }

  charts.value.setOption(props.options, true)
}

const refreshChart = () => {
  if (charts.value && hasValidOption(props.options)) {
    charts.value.setOption(props.options, true)
  }
}

const handleResize = () => {
  if (charts.value) {
    charts.value.resize()
  }
}

watch(
  () => props.options,
  () => {
    drawChart()
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    drawChart()
  })
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (charts.value) {
    charts.value.dispose()
  }
})

defineExpose({
  refreshChart
})
</script>

<style lang="less" scoped>
	.easy-chart {
		position: relative;
		height: 100%;
		width: 100%;
		background: transparent;
		.chart {
			width: 100%;
			height: calc(100% - 1px);
		}
	}
</style>
