<template>
  <div class="airport-activity-card">
    <ModuleTitle :text="'机场活跃度排名'" icon="icon-设备活动监控" />
    <div
      class="card-body"
      v-loading="loading"
      element-loading-background="rgba(0, 0, 0, 0.2)">
      <!-- 时间选择器 -->
      <div class="time-selector">
        <div
          v-for="item in timeTypes"
          :key="item.value"
          class="time-btn"
          :class="{ active: selectedTimeType === item.value }"
          @click="handleTimeChange(item.value)">
          {{ item.label }}
        </div>
      </div>

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
import { $getAirportFlightStats } from "@/api/flyControl/situationApi";

const timeTypes = [
  { label: "全部", value: "all" },
  { label: "今日", value: "day" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

const selectedTimeType = ref("all");
const loading = ref(false);
const allData = ref<Record<string, any[]>>({});

interface ListItem {
  name: string;
  value: number;
  unit: string;
  mileage: number;
}

const list = ref<ListItem[]>([]);

const loadData = async () => {
  loading.value = true;
  try {
    const res: any = await $getAirportFlightStats();
    if (res?.code === 200 && res.data) {
      allData.value = res.data;
      updateList();
    }
  } catch (error) {
    console.error("获取机场统计数据失败", error);
  } finally {
    loading.value = false;
  }
};

const updateList = () => {
  const currentData = allData.value[selectedTimeType.value] || [];
  list.value = currentData
    .map((item: any) => ({
      name: item.deviceName,
      value: item.flightCount || 0,
      mileage: item.flightMileageKm || 0,
      unit: "次",
    }))
    .sort((a, b) => b.value - a.value); // 降序排列
};

const handleTimeChange = (type: string) => {
  selectedTimeType.value = type;
  updateList();
};

const chartOption = computed(() => {
  const COUNT = list.value.map((item) => item.value);
  const MILEAGE = list.value.map((item) => item.mileage);

  return {
    // tooltip: {
    //   show: true,
    //   trigger: "axis",
    //   triggerOn: "mousemove|click",
    //   appendToBody: true,
    //   confine: false,
    //   axisPointer: {
    //     type: "line",
    //     snap: true,
    //   },
    //   borderColor: "#00c5fe",
    //   borderWidth: 1,
    //   backgroundColor: "rgba(4, 18, 63, 0.92)",
    //   padding: [6, 10],
    //   textStyle: { color: "#fff", fontSize: 12 },
    //   formatter: (params: any[]) => {
    //     const items = Array.isArray(params) ? params : [params];
    //     const title = items[0]?.axisValueLabel || items[0]?.name || "";
    //     const lines = items.map((item) => {
    //       const unit = item.seriesName === "飞行里程" ? "km" : "次";
    //       return `${item.seriesName}: ${item.value ?? "--"}${unit}`;
    //     });
    //     return [title, ...lines].filter(Boolean).join("<br/>");
    //   },
    // },
    // legend: {
    //   show: true,
    //   top: "2%",
    //   right: "5%",
    //   itemWidth: 16,
    //   itemHeight: 8,
    //   itemGap: 12,
    //   textStyle: { color: "#fff", fontSize: 12 },
    //   icon: "roundRect",
    // },
    grid: {
      left: "5%",
      right: "5%",
      top: "20%",
      bottom: "0%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: list.value.map((item) => item.name),
      axisLine: {
        lineStyle: { color: "#03A9F4" },
      },
      axisLabel: {
        interval: 0,
        alignMinLabel: "center",
        textStyle: { fontSize: 10, color: "#FFF" },
      },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "飞行架次(次)",
        minInterval: 1,
        boundaryGap: [0, '20%'],
        nameTextStyle: {
          color: "#00E9FF",
          fontSize: 12,
          padding: [0, 0, 0, -15],
        },
        axisLabel: {
          show: true,
          textStyle: { fontSize: 12, color: "#7DB5DD" },
        },
        axisLine: {
          show: true,
          lineStyle: { color: "#7DB5DD", width: 1 },
        },
        splitLine: {
          show: true,
          lineStyle: { color: "rgba(51, 66, 101, 0.5)", width: 1 },
        },
        axisTick: { show: false },
      },
      {
        type: "value",
        name: "飞行里程(km)",
        boundaryGap: [0, '20%'],
        nameTextStyle: {
          color: "#FFA940",
          fontSize: 12,
          padding: [0, -10, 0, 0],
        },
        axisLabel: {
          show: true,
          textStyle: { fontSize: 12, color: "#FFC171" },
        },
        axisLine: {
          show: true,
          lineStyle: { color: "#FFC171", width: 1 },
        },
        splitLine: { show: false },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: "飞行架次",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        yAxisIndex: 0,
        label: {
          show: true,
          position: "top",
          fontSize: 14,
          color: "#00EEFF",
          distance: 6,
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#01d6fc" },
            { offset: 1, color: "#00c5fe" },
          ]),
        },
        itemStyle: {
          color: "#01d6fc",
          borderColor: "#fff",
          borderWidth: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(1, 214, 252, 0.5)" },
            { offset: 1, color: "rgba(1, 214, 252, 0)" },
          ]),
        },
        data: COUNT,
      },
      {
        name: "飞行里程",
        type: "line",
        smooth: true,
        symbol: "diamond",
        symbolSize: 10,
        yAxisIndex: 1,
        label: {
          show: true,
          position: "top",
          fontSize: 14,
          color: "#FFA940",
          distance: 6,
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#FF8C00" },
            { offset: 1, color: "#FFB74D" },
          ]),
        },
        itemStyle: {
          color: "#FFA940",
          borderColor: "#fff",
          borderWidth: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(255, 140, 0, 0.35)" },
            { offset: 1, color: "rgba(255, 140, 0, 0)" },
          ]),
        },
        data: MILEAGE,
      },
    ],
  };
});

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="less">
.airport-activity-card {
  color: #fff;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .card-body {
    display: flex;
    flex-direction: column;

    flex: 1;
    min-height: 230px;

    .time-selector {
      display: flex;
      background: transparent;
      border: 1px solid rgba(0, 197, 254, 0.3);
      padding: 0;
      margin: 0 10px;

      .time-btn {
        flex: 1;
        text-align: center;
        padding: 5px 0;
        font-size: 14px;
        color: #8bb3e1;
        cursor: pointer;
        transition: all 0.3s;
        border-right: 1px solid rgba(0, 197, 254, 0.3);

        &:last-child {
          border-right: none;
        }

        &:hover {
          color: #fff;
        }

        &.active {
          background: #00c5fe;
          color: #fff;
          font-weight: bold;
        }
      }
    }

    .chart-container {
      flex: 1;
      width: 100%;
    }
  }
}
</style>
