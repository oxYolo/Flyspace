<!-- 航点航线设置组件 -->
<template>
  <div class="waypoint-settings-container">
    <!-- 添加一个容器类 -->
    <div style="display: flex; justify-content: center;">
      <div
        v-if="!props.isAdding"
        class="reference-point-button"
        :class="{ disabled: props.isAdding }"
        @click="startAddWaypoints">
        <el-icon :size="18"><AddLocation /></el-icon>
        <span>添加航点航线</span>
      </div>
      <div v-else class="reference-point-button" @click="redrawWaypoints">
        <el-icon :size="18"><RefreshRight /></el-icon>
        <span>重新绘制</span>
      </div>
      <!-- <div
        class="reference-point-button"
        :class="{ disabled: props.isAdding }"
        @click="createBdRoute">
        <span>航线生成</span>
      </div> -->
    </div>
    <!-- 拍照设置 和 智能低光 -->
    <div class="section">
      <div class="section-title">拍照设置</div>
      <div class="button-group photo-buttons">
        <div
          class="setting-button"
          :class="{ active: props.selectedPhotoType.includes('wide') }"
          @click="selectPhotoType('wide')">
          广角照片
        </div>
        <div
          class="setting-button"
          :class="{ active: props.selectedPhotoType.includes('zoom') }"
          @click="selectPhotoType('zoom')">
          变焦照片
        </div>
        <div
          class="setting-button"
          :class="{ active: props.selectedPhotoType.includes('infrared') }"
          @click="selectPhotoType('infrared')">
          红外照片
        </div>
      </div>
      <!-- 智能低光 -->
      <!-- <div class="toggle-section smart-low-light">
      <div class="section-title">智能低光</div>
      <el-switch
        :model-value="props.smartLowLightEnabled"
        @update:model-value="emit('update:smartLowLightEnabled', $event)"
        style="--el-switch-off-color: #444"
      />
    </div> -->
    </div>

    <!-- 航点高度模式 -->
    <div class="section height-mode">
      <div class="section-title title-with-tip">
        <span>航点高度模式</span>
        <el-tooltip
          effect="dark"
          placement="right"
          popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>海拔高度：航点高度值相对于海平面高度保持不变。</p>
              <p>相对起飞点高度（ALT）：航点高度值相对起飞点的高度保持不变。</p>
              <p>
                相对地形的高度（AGL）：航点高度值相对地形/模型高度保持不变。
              </p>
            </div>
          </template>
          <el-icon class="title-tip-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div
          class="setting-button"
          :class="{ active: props.selectedHeightMode === 'EGM96' }"
          @click="selectHeightMode('EGM96')">
          海拔高度
        </div>
        <div
          class="setting-button"
          :class="{
            active: props.selectedHeightMode === 'relativeToStartPoint',
          }"
          @click="selectHeightMode('relativeToStartPoint')">
          相对起飞点高度
        </div>
        <div
          class="setting-button"
          :class="{
            active: props.selectedHeightMode === 'aboveGroundLevel',
          }"
          @click="selectHeightMode('aboveGroundLevel')">
          相对地形高度
        </div>
      </div>
      <!-- 高度模式示意图和高度调整 -->
      <div class="climb-settings">
        <div class="diagram">
          <img
            v-if="props.selectedHeightMode === 'EGM96'"
            src="/src/assets/svg/海拔高度.svg"
            alt="海拔高度示意图" />
          <img
            v-if="props.selectedHeightMode === 'relativeToStartPoint'"
            src="/src/assets/svg/相对起飞点高度.svg"
            alt="相对起飞点高度示意图" />
          <img
            v-if="props.selectedHeightMode === 'aboveGroundLevel'"
            src="/src/assets/svg/相对地形高度.svg"
            alt="相对地形高度示意图" />
        </div>
        <div class="altitude-control">
          <div class="alt-button" @click="adjustRouteAltitude(100)">+100</div>
          <div class="alt-button" @click="adjustRouteAltitude(10)">+10</div>
          <div class="alt-value-input-group">
            <span
              v-if="!isRouteAltitudeEditing"
              class="alt-value"
              @click="startRouteAltitudeEdit">
              {{ props.routeAltitude }}
            </span>
            <el-input
              v-else
              v-model.number="routeAltitudeValue"
              type="number"
              class="alt-input"
              :controls="false"
              @blur="stopRouteAltitudeEdit"
              @keyup.enter="stopRouteAltitudeEdit"
              ref="routeAltitudeInputRef" />
            <span class="alt-unit">m</span>
          </div>
          <div class="alt-button" @click="adjustRouteAltitude(-10)">-10</div>
          <div class="alt-button" @click="adjustRouteAltitude(-100)">-100</div>
        </div>
      </div>
    </div>

    <!-- 爬升模式 -->
    <div class="section">
      <div class="section-title title-with-tip">
        <span>爬升模式</span>
        <el-tooltip
          effect="dark"
          placement="right"
          popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>
                <strong>垂直爬升：</strong
                >飞行器爬升到航线起始点高度后，再飞向航线起始点。
              </p>
              <p>
                <strong>倾斜爬升：</strong
                >飞行器爬升到“安全起飞高度”后，再直线飞到航线起始点。
              </p>
              <p><strong>安全起飞高度：</strong>是相对起飞点的高度值。</p>
              <p>飞行器起飞后，会先上升至“安全起飞高度”，再飞向航线起始点</p>
              <img src="/src/assets/svg/returnHeight.svg" alt="返航高度说明" />
            </div>
          </template>
          <el-icon class="title-tip-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div
          class="setting-button large"
          :class="{ active: props.flyToWaylineMode === 'safely' }"
          @click="selectClimbMode('safely')">
          垂直爬升
        </div>
        <div
          class="setting-button large"
          :class="{ active: props.flyToWaylineMode === 'pointToPoint' }"
          @click="selectClimbMode('pointToPoint')">
          倾斜爬升
        </div>
      </div>
      <!-- 爬升模式示意图和高度调整 -->
      <div class="climb-settings">
        <div class="diagram">
          <img src="/src/assets/svg/爬升.svg" alt="爬升示意图" />
        </div>
        <div class="altitude-control">
          <div class="alt-button" @click="adjustClimbAltitude(100)">+100</div>
          <div class="alt-button" @click="adjustClimbAltitude(10)">+10</div>
          <!-- 爬升高度数值和单位 -->
          <div class="alt-value-input-group">
            <span
              v-if="!isClimbAltitudeEditing"
              class="alt-value"
              @click="startClimbAltitudeEdit">
              {{ props.climbAltitude }}
            </span>
            <el-input
              v-else
              v-model.number="climbAltitudeValue"
              type="number"
              class="alt-input"
              :controls="false"
              @blur="stopClimbAltitudeEdit"
              @keyup.enter="stopClimbAltitudeEdit"
              ref="climbAltitudeInputRef" />
            <span class="alt-unit">m</span>
          </div>
          <div class="alt-button" @click="adjustClimbAltitude(-10)">-10</div>
          <div class="alt-button" @click="adjustClimbAltitude(-100)">-100</div>
        </div>
      </div>
    </div>

    <!-- 全局航线速度 -->
    <div class="section speed-section">
      <div class="section-title">全局航线速度</div>
      <div class="speed-control">
        <div class="speed-button" @click="adjustSpeed(-1)">-</div>
        <!-- 速度数值和单位 -->
        <div class="speed-value-input-group">
          <span
            v-if="!isSpeedEditing"
            class="speed-value"
            @click="startSpeedEdit">
            {{ props.routeSpeed }}
          </span>
          <el-input
            v-else
            v-model.number="routeSpeedValue"
            type="number"
            class="speed-input"
            :controls="false"
            @blur="stopSpeedEdit"
            @keyup.enter="stopSpeedEdit"
            ref="speedInputRef" />
          <span class="speed-unit">m/s</span>
        </div>
        <div class="speed-button" @click="adjustSpeed(1)">+</div>
      </div>
    </div>

    <!-- 高级设置 (可折叠) -->
    <div class="section">
      <div class="collapsible-section" @click="toggleAdvancedSettings">
        <div class="section-title">高级设置</div>
        <el-icon :size="16">
          <component
            :is="
              props.advancedSettingsExpanded ? ArrowUpBold : ArrowDownBold
            " />
        </el-icon>
      </div>
      <div
        class="advanced-settings-content"
        v-if="props.advancedSettingsExpanded">
        <div class="advanced-settings-inner">
          <!-- 起飞速度 -->
          <div class="setting-item">
            <div class="setting-title-group">
              <span class="setting-title">起飞速度</span>
            </div>
            <div class="speed-control">
              <div class="speed-button" @click="adjustTakeoffSpeed(-1)">-</div>
              <div class="speed-value-input-group">
                <span
                  v-if="!isTakeoffSpeedEditing"
                  class="speed-value"
                  @click="startTakeoffSpeedEdit">
                  {{ props.takeoffSpeed }}
                </span>
                <el-input
                  v-else
                  v-model.number="takeoffSpeedValue"
                  type="number"
                  class="speed-input"
                  :controls="false"
                  @blur="stopTakeoffSpeedEdit"
                  @keyup.enter="stopTakeoffSpeedEdit"
                  ref="takeoffSpeedInputRef" />
                <span class="speed-unit">m/s</span>
              </div>
              <div class="speed-button" @click="adjustTakeoffSpeed(1)">+</div>
            </div>
          </div>

          <!-- 航点类型 -->
          <div class="setting-item">
            <div class="setting-title-group">
              <span class="setting-title">航点类型</span>
            </div>
            <el-select
              :model-value="props.selectedWaypointType"
              @update:model-value="emit('update:selectedWaypointType', $event)"
              placeholder="选择类型"
              class="black-select"
              popper-class="black-select waypoint-type-dropdown"
              placement="top-start">
              <el-option
                v-for="item in waypointTypes"
                :key="item.value"
                :label="item.label"
                :value="item.value">
                <div class="waypoint-option-content">
                  <span>{{ item.label }}</span>
                  <img :src="item.image" :alt="item.label" />
                </div>
              </el-option>
            </el-select>
          </div>
          <!-- 飞行器偏航角模式 -->
          <div class="setting-item">
            <div class="setting-title-group">
              <span class="setting-title">飞行器偏航角模式</span>
              <div
                v-tooltip="
                  '沿航线方向：飞行器机头沿着航线方向飞至下一航点\n' +
                  '手动控制：飞行器在飞至下一航点的过程中，用户可以手动控制飞行器机头朝向\n' +
                  '锁定当前偏航角：飞行器机头保持执行完航点动作后的飞行器偏航角飞至下一航点'
                "
                class="info-icon">
                i
              </div>
            </div>
            <el-select
              :model-value="props.selectedYawMode"
              @update:model-value="emit('update:selectedYawMode', $event)"
              placeholder="选择模式"
              class="black-select"
              popper-class="black-select"
              :teleported="false">
              <el-option
                v-for="item in yawModes"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
          </div>

          <!-- 航点间云台俯仰控制模式 -->
          <div class="setting-item">
            <div class="setting-title-group">
              <span class="setting-title">航点间云台俯仰控制模式</span>
              <div
                v-tooltip="
                  '手动控制：飞行器从一个航点飞向下一个航点的过程中，支持用户手动控制云台的俯仰角度；若无用户控制，则保持飞离航点时的云台俯仰角度。\n' +
                  '依照每个航点设置：飞行器从一个航点飞向下一个航点的过程中，云台俯仰角均匀过渡至下一个航点的俯仰角。'
                "
                class="info-icon">
                i
              </div>
            </div>
            <el-select
              :model-value="props.selectedGimbalPitchMode"
              @update:model-value="
                emit('update:selectedGimbalPitchMode', $event)
              "
              placeholder="选择模式"
              class="black-select"
              popper-class="black-select"
              :teleported="false">
              <el-option
                v-for="item in gimbalPitchModes"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
          </div>

          <!-- 完成动作 -->
          <div class="setting-item">
            <div class="setting-title-group">
              <span class="setting-title">完成动作</span>
              <div
                v-tooltip="
                  '自动返航：飞行器航线任务完成后，立即飞向起飞点。若飞行器此时处于失联状态或飞向起飞点的过程中飞行器失联，则立即执行失联行为\n' +
                  '返回航线起始点悬停：飞行器航线任务完成后，立即飞向起始点（S点），若飞行器此时处于失联状态或飞向起始点（S点）的过程中飞行器失联，则立即执行失联行为\n' +
                  '退出航线模式：飞行器航线任务完成后，立即退出航线模式，并悬停在原点。若飞行器此时处于失联状态，则立即执行失联行为\n' +
                  '原地降落：飞行器航线任务完成后，立即开始降落。若飞行器此时处于失联状态或在降落过程中失联，则立即执行失联行为'
                "
                class="info-icon">
                i
              </div>
            </div>
            <el-select
              :model-value="props.selectedCompletionAction"
              @update:model-value="
                emit('update:selectedCompletionAction', $event)
              "
              placeholder="选择动作"
              class="black-select"
              popper-class="black-select"
              :teleported="false">
              <el-option
                v-for="item in completionActions"
                :key="item.value"
                :label="item.label"
                :value="item.value">
              </el-option>
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <CreateBeiDouRouteDialog
      v-if="createBdRouteVisible"
      @close="handleCloseBdVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { ElInput, ElSelect, ElOption, ElIcon, ElTooltip } from "element-plus";
