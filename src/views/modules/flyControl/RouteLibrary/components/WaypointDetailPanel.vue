<template>
  <div class="waypoint-detail-panel-float">
    <!-- 标题区 -->
    <div class="panel-header">
      <div class="header-left">
        <!-- <el-icon :size="22" class="icon">
          <ZoomIn />
        </el-icon> -->
        <span class="icon-label">{{ action.alt }}</span>
      </div>
      <div class="header-center"></div>
      <div class="header-right">
        <!-- <el-icon class="delete-btn"><Delete /></el-icon> -->
      </div>
    </div>
    <!-- 滑块区 -->
    <div class="slider-area" v-if="action.type == 'angle'">
      <div class="slider-label">
        <span>{{ action.alt }}</span>
        <div>
          <el-input-number
            v-model="action.value"
            size="small"
            class="slider-value-input"
            :controls="false"
            @change="onSliderChange" />
          {{ action.unit }}
        </div>
      </div>
      <div class="slider-controls">
        <el-button size="small" class="gray-btn" @click="dec(action)"
          >-</el-button
        >
        <el-slider
          v-model="action.value"
          :min="action.min"
          :max="action.max"
          style="width: 180px"
          @change="onSliderChange" />
        <el-button size="small" class="gray-btn" @click="inc(action)"
          >+</el-button
        >
      </div>
      <!-- <CompassPanel v-show="action.label === 'aircraftHeading'" :angle="action.value" class="CompassPanel" /> -->
    </div>
    <div class="slider-area" v-else-if="action.label === 'zoom'">
      <div class="slider-label">
        <span>{{ action.alt }}</span>
        <div>
          <span class="slider-value">{{
            Math.round((action["value"] ?? 0) / zoomChange)
          }}</span>
          {{ action.unit }}
        </div>
      </div>
      <div class="slider-controls">
        <el-button
          size="small"
          class="gray-btn"
          @click="dec(action, zoomChange.value)"
          >-</el-button
        >
        <el-slider
          :model-value="Math.round((action['value'] ?? 0) / zoomChange)"
          @update:model-value="(val) => (action['value'] = val * zoomChange)"
          :min="Math.round((action.min ?? 0) / zoomChange)"
          :max="Math.round((action.max ?? 100) / zoomChange)"
          :step="1"
          style="width: 180px"
          @change="onSliderChange" />
        <el-button
          size="small"
          class="gray-btn"
          @click="inc(action, zoomChange.value)"
          >+</el-button
        >
      </div>
    </div>
    <div class="slider-area" v-else-if="action.type == 'number'">
      <div class="slider-label">
        <span>{{ action.alt }}</span>
      </div>
      <div class="slider-controls horizontal">
        <div class="btn-group">
          <button class="alt-button" @click="dec(action, 100)">-100</button>
          <button class="alt-button" @click="dec(action, 10)">-10</button>
          <button class="alt-button" @click="dec(action, 1)">-1</button>
        </div>
        <div class="alt-value-input-group">
          <span
            v-if="!isEditing"
            class="alt-value"
            @click="startEdit(action)"
            >{{ action.value }}</span
          >
          <el-input
            v-else
            v-model.number="editValue"
            type="number"
            class="alt-input"
            size="small"
            :controls="false"
            @blur="stopEdit(action)"
            @keyup.enter="stopEdit(action)"
            style="width: 60px" />
          <span class="unit" @click="startEdit(action)">{{
            action.unit || "s"
          }}</span>
        </div>
        <div class="btn-group">
          <button class="alt-button" @click="inc(action, 1)">+1</button>
          <button class="alt-button" @click="inc(action, 10)">+10</button>
          <button class="alt-button" @click="inc(action, 100)">+100</button>
        </div>
      </div>
    </div>
    <!-- 图片区 -->
    <div class="image-area">
      <div class="image-wrapper">
        <div class="image-tab-bar center-tabs">
          <div
            class="image-tab-btn"
            :class="{ active: activeTab === 0 }"
            @click="activeTab = 0">
            广角 1X [1]
          </div>
          <div
            class="image-tab-btn"
            :class="{ active: activeTab === 1 }"
            @click="activeTab = 1">
            变焦 7X [2]
          </div>
        </div>
        <img :src="images[activeTab]" class="preview-img" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import emitter from "@/stores/mitt";
