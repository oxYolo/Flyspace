<template>
  <div>
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="创建新航线"
      width="750px"
      :before-close="handleClose"
      class="create-route-dialog"
      :custom-class="'create-route-dialog'"
      :append-to-body="false"
      :style="{
        backgroundColor: 'rgba(23, 44, 44, 0.9)',
        '--el-dialog-bg-color': 'rgba(23, 44, 44, 0.9)',
        '--el-dialog-text-color': '#fff',
      }">
      <!-- 对话框内容区域 -->
      <div class="dialog-content">
        <!-- 巡检/测绘航线选择 -->
        <div class="section">
          <div class="section-title">巡逻测绘航线</div>
          <div class="button-group">
            <div
              v-for="type in mainRouteTypes"
              :key="type.id"
              class="type-button"
              :class="{ active: selectedRouteType === type.id }"
              @click="selectRouteType(type.id)">
              <el-icon :size="24"
                ><component :is="type.iconComponent"
              /></el-icon>
              <!-- 如果有图标 -->
              <span>{{ type.label }}</span>
            </div>
          </div>
        </div>

        <!-- 测绘航线选择 (如果需要，可以根据主类型显示/隐藏) -->
        <div class="section">
          <div class="section-title">测绘航线</div>
          <div class="button-group wrap">
            <!-- 添加 wrap 类使其换行 -->
            <div
              v-for="type in surveyRouteTypes"
              :key="type.id"
              class="type-button small"
              :class="{
                active: selectedRouteType === type.id,
                disabled: type.disabled,
              }"
              @click="!type.disabled && selectRouteType(type.id)"
              :disabled="type.disabled">
              <el-icon :size="20"
                ><component :is="type.iconComponent"
              /></el-icon>
              <!-- 如果有图标 -->
              <span>{{ type.label }}</span>
            </div>
          </div>
        </div>

        <!-- 选择飞行器系列 -->
        <div class="section">
          <div class="section-title">选择飞行器</div>
          <div class="button-group wrap">
            <div
              v-for="series in aircraftSeries"
              :key="series.id"
              class="type-button small"
              :class="{ active: selectedAircraftSeries === series.id }"
              @click="selectAircraftSeries(series.id)">
              {{ series.label }}
            </div>
          </div>
        </div>

        <!-- 选择型号 -->
        <div class="section">
          <div class="section-title">选择型号</div>
          <div class="button-group">
            <div
              v-for="model in aircraftModels"
              :key="model.subType"
              class="type-button small"
              :class="{ active: selectedAircraftModel === model.subType }"
              @click="selectAircraftModel(model.subType, model.id)">
              {{ model.label }}
            </div>
          </div>
        </div>

        <!-- 航线名称输入 -->
        <div class="section">
          <div class="section-title">航线名称</div>
          <el-input v-model="routeName" placeholder="请输入航线名称"></el-input>
        </div>
      </div>

      <!-- 对话框底部按钮区域 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleConfirm"> 确定 </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  ElDialog,
  ElButton,
  ElInput,
  ElIcon,
  ElMessage,
  dayjs,
} from "element-plus";
import { Location, Crop, TrendCharts } from "@element-plus/icons-vue";
import { GetAircraftSeries } from "@/transform/routeList.ts";
import { $handleGetDeviceDictionaryPage } from "@/api/flyControl/device";

// 定义组件接收的 props
const props = defineProps<{
  visible: boolean; // 控制对话框是否可见
  points: [];
}>();
// 统一的航线类型选择状态
const selectedRouteType = ref("0"); // 默认选中航点航线
// 定义组件可以触发的事件
const emit = defineEmits(["update:visible", "confirm", "close"]);

// 内部状态，用于控制 ElDialog 的显示
const dialogVisible = ref(props.visible);

// 监听 props.visible 的变化，同步到内部状态
watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
      routeName.value = `航点航线(${getTime()})`;
      selectedRouteType.value = "0";
    }
  },
);

const getTime = () => {
  return dayjs().format("YYYYMMDD_HHmmss");
};
// 航线名称
const routeName = ref(`航点航线(${getTime()})`);
// 主航线类型数据 (巡检/测绘)
const mainRouteTypes = [
  { id: "0", label: "航点航线", iconComponent: Location }, // 示例图标
  // { id: 'patrol', label: '巡逻航线', iconComponent: Scissor }, // 示例图标
];