import { ElMessage } from "element-plus";
import {
  ArrowUpBold,
  ArrowDownBold,
  AddLocation,
  QuestionFilled,
  RefreshRight,
} from "@element-plus/icons-vue"; // 导入需要的图标
import emitter from "@/stores/mitt";

import {
  startDrawingWaypoints,
  setWaypointDefaultAltitude,
  setWaypointRouteSpeed,
  // @ts-ignore
} from "@/services/waypointService";
import CreateBeiDouRouteDialog from "@/views/modules/flyControl/RouteLibrary/components/CreateBeiDouRouteDialog.vue";

// 定义组件接收的 props
const props = defineProps<{
  selectedPhotoType: string[];
  smartLowLightEnabled: boolean;
  flyToWaylineMode: string;
  climbAltitude: number;
  selectedHeightMode: string;
  routeAltitude: number;
  routeSpeed: number;
  advancedSettingsExpanded: boolean; // 控制高级设置展开状态
  takeoffSpeed: number;
  selectedWaypointType: string;
  selectedYawMode: string;
  selectedGimbalPitchMode: string;
  selectedCompletionAction: string;
  isAdding: boolean;
}>();

// 定义组件可以触发的事件
const emit = defineEmits([
  "update:selectedPhotoType",
  "update:smartLowLightEnabled",
  "update:flyToWaylineMode",
  "update:climbAltitude",
  "update:selectedHeightMode",
  "update:routeAltitude",
  "update:routeSpeed",
  "update:advancedSettingsExpanded", // 高级设置展开状态更新事件
  "update:takeoffSpeed",
  "update:selectedWaypointType",
  "update:selectedYawMode",
  "update:selectedGimbalPitchMode",
  "update:selectedCompletionAction",
  "update:isAdding",
]);

