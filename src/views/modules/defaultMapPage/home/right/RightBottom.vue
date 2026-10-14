<template>
  <div
    class="common-border con height32"
    v-loading="loading"
    element-loading-text="获取数据中~"
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(0, 0, 0, 0.2)">
    <ModuleTitle text="飞行记录统计" type="right" icon="icon-能源管理" />
    <EasyChart
      style="height: calc(100% - 30px); margin-top: 10px"
      :options="chartOption" />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import * as echarts from "echarts";
import ModuleTitle from "@/components/common/Title.vue";
import EasyChart from "@/components/common/EasyChart.vue";

interface DataItem {
  label: string;
  value1: string;
  value2: string;
}

interface DataOption {
  type: string;
  unit: string;
  label: string[];
  data: DataItem[];
}

const loading = ref(false);
const energyData = ref<DataOption>({} as DataOption);

// 1. 三架无人机真实作业基准量 (大幅拉开每天的差距，让曲线动起来)
// 周一到周日：恢复高峰(15h) -> 正常巡检(10h) -> 阴雨降温(3h) -> 正常(11h) -> 密集突击(16h) -> 周六微调(5h) -> 周日整备(0h)
const baseFlightHours = [15.2, 10.5, 3.2, 11.8, 16.5, 5.0, 0.0];
const baseTaskCounts = [22, 15, 4, 17, 24, 7, 0];

const generateWeeklyData = (): DataOption[] => {
  const flightData: DataItem[] = [];
  const taskData: DataItem[] = [];

  let currentTotalHours = 1642.5;
  let currentTotalTasks = 2110;

  const today = new Date();

  // 循环生成截止到昨天的过去 7 天
  for (let i = 7; i >= 1; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);

    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const dateLabel = `${month}-${day}`;

    const dayOfWeek = targetDate.getDay();
    const baseIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 🟢 加大随机扰动系数（在基准上允许上下 25% 波动），让曲线起伏更明显
    const randomFactor = 0.75 + Math.random() * 0.5;

    // 计算当日与累计飞行时长
    let v1_hours =
      baseFlightHours[baseIndex] === 0
        ? 0
        : Number((baseFlightHours[baseIndex] * randomFactor).toFixed(1));
    currentTotalHours = Number((currentTotalHours + v1_hours).toFixed(1));

    // 计算当日与累计完成架次
    let v1_tasks =
      baseTaskCounts[baseIndex] === 0
        ? 0
        : Math.round(baseTaskCounts[baseIndex] * randomFactor);
    currentTotalTasks += v1_tasks;

    flightData.push({
      label: dateLabel,
      value1: String(v1_hours),
      value2: String(currentTotalHours),
    });

    taskData.push({
      label: dateLabel,
      value1: String(v1_tasks),
      value2: String(currentTotalTasks),
    });
  }

  return [
    {
      type: "飞行时长",
      unit: "小时",
      label: ["日飞行时长", "累计飞行时长"],
      data: flightData,
    },
    {
      type: "任务完成",
      unit: "架次",
      label: ["日完成任务", "累计完成任务"],
      data: taskData,
    },
  ];
};

const dataOptions = ref<DataOption[]>(generateWeeklyData());

const chartOption = computed(() => {
  if (!energyData.value.type) return {};
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        lineStyle: {
          color: "#57617B",
        },
      },
    },
    legend: {
      icon: "rect",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 13,
      top: "0%",
      textStyle: {
        fontSize: 16,
        color: "#fff",
      },
    },
    grid: {
      left: "5%",
      right: "10%",
      bottom: "40",
      top: "15%",
      containLabel: true,
    },
    xAxis: [
      {
        type: "category",
        boundaryGap: false,
        axisTick: {
          show: false,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: "#0c54a4",
          },
        },
        axisLabel: {
          margin: 20,
          textStyle: {
            fontSize: 16,
            color: "#fff",
          },
        },
        data: energyData.value.data?.map((el) => el.label) || [],
      },
    ],
    yAxis: [
      {
        type: "value",
        name: energyData.value.unit,
        nameTextStyle: {
          fontSize: 16,
          padding: [0, 15, 5, 0],
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
          lineStyle: {
            color: "#9397a3",
          },
        },
        axisLabel: {
          margin: 5,
          textStyle: {
            fontSize: 16,
          },
        },
        splitLine: {
          lineStyle: {
            color: "#2e3c5e",
          },
        },
      },
    ],
    series: [
      {
        name: energyData.value.label?.[0] || "",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: {
          normal: {
            width: 3,
          },
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
            {
              offset: 0,
              color: "rgba(0,255,240,0)",
            },
            {
              offset: 1,
              color: "rgba(0,255,240,0.6)",
            },
          ]),
        },
        itemStyle: {
          normal: {
            color: "#10d8cc",
          },
          emphasis: {
            color: "#00fff0",
            borderWidth: 10,
          },
        },
        data: energyData.value.data?.map((el) => el.value1) || [],
      },
      {
        name: energyData.value.label?.[1] || "",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        lineStyle: {
          normal: {
            width: 3,
          },
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 1, 0, 0, [
            {
              offset: 0,
              color: "rgba(255, 219, 53, 0)",
            },
            {
              offset: 1,
              color: "rgba(255, 219, 53, 0.5)",
            },
          ]),
        },
        itemStyle: {
          normal: {
            color: "#ffdb35",
          },
          emphasis: {
            color: "rgb(255, 219, 53)",
            borderWidth: 10,
          },
        },
        data: energyData.value.data?.map((el) => el.value2) || [],
      },
    ],
  };
});

onMounted(() => {
  energyData.value = dataOptions.value[0];
});
</script>

<style lang="less" scoped>
.con {
  position: relative;
  .tab {
    position: absolute;
    top: 10px;
    right: 50px;
    color: #fff;
    font-size: 17px;
    display: flex;
    border-radius: 5px;
    cursor: pointer;
    overflow: hidden;

    div {
      padding: 5px 10px;
    }
  }
}
</style>
