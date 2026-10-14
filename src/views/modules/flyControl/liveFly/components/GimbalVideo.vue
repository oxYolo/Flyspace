<!-- 云台相机视频组件 -->
<template>
  <div
    class="ptz-camera-container"
    :class="{ panelFullscreen: props.isPanelFullscreen }">
    <GeoBorderBox title="云台相机" width="100%" bgColor="#0a6a98" type="small">
      <template #right>
        <div class="header-right">
          <el-icon
            v-tooltip="props.isPanelFullscreen ? '退出全屏' : '全屏'"
            :size="20"
            color="#FFF"
            @click="handleFullScreen">
            <FullScreen />
          </el-icon>
          <el-icon
            v-tooltip="'刷新'"
            :size="20"
            color="#FFF"
            @click="handleRefresh(false)">
            <RefreshRight />
          </el-icon>
          <!--          <template v-if="camerasList.length">-->
          <!--            <el-dropdown-->
          <!--              v-for="item in camerasList"-->
          <!--              :key="item.name"-->
          <!--              placement="bottom">-->
          <!--              <el-icon v-tooltip="item.name" :size="20" color="#FFF">-->
          <!--                <component :is="getCameraIcon(item.payloadType)" />-->
          <!--              </el-icon>-->
          <!--              <template #dropdown>-->
          <!--                <el-dropdown-menu>-->
          <!--                  <el-dropdown-item-->
          <!--                    v-for="e in item.videosList"-->
          <!--                    :key="e.type"-->
          <!--                    @click="handleChangeTypeItem(item)"-->
          <!--                    >{{ e.description }}</el-dropdown-item-->
          <!--                  >-->
          <!--                </el-dropdown-menu>-->
          <!--              </template>-->
          <!--            </el-dropdown>-->
          <!--          </template>-->
          <el-dropdown placement="bottom">
            <el-icon v-tooltip="'切换视角'" :size="20" color="#FFF">
              <VideoCameraFilled />
            </el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="item in cameraType"
                  :key="item.label"
                  @click="handleChangeTypeItem(item)">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-icon
            v-tooltip="'展开'"
            :size="20"
            color="#FFF"
            @click="emit('changeBig')">
            <ScaleToOriginal />
          </el-icon>
        </div>
      </template>
      <!-- 操作栏 -->
      <div v-show="isBig" class="hander-item">
        <span
          class="handle-btn"
          v-for="(el, index) in centerLeftButtons"
          :key="index"
          :class="{ disabled: el.disabled }"
          @click="!el.disabled && el.action?.()">
          <span v-tooltip="el.label">
            <img v-if="!el.isElIcon" :src="el.icon" alt="" />
            <el-icon v-else><component :is="el.icon"></component></el-icon>
          </span>
        </span>
      </div>

      <!-- 主显示区域 -->
      <div class="display-area">
        <!-- 状态栏 -->
        <div class="status-bar" :class="connectionStatus">
          {{ getStatusText }}
        </div>
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在连接直播...</div>
        </div>
        <!-- 视频容器 -->
        <div class="video-container">
          <!-- 视频元素 -->
          <video
            id="gimbalVideo"
            ref="gimbalVideo"
            autoplay
            muted
            playsinline></video>

          <!-- 摄像头聚焦框 -->
          <FocusFrame
            v-show="!isLoading && connectionStatus === 'connected'"
            :zoom="cameraZoomFactor" />
          <div
            v-if="connectionStatus !== 'connected' && !isLoading"
            class="video-placeholder">
            <el-icon
              class="refresh-icon"
              size="20px"
              @click="handleRefresh(false)">
              <Refresh />
            </el-icon>
          </div>
        </div>
      </div>

      <!-- 底部控制按钮 -->
      <div v-show="isBig" class="control-buttons">
        <div class="button-group">
          <button v-for="(button, index) in leftButtons" :key="index">
            <img :src="button.icon" />
            <span>{{ button.label }}</span>
            <p>
              {{ getValueByPath(droneStatus, button.field) }}{{ button.unit }}
            </p>
          </button>
        </div>
        <!-- 新增底部中间指南针 -->
        <div class="bottom-compass-container">
          <CompassPanel :angle="compassRotation" class="CompassPanel" />
        </div>
        <div class="button-group">
          <button v-for="(button, index) in rightButtons" :key="index">
            <img :src="button.icon" />
            <span>{{ button.label }}</span>
            <p>
              {{ getValueByPath(droneStatus, button.field) }}{{ button.unit }}
            </p>
          </button>
        </div>
      </div>
    </GeoBorderBox>
    <!-- 模型选择弹窗 -->
    <AiModel
      v-model:visible="showAIDialog"
      :modelValue="currentModelInfo"
      @confirm="handleChooseAiModel" />
    <!-- 快捷键弹窗 -->
    <ShortCutKey v-model:visible="showShortCutKeyDialog" />
  </div>