// 内部状态用于编辑输入框，与 prop 同步
const climbAltitudeValue = ref(props.climbAltitude);
const routeAltitudeValue = ref(props.routeAltitude);
const routeSpeedValue = ref(props.routeSpeed);
const takeoffSpeedValue = ref(props.takeoffSpeed);

// 监听 props 变化，同步到内部编辑状态
watch(
  () => props.climbAltitude,
  (newVal) => {
    climbAltitudeValue.value = newVal;
  },
);
watch(
  () => props.routeAltitude,
  (newVal) => {
    routeAltitudeValue.value = newVal;
    setWaypointDefaultAltitude(newVal);
  },
);
watch(
  () => props.routeSpeed,
  (newVal) => {
    routeSpeedValue.value = newVal;
    setWaypointRouteSpeed(newVal);
  },
  { immediate: true },
);
watch(
  () => props.takeoffSpeed,
  (newVal) => {
    takeoffSpeedValue.value = newVal;
  },
);

// 编辑状态
const isClimbAltitudeEditing = ref(false);
const isRouteAltitudeEditing = ref(false);
const isSpeedEditing = ref(false);
const isTakeoffSpeedEditing = ref(false);

// Input 元素的引用，用于聚焦
const climbAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const routeAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const speedInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const takeoffSpeedInputRef = ref<InstanceType<typeof ElInput> | null>(null);