// 测绘航线类型数据
const surveyRouteTypes = [
  { id: "1", label: "面状航线", iconComponent: Crop, disabled: false }, // 设置为禁用
  { id: "3", label: "带状航线", iconComponent: TrendCharts }, // 示例图标
  // { id: 'oblique', label: '斜面航线', iconComponent: Box }, // 示例图标
  // { id: 'geometry', label: '几何体航线', iconComponent: Camera }, // 示例图标
  // { id: 'close-up', label: '贴近摄影航线', iconComponent: Camera }, // 示例图标
];
let aircraftSeries = [] as Array<any>;
const selectedAircraftSeries = ref("");
const selectedAircraftModel = ref("");
const selectedAircraftId = ref("");

const aircraftModels = computed(() => {
  // 根据选中的系列返回对应的型号列表
  return (
    aircraftSeries.find((e) => e.id === selectedAircraftSeries.value)
      ?.children || []
  );
});
const getAircraftSeries = async () => {
  aircraftSeries = await GetAircraftSeries();
  selectedAircraftSeries.value = aircraftSeries[0]?.id;
  selectedAircraftModel.value = aircraftModels.value[0]?.subType;
  selectedAircraftId.value = aircraftModels.value[0]?.id;
};
getAircraftSeries();
// 统一的航线类型选择方法
const selectRouteType = (id: string) => {
  selectedRouteType.value = id;
  // 根据选中的航线类型，可以动态调整航线名称的默认值
  const allRouteTypes = [...mainRouteTypes, ...surveyRouteTypes];
  const selectedType = allRouteTypes.find((type) => type.id === id);
  if (selectedType) {
    routeName.value = `${selectedType.label}(${getTime()})`;
  }
};

// 选择飞行器系列
const selectAircraftSeries = (id: string) => {
  selectedAircraftSeries.value = id;
  // 选中新系列后，默认选中该系列下的第一个型号（如果存在）
  const models = aircraftModels.value;
  if (models && models.length > 0) {
    selectedAircraftModel.value = models[0].subType;
    selectedAircraftId.value = models[0].id;
  } else {
    selectedAircraftModel.value = "";
    selectedAircraftId.value = "";
  }
};

// 选择飞行器型号
const selectAircraftModel = (subType: string, id: string) => {
  selectedAircraftModel.value = subType;
  selectedAircraftId.value = id;
};

// 通过设备id查询 payload 信息
const getPayloadInfo = async () => {
  if (!selectedAircraftId.value) return null;
  try {
    const res: any = await $handleGetDeviceDictionaryPage({
      parentId: selectedAircraftId.value,
      pageNum: 1,
      pageSize: 10,
    });
    if (res?.code == 200) {
      return res.rows[0] || {};
    }
  } catch (e) {
    console.error("获取负载信息失败", e);
  }
};

// 处理对话框关闭前的事件
const handleClose = () => {
  // 触发 update:visible 事件，通知父组件隐藏对话框
  emit("update:visible", false);
  emit("close"); // 也可以触发一个 close 事件
};

