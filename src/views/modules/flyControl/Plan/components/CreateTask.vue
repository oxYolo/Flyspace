<template>
  <div class="project-middle-container">
    <div class="plan-form">
      <div class="form-content">
        <div class="title">
          <span>{{ title }}任务</span>
          <el-icon @click="handleCloseDialog"><Close /></el-icon>
        </div>
        <div class="form-main dark">
          <el-form
            ref="formRef"
            label-position="top"
            label-width="auto"
            :model="formModel"
            :rules="formRules">
            <el-form-item label="任务名称" prop="taskName" required>
              <el-input
                class="blackInput"
                v-model="formModel.taskName"
                placeholder="请输入任务名称..."
                clearable />
            </el-form-item>
            <el-form-item label="巡检场景" prop="inspectionSceneName" required>
              <el-select
                v-model="formModel.inspectionSceneName"
                placeholder="请选择巡检场景..."
                class="black-select"
                :teleported="false"
                clearable>
                <el-option
                  v-for="item in inspectionSceneOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.dictCode" />
              </el-select>
            </el-form-item>
            <el-form-item
              label="识别问题大类"
              prop="problemCategoryName"
              required>
              <el-select
                v-model="formModel.problemCategoryName"
                placeholder="请选择识别问题大类..."
                class="black-select"
                :teleported="false"
                clearable>
                <el-option
                  v-for="item in problemCategoryOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.dictCode" />
              </el-select>
            </el-form-item>
            <el-form-item label="识别问题小类" prop="aiTags" required>
              <el-checkbox-group
                v-model="formModel.aiTags"
                class="ai-tags-group">
                <el-checkbox
                  class="ai-tag"
                  v-for="item in aiTagsOption"
                  :key="item.id"
                  :label="item.dictCode">
                  <el-tooltip effect="light" :content="item.name">
                    {{ item.name }}
                  </el-tooltip>
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="执行航线" prop="routeId" required>
              <div
                class="route-card"
                v-if="currentRoute && Object.keys(currentRoute).length"
                @click="handleShowChooseRoute">
                <div class="card-title">
                  <el-input
                    v-if="showInputRoute"
                    @change="handleClickCard(false)"
                    v-model="currentRoute.title" />
                  <div v-else class="card-title-name">
                    <span>{{ currentRoute.title }}</span>
                    <img
                      class="route-icon"
                      src="@/assets/svg/航线.svg"
                      alt="" />
                  </div>
                </div>
                <div class="card-meta">
                  <img
                    class="device-icon"
                    src="@/assets/svg/无人机.svg"
                    alt="" />
                  {{ currentRoute.deviceName || "--" }}
                </div>
                <div class="card-meta">
                  更新时间 {{ currentRoute.updateTime }}
                </div>
              </div>
              <el-button
                v-else
                @click="handleShowChooseRoute"
                color="#2D8CF0"
                :icon="Plus">
                选择航线
              </el-button>
            </el-form-item>
            <el-form-item
              :label="
                formModel.taskType !== 1 ? '执行设备' : '执行设备（起飞）'
              "
              prop="deviceSn"
              required>
              <div
                class="device-card"
                v-if="deviceInfo && Object.keys(deviceInfo).length"
                @click="handleChangeDevice">
                <div
                  class="activity-icon"
                  :class="deviceInfo.domain == 3 ? 'dock' : 'drone'"
                  v-tooltip="deviceInfo.domain == 3 ? '机场' : '无人机'">
                  <img :src="deviceInfo.domain == 3 ? dock : drone" alt="" />
                </div>
                <div class="activity-content">
                  <div class="activity-title">
                    <span>{{ deviceInfo.nickname }}</span>
                  </div>
                  <div class="activity-time">{{ deviceInfo.deviceName }}</div>
                </div>
                <div
                  class="activity-status"
                  :class="getStatusClass(deviceInfo.status)">
                  {{ deviceInfo.status === "success" ? "在线" : "离线" }}
                </div>
              </div>
              <el-button
                color="#2D8CF0"
                :icon="Plus"
                v-else
                @click="handleChangeDevice">
                选择设备
              </el-button>
            </el-form-item>
            <el-form-item
              label="执行设备（降落）"
              v-if="formModel.taskType === 1">
              <el-button color="#2D8CF0" :icon="Plus">选择设备</el-button>
            </el-form-item>
            <el-form-item label="任务精度">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>任务精度</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>
                          <strong>高精度 RTK 任务</strong>:
                          飞行器起飞后会在空中等待 RTK
                          收敛后再执行任务，等待过程中无法暂停任务。建议高精度航线任务使用该模式。
                        </div>
                        <div>
                          <strong>GNSS 任务</strong>: 飞行器无需等待 RTK
                          收敛便可以直接开始执行。建议精度要求不高的任务使用该模式。
                        </div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <div
                class="task-accuracy-box"
                :class="{ 'disabled-mask': formModel.taskType === 1 }">
                <el-radio-group
                  :disabled="formModel.taskType === 1"
                  v-model="formModel.taskAccuracy"
                  fill="#2D8CF0"
                  @change="handleChangeTaskAccuracy">
                  <el-radio-button
                    v-for="(el, idx) in taskAccuracy"
                    :key="idx"
                    :value="el.value"
                    :label="el.label" />
                </el-radio-group>
              </div>
            </el-form-item>
            <el-form-item label="任务策略">
              <el-radio-group
                class="strategy-radio-group"
                v-model="formModel.taskStrategy"
                fill="#2D8CF0">
                <el-radio-button
                  v-for="(el, idx) in taskStrategy"
                  :key="idx"
                  :value="el.value"
                  :label="el.label" />
              </el-radio-group>
            </el-form-item>
            <el-form-item
              label="执行时间"
              v-if="['1'].find((i) => i == String(formModel.taskStrategy))">
              <el-date-picker
                v-model="formModel.onceExecutionDate"
                type="datetime"
                placeholder="选择执行时间"
                value-format="YYYY-MM-DD HH:mm:ss" />
            </el-form-item>
            <el-form-item
              label="执行日期"
              v-if="
                ['2', '3'].find((i) => i == String(formModel.taskStrategy))
              ">
              <el-date-picker
                v-model="formModel.executionDate"
                type="daterange"
                range-separator="~"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item
              label="执行时间"
              v-show="
                ['2', '3'].find((i) => i == String(formModel.taskStrategy))
              ">
              <div
                class="execution-time-box"
                v-for="(el, idx) in formModel.executionTimeData"
                :key="idx">
                <el-time-picker
                  v-model="el.time"
                  arrow-control
                  placeholder="请选择时间"
                  value-format="HH:mm" />
                <div class="execution-time-btn">
                  <el-button
                    color="#2D8CF0"
                    :icon="Plus"
                    circle
                    @click="handleClickAddExecutionTime" />
                  <el-button
                    type="danger"
                    :icon="Minus"
                    circle
                    :disabled="formModel.executionTimeData.length <= 1"
                    @click="handleClickDelExecutionTime(idx)" />
                </div>
              </div>
            </el-form-item>
            <el-form-item
              label="计划开始执行的电量"
              class="task-type-label"
              v-show="['2', '3'].find((i) => i == String(formModel.taskStrategy))">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>计划开始执行的电量</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>
                          计划开始执行的电量支持设置为 50% ~
                          100%，当飞行器电池充电至设置的电量时，飞行计划将自动开始执行
                        </div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <div class="battery-status-box">
                <el-input
                  v-model="formModel.batteryStatus"
                  style="width: 93%" />
                <span>%</span>
              </div>
            </el-form-item>
            <el-form-item
              label="重复频率"
              v-show="
                ['2', '3'].find((i) => i == String(formModel.taskStrategy))
              ">
              <div class="repeat-frequency">
                <span class="every">每</span>
                <div><el-input v-model="formModel.frequency"></el-input></div>
                <div class="plan-el-select">
                  <el-select
                    v-model="formModel.frequencyScope"
                    class="black-select"
                    popper-class="black-select"
                    :teleported="false"
                    @change="frequencyScopeChange">
                    <el-option
                      v-for="item in frequencyScopeOption"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value" />
                  </el-select>
                </div>
              </div>
            </el-form-item>
            <el-form-item
              label="重复规则"
              v-show="
                ['2', '3'].find((i) => i === String(formModel.taskStrategy)) &&
                formModel.frequencyScope !== 'daily'
              ">
              <div
                class="day-selector"
                v-if="formModel.frequencyScope === 'month'">
                <div
                  class="uranus-btn"
                  :class="{ active: formModel.selectedDays.includes(i) }"
                  @click="toggleDaySelection(i)"
                  v-for="i in 31"
                  :key="i">
                  {{ i }}
                </div>
              </div>
              <div
                class="week-selector"
                v-if="formModel.frequencyScope === 'week'">
                <div
                  class="uranus-btn"
                  :class="{ active: formModel.selectedDays.includes(i.value) }"
                  @click="toggleDaySelection(i.value)"
                  v-for="i in weekDayOption"
                  :key="i.value">
                  {{ i.label }}
                </div>
              </div>
            </el-form-item>
            <el-form-item
              label="返航高度（相对机场返航高度）"
              class="task-type-label">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>返航高度（相对机场返航高度）</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>
                          <strong>设定高度返航</strong>: 返航距离 >50m
                          时：飞行器将自动寻找空旷位置，上升到设定高度后按照最佳路线返航
                        </div>
                        <div>
                          <strong>返航距离在 5-50m 时</strong>:
                          将保持当前高度按照最佳路线返航
                        </div>
                        <div>
                          <strong>返航距离 ≤5m 时</strong>: 飞行器将直接降落
                        </div>
                        <div>
                          智能返航模式下，飞行器将自动规划最佳返航高度。
                          当环境、光线不满足视觉系统要求时（譬如傍晚阳光直射、夜间弱光无光），飞行器将使用您设定的返航高度进行直线返航
                        </div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <div class="control-buttons">
                <el-button
                  :disabled="is_disabled_flightAltitude"
                  v-for="btn in minusLeft"
                  :key="btn.value"
                  class="btn minus-btn"
                  @click="changeHeightValue(btn)">
                  {{ btn.label }}
                </el-button>
                <div class="input-unit">
                  <div class="input">
                    <el-input
                      @change="changeFlightAltitude"
                      v-model="formModel.flightAltitude" />
                  </div>
                  <div class="unit">m</div>
                </div>
                <el-button
                  :disabled="is_disabled_flightAltitudeMax"
                  v-for="btn in minusRight"
                  :key="btn.value"
                  class="btn minus-btn"
                  @click="changeHeightValue(btn)">
                  {{ btn.label }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="航线飞行中失联" class="task-type-label">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>航线飞行中失联</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>
                          飞行器与机场的连接断开后，飞行器将执行失联行为
                        </div>
                        <div>
                          <strong>立即返航</strong>:
                          飞行器从失联位置立即返回机场并降落
                        </div>
                        <div>
                          <strong>继续执行</strong>:
                          飞行器从失联位置继续执行航线
                        </div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <el-radio-group v-model="formModel.flightStatus" fill="#2D8CF0">
                <el-radio-button
                  v-for="(el, idx) in flightStatusOption"
                  :key="idx"
                  :value="el.value"
                  :label="el.label" />
              </el-radio-group>
            </el-form-item>
            <el-form-item label="完成动作" class="task-type-label">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>完成动作</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>创建计划时，完成动作仅支持自动返航</div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <el-select
                v-model="formModel.flightMovement"
                disabled
                placeholder="请选择完成动作"
                class="black-select"
                popper-class="black-select"
                :teleported="false">
                <el-option
                  v-for="item in flightMovementOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item
              label="自动断点续飞"
              class="task-type-label form-label">
              <template #label>
                <div
                  style="display: inline-flex; align-items: center; gap: 4px">
                  <span>自动断点续飞</span>
                  <el-tooltip
                    effect="dark"
                    placement="bottom-start"
                    popper-class="task-type-tooltip">
                    <template #content>
                      <div
                        class="plan-tooltip-inner"
                        style="max-width: 250px; line-height: 1.5">
                        <div>
                          开启后如果因飞行器电量限制无法完成航线飞行，则自动生成待执行计划，待充至足够电量后将继续执行，直到完成航线飞行
                        </div>
                      </div>
                    </template>
                    <el-icon :size="14" style="color: #999; cursor: pointer">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip>
                </div>
              </template>
              <el-switch
                v-model="formModel.isOffFlight"
                class="ml-2"
                style="
                  --el-switch-on-color: #2d8cf0;
                  --el-switch-off-color: #5d5f61;
                " />
            </el-form-item>
          </el-form>
        </div>
        <div class="actions">
          <el-button color="#3c3c3c" @click="handleCloseDialog">取消</el-button>
          <el-button color="#2D8CF0" :loading="loading" @click="submitPlan">
            确定
          </el-button>
        </div>
      </div>
    </div>
    <!-- 航线 -->
    <RouteLibraryPanel
      v-if="showChooseRoute"
      :showBtns="false"
      :defaultSelectedRouteId="formModel.routeId"
      @handleCloseDialog="showChooseRoute = false"
      @selectRoute="handleChooseRoute"
      style="
        width: 350px;
        position: absolute;
        top: 0;
        right: -10px;
        transform: translateX(100%);
        background-color: rgba(23, 44, 44, 0.9);
      " />
    <!-- 设备 -->
    <DevicePanel
      v-if="showChooseDevice"
      :defaultSelectedDeviceSn="formModel.deviceSn"
      @handleCloseDialog="showChooseDevice = false"
      @handleClickDevice="handleClickDevice" />
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, computed, watch, onMounted } from "vue";
import { Plus, Minus, QuestionFilled, Close } from "@element-plus/icons-vue";
import drone from "@/assets/images/drone/drone.png";
import dock from "@/assets/images/drone/dock.png";
import { ElMessageBox, ElMessage, dayjs } from "element-plus";
import type { FormInstance } from "element-plus";
import RouteLibraryPanel from "@/views/modules/flyControl/RouteLibrary/RouteLibraryPanel.vue";
import DevicePanel from "@/views/modules/flyControl/devicePanel.vue";
import { addPlan, getPlanInfo, getTaskDictList } from "@/transform/control";