// 航点类型选项数据
const waypointTypes = ref([
  {
    value: "coordinateTurn",
    label: "协调转弯，不过点，提前转弯",
    image: "/src/assets/svg/航点类型-协调转弯.svg",
  },
  {
    value: "toPointAndStopWithDiscontinuityCurvature",
    label: "直线飞行, 飞行器到点停",
    image: "/src/assets/svg/航点类型-直线飞行.svg",
  },
  // { value: 'smooth_turn', label: '平滑过点，提前转弯', image: '/src/assets/svg/航点类型-平滑过点.svg' },
  {
    value: "toPointAndStopWithContinuityCurvature",
    label: "曲线飞行, 飞行器到点停",
    image: "/src/assets/svg/航点类型-曲线到点停.svg",
  },
  {
    value: "toPointAndPassWithContinuityCurvature",
    label: "曲线飞行, 飞行器过点不停",
    image: "/src/assets/svg/航点类型-曲线过点不停.svg",
  },
]);
// 飞行器偏航角模式选项数据
const yawModes = ref([
  { value: "followWayline", label: "沿航线方向" },
  { value: "manually", label: "手动控制" },
  { value: "fixed", label: "锁定当前偏航角" },
  // 根据需要添加更多选项
]);

// 航点间云台俯仰控制模式选项数据
const gimbalPitchModes = ref([
  { value: "manual", label: "手动控制" },
  { value: "usePointSetting", label: "依照每个航点控制" },
  // 根据需要添加更多选项
]);