</template>

<script setup lang="ts">
import battery from "@/assets/icons/battery.png";
import height from "@/assets/icons/relative-dock.png";
import ground from "@/assets/icons/relative-ground.png";
import distance from "@/assets/icons/distance.png";
import wind from "@/assets/icons/wind.png";
import horizontal from "@/assets/icons/horizontal-speed.png";
import speed from "@/assets/icons/vertical-speed.png";
import fly_storage from "@/assets/icons/fly_storage.png";
import fly_time from "@/assets/icons/fly_time.png";
import search from "@/assets/icons/search-count.png";
import AI from "@/assets/icons/AI.png";
import LIVE from "@/assets/icons/现场直播.png";
import {
  Refresh,
  RefreshRight,
  ScaleToOriginal,
  VideoCameraFilled,
  Camera,
  VideoPause,
  VideoCamera,
  PictureRounded,
  QuestionFilled,
  FullScreen,
} from "@element-plus/icons-vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DeviceInfo } from "@/model/device";

import AiModel from "./AiModel.vue";
import { WebRTCLiveService } from "./LiveStream.ts";
import {
  $changeIceCandidate,
  deviceLiveCapacity,
  startDroneAILive,
} from "@/api/flyControl/device.ts";
import { $getPlanDetail } from "@/api/flyControl/control.ts";
import { ElMessage } from "element-plus";
import emitter from "@/stores/mitt.ts";
import FocusFrame from "@/components/business/FocusFrame.vue";
import CompassPanel from "./CompassPanel.vue";
import {
  handleTakePhoto as apiTakePhoto,
  handlePanoramaPhoto as apiPanoramaPhoto,
  handleRecordVideo as apiRecordVideo,
} from "@/transform/control";
import { useFlyControlStore } from "@/stores/modules/flyControl";
import ShortCutKey from "./ShortCutKey.vue";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";
import urlConfig from "@/public-path.ts";
import { WebRTCConnection } from "@/utils/community/webrtc_connection.ts";

const props = defineProps({
  device: {
    type: Object as () => DeviceInfo | null,
    default: () => null,
  },
  isBig: {
    type: Boolean,
    default: true,
  },
  isPanelFullscreen: {
    type: Boolean,
    default: false,
  },
  droneStatus: {
    type: Object,
    default: () => ({}),
  },
  runTaskData: {
    type: Object as any,
    default: () => null,
  },
});
const cameraZoomFactor = computed(() => {
  return Number(props.droneStatus?.deviceInfo?.cameras?.[0]?.zoomFactor) || 2;
});
const emit = defineEmits(["changeBig", "togglePanelFullscreen"]);
// 指南针旋转角度，改为实时数据
const compassRotation = computed(() => {
  return props.droneStatus?.attitudeInfo?.attitudeHead;
});
const isRecordingActive = computed(() => {
  return props.droneStatus?.deviceInfo?.cameras?.[0]?.recordingState === 1;
});
const currentCameraMode = computed(() => {
  return props.droneStatus?.deviceInfo?.cameras?.[0]?.cameraMode || 0;
});
// 使用Pinia store获取drcConnected状态
const flyControlStore = useFlyControlStore();
const hasOriginLiveStream = computed(() => {
  return Boolean(webrtcService.value?.getOriginLiveUrl?.());
});
const aiButtonDisabled = computed(() => {
  if (vedioType.value !== "original") return false;
  return !(hasOriginLiveStream.value && connectionStatus.value === "connected");
});

