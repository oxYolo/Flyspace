<template>
  <div class="achievement-statistics-card">
    <ModuleTitle :text="'成果统计'" icon="icon-数据统计" type="right" />
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
      <div class="data-display">
        <div class="media-item">
          <div class="icon-wrapper photo-icon">
            <img src="@/assets/images/tool/拍照.svg" alt="Photo" />
          </div>
          <div class="info-wrapper">
            <div class="value-wrapper">
              <span class="value">{{ formatSize(currentData.PHOTO).value }}</span>
              <span class="unit">{{ formatSize(currentData.PHOTO).unit }}</span>
            </div>
            <div class="label">照片大小</div>
          </div>
        </div>
        <div class="media-item">
          <div class="icon-wrapper video-icon">
            <img src="@/assets/images/tool/开始录像.svg" alt="Video" />
          </div>
          <div class="info-wrapper">
            <div class="value-wrapper">
              <span class="value">{{ formatSize(currentData.VIDEO).value }}</span>
              <span class="unit">{{ formatSize(currentData.VIDEO).unit }}</span>
            </div>
            <div class="label">视频大小</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import ModuleTitle from "@/components/common/Title.vue";
import { $getMediaFileSizeStats } from "@/api/flyControl/situationApi";

const timeTypes = [
  { label: "全部", value: "all" },
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

const selectedTimeType = ref("all");
const loading = ref(false);

const statsData = ref<Record<string, any>>({});

const currentData = computed(() => {
  return (
    statsData.value[selectedTimeType.value] || {
      PHOTO: "0.00MB",
      VIDEO: "0.00MB",
    }
  );
});

const formatSize = (sizeStr: string) => {
  if (!sizeStr) {
    return { value: "0.00", unit: "MB" };
  }
  const match = sizeStr.match(/^([\d.]+)(MB|GB|KB|B)$/);
  if (!match) {
    return { value: "0.00", unit: "MB" };
  }
  const num = parseFloat(match[1]);
  const unit = match[2];
  let decimals = 2;
  if (unit === "GB") {
    decimals = 1;
  }
  return {
    value: num.toFixed(decimals),
    unit,
  };
};

const loadData = async () => {
  loading.value = true;
  try {
    const res: any = await $getMediaFileSizeStats();
    if (res?.code === 200 && res.data) {
      statsData.value = res.data;
    }
  } catch (error) {
    console.error("获取媒体文件大小统计数据失败", error);
  } finally {
    loading.value = false;
  }
};

const handleTimeChange = (type: string) => {
  selectedTimeType.value = type;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="less">
.achievement-statistics-card {
  color: #fff;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 15px;
    flex: 1;
    min-height: 180px;

    .time-selector {
      display: flex;
      background: transparent;
      border: 1px solid rgba(0, 197, 254, 0.3);
      padding: 0;
      margin: 0px 10px;

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

    .data-display {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 0 10px 10px;

      .media-item {
        display: flex;
        align-items: center;
        background: url("@/assets/qyfw/03_04底座.png") no-repeat center;
        background-size: 100% 100%;
        padding: 15px 20px;
        min-height: 60px;

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-right: 20px;
          background: rgba(0, 197, 254, 0.1);
          border: 1px solid rgba(0, 197, 254, 0.3);

          img {
            width: 24px;
            height: 24px;
          }
        }

        .info-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: center;

          .value-wrapper {
            display: flex;
            align-items: baseline;

            .value {
              //font-family: com, sans-serif;
              color: #e8fcff;
              line-height: 1;
              font-size: 26px;
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
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            margin-top: 4px;
          }
        }
      }
    }
  }
}
</style>
