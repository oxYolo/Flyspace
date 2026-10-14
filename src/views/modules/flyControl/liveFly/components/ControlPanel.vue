<template>
  <div class="container">
    <!-- 左侧 -->
    <div class="left-wrap">
      <div class="takeover-auth-box">
        <div
          class="takeover-auth"
          :class="{ disabled: drcLoading }"
          @click="!drcLoading && handleGetControlPermission()">
          <img class="uav-image" src="@/assets/icons/uav.png" />
          <div>
            <span v-if="drcLoading">处理中...</span>
            <span v-else-if="flyControlStore.drcConnected">已接管</span>
            <span v-else>接管授权</span>
          </div>
        </div>
      </div>
      <div class="uav-info-box">
        <div class="take-off-button-container">
          <div class="outer-rect hover_box">
            <el-button
              class="take-off-button"
              :disabled="canTakeOff"
              @click="handleTakeOff">
              <div class="button-content">
                <img
                  class="uav-icon"
                  src="@/assets/icons/fly_UAV.png"
                  alt="无人机图标" />
                <span class="button-label">一键起飞 <br />（T）</span>
              </div>
            </el-button>
          </div>
        </div>
        <div class="nav-info">
          <div>
            返航高度：<span
              >{{ defaultTakeOffState.rthAltitude || "--" }}米</span
            >
          </div>
          <div>
            失控动作：<span>{{
              rcLostActionMap[
                defaultTakeOffState.rcLostAction as keyof typeof rcLostActionMap
              ] || "--"
            }}</span>
          </div>
          <span
            class="nav-info-btn hover_box"
            @click="handleShowEditTakeOffState">
            <img class="icon" src="@/assets/icons/修改.png" alt="" />
            <span>修改飞行参数（P）</span>
          </span>
        </div>
        <div class="uav-btn-wrap">
          <div
            v-if="showReturnHomeButton"
            class="uav-back hover_box"
            @click="handleControlTask('return_home')">
            <img src="@/assets/icons/一键返航.png" />
            <div>一键返航(G)</div>
          </div>
          <div
            v-if="showCancelReturnButton"
            class="uav-back hover_box"
            @click="handleControlTask('return_home_cancel')">
            <img src="@/assets/icons/取消返航.png" />
            <div>取消返航(N)</div>
          </div>
          <div
            v-if="showResumeFlightButton"
            class="uav-back hover_box"
            @click="handleResumeFlight">
            <img src="@/assets/icons/取消返航.png" />
            <div>恢复航线(B)</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 中间 -->
    <div class="center-wrap">
      <div class="title">飞行控制</div>
      <!-- 键盘控制网格 -->
      <div class="control-grid">
        <div class="key-item">
          <div class="tag">Q</div>
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('q')">
            <el-icon :size="28" color="#333">
              <RefreshLeft />
            </el-icon>
          </div>
        </div>
        <div class="key-item">
          <div class="tag">W</div>
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('w')">
            <el-icon :size="28" color="#333">
              <ArrowUp />
            </el-icon>
          </div>
        </div>
        <div class="key-item">
          <div class="tag">E</div>
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('e')">
            <el-icon :size="28" color="#333">
              <RefreshRight />
            </el-icon>
          </div>
        </div>
        <div class="key-item">
          <div class="tag">C</div>
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('c')">
            <el-icon :size="28" color="#333">
              <Top />
            </el-icon>
          </div>
        </div>
        <div class="key-item">
          <div class="tag"></div>
          <div
            class="control-item hover_red_box"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleControlTask('emergency_stop')">
            <img class="icon" src="@/assets/icons/急停.png" alt="" />
            <span>急停</span>
            <span>Space</span>
          </div>
        </div>
        <div class="key-item">
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('a')">
            <el-icon :size="28" color="#333">
              <ArrowLeft />
            </el-icon>
          </div>
          <div class="tag">A</div>
        </div>
        <div class="key-item">
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('s')">
            <el-icon :size="28" color="#333">
              <ArrowDown />
            </el-icon>
          </div>
          <div class="tag">S</div>
        </div>
        <div class="key-item">
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('d')">
            <el-icon :size="28" color="#333">
              <ArrowRight />
            </el-icon>
          </div>
          <div class="tag">D</div>
        </div>
        <div class="key-item">
          <div
            class="key"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('z')">
            <el-icon :size="28" color="#333">
              <Bottom />
            </el-icon>
          </div>
          <div class="tag">Z</div>
        </div>
        <div class="key-item">
          <div
            class="control-item hover_box"
            :class="!flyControlStore.drcConnected ? 'disabled' : ''"
            @click="handleFlyControl('x')">
            <img class="icon" src="@/assets/icons/高速档.png" alt="" />
            <span>{{ speedMode === "high" ? "普通档" : "高速档" }}</span>
            <span>(X)</span>
          </div>
          <div class="tag tip1">Tip：可在飞行地图中指点自动飞行</div>
        </div>
      </div>
    </div>
    <!-- 右侧 -->
    <div class="right-wrap">
      <div class="title">云台控制</div>
      <div class="control-wrap">
        <div class="ptz-control">
          <div class="control-grid">
            <div
              class="control-button control-top"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControlVideo('arrowup')">
              <CaretTop />
            </div>
            <div
              class="control-button control-left"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControlVideo('arrowleft')">
              <CaretLeft />
            </div>
            <div
              class="control-button control-right"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControlVideo('arrowright')">
              <CaretRight />
            </div>
            <div
              class="control-button control-bottom"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControlVideo('arrowdown')">
              <CaretBottom />
            </div>
          </div>
          <div class="controls-btn">
            <div
              class="control-item hover_box"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControl('0')">
              <img class="icon" src="@/assets/icons/水平.png" alt="" />
              <span>一键水平(H)</span>
            </div>
            <div
              class="control-item hover_box"
              :class="!flyControlStore.drcConnected ? 'disabled' : ''"
              @click="handlestickControl('1')">
              <img class="icon" src="@/assets/icons/垂直.png" alt="" />
              <span>一键垂直(V)</span>
            </div>
          </div>
          <div class="slide-wrap">
            <el-slider
              v-model="sliderValue"
              vertical
              height="80%"
              :min="2"
              :max="100"
              :marks="marks"
              placement="left"
              :disabled="!flyControlStore.drcConnected"
              @input="debouncedSliderChange" />
          </div>
        </div>
      </div>
    </div>

    <GeoCommonDialog
      v-model:dialogVisible="showTakeOffStateForm"
      title="修改飞行参数"
      @close="handleClosedTakeOffStateForm"
      @cancel="handleClosedTakeOffStateForm"
      @confirm="handleConfirmTakeOffStateForm">
      <div class="dialogContent">
        <el-form
          :model="tempTakeOffStateForm"
          label-width="160px"
          :rules="formRules"
          ref="formRef">
          <el-form-item label="返航高度(m)" prop="rthAltitude">
            <el-input-number
              v-model="tempTakeOffStateForm.rthAltitude"
              :min="1"
              :max="1000" />
          </el-form-item>

          <el-form-item label="指点飞行高度(m)" prop="commanderFlightHeight">
            <el-input-number
              v-model="tempTakeOffStateForm.commanderFlightHeight"
              :min="1"
              :max="1000" />
          </el-form-item>

          <el-form-item label="遥控器失控动作" prop="rcLostAction">
            <el-radio-group v-model="tempTakeOffStateForm.rcLostAction">
              <el-radio value="0">悬停</el-radio>
              <el-radio value="1">着陆(降落)</el-radio>
              <el-radio value="2">返航</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
    </GeoCommonDialog>
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowLeft,
  Top,
  RefreshLeft,
  RefreshRight,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Bottom,
  CaretTop,
  CaretBottom,
  CaretLeft,
  CaretRight,
} from "@element-plus/icons-vue";
import { v4 as uuidv4 } from "uuid";
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
} from "vue";
import type { DeviceInfo } from "@/model/device";
import {
  $createDRCConnection,
  $enterDRCMode,
  $oneKeyTakeOff,
  $getFlightControl,
} from "@/api/flyControl/device";
import {
  changeFlyTaskStatus,
  createControlTask,
  handleControl,
  handleControlVideo,
  handleControlZoomFactor,
  handleRTCFlyControl,
} from "@/transform/control.ts";
import { ElMessage } from "element-plus";
import emitter from "@/stores/mitt";
import { DockDrcHeartConnect } from "@/composables/droneStatus";
import { useFlyControlStore } from "@/stores/modules/flyControl";
import type { CSSProperties } from "vue";
import { debounce } from "lodash";
import GeoCommonDialog from "@/components/common/GeoCommonDialog.vue";
const sliderValue = ref<number>(2);
// 控制是否启用 watch 监听的标志
const props = defineProps({
  droneStatus: {
    type: Object,
    default: () => ({}),
  },
  device: {
    type: Object as () => DeviceInfo | null,
    default: () => null,
  },
  runTaskData: {
    type: Object as any,
    default: () => null,
  },
});

