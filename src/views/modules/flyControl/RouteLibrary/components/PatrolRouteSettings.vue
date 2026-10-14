<template>
  <div class="patrol-settings-container">
    <!-- 顶部的四个信息展示块 -->
    <div class="info-blocks">
      <div class="info-block">
        <div class="info-icon-wrapper">
            <!-- TODO: 替换为实际的面积SVG图标 -->
            <img src="/src/assets/svg/航线设置-面积.svg" alt="面积图标"> <!-- 使用 img 标签作为占位 -->
        </div>
        <div class="info-value">0 m²</div> <!-- 数值和单位合并 -->
      </div>
      <div class="info-block">
         <div class="info-icon-wrapper">
            <!-- TODO: 替换为实际的距离SVG图标 -->
            <img src="/src/assets/svg/航线设置-路线.svg" alt="距离图标"> <!-- 使用 img 标签作为占位 -->
        </div>
        <div class="info-value">0 m</div> <!-- 数值和单位合并 -->
      </div>
      <div class="info-block">
         <div class="info-icon-wrapper">
            <!-- TODO: 替换为实际的时长SVG图标 -->
            <img src="/src/assets/svg/航线设置-时间.svg" alt="时长图标"> <!-- 使用 img 标签作为占位 -->
        </div>
        <div class="info-value">0 s</div> <!-- 数值和单位合并 -->
      </div>
      <div class="info-block">
         <div class="info-icon-wrapper">
            <!-- TODO: 替换为实际的目标SVG图标 (与智能识别告警标题图标一致) -->
            <img src="/src/assets/svg/航线设置-识别.svg" alt="目标图标"> <!-- 使用 img 标签作为占位 -->
        </div>
        <div class="info-value">0</div> <!-- 数值 -->
      </div>
    </div>

    <!-- 智能识别告警、全程录像、告警信息 的外部容器，带渐变边框 -->
    <div class="settings-group-container">
      <!-- 智能识别告警 -->
      <div class="section"> <!-- 移除 alarm-section 类，背景色应用到内部 -->
        <div class="collapsible-section alarm-title-bar" @click="toggleAlarmSettings"> <!-- 添加 alarm-title-bar 类 -->
          <div class="section-title-with-icon">
             <!-- TODO: 替换为实际的智能识别告警SVG图标 (与顶部第四个块图标一致) -->
             <img src="/src/assets/svg/航线设置-识别.svg" alt="智能识别告警图标"> <!-- 使用 img 标签作为占位 -->
             <span class="section-title alarm-title-text">智能识别告警</span> <!-- 添加 alarm-title-text 类 -->
          </div>
          <el-switch
            :model-value="props.intelligentAlarmEnabled"
            @update:model-value="emit('update:intelligentAlarmEnabled', $event)"
            style="--el-switch-off-color: #444"
            @click.stop=""
          />
        </div>
        <div class="advanced-settings-content alarm-content" v-if="props.intelligentAlarmEnabled"> <!-- 添加 alarm-content 类 -->
          <div class="advanced-settings-inner">
            <!-- 告警条件 -->
            <div class="setting-item">
              <div class="setting-title-group">
                <span class="setting-title">告警条件</span>
                <div class="info-icon">i</div>
              </div>
              <div class="alarm-conditions">
                <!-- 人 -->
                <div class="condition-item">
                  <div
                    class="condition-label-button"
                    :class="{ active: personConditionEnabled }"
                    @click="togglePersonCondition"
                  >
                    <el-icon><User /></el-icon>
                    <span>人</span>
                  </div>
                  <el-select
                    :model-value="props.personConditionOperator"
                    @update:model-value="emit('update:personConditionOperator', $event)"
                    placeholder="选择"
                    size="small"
                    class="black-select condition-select"
                    popper-class="black-select"
                    :teleported="false"
                    :disabled="!personConditionEnabled"
                  >
                    <el-option label="≥" value="gte"></el-option>
                    <el-option label=">" value="gt"></el-option>
                    <el-option label="=" value="eq"></el-option>
                    <el-option label="<" value="lt"></el-option>
                    <el-option label="≤" value="lte"></el-option>
                  </el-select>
                  <el-input
                    :model-value="props.personConditionValue"
                    @update:model-value="emit('update:personConditionValue', $event)"
                    type="number"
                    size="small"
                    class="black-input condition-input"
                    :controls="false"
                    min="0"
                    :disabled="!personConditionEnabled"
                  />
                </div>
                <!-- 车 -->
                <div class="condition-item">
                  <div
                    class="condition-label-button"
                    :class="{ active: carConditionEnabled }"
                    @click="toggleCarCondition"
                  >
                    <el-icon><Van /></el-icon> <!-- 使用 Van 图标 -->
                    <span>车</span>
                  </div>
                   <el-select
                    :model-value="props.carConditionOperator"
                    @update:model-value="emit('update:carConditionOperator', $event)"
                    placeholder="选择"
                    size="small"
                    class="black-select condition-select"
                    popper-class="black-select"
                    :teleported="false"
                    :disabled="!carConditionEnabled"
                  >
                    <el-option label="≥" value="gte"></el-option>
                    <el-option label=">" value="gt"></el-option>
                    <el-option label="=" value="eq"></el-option>
                    <el-option label="<" value="lt"></el-option>
                    <el-option label="≤" value="lte"></el-option>
                  </el-select>
                  <el-input
                    :model-value="props.carConditionValue"
                    @update:model-value="emit('update:carConditionValue', $event)"
                    type="number"
                    size="small"
                    class="black-input condition-input"
                    :controls="false"
                    min="0"
                    :disabled="!carConditionEnabled"
                  />
                </div>
                <!-- 船 -->
                <div class="condition-item">
                  <div
                    class="condition-label-button"
                    :class="{ active: boatConditionEnabled }"
                    @click="toggleBoatCondition"
                  >
                    <el-icon><Ship /></el-icon>
                    <span>船</span>
                  </div>
                   <el-select
                    :model-value="props.boatConditionOperator"
                    @update:model-value="emit('update:boatConditionOperator', $event)"
                    placeholder="选择"
                    size="small"
                    class="black-select condition-select"
                    popper-class="black-select"
                    :teleported="false"
                    :disabled="!boatConditionEnabled"
                  >
                    <el-option label="≥" value="gte"></el-option>
                    <el-option label=">" value="gt"></el-option>
                    <el-option label="=" value="eq"></el-option>
                    <el-option label="<" value="lt"></el-option>
                    <el-option label="≤" value="lte"></el-option>
                  </el-select>
                  <el-input
                    :model-value="props.boatConditionValue"
                    @update:model-value="emit('update:boatConditionValue', $event)"
                    type="number"
                    size="small"
                    class="black-input condition-input"
                    :controls="false"
                    min="0"
                    :disabled="!boatConditionEnabled"
                  />
                </div>
              </div>
            </div>

            <!-- 置信度 -->
            <div class="setting-item">
              <div class="setting-title-group">
                <span class="setting-title">置信度</span>
              </div>
              <div class="confidence-control">
                <span>更全</span>
                <el-slider
                  :model-value="props.confidence"
                  @update:model-value="emit('update:confidence', $event)"
                  :min="0"
                  :max="100"
                  :step="1"
                  show-tooltip
                  :format-tooltip="(val: number) => `${val}%`"
                  class="confidence-slider"
                />
                <span>更准</span>
                <span class="confidence-value">{{ props.confidence }}%</span> <!-- 百分比数值在同一行 -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 全程录像 -->
      <div class="section">
        <div class="collapsible-section" @click="toggleRecordingSettings">
          <div class="section-title">全程录像</div>
          <el-switch
            :model-value="props.fullRecordingEnabled"
            @update:model-value="emit('update:fullRecordingEnabled', $event)"
            style="--el-switch-off-color: #444"
            @click.stop=""
          />
        </div>
        <div class="advanced-settings-content" v-if="props.fullRecordingEnabled">
          <div class="advanced-settings-inner">
            <!-- 触发动作 -->
            <div class="setting-item">
              <div class="setting-title-group">
                <span class="setting-title">触发动作</span>
              </div>
              <!-- 调整样式使其更像一个居中的块 -->
              <div class="select-action-block" @click="selectTriggerAction">选择动作</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 告警信息 -->
      <div class="section">
        <div class="section-title">告警信息</div>
        <div class="alarm-messages">
          <el-input
            :model-value="props.alarmMessageTitle"
            @update:model-value="emit('update:alarmMessageTitle', $event)"
            type="textarea"
            :rows="2"
            placeholder="新建巡逻航线"
            class="black-textarea"
          />
          <el-input
            :model-value="props.alarmMessageContent"
            @update:model-value="emit('update:alarmMessageContent', $event)"
            type="textarea"
            :rows="2"
            placeholder="识别到异常目标"
            class="black-textarea"
          />
        </div>
      </div>
    </div> <!-- settings-group-container 结束 -->


    <!-- 顶部的参考起飞点按钮 -->
    <div class="reference-point-button" @click="setReferencePoint">
        <el-icon><LocationInformation /></el-icon> <!-- 使用 LocationInformation 图标 -->
        <span>参考起飞点未设置</span>
    </div>

    <!-- 航线高度模式 -->
    <div class="section">
      <div class="section-title">航线高度模式</div>
      <div class="button-group segmented-control">
        <div
          class="setting-button"
          :class="{ active: props.selectedHeightMode === 'altitude' }"
          @click="selectHeightMode('altitude')"
        >
          海拔高度
        </div>
        <div
          class="setting-button"
          :class="{ active: props.selectedHeightMode === 'takeoff' }"
          @click="selectHeightMode('takeoff')"
        >
          相对起飞点高度
        </div>
        <div
          class="setting-button"
          :class="{ active: props.selectedHeightMode === 'terrain' }"
          @click="selectHeightMode('terrain')"
        >
          相对地形高度
        </div>
      </div>
      <!-- 高度模式示意图和高度调整 -->
      <div class="climb-settings">
          <div class="diagram">
              <img v-if="props.selectedHeightMode === 'altitude'" src="/src/assets/svg/海拔高度.svg" alt="海拔高度示意图">
              <img v-if="props.selectedHeightMode === 'takeoff'" src="/src/assets/svg/相对起飞点高度.svg" alt="相对起飞点高度示意图">
              <img v-if="props.selectedHeightMode === 'terrain'" src="/src/assets/svg/相对地形高度.svg" alt="相对地形高度示意图">
          </div>
          <div class="altitude-control">
              <div class="alt-button" @click="adjustRouteAltitude(100)">+100</div>
              <div class="alt-button" @click="adjustRouteAltitude(10)">+10</div>
               <!-- 航线高度数值和单位 -->
              <div class="alt-value-input-group">
                   <span v-if="!isRouteAltitudeEditing" class="alt-value" @click="startRouteAltitudeEdit">{{ props.routeAltitude }}</span>
                   <el-input
                      v-else
                      v-model.number="routeAltitudeValue"
                      type="number"
                      class="alt-input"
                      size="small"
                      :controls="false"
                      @blur="stopRouteAltitudeEdit"
                      @keyup.enter="stopRouteAltitudeEdit"
                      ref="routeAltitudeInputRef"
                  />
                  <span class="alt-unit">m</span>
              </div>
              <div class="alt-button" @click="adjustRouteAltitude(-10)">-10</div>
              <div class="alt-button" @click="adjustRouteAltitude(-100)">-100</div>
          </div>
      </div>
    </div>

    <!-- 其他巡逻航线特有的设置将在这里添加 -->

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { ElSwitch, ElInput, ElSelect, ElOption, ElIcon, ElSlider } from 'element-plus'; // 导入 Element Plus 组件
import { LocationInformation, User, Van, Ship } from '@element-plus/icons-vue'; // 导入需要的图标，Crop 仅用于占位，实际图标使用 img

