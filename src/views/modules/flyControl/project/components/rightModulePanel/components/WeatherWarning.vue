<template>
  <div class="weather-warning-panel module-right">
    <ModuleTitle :text="'天气预警'" icon="icon-天气预警" />
    <div class="close-btn" @click="emit('close')" title="关闭">
      <el-icon :size="20"><Close /></el-icon>
    </div>

    <div class="card-body">
      <div
        class="warning-item"
        v-for="(item, index) in warningData"
        :key="index">
        <!-- 预警内容 -->
        <div class="time">
          <img src="@/assets/images/weather/time_icon.png" alt="" />
          <span>{{ item.createTime }}</span>
        </div>
        <div class="warning-content">
          <div class="title" v-tooltip="item.title">{{ item.title }}</div>
          <div class="desc" v-tooltip="item.alarmContent">
            {{ item.alarmContent }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ModuleTitle from "@/components/common/Title.vue";
import { useRightCenterModule } from "../composables/useRightCenterModule";
import { Close } from "@element-plus/icons-vue";

const emit = defineEmits(["close"]);
const { warningData } = useRightCenterModule();
</script>

<style lang="less" scoped>
.weather-warning-panel {
  position: absolute;
  right: 100%;
  top: 0;
  width: 320px;
  height: 100%;
  margin-right: 10px;
  z-index: 10;
  pointer-events: auto;
  padding-bottom: 10px;

  .close-btn {
    position: absolute;
    top: 12px;
    right: 20px;
    cursor: pointer;
    color: #04d9ff;
    transition: all 0.3s;
    z-index: 10;
    &:hover {
      color: #fff;
      transform: scale(1.1);
    }
  }

  .card-body {
    width: 100%;
    height: calc(100% - 60px);
    overflow-y: auto;

    .warning-item {
      display: flex;
      align-items: flex-end;
      gap: 5px;
      border-radius: 2px;

      margin-bottom: 20px;
      height: 80px;
      background-size: 100% 100%;
      position: relative;
      flex-direction: column;
      .time {
        font-size: 16px;
        color: #409eff;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        width: 100%;
      }
      .warning-content {
        flex: 1;
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
          color: #f5ac32;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 310px;
        }

        .desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 310px;
        }
      }
    }
  }
}
</style>