// 处理确定按钮点击事件
const handleConfirm = async () => {
  // 先查 payload info
  const payload = await getPayloadInfo();
  if (!payload) {
    ElMessage({ message: "获取设备信息失败", type: "error" });
    return;
  }
  let newRouteData = {};
  // 在这里收集用户选择的数据
  if (selectedRouteType.value == "0") {
    newRouteData = {
      routeName: routeName.value, //航线名称
      routeDesc: "", //航线描述
      workspaceId: "",
      templateType: 0, //	航线类型
      droneType: selectedAircraftSeries.value, //无人机类型
      subDroneType: selectedAircraftModel.value, //无人机子类型
      imageFormat: "wide", //负载图片存储类型
      payloadType: payload.deviceType, //负载类型
      payloadPosition: payload.subType, //负载挂载位置
      finishAction: "goHome", //航线结束动作
      exitOnRcLostAction: "goBack", //失控动作
      status: 1,
      routePointList: [],
    };
  } else if (selectedRouteType.value == "1") {
    newRouteData = {
      routeName: routeName.value, //航线名称
      routeDesc: "", //航线描述
      templateType: 1, //	航线类型
      takeOffRefPoint: "", //参考起飞点
      droneType: selectedAircraftSeries.value, //无人机类型
      subDroneType: selectedAircraftModel.value, //无人机子类型
      imageFormat: "wide", //负载图片存储类型
      finishAction: "goHome", //航线结束动作
      exitOnRcLostAction: "goBack", //失控动作
      status: 1,
      payloadType: payload.deviceType, //负载类型
      payloadPosition: payload.subType, //负载挂载位置
    };
  } else if (selectedRouteType.value == "3") {
    newRouteData = {
      routeName: routeName.value, //航线名称
      routeDesc: "", //航线描述
      templateType: 3, //	航线类型
      takeOffRefPoint: "", //参考起飞点
      droneType: selectedAircraftSeries.value, //无人机类型
      subDroneType: selectedAircraftModel.value, //无人机子类型
      imageFormat: "wide", //负载图片存储类型
      finishAction: "goHome", //航线结束动作
      exitOnRcLostAction: "goBack", //失控动作
      status: 1,
      payloadType: payload.deviceType, //负载类型
      payloadPosition: payload.subType, //负载挂载位置
    };
  }
  console.log("创建航线数据:", newRouteData);

  // 触发 confirm 事件，并传递收集到的数据
  emit("confirm", newRouteData);

  // 关闭对话框
  handleClose();
};
</script>

<style scoped lang="less">
/* 使用多层 :deep 确保样式完全穿透 */
:deep(.el-dialog) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  margin: 0 auto !important;

  .el-dialog__body {
    background-color: transparent !important;
    color: #ccc !important;
    padding: 10px 20px 20px 20px !important;
  }

  .el-dialog__header {
    background-color: rgba(23, 44, 44, 0.95) !important;
    border-bottom: 1px solid #444 !important;
    padding: 15px 20px !important;
    margin-right: 0 !important;
  }

  .el-dialog__title {
    color: white !important;
    font-size: 16px !important;
    font-weight: bold !important;
  }

  .el-dialog__headerbtn {
    top: 18px !important;
    right: 13px !important;

    .el-dialog__close {
      color: #ccc !important;
    }
  }

  .el-dialog__footer {
    background-color: rgba(23, 44, 44, 0.95) !important;
    border-top: 1px solid #444 !important;
    padding: 15px 20px !important;
  }
}

/* 强制覆盖 Element Plus 输入框样式 */
:deep(.el-input) {
  .el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;

    .el-input__inner {
      background-color: #333 !important;
      color: #ccc !important;
    }
  }

  &.is-focused .el-input__wrapper {
    box-shadow: 0 0 0 1px #2d8cf0 inset !important;
  }
}

/* 强制覆盖 Element Plus 按钮样式 */
:deep(.el-button) {
  background-color: #444 !important;
  color: #ccc !important;
  border-color: #555 !important;

  &:hover {
    background-color: #555 !important;
    border-color: #666 !important;
    color: white !important;
  }

  &--primary {
    background-color: #2d8cf0 !important;
    border-color: #2d8cf0 !important;
    color: white !important;

    &:hover {
      background-color: #0056b3 !important;
      border-color: #004085 !important;
    }
  }
}

/* 组件内部样式 */
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 10px;
}

.button-group {
  display: flex;
  gap: 10px;

  &.wrap {
    flex-wrap: wrap;
  }
}

.type-button {
  background-color: rgba(51, 51, 51, 0.6);
  color: #ccc;
  border: 1px solid rgba(85, 85, 85, 0.7);
  border-radius: 4px;
  padding: 15px 20px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  min-width: 100px;

  &.small {
    padding: 10px 15px;
    min-width: auto;
    flex-direction: row;
    gap: 5px;
  }

  &:hover {
    background-color: rgba(68, 68, 68, 0.7);
    border-color: #2d8cf0;
  }

  &.active {
    background-color: rgba(45, 140, 240, 0.4);
    border-color: #2d8cf0;
    color: white;
  }
}

.type-button.disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: #444 !important;
  color: #888 !important;
  border-color: #555 !important;
}
</style>