// 完成动作选项数据
const completionActions = ref([
  { value: "goHome", label: "自动返航" },
  { value: "gotoFirstWaypoint", label: "返回航线起始点悬停" },
  { value: "noAction", label: "退出航线模式" },
  { value: "autoLand", label: "原地降落" },
  // 根据需要添加更多选项
]);
// 开始添加航点
function startAddWaypoints() {
  if (props.isAdding) return;
  emit("update:isAdding", true);
  emitter.emit("waypoint-route-drawing-start");
  ElMessage.info("左键添加航点，右键结束绘制并生成避障航线");
  // 设置默认高度
  setWaypointDefaultAltitude(props.routeAltitude);
  startDrawingWaypoints();
}

async function redrawWaypoints() {
  emit("update:isAdding", false);
  emitter.emit("changeAdding", false);
  emitter.emit("reset-map");
  await nextTick();
  startAddWaypoints();
}
// 创建避障航线
const createBdRouteVisible = ref(false);
function createBdRoute() {
  if (props.isAdding) return;
  emit("update:isAdding", true);
  createBdRouteVisible.value = true;
}
// 关闭避障航线弹窗
function handleCloseBdVisible(flag: boolean) {
  if (!flag) {
    emit("update:isAdding", false);
  }
  createBdRouteVisible.value = false;
}
// 停止添加航点
function stopAddWaypoints() {
  emit("update:isAdding", false);
}

// --- 方法 ---

// 选择拍照类型
const selectPhotoType = (type: string) => {
  const newSelectedTypes = [...props.selectedPhotoType]; // 创建副本
  const index = newSelectedTypes.indexOf(type);
  if (index > -1) {
    // 如果已选中，则移除
    newSelectedTypes.splice(index, 1);
  } else {
    // 如果未选中，则添加
    newSelectedTypes.push(type);
  }
  emit("update:selectedPhotoType", newSelectedTypes); // 触发更新事件
};

// 选择爬升模式
const selectClimbMode = (mode: string) => {
  emit("update:flyToWaylineMode", mode); // 触发更新事件
};

// 调整爬升高度
const adjustClimbAltitude = (delta: number) => {
  const newValue = props.climbAltitude + delta;
  // 可以添加边界检查
  const finalValue = newValue < 0 ? 0 : newValue;
  emit("update:climbAltitude", finalValue); // 触发更新事件
};

// 爬升高度开始编辑
const startClimbAltitudeEdit = () => {
  isClimbAltitudeEditing.value = true;
  nextTick(() => {
    climbAltitudeInputRef.value?.focus();
  });
};

// 爬升高度停止编辑
const stopClimbAltitudeEdit = () => {
  isClimbAltitudeEditing.value = false;
  // 可以在这里添加数值验证或格式化，并确保通过 emit 更新父组件状态
  emit("update:climbAltitude", climbAltitudeValue.value);
};

// 选择航点高度模式
const selectHeightMode = (mode: string) => {
  emit("update:selectedHeightMode", mode); // 触发更新事件
};

// 调整航线高度
const adjustRouteAltitude = (delta: number) => {
  const newValue = props.routeAltitude + delta;
  // 可以添加边界检查
  const finalValue = newValue < 0 ? 0 : newValue;
  emit("update:routeAltitude", finalValue); // 触发更新事件
  setWaypointDefaultAltitude(finalValue);
};

// 航线高度开始编辑
const startRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = true;
  nextTick(() => {
    routeAltitudeInputRef.value?.focus();
  });
};