// 定义组件接收的 props
const props = defineProps<{
  // 新增的巡逻航线设置 props
  intelligentAlarmEnabled: boolean;
  personConditionOperator: string;
  personConditionValue: number;
  carConditionOperator: string;
  carConditionValue: number;
  boatConditionOperator: string;
  boatConditionValue: number;
  confidence: number;
  fullRecordingEnabled: boolean;
  // triggerAction: string; // 触发动作可能需要更复杂的类型或事件处理
  alarmMessageTitle: string;
  alarmMessageContent: string;

  // 从 WaypointRouteSettings 复制过来的通用或相似设置 props
  selectedHeightMode: string;
  routeAltitude: number;
  // 其他可能通用的 props，例如速度等，如果巡逻航线也有全局速度设置的话
}>();

// 定义组件可以触发的事件
const emit = defineEmits([
  // 新增的巡逻航线设置事件
  'update:intelligentAlarmEnabled',
  'update:personConditionOperator',
  'update:personConditionValue',
  'update:carConditionOperator',
  'update:carConditionValue',
  'update:boatConditionOperator',
  'update:boatConditionValue',
  'update:confidence',
  'update:fullRecordingEnabled',
  'selectTriggerAction', // 触发动作按钮点击事件
  'update:alarmMessageTitle',
  'update:alarmMessageContent',

  // 从 WaypointRouteSettings 复制过来的通用或相似设置事件
  'setReferencePoint', // 参考起飞点设置事件
  'update:selectedHeightMode',
  'update:routeAltitude',
  // 其他可能通用的事件
]);