const centerLeftButtons: any = computed(() => {
  return [
    {
      icon: vedioType.value === "original" ? AI : LIVE,
      label: vedioType.value === "original" ? "AI推理" : "直播",
      action: () => handelShowAiDialog(),
      disabled: aiButtonDisabled.value,
    },
    {
      icon: Camera,
      isElIcon: true,
      label: "拍照",
      action: () => handleTakePhoto(),
      disabled: isRecordingActive.value || !flyControlStore.drcConnected,
    },
    {
      icon: PictureRounded,
      isElIcon: true,
      label: "全景",
      action: () => togglePanorama(),
      disabled: isRecordingActive.value || !flyControlStore.drcConnected,
    },
    {
      icon: isRecordingActive.value ? VideoPause : VideoCamera,
      isElIcon: true,
      label: isRecordingActive.value ? "录制中" : "录制",
      action: () => toggleRecording(),
      disabled: !flyControlStore.drcConnected,
    },
    {
      icon: QuestionFilled,
      isElIcon: true,
      label: "帮助",
      action: () => handelShowShortCutKeyDialog(),
    },
  ];
});

// 检查连接和设备状态
const checkDeviceStatus = () => {
  // 首先检查是否接管了授权
  if (!flyControlStore.drcConnected) {
    ElMessage.warning("请先接管设备授权");
    return false;
  }

  if (!props.device?.deviceSn) {
    ElMessage.warning("设备序列号不存在");
    return false;
  }

  if (!props.droneStatus?.deviceInfo) {
    ElMessage.warning("设备信息不完整");
    return false;
  }

  return true;
};

// 获取负载索引
const getPayloadIndex = () => {
  if (
    Array.isArray(props.droneStatus?.deviceInfo?.dockPayloads) &&
    props.droneStatus.deviceInfo.dockPayloads.length
  ) {
    return props.droneStatus.deviceInfo.dockPayloads[0]?.payloadIndex;
  }

  return null;
};

