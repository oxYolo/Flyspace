
<template>
  <div
      class="common-border con"
      v-loading="loading"
      element-loading-text="获取数据中~"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle :text="'飞行机器架次统计'" type="right" icon="icon-物业服务" />
    <EasyChart :options="chartOption" style="height: calc(100% - 60px)" @onEasyChartClick="onEasyChartClick" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ModuleTitle from "@/components/common/Title.vue";
import EasyChart from "@/components/common/EasyChart.vue";
import * as echarts from "echarts";

interface ListItem {
  name: string
  value: number
  unit: string
}

const router = useRouter()
const loading = ref(false)

const list = ref<ListItem[]>([
  {name:'巡检飞行', value: 156, unit:'架次' } ,
  {name:'测绘\n任务', value:89, unit:'架次' } ,
  {name:'监控\n巡逻', value: 67, unit:'架次' } ,
  {name:'应急救援', value: 34, unit:'架次' } ,
  {name:'物流配送', value: 28, unit:'架次' } ,
  {name:'农业植保', value: 15, unit:'架次' } ,
])

const chartOption = computed(() => {
      const offsetX = 12
      const offsetY = 6
      // 绘制左侧面
      const CubeLeft = echarts.graphic.extendShape({
        shape: {
          x: 0,
          y: 0,
        },
        buildPath: function (ctx, shape) {
          // 会canvas的应该都能看得懂，shape是从custom传入的
          const xAxisPoint = shape.xAxisPoint
          // console.log(shape);
          const c0 = [shape.x, shape.y]
          const c1 = [shape.x - offsetX, shape.y - offsetY]
          const c2 = [xAxisPoint[0] - offsetX, xAxisPoint[1] - offsetY]
          const c3 = [xAxisPoint[0], xAxisPoint[1]]
          ctx
              .moveTo(c0[0], c0[1])
              .lineTo(c1[0], c1[1])
              .lineTo(c2[0], c2[1])
              .lineTo(c3[0], c3[1])
              .closePath()
        },
      })
      // 绘制右侧面
      const CubeRight = echarts.graphic.extendShape({
        shape: {
          x: 0,
          y: 0,
        },
        buildPath: function (ctx, shape) {
          const xAxisPoint = shape.xAxisPoint
          const c1 = [shape.x, shape.y]
          const c2 = [xAxisPoint[0], xAxisPoint[1]]
          const c3 = [xAxisPoint[0] + offsetX, xAxisPoint[1] - offsetY]
          const c4 = [shape.x + offsetX, shape.y - offsetY]
          ctx
              .moveTo(c1[0], c1[1])
              .lineTo(c2[0], c2[1])
              .lineTo(c3[0], c3[1])
              .lineTo(c4[0], c4[1])
              .closePath()
        },
      })
      // 绘制顶面
      const CubeTop = echarts.graphic.extendShape({
        shape: {
          x: 0,
          y: 0,
        },
        buildPath: function (ctx, shape) {
          const c1 = [shape.x, shape.y]
          const c2 = [shape.x + offsetX, shape.y - offsetY] //右点
          const c3 = [shape.x, shape.y - offsetX]
          const c4 = [shape.x - offsetX, shape.y - offsetY]
          ctx
              .moveTo(c1[0], c1[1])
              .lineTo(c2[0], c2[1])
              .lineTo(c3[0], c3[1])
              .lineTo(c4[0], c4[1])
              .closePath()
        },
      })
      // 注册三个面图形
      echarts.graphic.registerShape('CubeLeft', CubeLeft)
      echarts.graphic.registerShape('CubeRight', CubeRight)
      echarts.graphic.registerShape('CubeTop', CubeTop)
      const VALUE = list.value.map((item) => item.value)
      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          borderColor: '#fdd50a',
          borderWidth: 1,
          backgroundColor: '#04123f',
          padding: [5, 10],
          textStyle: {
            color: '#fff',
            fontSize: '20'
          },
          formatter: function (p) {
            const str = `${p[0].name} ` + '<br/>' + '<span style="font-size:22px;font-family: fzxzyjt;color:#f6ca0d;">' + p[0].value + '<span>架次'
            return str
          },
        },
        grid: {
          left: '15%',
          right: '5%',
          top: '25%',
          bottom: '0%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: list.value.map((item) => item.name),
          axisLine: {
            lineStyle: {
              color: '#03A9F4'
            }
          },
          axisLabel: {
            overflow: 'break',
            interval: 0,
            textStyle: {
              fontSize: 10,
              color: '#FFF',
              fontFamily: 'LCD'
            }
          },
          axisTick: {
            show: false // 不显示坐标轴刻度线
          },
        },
        yAxis: {
          type: 'value',
          name: '飞行架次(次)',
          nameTextStyle: {
            color: '#ffff',
            fontSize: 14,
            lineHeight: 30,
            align: 'right',
            padding: [0, 0, 0 , 60]
          },
          axisLabel: {
            show: true,
            interval: 'auto',
            formatter: '{value} ',
            textStyle: {
              fontSize: 16,
              color: '#8892a6',
            }
          },
          axisLine: {
            show: false,
            lineStyle: {
              color: '#11ACF1',
              width: 1
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#334265',
              width: 0.3
            }
          },
          axisTick: {
            show: false // 不显示坐标轴刻度线
          },
          show: true
        },
        series: [
          {
            type: 'custom',
            renderItem: (params, api) => {
              const location = api.coord([api.value(0), api.value(1)])
              return {
                type: 'group',
                children: [
                  {
                    type: 'CubeLeft',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                  {
                    type: 'CubeRight',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                  {
                    type: 'CubeTop',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                ],
              }
            },
            data: VALUE,
          },
          {
            type: 'custom',
            renderItem: (params, api) => {
              const location = api.coord([api.value(0), api.value(1)])
              return {
                type: 'group',
                children: [
                  {
                    type: 'CubeLeft',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                  {
                    type: 'CubeRight',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                  {
                    type: 'CubeTop',
                    shape: {
                      api,
                      xValue: api.value(0),
                      yValue: api.value(1),
                      x: location[0],
                      y: location[1],
                      xAxisPoint: api.coord([api.value(0), 0]),
                    },
                    style: {
                      fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        {
                          offset: 1,
                          color: '#01d6fc',
                        },
                        {
                          offset: 0,
                          color: 'rgba(1,214,252,0.2)',
                        },
                      ]),
                    },
                  },
                ],
              }
            },
            data: VALUE,
          },
          {
            type: 'bar',
            label: {
              normal: {
                show: true,
                position: 'top',
                fontSize: 16,
                color: '#FFF',
                offset: [0, -5],
              },
            },
            itemStyle: {
              color: 'transparent',
            },
            tooltip: {},
            data: VALUE,
          },
        ]
      }
})

const onEasyChartClick = () => {
  router.push({name: 'programeList'})
}
</script>

<style lang="less" scoped>

</style>