// 内部状态用于编辑输入框，与 prop 同步 (航线高度)
const routeAltitudeValue = ref(props.routeAltitude);

// 监听 props 变化，同步到内部编辑状态 (航线高度)
watch(() => props.routeAltitude, (newVal) => { routeAltitudeValue.value = newVal; });

// 编辑状态 (航线高度)
const isRouteAltitudeEditing = ref(false);

// Input 元素的引用，用于聚焦 (航线高度)
const routeAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(null);

// 告警条件按钮的选中状态
const personConditionEnabled = ref(false);
const carConditionEnabled = ref(false);
const boatConditionEnabled = ref(false);

// 监听 props 变化，同步告警条件按钮的初始状态 (可选，如果需要从外部加载状态)
// 只有当数值大于0时才视为启用，或者可以根据实际业务逻辑判断
watch(() => props.personConditionValue, (newVal) => { personConditionEnabled.value = newVal > 0; });
watch(() => props.carConditionValue, (newVal) => { carConditionEnabled.value = newVal > 0; });
watch(() => props.boatConditionValue, (newVal) => { boatConditionEnabled.value = newVal > 0; });


// --- 方法 ---

// 切换智能识别告警展开/收起状态 (如果需要折叠效果)
const toggleAlarmSettings = () => {
  // 如果智能识别告警部分需要折叠，可以在这里添加逻辑
  // 目前模板中是根据 intelligentAlarmEnabled 直接 v-if 控制显示隐藏
};