const emits = defineEmits([
  "showShortCutKey",
  "takePhoto",
  "togglePanorama",
  "toggleRecording",
]);

// 使用Pinia store管理drcConnected状态
const flyControlStore = useFlyControlStore();
const drcLoading = ref(false);

interface drcInfo {
  address: string;
  username: string;
  password: string;
  clientId: string;
  expireTime: string;
  enableTls: string;
}

const drcInfo = ref<drcInfo>({
  address: "",
  username: "",
  password: "",
  clientId: "",
  expireTime: "",
  enableTls: "",
});

const CENTER_VALUE = 1024; // 中位值
const HANDLE_VALKUE = 300; // 单次操作的值
const speedMode = ref<"normal" | "high">("normal"); //添加速度模式状态
const isReturningHome = ref(false); // 跟踪返航状态

// 键盘控制状态管理
const pressedKeys = ref<Set<string>>(new Set()); // 当前按下的键
const keyTimers = ref<Map<string, any>>(new Map()); // 长按定时器
const combinationTimer = ref<any | null>(null); // 组合控制定时器
const LONG_PRESS_DELAY = 150; // 长按判定时间(ms)
const COMBINATION_INTERVAL = 100; // 组合控制执行间隔(ms)

onMounted(async () => {
  //键盘事件监听
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
});

