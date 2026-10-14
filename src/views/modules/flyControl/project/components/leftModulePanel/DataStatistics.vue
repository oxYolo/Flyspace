<template>
  <div class="data-statistics-card">
    <ModuleTitle :text="'数据统计'" icon="icon-数据统计" />
    <div
      class="card-body"
      v-loading="loading"
      element-loading-background="rgba(0, 0, 0, 0.1)">
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

      <!-- 数据展示区 -->
      <div class="data-grid">
        <div class="grid-item" v-for="(item, index) in dataList" :key="index">
          <div class="item-content">
            <div class="value-wrapper">
              <span class="value">{{ item.value }}</span>
              <span class="unit">{{ item.unit }}</span>
            </div>
            <div class="label">{{ item.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ModuleTitle from "@/components/common/Title.vue";
import { $getFlightOverview } from "@/api/flyControl/situationApi";

const timeTypes = [
  { label: "全部", value: "all" },
  { label: "今日", value: "day" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

interface StatisticItem {
  label: string;
  value: number | string;
  unit: string;
  key: string;
}

const selectedTimeType = ref("all");
const loading = ref(false);

const dataList = ref<StatisticItem[]>([
  { label: "累计飞行架次", value: 0, unit: "架", key: "flightSortieCount" },
  { label: "累计执行任务数", value: 0, unit: "次", key: "flightTaskCount" },
  {
    label: "累计飞行时长",
    value: "0.00",
    unit: "h",
    key: "totalFlightDurationHours",
  },
  { label: "累计飞行面积", value: "0.00", unit: "km²", key: "totalFlightArea" },
  { label: "巡护里程", value: "0.00", unit: "km", key: "totalMileageKm" },
  { label: "巡护面积", value: "0.00", unit: "km²", key: "patrolFlightArea" },
]);

const formatFixedTwo = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

const loadData = async () => {
  loading.value = true;
  try {
    const res: any = await $getFlightOverview(selectedTimeType.value);
    if (res?.code === 200 && res.data) {
      dataList.value[0].value = res.data.flightSortieCount || 0;
      dataList.value[1].value = res.data.flightTaskCount || 0;
      dataList.value[2].value = formatFixedTwo(
        res.data.totalFlightDurationHours,
      );
      dataList.value[3].value = formatFixedTwo(res.data.totalFlightArea);
      dataList.value[4].value = formatFixedTwo(res.data.totalMileageKm);
      dataList.value[5].value = formatFixedTwo(res.data.patrolFlightArea);
    }
  } catch (error) {
    console.error("获取飞行概览数据失败", error);
  } finally {
    loading.value = false;
  }
};

const handleTimeChange = (type: string) => {
  selectedTimeType.value = type;
  loadData();
};

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="less">
.data-statistics-card {
  color: #fff;
  width: 100%;
  box-sizing: border-box;

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;

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

    .data-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      padding: 0 10px;

      .grid-item {
        display: flex;
        justify-content: center;
        align-items: center;

        .item-content {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: url("@/assets/qyfw/03_04底座.png") no-repeat center;
          background-size: 100% auto;
          min-height: 56px;

          .value-wrapper {
            display: flex;
            align-items: baseline;
            justify-content: center;

            .value {
              //font-family: com, sans-serif;
              color: #e8fcff;
              line-height: 1;
              font-size: 24px;
              font-weight: bold;
              text-shadow:
                0 0 6px rgba(0, 197, 254, 0.45),
                0 0 14px rgba(255, 255, 255, 0.35);
            }

            .unit {
              color: #fff;
              font-size: 14px;
              margin-left: 3px;
            }
          }

          .label {
            color: #fff;
            font-size: 14px;
            margin-top: 2px;
          }
        }
      }
    }
  }
}
</style>