// 航线高度停止编辑
const stopRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = false;
  // 可以在这里添加数值验证或格式化
  emit("update:routeAltitude", routeAltitudeValue.value);
  setWaypointDefaultAltitude(routeAltitudeValue.value);
};

// 调整航线速度
const adjustSpeed = (delta: number) => {
  const newValue = props.routeSpeed + delta;
  // 可以添加边界检查
  const finalValue = newValue < 1 ? 1 : newValue; // 假设最小速度为 1
  setWaypointRouteSpeed(finalValue);
  emit("update:routeSpeed", finalValue); // 触发更新事件
};

// 航线速度开始编辑
const startSpeedEdit = () => {
  isSpeedEditing.value = true;
  nextTick(() => {
    speedInputRef.value?.focus();
  });
};

// 航线速度停止编辑
const stopSpeedEdit = () => {
  isSpeedEditing.value = false;
  // 可以在这里添加数值验证或格式化
  const finalValue = routeSpeedValue.value < 1 ? 1 : routeSpeedValue.value; // 最小速度为 1
  setWaypointRouteSpeed(finalValue);
  emit("update:routeSpeed", finalValue);
};

// 调整起飞速度
const adjustTakeoffSpeed = (delta: number) => {
  const newValue = props.takeoffSpeed + delta;
  const finalValue = newValue < 1 ? 1 : newValue; // 假设最小速度为 1
  emit("update:takeoffSpeed", finalValue); // 触发更新事件
};

// 起飞速度开始编辑
const startTakeoffSpeedEdit = () => {
  isTakeoffSpeedEditing.value = true;
  nextTick(() => {
    takeoffSpeedInputRef.value?.focus();
  });
};

// 起飞速度停止编辑
const stopTakeoffSpeedEdit = () => {
  isTakeoffSpeedEditing.value = false;
  // 可以在这里添加数值验证或格式化
  emit("update:takeoffSpeed", takeoffSpeedValue.value);
};

// 切换高级设置展开/收起状态
const toggleAdvancedSettings = () => {
  emit("update:advancedSettingsExpanded", !props.advancedSettingsExpanded); // 触发更新事件
};

defineExpose({ stopAddWaypoints });
</script>

<style lang="less" scoped>
.waypoint-settings-container {
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 之间的间距 */
}

/* 顶部的参考起飞点按钮样式 (从 RouteSettingsPanel.vue 迁移过来) */
.reference-point-button {
  flex: 1;
  background-color: #2d8cf0; /* 蓝色背景 */
  color: white;
  padding: 12px 20px; /* 调整内边距 */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  gap: 8px; /* 图标和文字的间距 */
  transition: background-color 0.2s ease;
  margin-top: 10px;
}

.reference-point-button:hover {
  background-color: #1a7cdb; /* 悬停颜色 */
}

.reference-point-button.disabled {
  background-color: #888 !important;
  color: #ccc !important;
  cursor: not-allowed !important;
  pointer-events: none;
}

/* 从 RouteSettingsPanel_old.vue 迁移过来的样式 */
.waypoint-settings-container .section {
  /* 样式应用到容器内的 section */
  background-color: rgba(51, 51, 51, 0.6); /* 功能块背景色，比抽屉背景稍浅 */
  padding: 15px; /* 功能块内边距 */
  border-radius: 8px; /* 功能块圆角 */
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 内部元素间距 */
  margin-bottom: 0;
}
/* WaypointRouteSettings 组件的根容器样式 */
.waypoint-route-settings {
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 之间的间距 */
}