const emits = defineEmits(["close"]);
const props = withDefaults(
  defineProps<{ title?: string; editTaskInfo?: any }>(),
  {
    title: "",
    editTaskInfo: () => {},
  },
);

const formRef = ref<FormInstance>();

const formModel: any = reactive({
  taskName: dayjs().format("M月D日HH:mm"), // 任务名称
  taskType: 0,
  taskAccuracy: 1,
  taskStrategy: 0,
  executionDate: "",
  executionTime: "",
  deviceSn: "",
  routeId: "",
  routeName: "",
  deviceName: "",
  waylineType: "",
  flightAltitude: 100,
  flightStatus: 1,
  flightMovement: 0,
  isOffFlight: false,
  onceExecutionDate: "",
  executionTimeData: [
    {
      id: Date.now(), // 使用时间戳作为唯一ID
      time: null, // 初始时间为空
    },
  ],
  frequency: "1",
  frequencyScope: "month",
  batteryStatus: "",
  selectedDays: [] as number[],
  inspectionSceneName: "", // 巡检场景
  problemCategoryName: "", // 识别问题大类
  aiTags: [] as string[], // 识别问题小类
});

const formRules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  inspectionSceneName: [
    { required: true, message: "请选择巡检场景", trigger: "change" },
  ],
  problemCategoryName: [
    { required: true, message: "请选择识别问题大类", trigger: "change" },
  ],
  aiTags: [
    {
      validator: (_: any, value: any, callback: any) => {
        if (Array.isArray(value) && value.length > 0) {
          callback();
          return;
        }
        callback(new Error("请选择识别问题小类"));
      },
      trigger: "change",
    },
  ],

  deviceSn: [{ required: true, message: "请选择设备", trigger: "change" }],
  routeId: [{ required: true, message: "请选择航线", trigger: "change" }],
});