import { getImageUrl } from "@/utils/utils.ts";
import { updateCurrentWaypointFOVAction } from "@/services/waypointService";

interface Action {
  value: number;
  min?: number;
  max?: number;
  alt?: string;
  type?: string;
  label?: string;
  unit?: string;
}

const action = ref<Action>({
  value: 0,
  min: 0,
  max: 100,
  alt: "",
  type: "",
  label: "",
  unit: "",
});

emitter.on("changeIcon", (icon: any) => {
  action.value = JSON.parse(JSON.stringify(icon));
});

const isEditing = ref(false);
const editValue = ref(0);

const zoomChange = ref(24);

function startEdit(act: Action) {
  isEditing.value = true;
  editValue.value = act.value;
}
function stopEdit(act: Action) {
  isEditing.value = false;
  if (typeof editValue.value === "number" && !isNaN(editValue.value)) {
    act.value = Math.max(
      act.min ?? -Infinity,
      Math.min(act.max ?? Infinity, editValue.value),
    );
    updateCurrentWaypointFOVAction(act.label, act.value);
    emitter.emit("update-action-value", { label: act.label, value: act.value });
  }
}

// 支持步进的 dec/inc
const dec = (act: any, changeStep = 1) => {
  const step = act.label === "zoom" ? zoomChange.value : changeStep;
  act.value = Math.max(act.min ?? 0, act.value - step);
  updateCurrentWaypointFOVAction(act?.label, act.value);
  emitter.emit("update-action-value", { label: act?.label, value: act.value });
};
const inc = (act: any, changeStep = 1) => {
  const step = act.label === "zoom" ? zoomChange.value : changeStep;
  act.value = Math.min(act.max ?? 100, act.value + step);
  updateCurrentWaypointFOVAction(act?.label, act.value);
  emitter.emit("update-action-value", { label: act?.label, value: act.value });
};

function onSliderChange(val: number) {
  if (action.value.label === "zoom") {
    val = val * zoomChange.value;
  }
  updateCurrentWaypointFOVAction(action.value.label, val);
  emitter.emit("update-action-value", {
    label: action.value.label,
    value: val,
  });
}

const activeTab = ref(0);
const images = [
  getImageUrl("/assets/images/drone/media-wide.jpg"),
  getImageUrl("/assets/images/drone/media-zoom.jpg"),
];
</script>

