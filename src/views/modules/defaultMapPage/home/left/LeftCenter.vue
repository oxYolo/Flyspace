
<template>
  <div
      class="con"
      v-loading="loading"
      element-loading-text="获取数据中~"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle :text="'飞行机器架次统计'" icon="icon-飞行机器架次统计" />
    <EasyChart style="height: calc(100% - 32px); margin-top: 8px;" :options="chartOption" />

  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import * as echarts from 'echarts'
import EasyChart from "@/components/common/EasyChart.vue";
import ModuleTitle from "@/components/common/Title.vue";

interface ListItem {
  label: string
  value1: number
  value2: number
}

const loading = ref(false)

const list = ref<ListItem[]>([
  { label: 'DJI Dock 2', value1: 45, value2: 42 },
  { label: '临空经济区机场', value1: 38, value2: 35 },
  { label: '大疆M300', value1: 28, value2: 0 },
  { label: '精灵4RTK', value1: 22, value2: 0 },
  { label: '御3行业版', value1: 15, value2: 12 },
  { label: 'Mini 3 Pro', value1: 8, value2: 6 },
  { label: '其他机型', value1: 5, value2: 3 }
])

const chartOption = computed(() => {
      let myData = list.value.map(el => {
        if (el.label.length > 4) {
          return el.label.slice(0, 4) + '...'
        } else {
          return el.label
        }
      })
      var lineData = [45, 38, 28, 22, 15, 8, 5]
      var rightlineData = [45, 38, 28, 22, 15, 8, 5]
      var lastYearData = {
        1: list.value.map(el => el.value1)
      }
      var thisYearData = {
        1: list.value.map(el => el.value2)
      }
      var timeLineData = [1]

      var option = {
        baseOption: {
          timeline: {
            show: false,
            top: 0,
            data: []
          },
          legend : {
            itemWidth : 10,
            itemHeight : 10,
            itemGap: 40,
            icon : 'horizontal',
            textStyle : {
              color : '#ffffff',
              fontSize : 14,
            },
            data: ['总架次', '在线架次']
          },
          grid: [{
            show: false,
            left: '2%',
            top: '10%',
            bottom: '8%',
            containLabel: true,
            width: '37%'
          },  {
            show: false,
            left: '51%',
            top: '10%',
            bottom: '11%',
            width: '0%'
          }, {
            show: false,
            right: '2%',
            top: '10%',
            bottom: '8%',
            containLabel: true,
            width: '37%'
          }],
          xAxis: [{
            type: 'value',
            inverse: true,
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            position: 'bottom',
            axisLabel: {
              show: false,
              textStyle: {
                color: 'white'
              }
            },
            splitLine: {
              show: false
            }
          }, {
            gridIndex: 1,
            show: false,
          }, {
            gridIndex: 2,
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            position: 'bottom',
            axisLabel: {
              show: false,
              interval: 0,
              textStyle: {
                color: 'white'
              }
            },
            splitLine: {
              show: false
            }
          }],
          yAxis: [{
            type: 'category',
            inverse: true,
            position: 'right',
            axisLine: {
              show: true,
              lineStyle:{
                color: '#525e7a'
              }
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: false
            },
            data: myData
          }, {
            gridIndex: 1,
            type: 'category',
            inverse: true,
            position: 'left',
            axisLine: {
              show: false,
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: true,
              textStyle: {
                color: '#ffffff',
                fontSize: 14,
                padding: [8, 0, 0, 0]
              }

            },
            data: myData.map(function(value) {
              return {
                value: value,
                textStyle: {
                  align: 'center'
                }
              }
            })
          }, {
            gridIndex: 2,
            type: 'category',
            inverse: true,
            position: 'left',
            axisLine: {
              show: true,
              lineStyle:{
                color: '#525e7a'
              }
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: false

            },
            data: myData
          }],
          series: []

        },
        options: []
      }

      option.baseOption.timeline.data.push(timeLineData[0])
      option.options.push({
        series: [
          {
            type: 'pictorialBar',
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
              normal: {
                color: 'rgba(0,0,0,0)'
              }
            },
            barWidth: 10,
            data: lineData,
            barGap: '-100%',
            barCategoryGap: 0,
            label: {
              normal: {
                show: true,
                formatter: (series) => {
                  return lastYearData[timeLineData[0]][series.dataIndex]
                },
                position: 'insideTopLeft',
                textStyle:{
                  color: '#ffffff',
                  fontSize: 15,
                },
                offset: [-15, -5],
              }
            },
            z: 100,
            animationEasing: 'elasticOut',
            animationDelay: function (dataIndex, params) {
              return (params?.index || dataIndex) * 30;
            }
          }, {
            name: '总架次',
            type: 'bar',
            xAxisIndex: 0,
            yAxisIndex: 0,
            //  symbol: 'rect',
            barWidth: 10,
            itemStyle: {
              normal: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{
                  offset: 0,
                  color: '#02e0d8'
                },
                  {
                    offset: 1,
                    color: '#1cc2f5'
                  }
                ]),
              }
            },
            data: lastYearData[timeLineData[0]]
          },
          {
            type: 'pictorialBar',
            xAxisIndex: 2,
            yAxisIndex: 2,
            symbol: 'rect',
            itemStyle: {
              normal: {
                color: 'rgba(0,0,0,0)'
              }
            },
            barWidth: 10,
            symbolRepeat: true,
            symbolSize: 14,
            data: rightlineData,
            barGap: '-100%',
            barCategoryGap: 0,
            label: {
              normal: {
                show: true,
                formatter: (series) => {
                  return thisYearData[timeLineData[0]][series.dataIndex]
                },
                position: 'insideTopRight',
                textStyle:{
                  color: '#ffffff',
                  fontSize: 15,
                },
                offset: [0, -10],
              }
            },
            z: -100,
            animationEasing: 'elasticOut',
            animationDelay: function (dataIndex, params) {
              return (params?.index || dataIndex) * 30;
            }
          }, {
            name: '在线架次',
            type: 'bar',
            xAxisIndex: 2,
            yAxisIndex: 2,
            barWidth: 10,
            itemStyle: {
              normal: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{
                  offset: 0,
                  color: '#ffa800'
                },
                  {
                    offset: 1,
                    color: '#fee623'
                  }
                ]),
              }
            },
            data: thisYearData[timeLineData[0]]
          }
        ]
      });
      return option
})
</script>
