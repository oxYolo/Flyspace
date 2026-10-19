<template>
  <div
    class="top-center-overview"
    :class="{ 'is-chatbot-open': chatbot.visible }">
    <div
      class="overview-box"
      v-for="(item, index) in overviewList"
      :key="index">
      <div class="box-content">
        <div class="value-wrapper">
          <span class="value">{{ item.value }}</span>
          <span class="unit">{{ item.unit }}</span>
        </div>
        <div class="label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useChatbotStore } from "@/stores/chatbot";
import { $getDeviceOverviewStats } from "@/api/flyControl/situationApi";

const chatbot = useChatbotStore();

interface OverviewItem {
  label: string;
  value: number | string;
  unit: string;
}

const overviewList = ref<OverviewItem[]>([
  { label: "在线设备", value: 0, unit: "架" },
  { label: "离线设备", value: 0, unit: "架" },
  { label: "累计里程", value: "0.00", unit: "km" },
  { label: "累计时长", value: "0.00", unit: "h" },
]);

const loadData = async () => {
  try {
    const res: any = await $getDeviceOverviewStats();
    if (res?.code === 200 && res.data) {
      overviewList.value[0].value = res.data.onlineCount || 0;
      overviewList.value[1].value = res.data.offlineCount || 0;
      overviewList.value[2].value = Number(
        res.data.totalFlightMileageKm || 0,
      ).toFixed(2);
      overviewList.value[3].value = Number(
        res.data.totalFlightDurationHours || 0,
      ).toFixed(2);
    }
  } catch (error) {
    console.error("获取设备总览统计数据失败", error);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style lang="less" scoped>
.top-center-overview {
  position: absolute;
  top: 90px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 18px;
  z-index: 10;
  pointer-events: auto;

  &.is-chatbot-open {
    flex-wrap: wrap;
    width: 354px; // 168px * 2 + 18px gap
  }

  .overview-box {
    width: 168px;
    height: 86px;
    background: url("@/assets/qyfw/03_04底座.png") no-repeat center;
    background-size: 100% 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .box-content {
      text-align: center;
      width: 100%;
      padding: 0 14px;

      .value-wrapper {
        display: flex;
        align-items: baseline;
        justify-content: center;

        .value {
          font-family: com, sans-serif;
          color: #e8fcff;
          font-size: 24px;
          line-height: 1;
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
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        margin-top: 6px;
        line-height: 1;
      }
    }
  }
}
</style>
