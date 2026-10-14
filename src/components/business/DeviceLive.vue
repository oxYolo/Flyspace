<template>
  <div class="device-live">
    <!-- 标签页导航和操作区 -->
    <div class="head-container">
      <div class="tab-nav">
        <div v-if="isDock" class="tab-item" :class="{ active: activeTab === 'monitor' }" @click="switchTab('monitor')">
          机场监控
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'gimbal' }" @click="switchTab('gimbal')">
          云台直播
        </div>
      </div>
      <!-- 操作按钮 -->
      <div class="icon-bar">
        <div class="icon-item" v-for="(el, idx) in icons" :key="idx">
          <el-dropdown placement="bottom" v-if="el.options && el.options.length > 0">
            <el-icon v-tooltip="el.name">
              <component :is="el.icon"></component>
            </el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="(n, i) in el.options" :key="i" @click="handleChangeTypeItem(n, el.name)">
                  {{ n.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span v-tooltip="el.name" v-else @click="el?.action()">
            <el-icon>
              <component :is="el.icon"></component>
            </el-icon>
          </span>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="dialog-content">
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
        <video ref="gimbalVideo" autoplay muted playsinline></video>

        <!-- 摄像头聚焦框 -->
        <FocusFrame v-show="!isLoading && connectionStatus === 'connected'" :zoom="cameraZoomFactor" />
        <div v-if="connectionStatus !== 'connected' && !isLoading && props.device?.status == 'success'"
          class="video-placeholder">
          <el-icon class="refresh-icon" size="20px" @click="startLiveStream(false)">
            <Refresh />
          </el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { WebRTCConnection } from "@/utils/community/webrtc_connection.ts";
import {
  $changeIceCandidate,
  startAirportLive,
  stopLive,
  deviceLiveCapacity,
  deviceLiveSwitchDock,
  deviceLiveSwitchDrone,
} from "@/api/flyControl/device.ts";
import { VideoCameraFilled, Refresh, Camera } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import FocusFrame from "@/components/business/FocusFrame.vue";
import urlConfig from "@/public-path.ts";
import ModuleTitle from "@/components/common/Title.vue";

interface DeviceInfo {
  id?: number;
  name?: string;
  type?: string;
  status?: string;
}

const props = defineProps({
  device: {
    type: Object as () => any | null,
    default: () => null,
  },
  runTaskData: {
    type: Object as any,
    default: () => null,
  },
});

const emit = defineEmits(["close"]);

// 判断是否为无人机场
const isDock = computed(() => {
  return props.device?.type === "dock" || props.device?.name?.includes("Dock");
});

const cameraZoomFactor = computed(() => {
  if (activeTab.value === "gimbal") {
    return Number(props.device?.deviceInfo?.cameras?.[0]?.zoomFactor) || 2;
  } else {
    return 0;
  }
});

// 当前选中的标签页
const activeTab = ref("monitor");
const gimbalVideo = ref<any>(null);
const webrtcConnection = ref<WebRTCConnection | null>(null);
const videoId = ref<string | null>(null);
const dockVideoId = ref<string | null>(null);
const isLoading = ref(false);
const connectionStatus = ref("disconnected");
const camerasList = ref([]);
const lastDockDeviceSn = ref<string>("");

const icons = computed(() => {
  const baseIcons: any[] = [
    {
      name: "刷新",
      icon: Refresh,
      action: () => startLiveStream(false),
    },
  ];

  if (isDock.value && activeTab.value === "monitor") {
    return baseIcons.concat({
      name: "切换镜头",
      icon: VideoCameraFilled,
      options: [
        { label: "舱内", value: 0 },
        { label: "舱外", value: 1 },
      ],
    });
  } else {
    return baseIcons.concat({
      name: "切换镜头",
      icon: VideoCameraFilled,
      options: [
        { label: "变焦", value: "zoom" },
        { label: "广角", value: "wide" },
        { label: "红外", value: "ir" },
      ],
    });
  }

  // if (activeTab.value === 'gimbal' && camerasList.value.length > 0) {
  //   const cameraIcons = camerasList.value.map(camera => ({
  //     name: camera.payloadName,
  //     icon: getCameraIcon(camera.payloadType), // 根据相机类型返回对应图标
  //     options: camera.videoTypes?.map(videoType => ({
  //       label: videoType.description,
  //       value: videoType.videoType
  //     }))
  //   }));
  //   return baseIcons.concat(cameraIcons);
  // }

  return baseIcons;
});
// 组件挂载后初始化
onMounted(() => {
  // 根据设备类型设置默认标签页
  if (isDock.value) {
    activeTab.value = "monitor"; // 机场默认显示监控标签
  } else {
    activeTab.value = "gimbal"; // 无人机默认显示云台标签
  }
  // 检查设备状态是否为成功，如果不是则直接黑屏显示未连接
  // if (props.device?.status != "success") {
  //   connectionStatus.value = "disconnected";
  //   return
  // }
  startLiveStream(true);
  initDeviceLiveCapacity();
});

watch(
  () => [
    String(props.device?.deviceSn || ""),
    String(props.device?.subDeviceSn || ""),
    String(props.runTaskData?.jobId || ""),
  ],
  async ([deviceSn, subDeviceSn], oldValues) => {
    if (!props.device?.id) return;

    const prevDeviceSn = oldValues?.[0] || "";
    const prevSubDeviceSn = oldValues?.[1] || "";

    const deviceChanged =
      deviceSn !== prevDeviceSn || subDeviceSn !== prevSubDeviceSn;

    if (!deviceChanged) return;

    if (lastDockDeviceSn.value && lastDockDeviceSn.value !== deviceSn) {
      try {
        await stopLive(lastDockDeviceSn.value);
      } catch { }
    }

    dockVideoId.value = null;
    videoId.value = null;
    camerasList.value = [];

    if (isDock.value) {
      activeTab.value = "monitor";
      lastDockDeviceSn.value = deviceSn;
    } else {
      activeTab.value = "gimbal";
      lastDockDeviceSn.value = "";
    }
    // 检查设备状态是否为成功，如果不是则直接黑屏显示未连接
    // if (props.device?.status != "success") {
    //   connectionStatus.value = "disconnected";
    //   return
    // }

    await startLiveStream(true);
    await initDeviceLiveCapacity();
  },
);

// 组件卸载前清理
onBeforeUnmount(() => {
  stopLiveStream(true);
});

// 开始直播流
const startLiveStream = async (init: boolean = false) => {
  // 检查设备ID是否存在
  if (!props.device?.id) return;

  try {
   

    // 先停止当前直播
    await stopLiveStream(init);

    if (props.device?.status != "success") {
    connectionStatus.value = "disconnected";
    return
  }

   isLoading.value = true;
    connectionStatus.value = "connecting";

    // 根据设备类型和当前标签选择接口
    let response;
    if (isDock.value && activeTab.value === "monitor") {
      videoId.value = dockVideoId.value || props.device.deviceSn;
      if (init) {
        response = await startAirportLive(props.device.deviceSn);
        // 获取视频ID
        const match = response.data?.url?.match(/\/([^\/]+)$/); // 匹配最后一个 `/` 后的内容
        if (match?.[1]) {
          videoId.value = match[1];
          dockVideoId.value = match[1];
        }
      }
    } else {
      videoId.value = props.runTaskData.jobId || props.device.subDeviceSn;
    }
    if (!urlConfig.websocketAble) {
      connectionStatus.value = "connected";
      setTimeout(() => {
        gimbalVideo.value.src = `${urlConfig.videoUrl}/live/${videoId.value}.live.mp4`;
      }, 100);
      return;
    }

    // 初始化WebRTC连接
    webrtcConnection.value = new WebRTCConnection();
    await webrtcConnection.value.init(true);
    // 事件监听
    webrtcConnection.value.onStream((e) => {
      if (e.streams && e.streams.length > 0 && gimbalVideo.value) {
        gimbalVideo.value.srcObject = e.streams[0];
        gimbalVideo.value.play().catch(() => {
          // 视频播放失败时静默处理
        });
        connectionStatus.value = "connected";
        // 连接成功后关闭加载状态
        isLoading.value = false;
      }
    });

    webrtcConnection.value.onError((error) => {
      connectionStatus.value = "error";
      // 连接错误时关闭加载状态
      isLoading.value = false;
    });

    webrtcConnection.value.onStateChange((state) => {
      connectionStatus.value = state.toLowerCase();
    });

    // 监听重连开始事件
    webrtcConnection.value.onReconnectStart(() => {
      isLoading.value = true;
      connectionStatus.value = "reconnecting";
    });

    // 监听重连失败事件
    webrtcConnection.value.onReconnectFailed(() => {
      isLoading.value = false;
      connectionStatus.value = "failed";
    });

    webrtcConnection.value.onReoffer(async (offer) => {
      try {
        const sdpResponse: any = await $changeIceCandidate(
          { id: videoId.value },
          offer.sdp,
        );
        // 连接webrtc
        if (webrtcConnection.value) {
          await webrtcConnection.value.setRemoteDescription(
            sdpResponse as RTCSessionDescriptionInit,
          );
        }
        // 重连成功后关闭加载状态
        isLoading.value = false;
      } catch (error) {
        isLoading.value = false;
        connectionStatus.value = "failed";
      }
    });

    // 添加音频和视频接收器
    webrtcConnection.value.addAudioVideoReceivers();

    const d = await webrtcConnection.value.createOffer();
    // 获取sdp
    const sdpResponse: any = await $changeIceCandidate(
      { id: videoId.value },
      d.sdp,
    );
    // 连接webrtc
    await webrtcConnection.value.setRemoteDescription(
      sdpResponse as RTCSessionDescriptionInit,
    );
  } catch (err) {
    connectionStatus.value = "error";
  } finally {
    isLoading.value = false;
  }
};

// 停止直播流
const stopLiveStream = async (closeStream: boolean = false) => {
  try {
    if (webrtcConnection.value) {
      webrtcConnection.value.close();
      webrtcConnection.value = null;
    }
    if (gimbalVideo.value) {
      gimbalVideo.value.srcObject = null;
      gimbalVideo.value.removeAttribute("src");
      gimbalVideo.value.load?.();
    }
    if (isDock.value && props.device?.deviceSn && closeStream) {
      await stopLive(props.device.deviceSn);
      videoId.value = null;
      dockVideoId.value = null;
    }
    
    connectionStatus.value = "disconnected";
  } catch (err) {
    // 停止直播失败时静默处理
  }
};

//获取设备直播能力
const initDeviceLiveCapacity = async () => {
  try {
    const {
      code = 0,
      data,
      msg = "",
    }: any = await deviceLiveCapacity(props.device.subDeviceSn);
    if (code === 200) {
      camerasList.value = data.camerasList || [];
    } else {
      camerasList.value = [];
    }
  } catch (err) {
    // 获取设备直播能力失败时静默处理
  }
};

// 相机类型到图标的映射
const getCameraIcon = (payloadType: string) => {
  const iconMap: any = {
    DEFAULT: Camera, // 默认相机图标
  };
  return iconMap[payloadType] || iconMap.DEFAULT;
};

// 关闭对话框
const closeDialog = () => {
  emit("close");
};

// 切换标签页
const switchTab = async (tab: string) => {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  await startLiveStream(false);
};

// 切换相机/镜头类型
const handleChangeTypeItem = async (
  option: { label: string; value: string },
  actionName: string,
) => {
  try {
    if (!videoId.value) {
      return ElMessage.warning("当前无活跃视频流");
    }
    const params: any = {};
    let apiMethods: Function | null = null;
    if (isDock.value && activeTab.value === "monitor") {
      if (actionName === "切换镜头") {
        params.cameraPosition = option.value;
        params.deviceSn = props.device?.deviceSn;
        apiMethods = deviceLiveSwitchDock;
      }
    } else {
      if (actionName === "切换镜头") {
        params.videoType = option.value;
        params.subDeviceSn = props.device?.subDeviceSn;
        apiMethods = deviceLiveSwitchDrone;
      }
    }
    if (!apiMethods) return;

    const { code, msg } = await apiMethods(params);
    if (code === 200) {
      ElMessage.success(msg);
      await startLiveStream(false);
    } else {
      ElMessage.error(msg);
    }
  } catch (err) {
    ElMessage.error("切换操作异常");
  }
};

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
</script>

<style scoped lang="less">
.device-live {
  // position: fixed;
  top: 80px;
  left: 30px;
  display: flex;
  flex-direction: column;
  color: #fff;
  z-index: 1000;
  // width: 610px;
  border-radius: 12px;
  overflow: hidden;

  .close-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    color: #fff;
    cursor: pointer;
    z-index: 1001;

    &:hover {
      color: #ff6b6b;
    }
  }

  .head-container {
    padding: 8px 16px 12px 16px;
    margin-bottom: 0;
    border-bottom: 1px solid #444;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .tab-nav {
      display: flex;

      .tab-item {
        padding: 6px 16px;
        font-size: 14px;
        color: #ccc;
        cursor: pointer;
        position: relative;
        transition: all 0.3s ease;

        &:hover {
          color: #2d8cf0;
        }

        &.active {
          color: #2d8cf0;
          font-weight: 500;

          &::after {
            content: "";
            position: absolute;
            bottom: -9px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: #2d8cf0;
          }
        }
      }
    }

    .icon-bar {
      display: flex;
      gap: 8px;
      align-items: center;
      color: #ccc;

      .el-icon {
        color: #ccc;
      }
    }
  }

  .dialog-content {
    padding: 10px 16px 16px 16px;
    position: relative;

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
      top: 0px;
      left: 0px;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1;
      width: 100%;
      height: 100%;

      .loading-spinner {
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 3px solid #2d8cf0;
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

    .video-container {
      width: 100%;
      aspect-ratio: 16/9;
      background-color: #000000;
      border-radius: 8px;
      overflow: hidden;
      position: relative;

      .refresh-icon {
        cursor: pointer;
      }

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
        background: #000;
        color: #fff;
        z-index: 5;

        .placeholder-text {
          font-size: 16px;
          opacity: 0.8;
          margin-top: 10px;
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