const dockDrcHeartConnect = new DockDrcHeartConnect(props.device?.deviceSn);

// 接管授权
const handleGetControlPermission = async () => {
  if (props.device?.workspaceId) {
    drcLoading.value = true;
    dockDrcHeartConnect.closeHeart();
    if (!flyControlStore.drcConnected) {
      try {
        await $getFlightControl(props.device.workspaceId);
        const res = await $createDRCConnection(props.device.workspaceId, {
          clientId: uuidv4(),
        });
        drcInfo.value = res.data;
        const res2: any = await $enterDRCMode(props.device.workspaceId, {
          clientId: drcInfo.value.clientId,
          dockSn: props.device.deviceSn,
        });
        if (res2.code === 200 || res2.code === 0) {
          // 设置Pinia store中的状态
          flyControlStore.setDrcConnected(true);
          ElMessage.success("接管授权成功");
          dockDrcHeartConnect.startHeart();
        } else {
          // 设置Pinia store中的状态
          flyControlStore.setDrcConnected(false);
          ElMessage.error("接管授权失败");
        }
      } catch (e) {
        // 设置Pinia store中的状态
        flyControlStore.setDrcConnected(false);
        ElMessage.error("接管授权失败");
      } finally {
        drcLoading.value = false;
      }
    } else {
      drcLoading.value = false;
      // 设置Pinia store中的状态
      flyControlStore.setDrcConnected(false);
    }
  }
};

// 组件销毁时
onBeforeUnmount(() => {
  dockDrcHeartConnect.closeHeart();
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  emitter.off("change-camera-type");
});

// 键盘控制映射
const keyControlMap: any = {
  q: () => handleFlyControl("q"),
  w: () => handleFlyControl("w"),
  e: () => handleFlyControl("e"),
  a: () => handleFlyControl("a"),
  s: () => handleFlyControl("s"),
  d: () => handleFlyControl("d"),
  c: () => handleFlyControl("c"),
  z: () => handleFlyControl("z"),
  x: () => handleFlyControl("x"),
  // 相机操作
  f: () => emits("takePhoto"),
  y: () => emits("togglePanorama"),
  r: () => emits("toggleRecording"),
  // 任务/控制快捷键（受 canTakeOff 禁用态限制）
  p: () => {
    if (canTakeOff.value) return;
    handleShowEditTakeOffState();
  },
  g: () => {
    if (canTakeOff.value) return;
    handleControlTask("return_home");
  },
  n: () => {
    if (canTakeOff.value) return;
    handleControlTask("return_home_cancel");
  },
  b: () => {
    if (canTakeOff.value) return;
    handleResumeFlight();
  },
  t: () => handleTakeOff(),
  h: () => handlestickControl("0"),
  v: () => handlestickControl("1"),
  " ": () => handleControlTask("emergency_stop"),
  arrowup: () => handlestickControlVideo("arrowup"),
  arrowdown: () => handlestickControlVideo("arrowdown"),
  arrowleft: () => handlestickControlVideo("arrowleft"),
  arrowright: () => handlestickControlVideo("arrowright"),
  "?": () => handleShowShortCutKey(),
  "/": () => handleShowShortCutKey(),
  "？": () => handleShowShortCutKey(),
};
// 键盘事件处理 - 按下
const handleKeyDown = (e: any) => {
  const key = e.key.toLowerCase();
  const handler = keyControlMap[key];

  // 允许部分快捷键在未接管授权时也可触发（例如帮助弹窗）
  const bypassKeys = ["?", "/", "？"];
  if (!handler) {
    return;
  }
  if (!flyControlStore.drcConnected && !bypassKeys.includes(key)) {
    return;
  }

  e.preventDefault();

  // 如果键已经被按下，忽略重复事件
  if (pressedKeys.value.has(key)) {
    return;
  }

  pressedKeys.value.add(key);

  // 检查是否为方向控制键
  const directionKeys = ["w", "s", "a", "d", "q", "e", "c", "z"];
  if (directionKeys.includes(key)) {
    // 立即执行一次单次控制
    executeSingleControl(key);

    // 设置长按定时器
    const timer = setTimeout(() => {
      startContinuousControl();
    }, LONG_PRESS_DELAY);

    keyTimers.value.set(key, timer);
  } else {
    // 非方向键直接执行
    handler();
  }
};

