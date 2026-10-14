<template>
  <div
    class="flight-machine-rank-card"
    v-loading="loading"
    element-loading-background="rgba(0, 0, 0, 0.1)">
    <ModuleTitle :text="'飞行机器架次统计'" icon="icon-物业服务" type="right" />
    <div class="card-body">
      <!-- 图表展示区 -->
      <div class="chart-container">
        <EasyChart :options="chartOption" style="height: 100%; width: 100%" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import ModuleTitle from "@/components/common/Title.vue";
import EasyChart from "@/components/common/EasyChart.vue";
import * as echarts from "echarts";
import { $getInspectionSceneFlightStats } from "@/api/flyControl/situationApi";

const loading = ref(false);

interface ListItem {
  name: string;
  value: number;
  unit: string;
}

const list = ref<ListItem[]>([]);

const loadData = async () => {
  loading.value = true;
  try {
    const res: any = await $getInspectionSceneFlightStats();
    if (res?.code === 200 && res.data) {
      list.value = res.data
        .map((item: any) => ({
          name: item.inspectionSceneName,
          value: item.flightCount || 0,
          unit: "次",
        }))
        .sort((a: any, b: any) => b.value - a.value); // 降序排列
    }
  } catch (error) {
    console.error("获取飞行机器架次统计数据失败", error);
  } finally {
    loading.value = false;
  }
};

const chartOption = computed(() => {
  const offsetX = 12;
  const offsetY = 6;

  // 绘制左侧面
  const CubeLeft = echarts.graphic.extendShape({
    shape: { x: 0, y: 0 },
    buildPath: function (ctx, shape: any) {
      const xAxisPoint = shape.xAxisPoint;
      const c0 = [shape.x, shape.y];
      const c1 = [shape.x - offsetX, shape.y - offsetY];
      const c2 = [xAxisPoint[0] - offsetX, xAxisPoint[1] - offsetY];
      const c3 = [xAxisPoint[0], xAxisPoint[1]];
      ctx.moveTo(c0[0], c0[1]);
      ctx.lineTo(c1[0], c1[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.lineTo(c3[0], c3[1]);
      ctx.closePath();
    },
  });

  // 绘制右侧面
  const CubeRight = echarts.graphic.extendShape({
    shape: { x: 0, y: 0 },
    buildPath: function (ctx, shape: any) {
      const xAxisPoint = shape.xAxisPoint;
      const c1 = [shape.x, shape.y];
      const c2 = [xAxisPoint[0], xAxisPoint[1]];
      const c3 = [xAxisPoint[0] + offsetX, xAxisPoint[1] - offsetY];
      const c4 = [shape.x + offsetX, shape.y - offsetY];
      ctx.moveTo(c1[0], c1[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.lineTo(c3[0], c3[1]);
      ctx.lineTo(c4[0], c4[1]);
      ctx.closePath();
    },
  });

  // 绘制顶面
  const CubeTop = echarts.graphic.extendShape({
    shape: { x: 0, y: 0 },
    buildPath: function (ctx, shape: any) {
      const c1 = [shape.x, shape.y];
      const c2 = [shape.x + offsetX, shape.y - offsetY];
      const c3 = [shape.x, shape.y - offsetX];
      const c4 = [shape.x - offsetX, shape.y - offsetY];
      ctx.moveTo(c1[0], c1[1]);
      ctx.lineTo(c2[0], c2[1]);
      ctx.lineTo(c3[0], c3[1]);
      ctx.lineTo(c4[0], c4[1]);
      ctx.closePath();
    },
  });

  // 注册三个面图形
  echarts.graphic.registerShape("CubeLeft", CubeLeft);
  echarts.graphic.registerShape("CubeRight", CubeRight);
  echarts.graphic.registerShape("CubeTop", CubeTop);

  const VALUE = list.value.map((item) => item.value);

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      borderColor: "#00c5fe",
      borderWidth: 1,
      backgroundColor: "rgba(4, 18, 63, 0.8)",
      padding: [5, 10],
      textStyle: { color: "#fff", fontSize: "14" },
      formatter: function (p: any) {
        return `${p[0].name}<br/><span style="font-size:18px;color:#00c5fe;font-weight:bold;">${p[0].value}</span> 次`;
      },
    },
    grid: {
      left: "6%",
      right: "5%",
      top: "16%",
      bottom: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: list.value.map((item) => item.name),
      axisLine: {
        lineStyle: { color: "#03A9F4" },
      },
      axisLabel: {
        overflow: "truncate",
        interval: 0,
        textStyle: { fontSize: 10, color: "#FFF" },
        formatter: function (value: string) {
          // 如果名字太长，分行或者截断
          if (value.length > 4) {
            return value.substring(0, 4) + "\n" + value.substring(4);
          }
          return value;
        },
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "飞行架次",
      nameTextStyle: {
        color: "#fff",
        fontSize: 12,

        padding: [0, 0, 0, -20],
      },
      axisLabel: {
        show: true,
        textStyle: { fontSize: 12, color: "#8892a6" },
      },
      axisLine: {
        show: false,
        lineStyle: { color: "#11ACF1", width: 1 },
      },
      splitLine: {
        show: true,
        lineStyle: { color: "rgba(51, 66, 101, 0.5)", width: 1 },
      },
      axisTick: { show: false },
    },
    series: [
      {
        type: "custom",
        renderItem: (params: any, api: any) => {
          const location = api.coord([api.value(0), api.value(1)]);
          return {
            type: "group",
            children: [
              {
                type: "CubeLeft",
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
                    { offset: 1, color: "#01d6fc" },
                    { offset: 0, color: "rgba(1,214,252,0.2)" },
                  ]),
                },
              },
              {
                type: "CubeRight",
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
                    { offset: 1, color: "#01d6fc" },
                    { offset: 0, color: "rgba(1,214,252,0.2)" },
                  ]),
                },
              },
              {
                type: "CubeTop",
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
                    { offset: 1, color: "#01d6fc" },
                    { offset: 0, color: "rgba(1,214,252,0.2)" },
                  ]),
                },
              },
            ],
          };
        },
        data: VALUE,
      },
      {
        type: "bar",
        label: {
          show: true,
          position: "top",
          fontSize: 16,
          color: "#FFF",
          offset: [0, -5],
        },
        itemStyle: { color: "transparent" },
        tooltip: {},
        data: VALUE,
      },
    ],
  };
});

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="less">
.flight-machine-rank-card {
  color: #fff;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .card-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 250px;

    .chart-container {
      flex: 1;
      width: 100%;
      height: 200px;
    }
  }
}
</style>
