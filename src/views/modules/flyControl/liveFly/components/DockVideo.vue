<template>
  <div class="dock-video-wrap">
    <GeoBorderBox
      :device="props.device"
      title="机场监控"
      width="100%"
      bgColor="#0a6a98"
      type="small">
      <template #right>
        <div class="header-right">
          <el-icon
            v-tooltip="'刷新'"
            :size="20"
            color="#FFF"
            @click="startLiveStream(false)">
            <RefreshRight />
          </el-icon>
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
      <div v-show="isBig" class="hander-item">
        <div
          class="handle-btn"
          v-for="(el, index) in centerLeftButtons"
          :key="index">
          <el-dropdown
            placement="left"
            v-if="el.options && el.options.length > 0">
            <el-icon color="#fff">
              <component :is="el.icon"></component>
            </el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="(n, i) in el.options"
                  :key="i"
                  @click="handleChangeTypeItem(n)">
                  {{ n.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span v-else @click="el.action?.()">
            <el-icon color="#fff">
              <component :is="el.icon"></component>
            </el-icon>
          </span>
        </div>
      </div>
      <!-- 视频容器 -->
      <div class="video-wrap">
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
          <video ref="dockVideo" autoplay muted playsinline></video>
          <div
            v-if="connectionStatus !== 'connected' && !isLoading"
            class="video-placeholder">
            <el-icon
              class="refresh-icon"
              size="20px"
              @click="startLiveStream(false)">
              <Refresh />
            </el-icon>
          </div>
        </div>
      </div>
    </GeoBorderBox>
  </div>
</template>

<script lang="ts" setup="">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import type { DeviceInfo } from "@/model/device.ts";
import { RefreshRight, ScaleToOriginal } from "@element-plus/icons-vue";
import { WebRTCLiveService } from "./LiveStream.ts";
import { VideoCameraFilled, Refresh } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { stopLive } from "@/api/flyControl/device.ts";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";
const props = defineProps({
  device: {
    type: Object as () => DeviceInfo | null,
    default: () => null,
  },
  isBig: {
    type: Boolean,
    default: false,
  },
});

// 定义状态
const webrtcService = ref<WebRTCLiveService | null>(null);
const errorMessage = ref("");
const isLoading = ref(false);
const connectionStatus = ref("disconnected");
const dockVideo = ref<any>();
const videoId = ref<any | null>(null);
const centerLeftButtons: any = [];
const cameraType = [
  { label: "舱内", value: 0 },
  { label: "舱外", value: 1 },
];
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
    case "error":
      return "连接失败";
    case "closed":
      return "连接关闭";
    default:
      return connectionStatus.value;
  }
});

// 组件挂载后初始化
onMounted(() => {
  setTimeout(() => {
    startLiveStream(true);
  }, 100);
});
// 组件卸载前清理
onBeforeUnmount(() => {
  stopLiveStream();
});

//开始直播方法
const startLiveStream = async (init: boolean = false) => {
  if (!props.device?.deviceSn) {
    errorMessage.value = "设备序列号不可用";
    return;
  }
  try {
    isLoading.value = true;
    errorMessage.value = "";
    connectionStatus.value = "connecting";

    if (init) {
      // 先停止当前直播
      await stopLiveStream();
    }

    // 初始化服务实例
    webrtcService.value = new WebRTCLiveService();

    // 调用服务
    videoId.value = await webrtcService.value.start(
      {
        deviceId: props.device?.deviceSn,
        isDock: true,
        first: init,
        videoId: videoId.value,
      },
      dockVideo.value,
      {
        onStatusChange: (status) => {
          connectionStatus.value = status;
          // 当WebRTC重连时，设置loading状态
          if (status === "reconnecting") {
            isLoading.value = true;
          } else if (status === "connected") {
            isLoading.value = false;
          }
        },
        onError: (error) => {
          errorMessage.value = error;
          isLoading.value = false;
        },
      },
    );
  } catch (err) {
    errorMessage.value = "直播启动失败: " + (err as Error).message;
    connectionStatus.value = "error";
  } finally {
    isLoading.value = false;
  }
};

//停止直播方法
const stopLiveStream = async () => {
  try {
    videoId.value = null;
    if (webrtcService.value) {
      await webrtcService.value.stop();
      webrtcService.value = null;
    } else {
      await stopLive(props.device?.deviceSn || "");
    }
    if (dockVideo.value) {
      dockVideo.value.srcObject = null;
    }
    connectionStatus.value = "disconnected";
  } catch (err) {
    connectionStatus.value = "disconnected";
    console.error("停止直播失败:", err);
  }
};

// 切换相机/镜头类型
const handleChangeTypeItem = async (option: {
  label: string;
  value: number;
}) => {
  try {
    if (!webrtcService.value) {
      return ElMessage.warning("当前无活跃视频流");
    }
    await webrtcService.value.switchCamera({ cameraPosition: option.value });
    ElMessage.success("切换成功");
  } catch (err) {
    ElMessage.error("切换操作异常: " + (err as Error).message);
  }
};

const emit = defineEmits(["changeBig"]);
</script>

<style scoped lang="less">
.dock-video-wrap {
  width: 100%;
  height: 100%;
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
    z-index: 9;
    .handle-btn {
      padding: 10px;
      display: block;
      background: rgba(0, 0, 0, 0.6);
      height: 40px;
      width: 40px;
      text-align: center;
      cursor: pointer;
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
      &:hover {
        background: rgba(0, 204, 255, 0.8);
      }
    }
  }
  .video-wrap {
    width: 100%;
    height: 100%;
    position: relative;
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
      padding: 5px;
      background: #ffebee;
      color: #c62828;
      text-align: center;
      z-index: 10;
      display: grid;
      grid-template-columns: 1fr 12%;
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