// 键盘事件处理 - 释放
const handleKeyUp = (e: any) => {
  const key = e.key.toLowerCase();

  if (pressedKeys.value.has(key)) {
    pressedKeys.value.delete(key);

    // 清除对应的长按定时器
    const timer = keyTimers.value.get(key);
    if (timer) {
      clearTimeout(timer);
      keyTimers.value.delete(key);
    }

    // 如果没有方向键被按下，停止连续控制
    const directionKeys = ["w", "s", "a", "d", "q", "e", "c", "z"];
    const hasDirectionKeys = Array.from(pressedKeys.value).some((k) =>
      directionKeys.includes(k),
    );

    if (!hasDirectionKeys && combinationTimer.value) {
      clearInterval(combinationTimer.value);
      combinationTimer.value = null;
    }
  }
};

//水平、垂直控制
async function handlestickControl(resetMode: any) {
  if (!flyControlStore.drcConnected) {
    return;
  }
  if (!props.device?.deviceSn) return;
  if (!props.droneStatus?.deviceInfo) return;

  if (
    Array.isArray(props.droneStatus?.deviceInfo?.dockPayloads) &&
    props.droneStatus.deviceInfo.dockPayloads.length
  ) {
    const payloadIndex =
      props.droneStatus.deviceInfo.dockPayloads[0]?.payloadIndex;
    handleControl(props.device.deviceSn, resetMode, payloadIndex);
  }
}

//云台控制
async function handlestickControlVideo(mode: any) {
  if (!flyControlStore.drcConnected) {
    return;
  }
  if (!props.device?.deviceSn) return;
  if (!props.droneStatus?.deviceInfo) return;

  if (
    Array.isArray(props.droneStatus?.deviceInfo?.dockPayloads) &&
    props.droneStatus.deviceInfo.dockPayloads.length
  ) {
    const payloadIndex =
      props.droneStatus.deviceInfo.dockPayloads[0]?.payloadIndex;
    await handleControlVideo(
      props.device.deviceSn,
      mode,
      payloadIndex,
      cameraType.value,
    );
  }
}

// 遥控器失控动作映射
const rcLostActionMap: Record<string, string> = {
  "0": "悬停",
  "1": "着陆(降落)",
  "2": "返航",
};

const tempTakeOffStateForm: any = ref({});
const showTakeOffStateForm = ref(false);
const formRef = ref();

// 表单验证规则
const formRules = {
  rthAltitude: [{ required: true, message: "请输入返航高度", trigger: "blur" }],
  commanderFlightHeight: [
    { required: true, message: "请输入指点飞行高度", trigger: "blur" },
  ],
  rcLostAction: [
    { required: true, message: "请选择遥控器失控动作", trigger: "change" },
  ],
};

const handleShowEditTakeOffState = () => {
  tempTakeOffStateForm.value = {
    ...defaultTakeOffState.value,
  };
  showTakeOffStateForm.value = true;
};
const handleClosedTakeOffStateForm = () => {
  showTakeOffStateForm.value = false;
};
const handleConfirmTakeOffStateForm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    defaultTakeOffState.value = {
      ...tempTakeOffStateForm.value,
    };
    handleClosedTakeOffStateForm();
    ElMessage.success("飞行参数修改成功");
  } catch (error) {
    ElMessage.error("请完善表单信息");
  }
};