/* 从 RouteSettingsPanel_old.vue 迁移过来的样式 */
.section {
  background-color: rgba(51, 51, 51, 0.6); /* 功能块背景色，比抽屉背景稍浅 */
  padding: 15px; /* 功能块内边距 */
  border-radius: 8px; /* 功能块圆角 */
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 内部元素间距 */
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.title-tip-icon {
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 15px;
}

.title-tip-icon:hover {
  color: #fff;
}

:global(.route-height-tooltip) {
  max-width: 360px;
  padding: 18px 20px !important;
  border: none !important;
  background-color: rgba(51, 51, 51, 0.9) !important;
}

:global(.route-height-tip-content) {
  color: #fff;
  font-size: 14px;
  line-height: 1.7;
}

:global(.route-height-tip-content p) {
  margin: 0 0 12px;
}

:global(.route-height-tip-content img) {
  display: block;
  width: 300px;
  max-width: 100%;
  margin: 8px auto 0;
}

.required-title::before {
  content: "* ";
  color: #f56c6c;
}

.button-group {
  display: flex;
  /* gap: 27px; */ /* 移除默认 gap */
}

.setting-button {
  background-color: #444; /* 按钮背景色，比功能块背景浅 */
  color: #fff;
  border: none; /* 移除边框 */
  padding: 8px 0px; /* 调整内边距 */
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1; /* 使按钮组中的按钮平均分配空间 */
  min-width: 0; /* 允许缩小 */
}

/* 拍照按钮的圆角 */
.button-group.photo-buttons {
  gap: 10px; /* 拍照按钮之间的间距 */
}
.button-group.photo-buttons .setting-button {
  border-radius: 20px; /* 更大的圆角 */
  padding: 4px 16px; /* 调整内边距 */
}

.setting-button.large {
  padding: 8px 20px; /* 较大的按钮内边距 */
}

.setting-button:hover {
  background-color: #484848; /* 悬停背景色 */
  /* border-color: #2d8cf0; */ /* 移除边框悬停颜色 */
}

.setting-button.active {
  background-color: #2d8cf0; /* 选中背景色 */
  /* border-color: #2d8cf0; */ /* 移除边框选中颜色 */
  color: white; /* 选中文字颜色 */
}

/* 分段控制样式 */
.button-group.segmented-control {
  gap: 0; /* 移除 gap */
  border-radius: 4px; /* 整体圆角 */
  overflow: hidden; /* 隐藏内部按钮的溢出边框 */
  border: 1px solid #444; /* 整体边框 */
}

.button-group.segmented-control .setting-button {
  background-color: #444; /* 分段控制按钮背景色，比普通按钮深 */
  border: none; /* 移除内部按钮的独立边框 */
  border-right: 1px solid #444; /* 添加右侧边框作为分隔线 */
  border-radius: 0; /* 移除内部按钮圆角 */
  flex-basis: 0; /* 确保 flex-grow 1 有效 */
}

.button-group.segmented-control .setting-button:last-child {
  border-right: none; /* 最后一个按钮没有右侧边框 */
}

.button-group.segmented-control .setting-button.active {
  /* 选中状态样式 */
  background-color: #2d8cf0;
  color: white;
}

/* 高级设置中的分段控制样式 */
.button-group.segmented-control.advanced-settings-segmented-control {
  flex-wrap: wrap; /* 允许换行 */
  gap: 5px; /* 换行后的间距 */
  border: none; /* 移除整体边框 */
  border-radius: 0; /* 移除整体圆角 */
  overflow: visible; /* 允许溢出 */
}

.button-group.segmented-control.advanced-settings-segmented-control
  .setting-button {
  flex-basis: auto; /* 恢复 flex-basis */
  flex-grow: 0; /* 不强制拉伸 */
  border: 1px solid #444; /* 添加独立边框 */
  border-radius: 4px; /* 添加圆角 */
  padding: 6px 12px; /* 调整内边距 */
  border-right: 1px solid #444; /* 恢复右侧边框 */
}

.button-group.segmented-control.advanced-settings-segmented-control
  .setting-button:last-child {
  border-right: 1px solid #444; /* 最后一个按钮也有右侧边框 */
}

/* 智能低光部分样式 */
.toggle-section.smart-low-light {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* 移除 section 默认的 gap 影响 */
  margin-top: 10px; /* 与上方拍照按钮的间距 */
}

.climb-settings,
.height-settings {
  /* 复用样式 */
  display: flex;
  align-items: center;
  gap: 0px; /* 减小间距 */
}

.diagram {
  flex-shrink: 0; /* 防止示意图被压缩 */
  /* 示意图尺寸根据实际图片调整 */
  width: 220px; /* 示例宽度，增大 */
  height: 158px; /* 示例高度，增大 */
  display: flex;
  align-items: center;
  justify-content: center;
  /* 可以添加边框或背景 */
  box-sizing: border-box; /* 边框和内边距包含在尺寸内 */
}

.diagram img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.altitude-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  flex-grow: 1; /* 占据剩余空间 */
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
  width: 50px; /* 固定宽度 */
  height: 25px; /* 固定高度 */
  display: flex; /* 使内容居中 */
  align-items: center;
  justify-content: center;
  padding: 0; /* 移除内边距 */
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
}