<style scoped>
.waypoint-detail-panel-float {
  position: fixed;
  right: 10px;
  top: 90px;
  z-index: 2000;
  width: 340px;
  min-height: 500px;
  height: calc(100vh - 160px);
  background: rgba(23, 44, 44, 0.9);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  padding: 0;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 48px;
  border-bottom: 1px solid #444;
  background: transparent;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-label {
  font-size: 15px;
  color: #fff;
}
.header-center {
  font-size: 15px;
  color: #90caf9;
  font-weight: bold;
}
.header-right {
  display: flex;
  align-items: center;
}
.delete-btn {
  font-size: 20px;
  color: #aaa;
  cursor: pointer;
  margin-left: 4px;
}
.delete-btn:hover {
  color: #f56c6c;
}
.slider-area {
  padding: 24px 24px 0 24px;
  min-height: 120px;
  .CompassPanel {
    margin: 50px auto 0;
    width: 160px;
    height: 190px;
  }
  :deep(.slider-value-input) {
    width: 80px;
    height: 30px;
    .el-input__wrapper {
      background: transparent !important;
    }
    .el-input__inner {
      color: #2d8cf0 !important;
      font-weight: 900;
      font-size: 20px !important;
    }
  }
}
.slider-label {
  font-size: 15px;
  color: #fff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.slider-value {
  color: #2196f3;
  font-size: 18px;
  font-weight: bold;
  margin-left: 8px;
}
.slider-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gray-btn {
  background: #e0e0e0 !important;
  color: #888 !important;
  border: none !important;
}
.gray-btn:hover {
  background: #cccccc !important;
  color: #666 !important;
}

.alt-button {
  /* 根据图片调整样式 */
  background-color: #444; /* 深灰色按钮背景 */
  color: #fff;
  border: none; /* 移除边框 */
  border-radius: 4px; /* 圆角 */
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  box-sizing: border-box; /* 边框和内边边距包含在尺寸内 */
  height: 23px; /* 固定高度 */
  display: flex; /* 使内容居中 */
  align-items: center;
  justify-content: center;
  padding: 0 4px; /* 移除内边距 */
}

.alt-button:hover {
  background-color: #484848;
  /* border-color: #2d8cf0; */ /* 移除边框悬停颜色 */
}

/* 高度/海拔数值输入框及单位样式 */
.alt-value-input-group {
  display: flex;
  align-items: center;
  gap: 5px; /* 数值和单位的间距 */
  margin: 5px 0; /* 与上下按钮的间距 */
  min-height: 25px; /* 确保高度一致 */
}

.alt-value {
  font-size: 20px; /* 数值字体大小 */
  font-weight: bold;
  color: #2d8cf0; /* 蓝色数值 */
  cursor: pointer;
  min-width: 60px; /* 最小宽度 */
  text-align: center; /* 文本居中 */
  display: inline-block; /* 使 min-width 生效 */
}

/* 覆盖 Element Plus Input 默认样式 - 编辑状态 */
:deep(.alt-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important; /* 输入框背景色改为深灰色 */
  box-shadow: none !important;
  border: 1px solid #444 !important; /* 边框颜色 */
  border-radius: 4px !important;
  padding: 0 8px !important; /* 调整内边距 */
  height: 25px !important; /* 调整高度 */
}

:deep(.alt-input.el-input--small .el-input__inner) {
  color: white !important; /* 数值颜色改为白色 */
  text-align: center !important; /* 数值居中 */
  padding: 0 !important; /* 移除内边距 */
  height: 23px !important; /* 调整高度 */
  line-height: 23px !important; /* 调整行高 */
  font-size: 14px !important; /* 调整字体大小 */
  font-weight: bold !important;
  /* 移除上下箭头按钮 */
  -webkit-appearance: none; /* Chrome, Safari */
  -moz-appearance: textfield; /* Firefox */
}
.image-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0;
}
.image-wrapper {
  position: relative;
  width: 100%;
  height: 280px;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  background: #111;
  display: block;
}
.image-tab-bar {
  position: absolute;
  top: 12px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 0;
  z-index: 2;
}
.center-tabs {
  justify-content: center;
  gap: 0;
}
.image-tab-btn {
  background: rgba(30, 60, 80, 0.85);
  color: #fff;
  font-size: 14px;
  padding: 7px 20px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  opacity: 0.7;
  margin: 0;
}
.image-tab-btn.active {
  background: #225c5c;
  color: #2196f3;
  opacity: 1;
}
.slider-controls.horizontal {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-group {
  display: flex;
  flex-direction: row;
  gap: 4px;
}
.value-edit-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.value {
  font-size: 20px;
  font-weight: bold;
  color: #2d8cf0;
  cursor: pointer;
  min-width: 40px;
  text-align: center;
}
.unit {
  font-size: 14px;
  color: #fff;
  margin-left: 2px;
  cursor: pointer;
}
.value-input {
  width: 60px;
  text-align: center;
}
</style>