const defaultTakeOffState: any = ref({
  rthMode: "0", // 返航模式： {"0":"智能高度","1":"设定高度"}
  rthAltitude: 120, //返航高度 (相对(机场)起飞点的高度，相对高 ALT)
  commanderModeLostAction: "1", //指点飞行失控动作 {"0":"继续执行指点飞行任务","1":"退出指点飞行任务，执行普通失控行为"}
  commanderFlightMode: 0, // 指点飞行模式设置值 {"0":"智能高度飞行","1":"设定高度飞行"}
  commanderFlightHeight: 50, // 指点飞行高度（相对(机场)起飞点的高度，相对高 ALT）
  targetHeight: 150, // 目标高度： 相对地面
  securityTakeoffHeight: 50, // 安全起飞高度，相对(机场)起飞点的高度
  rcLostAction: "2", // 遥控器失控动作 {"0":"悬停","1":"着陆(降落)","2":"返航"}
  exitWaylineWhenRcLost: "1", // 遥控器信号丢失时是否退出航线,{"0":"否","1":"是"}
  maxSpeed: 10, // 最大飞行速度 m/s
});

// 一键起飞点击事件
async function handleTakeOff() {
  if (canTakeOff.value) {
    return;
  }
  // 示例参数，后续可用表单收集
  const flightId = uuidv4();
  const params = {
    ...defaultTakeOffState.value,
    flightId: flightId,
    targetLongitude: props.device?.longitude,
    targetLatitude: props.device?.latitude,
  };
  try {
    await $oneKeyTakeOff(props.device?.deviceSn || "", params).then(
      (res: any) => {
        if (res?.code == 200 || res?.code == 0) {
          ElMessage.success("一键起飞成功");
          emitter.emit("oneKeyTakeOff", flightId);
        } else {
          ElMessage.error("一键起飞失败");
        }
      },
    );
    // 可选：提示成功
  } catch (e) {
    // 可选：提示失败
    console.log(e);
  }
}
const canTakeOff = computed(() => {
  return props.droneStatus?.flightStatusInfo?.modeCode;
});
const getCameraZoomFactor = ref(false);
watch(
  () => props.droneStatus?.deviceInfo?.cameras?.[0]?.zoomFactor,
  (newVal) => {
    // 只有在启用监听时才更新 sliderValue
    if (newVal && !getCameraZoomFactor.value) {
      sliderValue.value = Number(newVal);
      getCameraZoomFactor.value = true;
    }
  },
  {
    immediate: true,
    deep: true,
  },
);

interface Mark {
  style: CSSProperties;
  label: string;
}

type Marks = Record<number, Mark | string>;
const marks = reactive<Marks>({
  2: "2",
  25: "25",
  50: "50",
  75: "75",
  100: "100",
});
// 控制任务
const handleControlTask = async (service_identifier: string) => {
  if (["emergency_stop"].includes(service_identifier)) {
    if (!flyControlStore.drcConnected) {
      return;
    }
  }
  if (service_identifier === "return_home") {
    dockDrcHeartConnect.closeHeart();
    // 设置Pinia store中的状态
    flyControlStore.setDrcConnected(false);
  }
  try {
    const params: any = {
      sn: props.device?.deviceSn,
      service_identifier,
    };
    const successMsg = await createControlTask(params);
    ElMessage.success(successMsg);

    // 更新返航状态
    if (service_identifier === "return_home") {
      isReturningHome.value = true;
    } else if (service_identifier === "return_home_cancel") {
      isReturningHome.value = false;
    }
  } catch (error: any) {
    ElMessage.error(error);
  }
};

// 单次控制执行
const executeSingleControl = async (controlKey: string) => {
  await handleFlyControl(controlKey);
};

// 开始连续控制
const startContinuousControl = () => {
  if (combinationTimer.value) {
    clearInterval(combinationTimer.value);
  }

  combinationTimer.value = setInterval(() => {
    executeCombinedControl();
  }, COMBINATION_INTERVAL);
};