type TaskDictItem = {
  id: number;
  parentId: number;
  name: string;
  dictCode?: string;
};

const inspectionSceneOptions = ref<TaskDictItem[]>([]);
const problemCategoryOptions = ref<TaskDictItem[]>([]);
const aiTagsOption = ref<TaskDictItem[]>([]);
const deviceInfo = ref<any | null>(null);
const currentRoute = ref<any | null>(null);
watch(
  () => props.editTaskInfo,
  async (newVal) => {
    if (!newVal) {
      currentRoute.value = null;
      deviceInfo.value = null;
      return;
    }

    currentRoute.value = null;
    deviceInfo.value = null;
    const { checkDeviceInfo, currentRouteInfo } = await getPlanInfo(
      newVal,
      formModel,
    );
    if (currentRouteInfo && Object.keys(currentRouteInfo)?.length) {
      currentRoute.value = currentRouteInfo;
      formRef.value?.clearValidate?.(["routeId"]);
    }
    if (checkDeviceInfo && Object.keys(checkDeviceInfo)?.length) {
      deviceInfo.value = checkDeviceInfo;
      formRef.value?.clearValidate?.(["deviceSn"]);
    }

    await loadInspectionScenes();
  },
  { immediate: true, deep: true },
);

const taskAccuracy = ref([
  {
    label: "高精度 RTK",
    value: 1,
  },
  {
    label: "GNSS",
    value: 0,
  },
]);
const minusLeft = ref([
  {
    label: "-100",
    value: -100,
  },
  {
    label: "-10",
    value: -10,
  },
  {
    label: "-1",
    value: -1,
  },
]);
const minusRight = ref([
  {
    label: "+1",
    value: 1,
  },
  {
    label: "+10",
    value: 10,
  },
  {
    label: "+100",
    value: 100,
  },
]);
const flightStatusOption = ref([
  {
    label: "继续执行",
    value: 0,
  },
  {
    label: "返航",
    value: 1,
  },
]);
const flightMovementOption = ref([
  {
    label: "自动返航",
    value: 0,
  },
]);
const frequencyScopeOption = ref([
  {
    label: "月",
    value: "month",
  },
  {
    label: "周",
    value: "week",
  },
  {
    label: "天",
    value: "daily",
  },
]);
const weekDayOption = ref([
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
  { label: "周日", value: 7 },
]);
onMounted(() => {
  loadInspectionScenes();
});
let loading = ref(false);