// 设置参考起飞点 (触发事件通知父组件处理)
const setReferencePoint = () => {
  emit('setReferencePoint'); // 触发事件通知父组件
};

// 选择航线高度模式
const selectHeightMode = (mode: string) => {
  emit('update:selectedHeightMode', mode); // 触发更新事件
};

// 调整航线高度
const adjustRouteAltitude = (delta: number) => {
  const newValue = props.routeAltitude + delta;
   // 可以添加边界检查
  const finalValue = newValue < 0 ? 0 : newValue;
  emit('update:routeAltitude', finalValue); // 触发更新事件
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
    emit('update:routeAltitude', routeAltitudeValue.value);
};

// 切换全程录像展开/收起状态 (如果需要折叠效果)
const toggleRecordingSettings = () => {
   // 如果全程录像部分需要折叠，可以在这里添加逻辑
   // 目前模板中是根据 fullRecordingEnabled 直接 v-if 控制显示隐藏
};

// 选择触发动作 (触发事件通知父组件处理)
const selectTriggerAction = () => {
  emit('selectTriggerAction'); // 触发事件通知父组件
};

// 切换人告警条件启用状态
const togglePersonCondition = () => {
  personConditionEnabled.value = !personConditionEnabled.value;
  // 如果禁用，可以考虑清空数值或重置操作符
  if (!personConditionEnabled.value) {
      emit('update:personConditionValue', 0);
      // emit('update:personConditionOperator', 'gte'); // 禁用时不重置操作符，保持上次选择
  }
};

