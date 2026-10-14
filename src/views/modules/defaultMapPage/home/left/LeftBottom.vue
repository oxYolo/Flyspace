<template>
  <div
      class="con"
      v-loading="loading"
      element-loading-text="获取数据中~"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle :text="'飞行任务统计'" icon="icon-飞行任务统计" />
    <EasyChart style="height: calc(100% - 60px);" :options="chartOption" />

  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import ModuleTitle from "@/components/common/Title.vue";
import EasyChart from "@/components/common/EasyChart.vue";
import bgImage from '@/assets/qyfw/环形图bg.png'

interface ListItem {
  name: string
  value: number
}

const loading = ref(false)

const list = ref<ListItem[]>([
  { name: '巡检任务', value: 45 },
  { name: '监控任务', value: 28 },
  { name: '测绘任务', value: 18 },
  { name: '应急任务', value: 12 },
  { name: '其他任务', value: 8 },
])

const chartOption = computed(() => {
      const color = ['#3275bc', '#00c6ff', '#00ffa3','#ffdb35','#ff7521','#ffffff','#6881ff','#1255ff']
      const data: any[] = []
      list.value.forEach((el, idx) => {
        data.push({
          value: el.value,
          name: el.name,
          itemStyle: {
              normal: {
                borderWidth: 8,
                shadowBlur: 20,
                borderRadius:20,
                borderColor:color[idx],
                shadowColor: color[idx]
              }
          }
        }, {
          value: 3,
          name: '',
          itemStyle: {
            normal: {
              label: {
                show: false
              },
              labelLine: {
                show: false
              },
              color: 'rgba(0, 0, 0, 0)',
              borderColor: 'rgba(0, 0, 0, 0)',
              borderWidth: 0
            }
          }
        })
      })
      return {
        legend: {
          icon: 'rect',
          orient: 'vertical',
          x: 'bottom',
          top: 'center',
          left: '50%',
          bottom: '0%',
          data: list.value.map((item) => item.name),
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 12,
          textStyle: {
            fontSize: 14,
            color: '#fff',
            fontFamily: 'com',
            rich: {
              one: {
                width: 85,
                fontSize: 13,
                color: '#fff',
              },
              two: {
                fontSize: 16,
                color: '#00fff0',
                fontFamily: 'com',
              }
            },
          },
          formatter: (name: string) => {
            const val = list.value.find((item) => item.name === name)
            if (name.length < 8) {
              const count = 8 - name.length
              for (let i = 0; i < count; i++) {
                name += ' '
              }
            }
            return `{one|${name}} {two|${val?.value || 0}} `
          },
        },
        tooltip: {
          show: true,
          textStyle: {
            fontSize: 22,
          },
        },
        title: [
          {
            text: total.value , // 主标题
            x: '25%',
            y: '40%',
            textAlign:'center',
            textStyle: { // 主标题样式
              fontSize: '18',
              color: '#03e8fb',
              fontFamily: 'com',
            },
            subtext: '任务总数', // 副标题
            subtextStyle: { // 副标题样式
              color: '#fff',
              fontSize: '16'
            },
          },

        ],
        color: ['#3275bc', '#00c6ff', '#00ffa3','#ffdb35','#ff7521','#ffffff','#6881ff','#1255ff'],
        graphic:{       //图形中间图片
          elements: [{
            type: 'image',
            style: {
              image: bgImage,
              width:140,
              height: 140
            },
            left: '7%',
            top: '17%'
          }]
        },
        series: [
          {
            name: '任务数量',
            type: 'pie',
            center: ['25%', '50%'],
            radius: ['55%', '57%'],
            itemStyle: {
              borderRadius: 8,
              normal: {
                borderColor: '#7d97c9',
                borderWidth: 0,
                fontSize: 32,
              },
            },
            label: {
              show: false,
              fontSize: 32,
              color: '#ccc',
            },
            data: data
          }
        ]
      }
})

const total = computed(() => {
  let totalValue = 0
  list.value.forEach(e => {
    totalValue += e.value
  })
  return totalValue
})
</script>

<style lang="less" scoped>
.con {
  color: #fff;

}
</style>