const applyDefaultAiTagsIfEmpty = () => {
  if (!Array.isArray(formModel.aiTags) || formModel.aiTags.length === 0) {
    formModel.aiTags = aiTagsOption.value
      .map((item) => item.dictCode)
      .filter(Boolean);
  }
};

const syncAiTagsByCurrentProblemCategory = async () => {
  const selected = problemCategoryOptions.value.find(
    (x) => x.dictCode === formModel.problemCategoryName,
  );
  if (!selected) {
    aiTagsOption.value = [];
    return;
  }
  await loadAiTags(selected.id);
};

const loadInspectionScenes = async () => {
  try {
    const list = (await getTaskDictList(null)) as TaskDictItem[];
    inspectionSceneOptions.value = Array.isArray(list) ? list : [];

    const hadSceneValue = Boolean(formModel.inspectionSceneName);
    if (!hadSceneValue && inspectionSceneOptions.value.length === 1) {
      formModel.inspectionSceneName =
        inspectionSceneOptions.value[0].dictCode || "";
      return;
    } else if (
      formModel.inspectionSceneName &&
      !inspectionSceneOptions.value.some(
        (x) => x.dictCode === formModel.inspectionSceneName,
      )
    ) {
      formModel.inspectionSceneName = "";
      return;
    }

    if (formModel.inspectionSceneName) {
      const selected = inspectionSceneOptions.value.find(
        (x) => x.dictCode === formModel.inspectionSceneName,
      );
      if (selected) {
        const hadProblemCategoryName = Boolean(formModel.problemCategoryName);
        await loadProblemCategories(selected.id);
        if (hadProblemCategoryName) {
          await syncAiTagsByCurrentProblemCategory();
        }
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取巡检场景失败");
  }
};

const loadProblemCategories = async (sceneId: number) => {
  try {
    const list = (await getTaskDictList(sceneId)) as TaskDictItem[];
    problemCategoryOptions.value = Array.isArray(list) ? list : [];
    if (
      !formModel.problemCategoryName &&
      problemCategoryOptions.value.length === 1
    ) {
      formModel.problemCategoryName =
        problemCategoryOptions.value[0].dictCode || "";
      return;
    }

    if (formModel.problemCategoryName) {
      if (
        !problemCategoryOptions.value.some(
          (x) => x.dictCode === formModel.problemCategoryName,
        )
      ) {
        formModel.problemCategoryName = "";
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题大类失败");
  }
};

const loadAiTags = async (categoryId: number) => {
  try {
    const list = (await getTaskDictList(categoryId)) as TaskDictItem[];
    const options = Array.isArray(list) ? list : [];
    aiTagsOption.value = options;

    if (!Array.isArray(formModel.aiTags)) {
      formModel.aiTags = [];
    }
    const availableCodes = new Set(
      options.map((x) => x.dictCode).filter(Boolean) as string[],
    );

    formModel.aiTags = formModel.aiTags
      .map((x: any) => String(x || ""))
      .filter((x: any) => availableCodes.has(x));
    applyDefaultAiTagsIfEmpty();
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题小类失败");
  }
};

watch(
  () => formModel.inspectionSceneName,
  async (sceneCode: string, prevSceneCode: string) => {
    const selected = inspectionSceneOptions.value.find(
      (x) => x.dictCode === sceneCode,
    );
    const shouldResetDownstream =
      Boolean(prevSceneCode) && prevSceneCode !== sceneCode;

    if (!selected) {
      if (shouldResetDownstream) {
        formModel.problemCategoryName = "";
        formModel.aiTags = [];
      }
      problemCategoryOptions.value = [];
      aiTagsOption.value = [];
      return;
    }

    if (shouldResetDownstream) {
      formModel.problemCategoryName = "";
      formModel.aiTags = [];
      problemCategoryOptions.value = [];
      aiTagsOption.value = [];
    }

    const hadProblemCategoryName = Boolean(formModel.problemCategoryName);
    await loadProblemCategories(selected.id);
    if (hadProblemCategoryName) {
      await syncAiTagsByCurrentProblemCategory();
    }
  },
);

watch(
  () => formModel.problemCategoryName,
  async (categoryCode: string, prevCategoryCode: string) => {
    const selected = problemCategoryOptions.value.find(
      (x) => x.dictCode === categoryCode,
    );
    const shouldResetDownstream =
      Boolean(prevCategoryCode) && prevCategoryCode !== categoryCode;

    if (!selected) {
      if (shouldResetDownstream) {
        formModel.aiTags = [];
      }
      aiTagsOption.value = [];
      return;
    }

    if (shouldResetDownstream) {
      formModel.aiTags = [];
      aiTagsOption.value = [];
    }

    await loadAiTags(selected.id);
  },
);
/**
 * 动态计算计划策略选项
 */
const taskStrategy = computed(() => {
  const baseOptions = [
    { label: "立即", value: 0 },
    { label: "单次定时", value: 1 },
    { label: "重复定时", value: 2 },
  ];
  // if (formModel.taskType === 0) {
  //   baseOptions.push({ label: "连续执行", value: 3 });
  // }

  return baseOptions;
});
/**
 * 计算返航高度按钮是否禁用
 */
const is_disabled_flightAltitude = computed(() => {
  const flightAltitude = Number(formModel.flightAltitude);
  if (Number.isFinite(flightAltitude) && flightAltitude <= 20) return true;
  return false;
});
/**
 * 计算返航高度按钮是否禁用
 */
const is_disabled_flightAltitudeMax = computed(() => {
  const flightAltitude = Number(formModel.flightAltitude);
  if (Number.isFinite(flightAltitude) && flightAltitude >= 500) return true;
  return false;
});
/**
 * 计划类型事件
 */
const handleChangeTaskType = (value: number) => {
  if (value === 1 && formModel.taskStrategy === 3) {
    formModel.taskStrategy = 0;
  }
};
/**
 * 返航高度input事件
 */
const changeFlightAltitude = (value: any) => {
  if (!Number.isFinite(Number(value))) {
    formModel.flightAltitude = 20;
  }
  if (Number(value) < 20) {
    formModel.flightAltitude = 20;
  }
  if (Number(value) > 500) {
    formModel.flightAltitude = 500;
  }
};
/**
 * 切换日期选择状态
 */
const toggleDaySelection = (day: number) => {
  const index = formModel.selectedDays.indexOf(day);
  if (index === -1) {
    formModel.selectedDays.push(day);
  } else {
    formModel.selectedDays.splice(index, 1);
  }
};

const frequencyScopeChange = () => {
  formModel.selectedDays = [];
};

/**
 * 增加执行时间元素
 */
const handleClickAddExecutionTime = () => {
  formModel.executionTimeData.push({
    id: Date.now(), // 使用时间戳作为唯一ID
    time: null, // 初始时间为空
  });
};
/**
 * 减少执行时间元素
 */
const handleClickDelExecutionTime = (index: any) => {
  formModel.executionTimeData.splice(index, 1);
};
/**
 *计划精度切换事件
 */
const handleChangeTaskAccuracy = (value: number) => {
  if (value === 0) {
    formModel.taskAccuracy = 1;
    ElMessageBox.confirm("切换为 GNSS 模式，计划将无法高精度执行，是否切换?", {
      confirmButtonText: "切换",
      cancelButtonText: "取消",
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      customClass: "plan-el-message-content",
    }).then(() => {
      formModel.taskAccuracy = 0;
    });
  }
};

/**
 * 新增计划
 */
const submitPlan = async () => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return ElMessage.warning("请填写完整计划信息！");
  }

  loading.value = true;
  const payload: any = {
    ...formModel,
    aiTags: Array.isArray(formModel.aiTags)
      ? formModel.aiTags.join(",")
      : formModel.aiTags,
  };
  console.log("payload==新建任务==>", payload);

  const { type, info }: any = await addPlan(payload);
  (ElMessage as any)[type](info);
  loading.value = false;
  if (type === "success") {
    handleCloseDialog();
  }
};

/**
 * 关闭新增计划弹框
 */
const handleCloseDialog = () => {
  emits("close");
};
/**
 * 选择航线库
 */
const showChooseRoute = ref(false);
const handleShowChooseRoute = () => {
  if (showChooseDevice.value) {
    showChooseDevice.value = false;
  }
  showChooseRoute.value = !showChooseRoute.value;
};

interface Route {
  id: number;
  title: string;
  meta: string;
  updateTime: string;
  type: string;
  routeId: string;
}
// 选择航线库事件
const handleChooseRoute = (route: any) => {
  if (route) {
    currentRoute.value = route;
    formModel.routeId = route.routeId;
    formModel.routeName = route.title;
    formModel.waylineType = route.templateType;
    formRef.value?.clearValidate?.(["routeId"]);
    loadRouteLayer();
  }
  // showChooseRoute.value = false
};
/**
 * 航线库标题修改事件
 */
const showInputRoute = ref(false);
const handleClickCard = (value: boolean) => {
  showInputRoute.value = value;
};

/**
 * 绘制航线图层
 */
const loadRouteLayer = () => {
  console.log("绘制航线图层");
};

/**
 * 修改返航高度值
 */
const changeHeightValue = (btn: { label: string; value: number }) => {
  // 处理空值或非法值情况
  const currentValue: any =
    formModel.flightAltitude === "" || isNaN(Number(formModel.flightAltitude))
      ? 0
      : Number(formModel.flightAltitude);
  let newValue = currentValue + btn.value;
  // 特殊规则：当前值为空/0时，+1按钮设置为20
  if (btn.value === 1 && currentValue <= 0) {
    newValue = 20;
  }
  // 强制最小值为20
  if (newValue < 20) {
    newValue = 20;
  }
  if (newValue > 500) {
    newValue = 500;
  }
  formModel.flightAltitude = newValue.toString();
};

/**
 * 选择设备(显示设备列表)
 */
const showChooseDevice = ref<boolean>(false);
const handleChangeDevice = () => {
  if (showChooseRoute.value) {
    showChooseRoute.value = false;
  }
  showChooseDevice.value = !showChooseDevice.value;
};

// 定义设备类型接口
interface DeviceActivity {
  id: number;
  deviceSn: string;
  deviceName: string;
  modelName: string;
  type: string;
  action: string;
  time: string;
  status: string;
  nickname: string;
}
/**
 * 设备数据显示
 * @param item 设备信息
 */
const handleClickDevice = (item: DeviceActivity) => {
  if (item) {
    deviceInfo.value = item;
    formModel.deviceSn = String(item.deviceSn);
    formRef.value?.clearValidate?.(["deviceSn"]);
  }
};

/**
 * 获取状态样式
 * */
const getStatusClass = (status: string) => {
  return `status-${status}`;
};
</script>

<style lang="less" scoped>
.project-middle-container {
  height: 100%;
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  .plan-form {
    background-color: rgba(23, 44, 44, 0.9);
    pointer-events: auto;
    flex-direction: row;
    width: 100%;
    height: 100%;
    display: flex;
    position: relative;
    .form-content {
      flex-direction: column;
      width: 350px;
      height: 100%;
      display: flex;
      .title {
        color: #fff;
        box-shadow: inset 0 -1px 0 0 #4f4f4f;
        margin: 0;
        padding: 10px;
        padding-left: 32px;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        .el-icon {
          cursor: pointer;
        }
        span {
          font-weight: bold;
        }
      }
      /deep/ .form-main {
        flex: 1;
        padding: 0 16px 16px;
        overflow: auto;
        margin: 10px 0;
        .blackInput {
          font-size: 14px;
          .el-input__inner {
            color: #fff !important;
          }
        }

        .form-label {
          align-items: center;
          display: flex;
          justify-content: space-between;
          .el-form-item__content {
            display: flex !important;
            justify-content: end !important;
          }
        }
        .strategy-radio-group {
          .el-radio-button {
            min-width: 25% !important;
          }
        }
        .task-accuracy-box {
          width: 100%;
        }
        .disabled-mask {
          position: relative;
          &::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(92, 94, 96, 0.5);
            border-radius: 4px;
            pointer-events: none;
          }
        }
        .task-type-label {
          .el-form-item__label {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .el-icon {
            transition: color 0.2s;
            cursor: pointer;
            color: #999;
            &:hover {
              color: #2d8cf0 !important;
            }
          }
        }
        .control-buttons {
          display: flex;
          align-items: center;
          width: 100%;
          .el-button {
            height: 22px !important;
            padding: 0 5px !important;
            background: #3c3c3c;
            color: #fff;
            border: none;
            border-radius: 2px;
            line-height: 22px;
            transition: all 0.3s;
            &:not(&:first-child) {
              margin-left: 5px !important;
            }
          }
          .input-unit {
            flex: 1;
            justify-content: center;
            align-items: center;
            margin: 0 4px;
            display: flex;
            .input {
              min-width: 60px;
            }
            .unit {
              color: #fff;
              margin-left: 2px;
            }
          }
        }

        .repeat-frequency {
          align-items: center;
          display: flex;
          width: 100%;
          .every {
            margin-right: 8px;
            color: #fff;
          }
          .plan-el-select {
            flex: 1;
            margin-left: 8px;
          }
        }
        .day-selector {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: repeat(6, 1fr);
          gap: 10px; /* 格子间距 */
          width: 100%;
          color: #fff;
          text-align: center;
          margin-top: 10px;
          .uranus-btn {
            background-color: #3c3c3c;
            cursor: pointer;
            text-decoration: none !important;
            border-radius: 3px;
            &:hover {
              background-color: #5d5f61;
            }
            &.active {
              background-color: #2d8cf0;
              color: #fff;
            }
          }
        }
        .week-selector {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px; /* 格子间距 */
          width: 100%;
          color: #fff;
          text-align: center;
          margin-top: 10px;
          .uranus-btn {
            background-color: #3c3c3c;
            cursor: pointer;
            text-decoration: none !important;
            border-radius: 3px;
            &:hover {
              background-color: #5d5f61;
            }
            &.active {
              background-color: #2d8cf0;
              color: #fff;
            }
          }
        }
        .repeat-day {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 16px;
          .repeat-day-item {
            flex: 1;
          }
        }
        .battery-status-box {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 5px;
          color: #fff;
        }

        .execution-time-box {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin: 5px 0;
          .execution-time-btn {
            display: flex;
            align-items: center;
            .el-button.is-circle {
              width: 24px !important;
              height: 24px !important;
            }
          }
        }
        .el-button,
        .el-button.is-round {
          width: 100%;
        }
        .el-form-item__label {
          color: #fff;
          margin-bottom: 0;
        }
        /* 强制覆盖 Element Plus 输入框样式 */
        .el-input {
          .el-input__wrapper {
            background-color: #333 !important;
            box-shadow: 0 0 0 1px #555 inset !important;

            .el-input__inner {
              background-color: #333 !important;
            }
          }

          &.is-focused .el-input__wrapper {
            box-shadow: 0 0 0 1px #2d8cf0 inset !important;
          }
        }
        .el-radio-button:last-child .el-radio-button__inner {
          border-radius: 0 3px 3px 0;
        }
        .el-radio-button:first-child .el-radio-button__inner {
          border-radius: 3px 0 0 3px;
        }
        .el-form-item__content {
          width: 100%;
        }
        .el-radio-group {
          width: 100%;
          display: flex;
          flex-wrap: nowrap;
          .el-radio-button {
            flex: 1;
            .el-radio-button__inner {
              width: 100%;
              background: #3c3c3c;
              border-color: #3c3c3c;
              color: #fff;
              outline-color: #3c3c3c;
              &:hover {
                background-color: rgb(92, 94, 96);
              }
            }
          }
        }
        .el-date-editor {
          .el-range-input,
          .el-range-separator,
          .el-range__icon {
            color: #fff;
          }
        }
        .el-date-editor.el-input,
        .el-date-editor.el-input__wrapper {
          background-color: #333 !important;
          box-shadow: 0 0 0 1px #555 inset !important;
          width: 100%;
        }
        .ai-tags-group {
          .el-checkbox__label {
            color: #fff;
          }
          .ai-tag {
            margin-right: 0px;
            .el-checkbox__label {
              width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }

        .ai-tags-group {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          height: 92px;
          width: 100%;
          padding: 10px;
          overflow-y: auto;
          border: 1px solid #555;
          border-radius: 2px;
          background: #333;
        }

        .ai-tags-group::-webkit-scrollbar {
          width: 2px;
        }

        .ai-tags-group::-webkit-scrollbar-thumb {
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.22);
        }

        .ai-tags-group::-webkit-scrollbar-track {
          background: transparent;
        }
      }
      .route-card {
        width: 100%;
        background-color: #333333; /* 卡片默认背景色 */
        border: 1px solid #555;
        padding: 12px;
        margin-bottom: 10px; /* 卡片之间的间距 */
        border-radius: 2px; /* 圆角 */
        position: relative; /* 用于定位卡片内的操作按钮 */
        cursor: pointer; /* 鼠标悬停时显示手型 */
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease; /* 添加过渡效果 */
        &:hover {
          background-color: #444; /* 鼠标悬停时背景变浅 */
        }
        div {
          line-height: 1;
        }
        .card-title {
          font-size: 14px;
          font-weight: bold;
          color: white;
          margin-bottom: 5px;
          .route-icon {
            width: 16px;
            height: 16px;
          }
          .card-title-name {
            display: flex;
            gap: 5px;
            align-items: center;
          }
        }

        .card-meta {
          font-size: 12px;
          color: #aaa; /* 元信息文字颜色 */
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          .device-icon {
            width: 12px;
            height: 12px;
            margin-right: 5px;
          }
        }
      }
      .device-card {
        background-color: #333333; /* 卡片默认背景色 */
        border: 1px solid #555;
        padding: 12px;
        margin-bottom: 10px;
        border-radius: 2px; /* 圆角 */
        cursor: pointer;
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease;
        display: flex;
        align-items: center;
        width: 100%;

        &:hover {
          background-color: #444; /* 鼠标悬停时背景变浅 */
        }
        div {
          line-height: 1.2;
        }
        .activity-icon {
          width: 24px;
          height: 24px;
          min-width: 24px; /* 防止图标被压缩 */
          border-radius: 50%;
          margin-right: 10px;
          background-size: 16px;
          background-position: center;
          background-repeat: no-repeat;
          transition: transform 0.3s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          &:hover {
            transform: scale(1.1);
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          &.drone {
            background-color: rgba(64, 158, 255, 0.1);
          }

          &.dock {
            background-color: rgba(103, 194, 58, 0.1);
          }
        }
        .activity-content {
          flex: 1;
          min-width: 0; // 防止文本溢出
          max-width: calc(100% - 50px); // 确保内容不会超出容器
          color: #fff;
          div {
            margin-bottom: 3px;
          }

          .activity-title {
            font-size: 14px;
            margin-bottom: 4px;

            .activity-action {
              margin-left: 8px;
              font-size: 12px;
              background-color: rgba(144, 147, 153, 0.1);
              padding: 1px 6px;
              border-radius: 10px;
              flex-shrink: 0;
            }
          }

          .activity-time {
            font-size: 12px;
            color: #aaa;
          }
        }

        .activity-status {
          min-width: 8px; /* 防止状态指示点被压缩 */
          font-size: 12px;

          &.status-success {
            color: #67c23a;
          }

          &.status-warning {
            color: #e6a23c;
          }

          &.status-error {
            color: #f56c6c;
          }
        }
      }
    }
  }
  .actions {
    width: 100%;
    padding: 16px;
    height: 65px;
    border-top: 1px solid #4f4f4f;
    display: flex;
    justify-content: space-between;
    .el-button {
      flex: 1;
    }
  }
}
</style>