// 切换车告警条件启用状态
const toggleCarCondition = () => {
  carConditionEnabled.value = !carConditionEnabled.value;
   if (!carConditionEnabled.value) {
      emit('update:carConditionValue', 0);
      // emit('update:carConditionOperator', 'gte'); // 禁用时不重置操作符
  }
};

// 切换船告警条件启用状态
const toggleBoatCondition = () => {
  boatConditionEnabled.value = !boatConditionEnabled.value;
   if (!boatConditionEnabled.value) {
      emit('update:boatConditionValue', 0);
      // emit('update:boatConditionOperator', 'gte'); // 禁用时不重置操作符
  }
};


</script>

<style lang="less" scoped>
.patrol-settings-container {
    display: flex;
    flex-direction: column;
    gap: 10px; /* section 之间的间距 */
}

/* 顶部的四个信息展示块样式 */
.info-blocks {
    display: grid;
    grid-template-columns: repeat(4, 1fr); /* 四列平均分配 */
    gap: 0; /* 移除块之间的间距 */
    margin-bottom: 10px; /* 与下方内容的间距 */
    border-radius: 8px; /* 整体圆角 */
    overflow: hidden; /* 隐藏内部边框溢出 */
    /* border: 1px solid #444; */ /* 移除整体边框 */
}

.info-block {
    background-color: rgba(51, 51, 51, 0.6); /* 背景色 */
    padding: 10px 5px; /* 内边距 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    text-align: center;
    /* border-right: 1px solid #444; */ /* 移除右侧分隔线 */
    position: relative; /* 用于伪元素分隔线 */
}

/* 使用伪元素添加分隔线 */
.info-block:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 10%; /* 调整位置 */
    bottom: 10%; /* 调整位置 */
    width: 1px; /* 分隔线宽度 */
    background-color: #444; /* 分隔线颜色 */
}


.info-icon-wrapper {
    /* font-size: 24px; */ /* 移除字体图标大小 */
    /* color: #2d8cf0; */ /* 移除字体图标颜色 */
    margin-bottom: 5px; /* 图标与数值的间距 */
    display: flex;
    align-items: center;
    justify-content: center;
    img {
        width: 24px; /* SVG 图标大小 */
        height: 24px; /* SVG 图标大小 */
        filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(190deg) brightness(118%) contrast(119%); /* 示例：将灰色图标变为蓝色 */
        /* TODO: 根据实际SVG颜色调整或移除 filter */
    }
}

.info-value {
    font-size: 14px; /* 调整字体大小 */
    font-weight: bold;
    color: #2d8cf0; /* 数值颜色 */
    /* margin-bottom: 3px; */ /* 移除底部间距 */
}

/* 移除 info-label 样式 */
/* .info-label {
    font-size: 12px;
    color: #ccc;
} */