// 执行组合控制
const executeCombinedControl = async () => {
  if (!flyControlStore.drcConnected || pressedKeys.value.size === 0) {
    return;
  }

  const directionKeys = ["w", "s", "a", "d", "q", "e", "c", "z"];
  const activeKeys = Array.from(pressedKeys.value).filter((key) =>
    directionKeys.includes(key),
  );

  if (activeKeys.length === 0) {
    return;
  }

  // 检查冲突的按键组合
  const hasConflict =
    (activeKeys.includes("w") && activeKeys.includes("s")) || // 前后冲突
    (activeKeys.includes("a") && activeKeys.includes("d")) || // 左右冲突
    (activeKeys.includes("q") && activeKeys.includes("e")) || // 左右旋转冲突
    (activeKeys.includes("c") && activeKeys.includes("z")); // 上下冲突

  if (hasConflict) {
    // 有冲突时，只执行最后按下的键
    const lastKey = Array.from(pressedKeys.value).pop();
    if (lastKey) {
      await handleFlyControl(lastKey);
    }
    return;
  }

  // 无冲突时，组合执行
  if (activeKeys.length === 1) {
    await handleFlyControl(activeKeys[0]);
  } else {
    await handleCombinedFlyControl(activeKeys);
  }
};

// 组合飞行控制
const handleCombinedFlyControl = async (controlKeys: string[]) => {
  if (!flyControlStore.drcConnected) {
    return;
  }

  try {
    const DIRECTION_MAP: any = {
      w: 1,
      e: 1,
      c: 1,
      d: 1,
      q: -1,
      a: -1,
      s: -1,
      z: -1,
    };

    const speedFactor = speedMode.value === "high" ? 2 : 1;
    const params: any = { sn: props.device?.deviceSn };

    // 组合多个方向的控制参数
    for (const controlKey of controlKeys) {
      const direction = DIRECTION_MAP[controlKey] || 0;
      let paramsValue: any;

      if (["q", "e"].includes(controlKey)) {
        paramsValue = "yaw";
      } else if (["w", "s"].includes(controlKey)) {
        paramsValue = "pitch";
      } else if (["c", "z"].includes(controlKey)) {
        paramsValue = "throttle";
      } else if (["a", "d"].includes(controlKey)) {
        paramsValue = "roll";
      }

      if (direction && paramsValue) {
        params[paramsValue] =
          CENTER_VALUE + direction * HANDLE_VALKUE * speedFactor;
      }
    }

    await handleRTCFlyControl(params);
  } catch (error) {
    flyControlStore.setDrcConnected(false);
  }
};

//飞行控制按钮事件
const handleFlyControl = async (controlKey: string) => {
  if (!flyControlStore.drcConnected) {
    return;
  }
  try {
    let set_Value, paramsValue: any;
    const DIRECTION_MAP: any = {
      w: 1,
      e: 1,
      c: 1,
      d: 1,
      arrowup: 1,
      q: -1,
      a: -1,
      s: -1,
      z: -1,
      arrowdown: -1,
    };

    const direction = DIRECTION_MAP[controlKey] || 0;

    // 处理速度模式切换
    if (controlKey === "x") {
      speedMode.value = speedMode.value === "normal" ? "high" : "normal";
      ElMessage.success(
        `已切换至${speedMode.value === "high" ? "高速档" : "普通档"}`,
      );
      return;
    }

    // 根据速度模式调整控制量
    const speedFactor = speedMode.value === "high" ? 2 : 1;

    if (direction) {
      set_Value = CENTER_VALUE + direction * HANDLE_VALKUE * speedFactor;
    }
    if (["q", "e"].some((n) => n === controlKey)) {
      paramsValue = "yaw";
    } else if (["w", "s", "x"].some((n) => n === controlKey)) {
      paramsValue = "pitch";
    } else if (["c", "z"].some((n) => n === controlKey)) {
      paramsValue = "throttle";
    } else if (["a", "d"].some((n) => n === controlKey)) {
      paramsValue = "roll";
    } else if (["arrowup", "arrowdown"].some((n) => n === controlKey)) {
      paramsValue = "gimbal_pitch";
    }
    const params: any = {
      sn: props.device?.deviceSn,
    };
    params[paramsValue] = set_Value;
    await handleRTCFlyControl(params);
  } catch (error) {
    // 设置Pinia store中的状态
    flyControlStore.setDrcConnected(false);
  }
};

const cameraType = ref("wide");
emitter.on("change-camera-type", (value) => {
  cameraType.value = value as string;
});

// 防抖处理滑块变化
const handleSliderChange = async () => {
  try {
    if (!flyControlStore.drcConnected) {
      return;
    }
    if (!props.device?.deviceSn) return;
    if (!props.droneStatus?.deviceInfo) return;

    if (
      Array.isArray(props.droneStatus?.deviceInfo?.cameras) &&
      props.droneStatus.deviceInfo.cameras.length
    ) {
      const payloadIndex =
        props.droneStatus.deviceInfo.cameras[0]?.payloadIndex;
      await handleControlZoomFactor(
        props.device.deviceSn,
        payloadIndex,
        cameraType.value,
        sliderValue.value || 2,
      );
    }
  } catch (error) {
    console.error("控制变焦失败:", error);
  }
};