.alt-unit {
  font-size: 14px; /* 单位字体大小 */
  color: #fff; /* 单位颜色 */
  flex-shrink: 0; /* 防止单位被压缩 */
}

.speed-section {
  display: flex;
  flex-direction: column; /* 速度部分改为垂直布局 */
  gap: 10px; /* 标题和控制之间的间距 */
}

.speed-control {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 使加减按钮和数值分散对齐 */
  gap: 10px; /* 减小间距 */
  border-radius: 4px;
  padding: 8px 15px; /* 调整内边距 */
}

.speed-button {
  /* 根据图片调整样式 */
  background-color: #444; /* 深灰色按钮背景 */
  color: #fff;
  border: none; /* 移除边框 */
  border-radius: 4px; /* 圆角 */
  width: 30px; /* 按钮宽度 */
  height: 30px; /* 按钮高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  flex-shrink: 0; /* 防止被压缩 */
}

.speed-button:hover {
  background-color: #484848;
  /* border-color: #2d8cf0; */ /* 移除边框悬停颜色 */
}

/* 速度数值输入框及单位样式 */
.speed-value-input-group {
  display: flex;
  align-items: center;
  gap: 5px; /* 数值和单位的间距 */
  min-height: 30px; /* 确保高度一致 */
}

.speed-value {
  font-size: 28px;
  font-weight: bold;
  color: #2d8cf0; /* 蓝色数值 */
  flex-grow: 1; /* 使数值占据中心剩余空间 */
  text-align: center; /* 数值居中 */
  cursor: pointer;
  min-width: 60px; /* 最小宽度 */
}

/* 覆盖 Element Plus Input 默认样式 - 编辑状态 */
:deep(.speed-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important; /* 输入框背景色改为深灰色 */
  box-shadow: none !important;
  border: 1px solid #444 !important; /* 边框颜色 */
  border-radius: 4px !important;
  padding: 0 8px !important; /* 调整内边距 */
  height: 33px !important; /* 调整高度 */
}

:deep(.speed-input.el-input--small .el-input__inner) {
  color: white !important; /* 数值颜色改为白色 */
  text-align: center !important; /* 数值居中 */
  padding: 0 !important; /* 移除内边距 */
  height: 28px !important; /* 调整高度 */
  line-height: 28px !important; /* 调整行高 */
  font-size: 14px !important; /* 调整字体大小 */
  font-weight: bold !important;
}

.speed-unit {
  font-size: 14px; /* 单位字体大小 */
  color: #fff; /* 单位颜色 */
  flex-shrink: 0; /* 防止单位被压缩 */
}

/* 高级设置样式 */
.collapsible-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 5px 0; /* 调整内边距 */
}

.advanced-settings-content {
  margin-top: 10px; /* 与标题的间距 */
  /* 可以添加动画效果 */
  transition:
    max-height 0.3s ease-out,
    opacity 0.3s ease-out;
  overflow: hidden;
  /* max-height 和 opacity 会在 v-if 切换时自动处理 */
}

.advanced-settings-inner {
  display: flex;
  flex-direction: column;
  gap: 15px; /* 高级设置内部项目间距 */
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px; /* 标题组和控制之间的间距 */
}

.setting-title-group {
  display: flex;
  align-items: center;
  gap: 5px; /* 标题和信息图标的间距 */
}

.setting-title {
  font-size: 13px; /* 调整字体大小 */
  color: #fff; /* 调整颜色 */
}

.info-icon {
  background-color: #555;
  color: white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  flex-shrink: 0; /* 防止被压缩 */
}

/* 航点类型选项内容样式 */
.waypoint-option-content {
  display: flex;
  flex-direction: column; /* 图片和文字垂直排列 */
  align-items: flex-start; /* 文字靠左对齐 */
  padding: 5px 0; /* 上下内边距 */
}

.waypoint-option-content span {
  font-size: 14px; /* 文字大小 */
  text-align: left; /* 文字左对齐 */
  margin-bottom: 5px; /* 文字和图片的间距 */
  width: 100%; /* 文字宽度填充容器 */
}

.waypoint-option-content img {
  max-width: 280px; /* 增大图片最大宽度 */
  height: auto; /* 高度自适应，保持比例 */
  object-fit: contain; /* 保持图片比例 */
  border-radius: 4px; /* 圆角 */
}
</style>