/* 智能识别告警、全程录像、告警信息 的外部容器样式 */
.settings-group-container {
    /* 使用 background 模拟渐变边框 */
    background:
        linear-gradient(#101010,#101010) padding-box padding-box,
        linear-gradient(115deg,#e889f1 10%,#8064fe 83%) border-box; /* 边框图片 */
    border-image-slice: 1; /* 边框图片切片 */
    border-width: 1px; /* 边框宽度 */
    border-radius: 8px; /* 圆角 */
    padding: 10px; /* 内部内容与边框的间距 */
    margin-bottom: 10px; /* 与下方内容的间距 */
    display: flex;
    flex-direction: column;
    gap: 10px; /* 内部 section 之间的间距 */
}

/* 智能识别告警标题栏背景 */
.collapsible-section.alarm-title-bar {
    background: linear-gradient(96deg, rgba(232, 137, 241, .2) 1%, rgba(128, 100, 254, .2) 99%);
    border-radius: 4px 4px 0 0; /* 顶部圆角 */
    padding: 10px 15px; /* 调整内边距 */
    margin: -10px -10px 0 -10px; /* 负外边距抵消父容器内边距 */
}

/* 智能识别告警标题文字渐变色 */
.collapsible-section.alarm-title-bar .alarm-title-text {
    /* color: transparent; */ /* 文字透明 */
    /* background: linear-gradient(115deg,#e889f1 10%,#8064fe 83%); */ /* 渐变背景 */
    /* -webkit-background-clip: text; */ /* 裁剪背景到文字 */
    /* background-clip: text; */ /* 裁剪背景到文字 */
    /* display: inline-block; */ /* 使背景裁剪生效 */
    color: #fff; /* 暂时使用白色，渐变文字效果需要更复杂的实现或调整 */
}


/* 智能识别告警内容区域背景色 */
.advanced-settings-content.alarm-content {
    background-color: rgba(30, 30, 30, 0.8); /* 智能识别告警内容的背景色 */
    border-radius: 0 0 4px 4px; /* 底部圆角 */
    padding: 15px; /* 内边距 */
    margin-top: 0; /* 移除顶部间距 */
}

/* 全程录像和告警信息区域背景色 */
.settings-group-container .section:not(:first-child) { /* 排除第一个 section (智能识别告警) */
    background-color: rgba(51, 51, 51, 0.8); /* 其他功能块背景色 */
    padding: 15px; /* 功能块内边距 */
    border-radius: 4px; /* 内部块的圆角 */
    margin-bottom: 0; /* 移除 section 自身的 margin-bottom */
}


/* 从 RouteSettingsPanel_old.vue 迁移过来的通用样式 */
.section-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
}

/* 智能识别告警标题带图标的样式 */
.section-title-with-icon {
    display: flex;
    align-items: center;
    gap: 8px; /* 图标和文字的间距 */
    .el-icon {
        font-size: 18px; /* 图标大小 */
        color: #2d8cf0; /* 图标颜色 */
    }
    img {
        width: 18px; /* SVG 图标大小 */
        height: 18px; /* SVG 图标大小 */
        filter: invert(48%) sepia(79%) saturate(2476%) hue-rotate(190deg) brightness(118%) contrast(119%); /* 示例：将灰色图标变为蓝色 */
        /* TODO: 根据实际SVG颜色调整或移除 filter */
    }
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
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1; /* 使按钮组中的按钮平均分配空间 */
  min-width: 0; /* 允许缩小 */
}

.setting-button:hover {
  background-color: #484848; /* 悬停背景色 */
}

.setting-button.active {
  background-color: #2d8cf0; /* 选中背景色 */
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

.climb-settings,
.height-settings { /* 复用样式 */
    display: flex;
    align-items: center;
    gap: 15px; /* 减小间距 */
}

.diagram {
    flex-shrink: 0; /* 防止示意图被压缩 */
    width: 180px; /* 示例宽度，增大 */
    height: 158px; /* 示例高度，增大 */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px; /* 添加内边距 */
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
    background-color: #444; /* 深灰色按钮背景 */
    color: #fff;
    border: none; /* 移除边框 */
    border-radius: 4px; /* 圆角 */
    cursor: pointer;
    font-size: 14px;
    text-align: center;
    transition: background-color 0.2s ease, border-color 0.2s ease;
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
}

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

.collapsible-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    padding: 5px 0; /* 调整内边距 */
}

.advanced-settings-content {
    margin-top: 10px; /* 与标题的间距 */
    transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
    overflow: hidden;
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

/* 顶部的参考起飞点按钮样式 */
.reference-point-button {
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
    margin-top: 10px; /* 与上方内容的间距 */
    gap: 8px; /* 图标和文字的间距 */
    transition: background-color 0.2s ease;
}

.reference-point-button:hover {
    background-color: #1a7cdb; /* 悬停颜色 */
}

/* Element Plus Select 下拉菜单的样式穿透 */
:deep(.black-select.el-popper.is-light) {
  border: none;
  background-color: rgba(51, 51, 51, 0.9) !important; /* 下拉菜单背景色 */
  .el-select-dropdown__item {
    color: #ccc; /* 选项文字颜色 */
    &.hover, &:hover {
      background-color: rgba(70, 70, 70, 0.9) !important; /* 悬停背景色 */
      color: white;
    }
    &.selected {
        color: #2d8cf0; /* 选中文字颜色 */
        font-weight: bold;
    }
  }
}

/* Element Plus Input 默认样式穿透 */
:deep(.black-input.el-input--small .el-input__wrapper) {
    background-color: #444 !important; /* 输入框背景色改为深灰色 */
    box-shadow: none !important;
    border: 1px solid #444 !important; /* 边框颜色 */
    border-radius: 4px !important;
    padding: 0 8px !important; /* 调整内边距 */
    height: 28px !important; /* 调整高度 */
}

:deep(.black-input.el-input--small .el-input__inner) {
    color: white !important; /* 文字颜色改为白色 */
    padding: 0 !important; /* 移除内边距 */
    height: 26px !important; /* 调整高度 */
    line-height: 26px !important; /* 调整行高 */
    font-size: 13px !important; /* 调整字体大小 */
}

/* Element Plus Textarea 默认样式穿透 */
:deep(.black-textarea.el-textarea .el-textarea__inner) {
    background-color: #444 !important; /* 输入框背景色改为深灰色 */
    box-shadow: none !important;
    border: 1px solid #444 !important; /* 边框颜色 */
    border-radius: 4px !important;
    padding: 8px !important; /* 调整内边距 */
    color: white !important; /* 文字颜色改为白色 */
    font-size: 13px !important; /* 调整字体大小 */
    resize: vertical; /* 允许垂直拖动 */
}

/* 智能识别告警 - 告警条件样式 */
.alarm-conditions {
    display: flex;
    flex-direction: column;
    gap: 10px; /* 条件项之间的间距 */
}

.condition-item {
    display: flex;
    align-items: center;
    gap: 10px; /* 元素之间的间距 */
}

/* 将 condition-label 改为按钮样式 */
.condition-label-button {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #ccc; /* 默认颜色 */
    font-size: 13px;
    width: 60px; /* 固定标签宽度 */
    flex-shrink: 0; /* 防止被压缩 */
    background-color: #444; /* 按钮背景色 */
    padding: 5px 8px; /* 内边距 */
    border-radius: 4px; /* 圆角 */
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    justify-content: center; /* 内容居中 */
}

.condition-label-button:hover {
    background-color: #484848;
    color: white;
}

.condition-label-button.active {
    background-color: #2d8cf0; /* 选中背景色 */
    color: white; /* 选中文字颜色 */
}


.condition-label-button .el-icon {
    font-size: 16px;
}

.condition-select {
    width: 80px; /* 选择器宽度 */
    flex-shrink: 0;
}

.condition-input {
    flex-grow: 1; /* 输入框占据剩余空间 */
}

/* 智能识别告警 - 置信度样式 */
.confidence-control {
    display: flex;
    align-items: center;
    gap: 10px; /* 元素之间的间距 */
    color: #fff;
    font-size: 13px;
}

.confidence-slider {
    flex-grow: 1; /* 滑块占据剩余空间 */
    margin: 0 5px; /* 滑块左右内边距 */
}

/* 覆盖 Element Plus Slider 默认样式穿透 */
:deep(.confidence-slider.el-slider__bar) {
    background-color: #2d8cf0; /* 滑块条颜色 */
}
:deep(.confidence-slider.el-slider__button) {
    border-color: #2d8cf0; /* 滑块按钮边框颜色 */
}

.confidence-value {
    font-weight: bold;
    color: #2d8cf0; /* 数值颜色 */
    width: 40px; /* 固定数值宽度 */
    text-align: right;
    flex-shrink: 0;
}

/* 全程录像 - 选择动作块样式 */
.select-action-block {
    background-color: #444; /* 背景色 */
    color: white;
    border: 1px solid #555; /* 边框 */
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    width: 100%; /* 宽度占满父容器 */
    text-align: center; /* 文字居中 */
    box-sizing: border-box; /* 边框和内边距包含在尺寸内 */
}

.select-action-block:hover {
    background-color: #484848;
    border-color: #666;
}

/* 告警信息样式 */
.alarm-messages {
    display: flex;
    flex-direction: column;
    gap: 10px; /* 文本框之间的间距 */
}

</style>