// 使用lodash防抖函数，延迟300ms执行
const debouncedSliderChange = debounce(handleSliderChange, 1000);

// 恢复航线
const handleResumeFlight = async () => {
  if (!flyControlStore.drcConnected) {
    return;
  }
  if (!props.device?.deviceSn || !props.runTaskData?.jobId) {
    ElMessage.warning("设备信息或航线任务不完整");
    return;
  }
  try {
    const successMsg = await changeFlyTaskStatus(props.runTaskData?.jobId, {
      status: "1",
    });
    ElMessage.success(successMsg || "恢复航线成功");
    isReturningHome.value = false;
  } catch (error) {
    ElMessage.error(typeof error === "string" ? error : "恢复航线失败");
  }
};

// 计算属性控制按钮的显示/隐藏
const showReturnHomeButton = computed(() => {
  // 无任务时始终显示，有任务时仅在非返航状态显示
  return (
    !props.runTaskData?.jobId ||
    (!!props.runTaskData?.jobId && !isReturningHome.value)
  );
});

const showCancelReturnButton = computed(() => {
  // 无任务时始终显示，有任务时仅在返航状态显示
  return (
    !props.runTaskData?.jobId ||
    (!!props.runTaskData?.jobId && isReturningHome.value)
  );
});

const showResumeFlightButton = computed(() => {
  // 只有在有任务时显示恢复航线按钮
  return !!props.runTaskData?.jobId;
});

const handleShowShortCutKey = () => {
  emits("showShortCutKey");
};
</script>