// 处理拍照
const handleTakePhoto = async () => {
  if (isRecordingActive.value) return;

  // 检查设备状态（包括授权检查）
  if (!checkDeviceStatus()) return;

  // 获取设备序列号和负载索引
  const deviceSn = props.device?.deviceSn || "";
  const payloadIndex = getPayloadIndex();

  if (!payloadIndex) {
    ElMessage.error("无法获取负载索引");
    return;
  }

  try {
    await apiTakePhoto(deviceSn, payloadIndex, currentCameraMode.value);
    ElMessage.success("拍照成功");
  } catch (error) {
    console.error("拍照失败:", error);
    ElMessage.error(
      `拍照失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

// 切换全景模式
const togglePanorama = async () => {
  if (isRecordingActive.value) return;

  // 检查设备状态（包括授权检查）
  if (!checkDeviceStatus()) return;

  // 获取设备序列号和负载索引
  const deviceSn = props.device?.deviceSn || "";
  const payloadIndex = getPayloadIndex();

  if (!payloadIndex) {
    ElMessage.error("无法获取负载索引");
    return;
  }

  try {
    // 切换状态前先调用API
    await apiPanoramaPhoto(deviceSn, payloadIndex, currentCameraMode.value);

    // 状态会通过props自动更新，无需手动设置
    ElMessage.success("已开启全景模式");
  } catch (error) {
    console.error("全景模式切换失败:", error);
    ElMessage.error(
      `全景模式切换失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

// 切换录制状态
const toggleRecording = async () => {
  // 检查设备状态（包括授权检查）
  if (!checkDeviceStatus()) return;

  // 获取设备序列号和负载索引
  const deviceSn = props.device?.deviceSn || "";
  const payloadIndex = getPayloadIndex();

  if (!payloadIndex) {
    ElMessage.error("无法获取负载索引");
    return;
  }

  try {
    // 切换状态前先调用API
    await apiRecordVideo(
      deviceSn,
      payloadIndex,
      !isRecordingActive.value,
      currentCameraMode.value,
    );

    // 状态会通过props自动更新，无需手动设置
    ElMessage.success(!isRecordingActive.value ? "开始录制" : "结束录制");
  } catch (error) {
    console.error("录制状态切换失败:", error);
    ElMessage.error(
      `录制状态切换失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
const cameraType = [
  { label: "变焦", value: "zoom" },
  { label: "广角", value: "wide" },
  { label: "红外", value: "ir" },
];
// 左侧控制按钮
const leftButtons = [
  {
    icon: battery,
    label: "剩余电量",
    unit: "%",
    field: "flightStatusInfo.battery.capacityPercent",
  },
  {
    icon: height,
    label: "相对机场",
    unit: "m",
    field: "positionInfo.elevation",
  },
  {
    icon: ground,
    label: "相对地形",
    unit: "m",
    field: "positionInfo.height",
  },
  {
    icon: distance,
    label: "距离返航点",
    unit: "m",
    field: "positionInfo.homeDistance",
  },
  {
    icon: wind,
    label: "空中风速",
    unit: "m/s",
    field: "environmentInfo.windSpeed",
  },
];

// 右侧控制按钮
const rightButtons = [
  {
    icon: horizontal,
    label: "水平速度",
    unit: "m/s",
    field: "flightStatusInfo.horizontalSpeed",
  },
  {
    icon: speed,
    label: "垂直速度",
    unit: "m/s",
    field: "flightStatusInfo.verticalSpeed",
  },
  {
    icon: fly_storage,
    label: "存储使用",
    unit: "MB",
    field: "deviceInfo.storage.used",
  }, // 若无此字段可用 --
  {
    icon: fly_time,
    label: "剩余飞行时间",
    unit: "s",
    field: "flightStatusInfo.battery.remainFlightTime",
  }, // 若无此字段可用 --
  {
    icon: search,
    label: "搜星质量",
    unit: "颗",
    field: "positionInfo.positionState.gpsNumber",
  },
];

const camerasList = ref([]);

function getValueByPath(obj: any, path: string) {
  const value = path
    .split(".")
    .reduce((o, k) => (o && o[k] != null ? o[k] : "--"), obj);

  // 如果值是 "--" 或者 null/undefined，直接返回
  if (value === "--" || value == null) {
    return value;
  }

  // environmentInfo.windSpeed 单位：m/s 风速要除以 10
  if (path === "environmentInfo.windSpeed") {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      // 将风速转换为 m/s
      const mpsValue = numValue / 10;
      return Number(mpsValue.toFixed(1));
    }
    return value;
  }

  // 特殊处理存储使用字段：将字节转换为MB
  if (path === "deviceInfo.storage.used") {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      // 将字节转换为MB (1MB = 1024 * 1024 bytes)
      const mbValue = numValue / 1024;
      return Number(mbValue.toFixed(2));
    }
    return value;
  }

  // 尝试将值转换为数字
  const numValue = Number(value);

  // 如果转换成功且不是整数，保留两位小数
  if (!isNaN(numValue) && !Number.isInteger(numValue)) {
    return Number(numValue.toFixed(2));
  }

  // 如果转换成功且是整数，返回整数
  if (!isNaN(numValue) && Number.isInteger(numValue)) {
    return numValue;
  }

  // 如果不是数字，返回原值
  return value;
}

const showAIDialog = ref(false);

const handelShowAiDialog = async () => {
  if (vedioType.value === "original") {
    if (aiButtonDisabled.value) {
      ElMessage.warning("请先开启无人机云台直播流");
      return;
    }
    showAIDialog.value = true;
  } else {
    ElMessage.success("已切回原始直播流");
    await handleCloseModel();
    handleRefresh(true);
  }
};

const showShortCutKeyDialog = ref(false);

const handelShowShortCutKeyDialog = () => {
  showShortCutKeyDialog.value = true;
};

const handleFullScreen = () => {
  emit("togglePanelFullscreen");
};

// 供父组件通过 ref 调用
defineExpose({
  handelShowShortCutKeyDialog,
  handleTakePhoto,
  togglePanorama,
  toggleRecording,
});
const currentModelInfo: any = ref({
  inspectionSceneName: "",
  problemCategoryName: "",
  aiTags: [] as string[],
});

const syncAiModelFromTaskId = async (taskId: any) => {
  const id = String(taskId || "").trim();
  if (!id) return;
  try {
    const res: any = await $getPlanDetail(id);
    if (res?.code !== 200) return;
    const data = res?.data || {};
    const aiTagsStr = typeof data.aiTags === "string" ? data.aiTags : "";
    const aiTags = aiTagsStr
      .split(",")
      .map((x: string) => x.trim())
      .filter(Boolean);
    currentModelInfo.value = {
      inspectionSceneName: String(data.inspectionSceneName || ""),
      problemCategoryName: String(data.problemCategoryName || ""),
      aiTags,
    };
  } catch {}
};

watch(
  () => props.runTaskData?.taskId,
  (taskId: any) => {
    if (!taskId) return;
    syncAiModelFromTaskId(taskId);
  },
  { immediate: true },
);
const modelWebrtcService: any = ref();
const processingId = ref("");
const vedioType = ref("original");
const handleChooseAiModel = async (value?: any) => {
  const inspectionSceneName = String(value?.inspectionSceneName || "");
  const problemCategoryName = String(value?.problemCategoryName || "");
  const aiTagsArr = Array.isArray(value?.aiTags) ? value.aiTags : [];
  const aiTags = aiTagsArr
    .map((x: any) => String(x))
    .filter(Boolean)
    .join(",");

  currentModelInfo.value = {
    inspectionSceneName,
    problemCategoryName,
    aiTags: aiTagsArr.map((x: any) => String(x)).filter(Boolean),
  };

  if (!inspectionSceneName) {
    ElMessage.warning("请选择巡检场景");
    return;
  }
  if (!problemCategoryName) {
    ElMessage.warning("请选择识别问题大类");
    return;
  }
  if (!aiTags) {
    ElMessage.warning("请选择识别问题小类");
    return;
  }
  const droneDeviceSn =
    props.device?.subDeviceSn || props.device?.deviceSn || "";
  if (!droneDeviceSn) {
    ElMessage.warning("无人机序列号不存在");
    return;
  }
  const originUrl = webrtcService.value?.getOriginLiveUrl?.() || "";
  if (!originUrl) {
    ElMessage.warning("原始直播流不存在，请先开启云台直播");
    return;
  }
  try {
    await handleCloseModel();
    isLoading.value = true;
    const res: any = await startDroneAILive({
      deviceSn: droneDeviceSn,
      originUrl,
      inspectionSceneName,
      problemCategoryName,
      aiTags,
    });
    // 停止原始直播流
    if (webrtcService.value) {
      webrtcService.value.stop();
    }
    // 从模型推理结果中提取 ID
    const url = res?.data?.aiUrl || res?.data?.originUrl || "";
    // 从 URL 中提取 ID
    const idFromUrl = String(url).match(/\/([^/]+)$/)?.[1];
    // 从 URL 中提取 ID
    processingId.value = String(idFromUrl || "");

    if (processingId.value) {
      if (!urlConfig.websocketAble) {
        vedioType.value = "ai";
        connectionStatus.value = "connected";
        isLoading.value = false;
        setTimeout(() => {
          gimbalVideo.value.src = `${urlConfig.videoUrl}/live/${processingId.value}.live.mp4`;
        }, 100);
        return;
      }
      modelWebrtcService.value = new WebRTCConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:your-turn-server.com",
            username: "user",
            credential: "pass",
          },
        ],
        reconnectAttempts: 5,
        reconnectInterval: 2000,
      });
      await modelWebrtcService.value.init(true);
      // 设置事件监听
      modelWebrtcService.value.onStream((e: any) => {
        if (e.streams && e.streams.length > 0) {
          gimbalVideo.value.srcObject = e.streams[0];
          gimbalVideo.value.play().catch((err: any) => {
            console.error("视频播放失败:", err);
          });
        }
      });
      modelWebrtcService.value.addAudioVideoReceivers();
      const offer = await modelWebrtcService.value.createOffer();
      const sdpResponse: any = await $changeIceCandidate(
        { id: processingId.value },
        offer.sdp,
      );
      await modelWebrtcService.value.setRemoteDescription(
        sdpResponse as RTCSessionDescriptionInit,
      );
      vedioType.value = "ai";
      connectionStatus.value = "connected";
    } else {
      ElMessage.error("模型推理失败");
      await handleCloseModel();
      handleRefresh();
    }
    isLoading.value = false;
  } catch (error) {
    ElMessage.error("模型推理失败");
    isLoading.value = false;
    await handleCloseModel();
    handleRefresh();
  }
};

const handleCloseModel = async () => {
  try {
    if (modelWebrtcService.value) {
      modelWebrtcService.value.close();
    }
    // await $stopModelVideo({ id: processingId.value });
  } catch (err) {
  } finally {
    vedioType.value = "original";
    processingId.value = "";
  }
};

// 初始化服务实例
const webrtcService = ref<WebRTCLiveService>(new WebRTCLiveService());
const isLoading = ref(false);
const connectionStatus = ref("disconnected");
const gimbalVideo = ref<any>(null);

// 用于管理异步操作的中断控制
let currentStreamController: AbortController | null = null;
let currentStreamId = 0; // 用于标识当前的流请求

// 获取连接状态显示文本
const getStatusText = computed(() => {
  switch (connectionStatus.value) {
    case "connected":
      return "已连接";
    case "connecting":
      return "连接中...";
    case "reconnecting":
      return "重连中...";
    case "disconnected":
      return "未连接";
    case "failed":
      return "连接失败";
    case "error":
      return "连接失败";
    case "closed":
      return "连接关闭";
    default:
      return connectionStatus.value;
  }
});

const jobId = ref<string | null>(null);
// 组件挂载后初始化
const firstTime = ref(0);
onMounted(() => {
  emitter.on("getDroneInfoByWebsocket", (droneInfo: any) => {
    if (firstTime.value === 0) {
      handleRefresh(true);
      firstTime.value++;
    }
  });
  emitter.on("oneKeyTakeOff", (event: any) => {
    jobId.value = event;
    isLoading.value = true;
    connectionStatus.value = "connecting";
  });
});

// 组件卸载前清理
onBeforeUnmount(() => {
  emitter.off("oneKeyTakeOff");

  // 中断当前的流请求
  if (currentStreamController) {
    currentStreamController.abort();
    currentStreamController = null;
  }

  // 停止WebRTC服务
  if (webrtcService.value) {
    webrtcService.value.stop();
  }
});

//开始直播方法
const startLiveStream = async (first: boolean = false) => {
  if (!props.device?.deviceSn) {
    return;
  }

  // 中断之前的流请求
  if (currentStreamController) {
    currentStreamController.abort();
  }

  // 创建新的中断控制器和流ID
  currentStreamController = new AbortController();
  const streamId = ++currentStreamId;

  try {
    // 只有当前流ID匹配时才更新状态
    if (
      streamId === currentStreamId &&
      !currentStreamController.signal.aborted
    ) {
      isLoading.value = true;
      connectionStatus.value = "connecting";
    }
    // 调用服务
    await webrtcService.value.start(
      {
        deviceId: props.device?.deviceSn,
        subDeviceSn: props.device?.subDeviceSn || "",
        isDock: false,
        camerasList: camerasList.value,
        jobId: jobId.value || props.runTaskData?.jobId,
        first: first,
      },
      gimbalVideo.value,
      {
        onStatusChange: (status) => {
          // 只有当前流ID匹配且未被中断时才更新状态
          if (
            streamId === currentStreamId &&
            !currentStreamController?.signal.aborted
          ) {
            connectionStatus.value = status;
            // 当WebRTC重连时，设置loading状态
            if (status === "reconnecting") {
              isLoading.value = true;
            } else if (status === "connected") {
              isLoading.value = false;
            }
          }
        },
        onError: (error) => {
          // 只有当前流ID匹配且未被中断时才更新状态
          if (
            streamId === currentStreamId &&
            !currentStreamController?.signal.aborted
          ) {
            connectionStatus.value = "error";
            isLoading.value = false;
          }
        },
      },
    );

    // 检查是否被中断或不是当前流
    if (
      currentStreamController?.signal.aborted ||
      streamId !== currentStreamId
    ) {
      return; // 静默返回，不更新状态
    }
  } catch (err: any) {
    // 检查是否是中断错误或不是当前流
    if (
      currentStreamController?.signal.aborted ||
      streamId !== currentStreamId
    ) {
      return; // 静默返回，不更新状态
    }

    // 只有当前流的真实错误才更新状态
    if (err.message !== "ABORTED") {
      connectionStatus.value = "error";
    }
  } finally {
    // 只有当前流ID匹配且未被中断时才更新loading状态
    if (
      streamId === currentStreamId &&
      !currentStreamController?.signal.aborted
    ) {
      isLoading.value = false;
    }
  }
};

// 相机类型到图标的映射
const getCameraIcon = (payloadType: string) => {
  const iconMap: any = {
    DEFAULT: VideoCameraFilled, // 默认相机图标
  };
  return iconMap[payloadType] || iconMap.DEFAULT;
};

//获取设备直播能力
const initDeviceLiveCapacity = async () => {
  try {
    const {
      code = 0,
      data,
      msg = "",
    }: any = await deviceLiveCapacity(props.device?.subDeviceSn || "");
    if (code === 200) {
      camerasList.value = data.camerasList || [];
    } else {
      camerasList.value = [];
      console.error("获取设备直播能力失败:", msg);
    }
  } catch (err) {
    console.error("获取设备直播能力失败:", err);
  }
};

// 切换相机/镜头类型
const handleChangeTypeItem = async (option: {
  label: string;
  value: string;
}) => {
  try {
    if (!webrtcService.value) {
      return ElMessage.warning("当前无活跃视频流或连接已断开");
    }
    emitter.emit("change-camera-type", option.value);
    const flag = await webrtcService.value.switchCamera(option);
    if (flag) {
      // 使用统一的startLiveStream方法，它会自动处理中断
      await startLiveStream();
      ElMessage.success(`已切换至${option.label}镜头`);
    } else {
      ElMessage.error(`切换镜头失败`);
    }
  } catch (err) {
    // 过滤中断错误，避免显示不必要的错误信息
    if ((err as Error).message !== "ABORTED") {
      ElMessage.error(`切换镜头失败: ${(err as Error).message}`);
    }
  }
};

// 刷新直播流
const handleRefresh = (first: boolean = false) => {
  if (vedioType.value === "original") {
    if (jobId.value || props.runTaskData?.jobId) {
      startLiveStream(first);
    }
    initDeviceLiveCapacity();
  } else {
    handleChooseAiModel(currentModelInfo.value);
  }
};
</script>

<style lang="less" scoped>
.ptz-camera-container {
  width: 100%;
  height: 100%;
  color: white;
  .header-right {
    margin-right: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    .el-icon {
      background: #409eff;
      border-radius: 2px;
      padding: 2px;
      cursor: pointer;
    }
  }

  .hander-item {
    position: absolute;
    right: 20px;
    top: 90px;
    border-radius: 5px;
    z-index: 99;
    .handle-btn {
      padding: 10px;
      display: block;
      background: rgba(0, 0, 0, 0.6);
      height: 40px;
      width: 40px;
      text-align: center;
      cursor: pointer;
      position: relative;
      font-size: 20px;
      img {
        width: 100%;
        height: 100%;
      }
      &:last-child {
        border-radius: 0 0 5px 5px;
      }
      &:first-child {
        border-radius: 5px 5px 0 0;
      }
      &:hover:not(.disabled) {
        background: rgba(0, 204, 255, 0.8);
      }

      &.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  .display-area {
    height: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    .refresh-icon {
      cursor: pointer;
    }
    .status-bar {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10;
      background: rgba(0, 0, 0, 0.5);
      color: white;

      &.connected {
        background: #4caf50;
      }
      &.connecting,
      &.reconnecting {
        background: #ff9800;
      }
      &.error,
      &.failed {
        background: #f44336;
      }
      &.disconnected {
        background: #9e9e9e;
      }
    }
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;

      .loading-spinner {
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 3px solid #1976d2;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
      }

      .loading-text {
        color: white;
        margin-top: 15px;
        font-size: 16px;
      }
    }
    .error-message {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999;
      padding: 5px;
      background: #ffebee;
      color: #c62828;
      text-align: center;
      display: grid;
      grid-template-columns: 1fr 8%;
      gap: 10px;
      align-items: center;
      .retry-btn {
        padding: 2px 8px;
        background: #c62828;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
    }
    .video-container {
      width: 100%;
      height: 100%;
      aspect-ratio: 16/9;
      background-color: #000000;
      border-radius: 8px;
      overflow: hidden;
      position: relative;

      video {
        width: 100%;
        height: 100%;
        object-fit: fill;
      }
      .video-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #675f5f;
        color: #fff;

        .placeholder-text {
          font-size: 16px;
          opacity: 0.7;
          margin-top: 10px;
        }
      }
    }
  }

  .control-buttons {
    display: flex;
    justify-content: space-between;
    position: absolute;
    bottom: 10px;
    width: calc(~"100% - 10px");
    z-index: 99;
    opacity: 0.7;
    .bottom-compass-container {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      .CompassPanel {
        width: 120px;
        height: 150px;
      }
    }
    .button-group {
      display: flex;
      align-items: center;
      width: 45%;

      &:first-child {
        button {
          &:last-child {
            border-radius: 0 50% 0 0;
          }
        }
      }

      &:last-child {
        button {
          &:first-child {
            border-radius: 50% 0 0 0;
          }
        }
      }

      button {
        background-color: rgba(0, 0, 0, 0.5);
        border: none;
        color: white;
        width: 100%;
        padding-top: 8px;
        height: 8vh;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;

        img {
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
        }

        span {
          font-size: 14px;
        }
      }
    }
  }
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