<style lang="less" scoped>
.hover_box:hover {
  background-color: #033b61 !important;
}
.hover_red_box:hover {
  background-color: #f05e6a !important;
}
.container {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 3fr 3fr 2fr;
  gap: 10px;
  color: #ccc;
  font-size: 18px;
  .left-wrap,
  .center-wrap,
  .right-wrap {
    height: 100%;
    width: 100%;
    //background-color: #0a6a98;
    padding: 10px;
    border-radius: 10px;
    background: url("@/assets/images/common/边框.png") center no-repeat;
    background-size: 100% 100%;
  }

  .left-wrap {
    display: flex;
    gap: 5px;
    .takeover-auth-box {
      height: 100%;
      cursor: pointer;
      border-radius: 5px;
      background-color: rgba(81, 176, 233, 0.5);
      box-shadow: 0 0 10px rgba(81, 176, 233, 1);
      color: #fff;
      font-weight: 500;
      width: 25%;
      font-size: 23px;
      .takeover-auth {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 30px;
        padding-top: 10px;
      }

      .uav-image {
        width: 70%;
      }
      &:hover {
        background-color: rgba(81, 176, 233, 0.6);
      }
    }
    .takeover-auth.disabled {
      pointer-events: none;
      opacity: 0.5;
    }
    .uav-info-box {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      .take-off-button-container {
        margin: 10px;
        height: 100%;
        width: 25%;

        .outer-rect {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 5px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(81, 176, 233, 1);
          width: 100%;
          height: 100%;
        }
        .take-off-button {
          width: 100%;
          height: 100%;
          border: none;
          padding: 0;
          background-color: transparent;
          font-size: 18px;
          color: #333;
          .button-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 30px;
            .uav-icon {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              padding: 10px;
              box-shadow: 0 0 10px rgba(89, 184, 242, 0.8);
              background: linear-gradient(
                to bottom right,
                #59b8f2,
                rgba(255, 255, 255, 0.2)
              );
            }
            .button-label {
              color: #ddd;
            }
          }
        }
      }
      .nav-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 16px;
        justify-content: space-around;
        .nav-info-btn {
          margin-top: 10px;
          text-align: center;
          // background-color: rgba(89, 184, 242, 0.2); // 外围长方形框背景颜色
          padding: 15px 0;
          border-radius: 3px;
          // box-shadow: 0 0 4px #59b8f2;
          background-color: rgba(204 230 252, 1);
          box-shadow: 0 0 10px rgba(81, 176, 233, 1);
          cursor: pointer;
          .icon {
            width: 28px;
          }
        }
      }
      .uav-btn-wrap {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        width: 30%;
        height: 100%;
        .uav-back {
          // background-color: rgba(89, 184, 242, 0.2); // 外围长方形框背景颜色
          padding: 10px;
          border-radius: 5px;
          height: 45%;
          width: 100%;
          // box-shadow: 0 0 10px rgba(89, 184, 242, 1);
          background-color: rgba(204 230 252, 1);
          box-shadow: 0 0 10px rgba(81, 176, 233, 1);
          text-align: center;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          img {
            width: 30px;
          }
          div {
            margin-top: 8px;
            font-size: 18px;
          }
        }
      }
    }
  }
  .title {
    color: rgba(81, 176, 233, 1);
    font-size: 27px;
    writing-mode: vertical-rl;
    text-orientation: upright; /* 保持字符直立 */
    position: relative;
    &::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 100%;
      background: linear-gradient(#fff, rgba(81, 176, 233, 1));
      position: absolute;
      left: 0px;
      bottom: 0px;
    }
  }
  .center-wrap {
    display: grid;
    grid-template-columns: 40px auto;
    gap: 10px;
    align-items: center;

    .control-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr); /* 4列 */
      grid-template-rows: repeat(2, 1fr); /* 2行 */
      gap: 10px; /* 格子间距 */
      width: 100%;
      color: #000;
      .key-item {
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        .tag {
          height: 30%;
          color: #ccc;
        }
        .tip1 {
          font-size: 14px;
          color: #ccc;
          margin-top: 5px;
          text-align: center;
          font-style: italic;
        }
        .control-item {
          width: 220px;
          border-radius: 3px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px 0;
          margin: 5px 0 5px 15px;
          height: 70%;
          .icon {
            margin-right: 5px;
            width: 27px;
          }
          &:nth-child(1) {
            background: rgba(2, 77, 120, 0.73);
            box-shadow: 0 0 10px rgba(81, 176, 233, 1);
          }
          &:nth-child(2) {
            background-color: #f16f79;
            box-shadow: 0 0 10px #df505b;
          }
        }
      }
      .key {
        cursor: pointer;
        // background: #01CCF4;
        background: linear-gradient(
          to bottom right,
          #59b8f2a8,
          rgba(255, 255, 255, 0.2)
        );
        display: flex;
        align-items: center;
        justify-content: center;
        // border: 3px solid #45b5fb;
        box-shadow: 0 0 8px rgba(89, 184, 242, 0.8);
        padding: 15px 0;
        border-radius: 5px;
        margin: 5px 0;
        height: 70%;
        :hover {
          transform: scale(1.1);
        }
      }
    }
  }
  .right-wrap {
    display: grid;
    grid-template-columns: 40px auto;
    gap: 10px;
    align-items: center;

    .control-wrap {
      color: #fff;
      height: 100%;
      .ptz-control {
        display: flex;
        align-items: center;
        justify-content: space-around;
        gap: 10px;
        height: 100%;
        .control-grid {
          width: 140px;
          height: 140px;
          position: relative;
          border-radius: 50%;
          background-color: #656b70;
          .control-button {
            position: absolute;
            cursor: pointer;
            width: 41px;
            height: 41px;
          }
          .control-top {
            top: 5%;
            left: 50%;
            transform: translateX(-50%);
          }
          .control-left {
            top: 50%;
            transform: translateY(-50%);
            left: 5%;
          }
          .control-right {
            top: 50%;
            transform: translateY(-50%);
            right: 5%;
          }
          .control-bottom {
            bottom: 5%;
            left: 50%;
            transform: translateX(-50%);
          }
        }
        .controls-btn {
          display: flex;
          flex-direction: column;
          gap: 20px;
          .control-item {
            width: 160px;
            text-align: center;
            padding: 15px 0;
            border-radius: 3px;
            background-color: rgba(204 230 252, 1);
            box-shadow: 0 0 10px rgba(81, 176, 233, 1);
            cursor: pointer;
            color: #ccc;
            .icon {
              width: 28px;
              margin-right: 5px;
            }
          }
        }
        .slide-wrap {
          height: 100%;
          width: 50px;
        }
      }
    }
  }
  .tip {
    font-size: 12px;
    text-align: center;
    margin: 15px 0;
  }
}
.disabled {
  cursor: not-allowed !important;
}
::v-deep {
  .el-slider__button {
    border: 2px solid rgba(81, 176, 233, 1);
  }
  .el-slider__runway {
    background-color: #dcdfe6;
  }
}
.dialogContent {
  height: 100%;
  overflow-y: auto;
  padding: 20px;

  .el-form {
    .el-form-item {
      margin-bottom: 5px;
    }

    .el-radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;

      .el-radio {
        margin-right: 15px;
      }
    }

    .el-input-number {
      width: 100%;
    }
  }
}
</style>
