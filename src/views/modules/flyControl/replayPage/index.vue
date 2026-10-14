<!-- 回放页面 -->
<template>
  <div class="replay-page">
    <!-- 主要内容区域 -->
    <div class="page-content">
      <GeoBigDialog :showBackButton="false">
        <div class="replay-main-info">
          <el-button :icon="Back" @click="closeDetail"> 返回 </el-button>
          <!-- 基本信息面板 -->
          <div class="data-panel" v-if="isVideoEnlarged === 'map'">
            <GeoBorderBox title="基本信息" width="100%" type="small">
              <div class="common-panel-content">
                <!-- 速度/高度显示区域 -->
                <div class="speed-height-section">
                  <div class="speed-section">
                    <div class="speed-value">
                      {{ formatSpeed(flightInfo.speed) }}m/s
                    </div>
                    <div class="speed-label">
                      <span class="speed-name">飞行速度</span>
                    </div>
                  </div>

                  <!-- 高度显示区域 -->
                  <div class="speed-section">
                    <div class="speed-value">{{ flightInfo?.elevation }}m</div>
                    <div class="speed-label">
                      <span class="speed-name">飞行高度</span>
                    </div>
                  </div>

                  <!-- 距离显示区域 -->
                  <div class="speed-section">
                    <div class="speed-value">
                      {{ flightInfo?.distanceToOperator }}m
                    </div>
                    <div class="speed-label">
                      <span class="speed-name">飞机距我</span>
                    </div>
                  </div>
                </div>

                <!-- 位置信息区域 -->
                <div class="location-section">
                  <div class="data-item">
                    <span class="label">经度</span>
                    <span class="value">{{ flightInfo?.longitude }}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">纬度</span>
                    <span class="value">{{ flightInfo?.latitude }}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">海拔高度</span>
                    <span class="value">{{ flightInfo?.altitude }}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">飞行时间</span>
                    <span class="value">{{ flightInfo?.flightTime }}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">航迹角</span>
                    <span class="value">{{ flightInfo?.trackAngle }}°</span>
                  </div>
                  <div class="data-item">
                    <span class="label">航点</span>
                    <span class="value">
                      {{ flightInfo?.waypointsTotal }}/
                      {{ flightInfo?.waypoints }}
                    </span>
                  </div>
                  <div class="data-item">
                    <span class="label">里程</span>
                    <span class="value">
                      {{ flightInfo?.mileage?.toFixed(3) }}km
                    </span>
                  </div>
                  <div class="data-item">
                    <span class="label">风速</span>
                    <span class="value"> {{ flightInfo?.windSpeed }}m/s </span>
                  </div>
                </div>
              </div>
            </GeoBorderBox>
          </div>

          <!-- 成果列表 -->
          <MediaListDialog
            v-if="isVideoEnlarged === 'map'"
            class="secondary-panel"
            :executorId="currentTask?.executorId"
            @loadMediaList="loadMediaList"
            @openMediaDetail="handleOpenMediaDetail" />

          <!-- 视频列表 -->
          <div class="video-box">
            <GeoBorderBox title="视频列表" width="100%" type="small">
              <template #right>
                <div class="header-right">
                  <span class="match-play-right-title">匹配播放：</span>
                  <el-switch
                    v-model="matchPlay"
                    size="mini"
                    active-color="#13ce66"
                    inactive-color="#ff4949"></el-switch>
                  <el-icon
                    class="tipIcon"
                    v-tooltip="
                      '开启匹配播放后，视频根据回放进度自动匹配到最优的播放位置，无法手动播放或移动播放。若需手动播放，请关闭匹配播放'
                    ">
                    <QuestionFilled />
                  </el-icon>
                </div>
              </template>
              <div class="common-panel-content">
                <div class="video-list">
                  <div
                    v-for="(video, index) in videoList"
                    :key="index"
                    class="video-item"
                    @click.stop="playVideo(video, index)">
                    <span class="video-name-row">
                      <span
                        class="video-type-tag"
                        :class="
                          video.videoSourceType === 'ai'
                            ? 'tag-ai'
                            : 'tag-original'
                        ">
                        {{
                          video.videoSourceType === "ai"
                            ? "AI识别视频"
                            : "原始视频"
                        }}
                      </span>
                      <span class="video-title">{{ video.name }}</span>
                    </span>
                    <span>{{ formatVideoDisplayTime(video.time) }}</span>
                  </div>
                </div>
              </div>
            </GeoBorderBox>
          </div>

          <!-- 地图和视频 -->
          <div class="main-content">
            <div
              class="map-container"
              :style="mapStyle"
              @click="toggleVideoSize('map')">
              <CommonMap class="map-placeholder" @mapLoad="mapLoad" />
            </div>
            <div
              class="video-container"
              v-if="currentVideo"
              :style="videoStyle"
              @click.stop="toggleVideoSize('video')">
              <div
                v-show="isVideoEnlarged === 'map' && !matchPlay"
                class="video-close-btn"
                @click.stop="handleCloseVideo">
                <el-icon><Close /></el-icon>
              </div>
              <div
                class="ai-model-btn"
                :class="{ active: currentVideo?.videoSourceType === 'ai' }"
                :title="currentVideoIconTitle">
                <img
                  :src="currentVideoIconUrl"
                  alt="视频源类型"
                  class="ai-icon" />
              </div>
              <!-- 模型加载遮罩 -->
              <div v-if="modelLoadingState" class="model-loading-mask">
                <el-icon class="is-loading" :size="40">
                  <Loading />
                </el-icon>
                <div class="loading-text">模型加载中...</div>
              </div>
              <video
                class="video-placeholder"
                ref="videoPlayer"
                :src="currentVideo.url"
                :controls="!matchPlay"
                autoplay
                muted
                playsinline
                crossorigin="anonymous"
                @ended="handleVideoEnded"></video>
            </div>
          </div>

          <!-- 顶部操作栏 -->

          <!-- 地图播放进度条 -->
          <div class="progress-bar-container">
            <!-- 加载中状态 -->
            <div v-if="loadingState.loading" class="progress-loading">
              <el-progress
                :percentage="loadingState.progress"
                :stroke-width="8"
                status="success">
                <template #default>
                  <span class="progress-text">
                    加载中 {{ loadingState.progress }}%
                  </span>
                </template>
              </el-progress>
            </div>

            <!-- 播放控制器，加载完成后显示 -->
            <template v-else>
              <el-icon @click="togglePlay" class="play-icon">
                <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
                <el-icon v-else><VideoPause /></el-icon>
              </el-icon>
              <span class="current-time">{{ formatTime(currentTime) }}</span>
              <div class="progress-bar" @click="handleProgressClick">
                <div
                  class="progress-filled"
                  :style="{ width: progressWidth + '%' }"></div>
                <div
                  class="progress-thumb"
                  :style="{ left: progressWidth + '%' }"
                  @mousedown="startDrag"></div>
              </div>
              <span class="total-time">{{ formatTime(totalTime) }}</span>
            </template>
          </div>

          <!-- 北斗网格码显示 -->
          <div v-if="currentGridCode" class="beidou-grid-code">
            <span class="grid-code-label">北斗网格码:</span>
            <span class="grid-code-value">{{ currentGridCode }}</span>
            <span class="grid-code-level">(Level {{ beidouGridLevel }})</span>
            <el-switch
              v-model="showBeidouGrid"
              @change="toggleBeidouGridVisibility"
              active-color="#ff8100"
              inactive-color="#dcdfe6"
              class="grid-toggle-switch" />
          </div>

          <!-- 回放媒体预览组件 -->
          <ReplayMediaDetailPanel
            ref="replayMediaDetailPanelRef"
            :media-list="currentMediaList"
            @close="handleCloseMediaDetail"
            @pasteCurrentImageToMap="handlePasteCurrentImageToMap" />
        </div>
      </GeoBigDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeMount, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useReplayStore } from "@/stores/modules/replay";
import { ElMessage } from "element-plus";

// 导入原来的Replay组件内容
import { reactive, nextTick, onBeforeUnmount } from "vue";
import {
  QuestionFilled,
  VideoPlay,
  VideoPause,
  Close,
  Loading,
  Back,
} from "@element-plus/icons-vue";
import CommonMap from "@/components/common/3d/commonMap.vue";
import { GetOSDMission } from "@/transform/taskList";
import { getImageUrl, formatSeconds, calculateDistance } from "@/utils/utils";
import { CesiumMapManager } from "@/map-system";
import MediaListDialog from "./MediaListDialog.vue";
import ReplayMediaDetailPanel from "./ReplayMediaDetailPanel.vue";
import {
  renderReplayMediaToMap,
  clearReplayMediaFromMap,
  setupReplayMediaInteraction,
  locateToReplayMedia,
  pasteImageToMap,
  // @ts-ignore
} from "@/services/replayMediaService";
import emitter from "@/stores/mitt";
import { WebSocketClient } from "@/utils/community/websocket_client";
import GeoBigDialog from "@/components/common/GeoBigDialog.vue";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";

import { VideoFusionManager } from "./VideoFusionManager";
import { WebRTCConnection } from "@/utils/community/webrtc_connection.ts";
import { $changeIceCandidateModel } from "@/api/flyControl/device.ts";
import { $startModelVideo } from "@/api/flyControl/modelInfo.ts";

// Cesium 全局声明
declare const Cesium: any;

const router = useRouter();
const replayStore = useReplayStore();

// 从 store 中获取任务数据
const currentTask = computed(() => replayStore.currentTask);

// 原来的Replay组件逻辑
interface FlightInfo {
  speed: string;
  latitude: string;
  longitude: string;
  altitude: string;
  elevation: string;
  flightTime: string;
  trackAngle: string;
  waypointsTotal: string;
  waypoints: string;
  mileage: number;
  windSpeed: string;
  distanceToOperator: string;
}

interface Video {
  name: string;
  time: string;
  url: string;
  duration?: number;
  startTime?: number;
  videoSourceType?: "original" | "ai";
}

const flightInfo = reactive<FlightInfo>({
  speed: "0.0",
  latitude: "0",
  longitude: "0",
  altitude: "0",
  elevation: "0",
  flightTime: "00:00:00",
  trackAngle: "0",
  waypointsTotal: "0",
  waypoints: "0",
  mileage: 0,
  windSpeed: "0",
  distanceToOperator: "0",
});

// 北斗网格相关变量
const beidouGridLevel = ref(7);
const visitedGrids = new Set<string>(); // 存储已访问的网格
const trajectoryGridEntities = new Map<string, any>(); // 轨迹网格对应的实体组
let hiddenTrajectoryGridKey = ""; // 当前被高亮层覆盖而隐藏的轨迹网格
const currentHighlightedGrid = ref<any>(null); // 当前高亮的网格
const currentGridCode = ref<string>(""); // 当前网格码
const showBeidouGrid = ref(true); // 是否显示北斗网格图层

const videoList = reactive<Video[]>([]);
const donceList = reactive<any[]>([]);
const mapStartTime = ref(0);
const currentVideo = ref<Video | null>(null);
const previousDataVideo = ref<Video | null>(null);
const isVideoEnlarged = ref("map");
const videoPlayer = ref<HTMLVideoElement | null>(null);
const matchPlay = ref(true);
const videoStartTime = ref(0);
const isPlaying = ref(true);
const currentTime = ref(0);
const totalTime = ref(0);
const isDragging = ref(false);
const isPlaybackCompleted = ref(false);
const progressTimerId = ref<number | any | null>(null);
const loadingState = ref({ loading: false, progress: 0 });

// 平滑动画相关
const animationFrameId = ref<number | null>(null);
const lastUpdateTime = ref<number>(0);
const playbackStartTime = ref<number>(0);
const pausedTime = ref<number>(0);
const lastRouteUpdateTime = ref<number>(0);
const ROUTE_UPDATE_INTERVAL = 50; // 路线更新间隔（毫秒），约20fps

const aiIconUrl = getImageUrl("assets/icons/AI.png");
const liveIconUrl = getImageUrl("assets/icons/现场直播.png");
const currentVideoIconUrl = computed(() =>
  currentVideo.value?.videoSourceType === "ai" ? aiIconUrl : liveIconUrl,
);
const currentVideoIconTitle = computed(() =>
  currentVideo.value?.videoSourceType === "ai" ? "AI识别视频" : "原始视频",
);

// 模型视频相关状态
const currentModelInfo = ref<{ modelId: string }>({ modelId: "" });
const modelWebrtcService = ref<WebRTCConnection | null>(null);
const processingId = ref("");
const vedioType = ref("original"); // 'original' 或 'model'
const modelLoadingState = ref(false); // 模型加载状态

const mapStyle: any = reactive({
  position: "absolute",
  bottom: "0px",
  right: "0px",
  width: "100%",
  height: "100%",
  zIndex: 1000,
});

const videoStyle: any = reactive({
  position: "absolute",
  bottom: "60px",
  right: "110px",
  width: "30%",
  height: "30%",
  zIndex: 1001,
});

// 地图实例变量
let mapInstance: any = null;
let mapManager: CesiumMapManager | null = null;
const isMapReady = ref(false);
const pendingMediaList = ref<any[]>([]);

// WebSocket 和影像拼接相关
let stitchingWebSocket: WebSocketClient | null = null;
const stitchingLayerId = "image-stitching-layer";

// 多画布覆盖层管理
const canvasOverlays = new Map<number, string>(); // 存储画布索引到图层ID的映射
let hasFlownToStitchingArea = false; // 标记是否已经定位过拼接区域

// 影像精拼相关
const fineStitchingLayerId = "fine-stitching-wms-layer";
const fineStitchingSourceId = "fine-stitching-wms-source";
const wmsBaseUrl = "http://192.168.101.21:8989/geoserver/drone/wms";
const isWmsLoaded = ref(false); // 标记WMS是否已加载

// 回放媒体预览相关
const replayMediaDetailPanelRef = ref(null);
const currentMediaList = ref<any[]>([]);

// 视频融合相关
let videoFusionManager: VideoFusionManager | null = null;
const isVideoFusionEnabled = ref(false);

// 动态点相关
const droneImageUrl = getImageUrl(`assets/images/map/dajiangfly.png`);
const animatePointGeoJson: any = ref({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [] },
    },
  ],
});

const realRouteGeoJson: any = ref({
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "LineString", coordinates: [] } },
  ],
});

const routeGeoJson: any = ref({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    },
  ],
});

// 播放视频
const playVideo = async (video: Video, index: number) => {
  // 如果是同一个视频，不重复加载
  if (
    currentVideo.value?.url === video.url &&
    videoPlayer.value?.src.endsWith(video.url)
  ) {
    return;
  }

  // 重置视频结束标志（新视频）
  hasTriggeredVideoEnd = false;

  // 记录融合状态，并立即禁用（等新视频加载完成后重新启用）
  const wasVideoFusionEnabled = isVideoFusionEnabled.value;
  if (wasVideoFusionEnabled && videoFusionManager) {
    videoFusionManager.setEnabled(false);
    isVideoFusionEnabled.value = false;
  }

  let currentVideoStartTime: number;
  if (video.startTime && mapStartTime.value > 0) {
    currentVideoStartTime = (video.startTime - mapStartTime.value) / 1000;
  } else {
    currentVideoStartTime = videoStartTime.value + getVideoOffsetTime(index);
  }

  const currentVideoDuration = video.duration || 60;
  if (
    matchPlay.value &&
    (currentTime.value < currentVideoStartTime ||
      currentTime.value > currentVideoStartTime + currentVideoDuration)
  ) {
    return;
  }

  currentVideo.value = video;

  await nextTick(() => {
    if (videoPlayer.value) {
      videoPlayer.value.src = video.url;
      videoPlayer.value.load();

      // 当视频元数据加载完成后，设置到视频融合管理器
      videoPlayer.value.addEventListener(
        "loadedmetadata",
        () => {
          if (videoFusionManager && videoPlayer.value) {
            videoFusionManager.setVideoElement(videoPlayer.value);

            // 如果之前融合是开启的，重新启用
            if (wasVideoFusionEnabled) {
              videoFusionManager.setEnabled(true);
              isVideoFusionEnabled.value = true;
            }
          }
        },
        { once: true },
      );

      if (!matchPlay.value) {
        videoPlayer.value.addEventListener(
          "canplaythrough",
          () => {
            videoPlayer?.value?.play().catch((error) => {});
          },
          { once: true },
        );
      }
    }
  });
};

// 监听匹配播放开关变化
const watchMatchPlay = () => {
  if (videoList.length === 0) {
    return;
  }

  if (matchPlay.value) {
    if (videoPlayer.value) {
      videoPlayer.value.controls = false;

      if (currentTime.value >= videoStartTime.value && currentVideo.value) {
        const currentVideoIndex = videoList.findIndex(
          (v) => v.url === currentVideo.value?.url,
        );
        const currentVideoStartTime =
          videoStartTime.value +
          (currentVideoIndex > 0 ? getVideoOffsetTime(currentVideoIndex) : 0);
        videoPlayer.value.currentTime =
          currentTime.value - currentVideoStartTime;
        if (isPlaying.value) {
          videoPlayer.value.play().catch((error) => {});
        } else {
          videoPlayer.value.pause();
        }
      }
    }
  } else {
    if (videoPlayer.value) {
      videoPlayer.value.controls = true;
    }
  }
};

// 上一次视频时间更新的时间戳
let lastVideoTimeUpdate = 0;
const VIDEO_TIME_UPDATE_INTERVAL = 200; // 视频时间更新最小间隔（毫秒）
let hasTriggeredVideoEnd = false; // 标记是否已触发结束逻辑

// 更新视频播放进度（优化：减少频繁的 currentTime 设置，主动检测视频结束）
const updateVideoProgress = () => {
  if (videoList.length === 0) {
    return;
  }

  if (hasTriggeredVideoEnd && !isVideoFusionEnabled.value) {
    return;
  }

  if (matchPlay.value && videoPlayer.value && currentVideo.value) {
    const currentVideoIndex = videoList.findIndex(
      (v) => v.url === currentVideo.value?.url,
    );

    let currentVideoStartTime: number;
    if (currentVideo.value.startTime && mapStartTime.value > 0) {
      currentVideoStartTime =
        (currentVideo.value.startTime - mapStartTime.value) / 1000;
    } else {
      currentVideoStartTime =
        videoStartTime.value + getVideoOffsetTime(currentVideoIndex);
    }

    const currentVideoDuration = currentVideo.value.duration || 60;

    if (
      currentTime.value >= currentVideoStartTime &&
      currentTime.value < currentVideoStartTime + currentVideoDuration
    ) {
      const videoCurrentTime = currentTime.value - currentVideoStartTime;

      // 主动检测：当视频播放时间超过视频实际时长时，手动触发结束
      if (
        videoPlayer.value.duration > 0 &&
        videoCurrentTime >= videoPlayer.value.duration - 0.2
      ) {
        if (hasTriggeredVideoEnd) {
          return;
        }

        hasTriggeredVideoEnd = true;

        // 立即禁用视频融合
        if (isVideoFusionEnabled.value && videoFusionManager) {
          isVideoFusionEnabled.value = false;
        }

        handleVideoEnded();
        return;
      }

      // 重置结束标志（如果回退到视频开始部分）
      if (
        videoCurrentTime < videoPlayer.value.duration - 1 &&
        hasTriggeredVideoEnd
      ) {
        hasTriggeredVideoEnd = false;
      }

      // 优化：只有当时间差异较大且距离上次更新超过一定时间时才更新
      const now = Date.now();
      const timeDiff = Math.abs(
        videoPlayer.value.currentTime - videoCurrentTime,
      );

      if (
        timeDiff > 1.0 &&
        now - lastVideoTimeUpdate > VIDEO_TIME_UPDATE_INTERVAL
      ) {
        videoPlayer.value.currentTime = videoCurrentTime;
        lastVideoTimeUpdate = now;
      }

      // 播放状态同步
      if (
        isPlaying.value &&
        videoPlayer.value.paused &&
        !videoPlayer.value.ended
      ) {
        videoPlayer.value.play().catch((error) => {});
      } else if (!isPlaying.value && !videoPlayer.value.paused) {
        videoPlayer.value.pause();
      }
    } else if (
      currentTime.value >=
      currentVideoStartTime + currentVideoDuration
    ) {
      // 当前时间超出当前视频范围，手动触发结束
      if (hasTriggeredVideoEnd) {
        return;
      }

      hasTriggeredVideoEnd = true;

      // 立即禁用视频融合
      if (isVideoFusionEnabled.value && videoFusionManager) {
        isVideoFusionEnabled.value = false;
      }

      handleVideoEnded();
      return;
    } else {
      // 当前时间在视频范围之外，暂停播放
      if (!videoPlayer.value.paused) {
        videoPlayer.value.pause();
      }
      // 重置结束标志
      hasTriggeredVideoEnd = false;
    }
  }
};

const MAX_RETRY_COUNT = 5; // 最大重试次数

// 动态点实体引用（避免频繁重建）
let animatePointEntity: any = null;
// 动态点当前坐标（用于 CallbackProperty）
let currentAnimateCoordinates: [number, number, number] = [0, 0, 0];

const FOLLOW_CAMERA_PITCH_DEGREES = -30;
const FOLLOW_CAMERA_RANGE = 120;

// 第三人称跟随视角：相机在无人机后上方，并朝向当前轨迹点。
const updateThirdPersonFollowCamera = (routePoint: any) => {
  const viewer = mapInstance;
  const positionInfo = routePoint?.positionInfo;

  if (!viewer?.camera || !positionInfo || typeof Cesium === "undefined") {
    return;
  }

  const longitude = Number(positionInfo.longitude);
  const latitude = Number(positionInfo.latitude);
  const height = Number(positionInfo.height ?? positionInfo.elevation ?? 0);

  if (![longitude, latitude, height].every(Number.isFinite)) {
    return;
  }

  const headingDegrees = Number(routePoint.attitudeInfo?.attitudeHead ?? 0);
  const targetPosition = Cesium.Cartesian3.fromDegrees(
    longitude,
    latitude,
    height,
  );
//跟随无人机位置
  viewer.camera.lookAt(
    targetPosition,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(
        Number.isFinite(headingDegrees) ? headingDegrees : 0,
      ),
      Cesium.Math.toRadians(FOLLOW_CAMERA_PITCH_DEGREES),
      FOLLOW_CAMERA_RANGE,
    ),
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
};

const updateAnimatePoint = (
  coordinates: [number, number, number],
  retryCount = 0,
) => {
  animatePointGeoJson.value.features[0].geometry.coordinates = coordinates;
  currentAnimateCoordinates = coordinates; // 更新缓存坐标

  if (!mapManager) {
    console.error("❌ mapManager 未初始化，无法更新动态点");
    return;
  }
  try {
    const dataSource = mapManager.getDataSource("animatePointLayer-source");
    if (dataSource) {
      // 如果实体已存在，CallbackProperty 会自动更新位置
      if (
        animatePointEntity &&
        dataSource.entities.contains(animatePointEntity)
      ) {
        return; // 已创建，CallbackProperty 会自动更新
      } else {
        // 清除旧的实体
        dataSource.entities.removeAll();

        // 创建新实体，使用 CallbackProperty 动态获取位置
        animatePointEntity = dataSource.entities.add({
          position: new Cesium.CallbackProperty(() => {
            return Cesium.Cartesian3.fromDegrees(
              currentAnimateCoordinates[0],
              currentAnimateCoordinates[1],
              currentAnimateCoordinates[2] + 2,
            );
          }, false),
          billboard: {
            image: droneImageUrl,
            scale: 0.2,
          },
        });
      }
    } else {
      // 检查重试次数，防止无限递归
      if (retryCount >= MAX_RETRY_COUNT) {
        return;
      }
      addAnimatePointSource();
      // 延迟重试，但限制重试次数
      setTimeout(
        () => {
          updateAnimatePoint(coordinates, retryCount + 1);
        },
        Math.min(100 * (retryCount + 1), 1000),
      );
    }
  } catch (error) {
    console.error("❌ 更新动态点位置失败:", error);
  }
};

const setTrajectoryGridVisible = (gridKey: string, visible: boolean) => {
  const gridEntities = trajectoryGridEntities.get(gridKey);
  if (!gridEntities) return;

  const setVisible = (entity: any) => {
    if (entity) {
      entity.show = visible;
    }
  };

  setVisible(gridEntities.bottom);
  setVisible(gridEntities.top);
  gridEntities.edges?.forEach(setVisible);
  gridEntities.sides?.forEach(setVisible);
};

const restoreHiddenTrajectoryGrid = () => {
  if (!hiddenTrajectoryGridKey) return;

  setTrajectoryGridVisible(hiddenTrajectoryGridKey, true);
  hiddenTrajectoryGridKey = "";
};

const hideTrajectoryGridUnderHighlight = (gridKey: string) => {
  if (hiddenTrajectoryGridKey && hiddenTrajectoryGridKey !== gridKey) {
    restoreHiddenTrajectoryGrid();
  }

  if (!trajectoryGridEntities.has(gridKey)) {
    hiddenTrajectoryGridKey = "";
    return;
  }

  if (hiddenTrajectoryGridKey === gridKey) return;

  setTrajectoryGridVisible(gridKey, false);
  hiddenTrajectoryGridKey = gridKey;
};

const clearCurrentGridHighlight = () => {
  restoreHiddenTrajectoryGrid();
  mapManager?.clearBeidouGridCellHighlight("current-grid-highlight");
  currentHighlightedGrid.value = null;
};

// 一次性添加整条轨迹的所有网格（改进版：绘制航线穿过的所有网格）
const addAllTrajectoryGrids = () => {
  if (!mapManager || donceList.length === 0) return;

  try {
    console.log("🔷 开始添加轨迹网格，总点数:", donceList.length);

    // 清空之前的记录
    visitedGrids.clear();
    trajectoryGridEntities.clear();
    hiddenTrajectoryGridKey = "";

    // 遍历相邻点对，计算每段航线穿过的网格
    for (let i = 0; i < donceList.length - 1; i++) {
      const recordA = donceList[i];
      const recordB = donceList[i + 1];

      if (
        !recordA.positionInfo ||
        !recordB.positionInfo ||
        !recordA.positionInfo.longitude ||
        !recordA.positionInfo.latitude ||
        !recordB.positionInfo.longitude ||
        !recordB.positionInfo.latitude
      )
        continue;

      const pointA = {
        lon: recordA.positionInfo.longitude,
        lat: recordA.positionInfo.latitude,
        height: recordA.positionInfo.height || 0,
      };

      const pointB = {
        lon: recordB.positionInfo.longitude,
        lat: recordB.positionInfo.latitude,
        height: recordB.positionInfo.height || 0,
      };

      // 获取这段航线穿过的所有网格
      const crossedGrids = mapManager.getGridsCrossedByLineSegment(
        pointA,
        pointB,
        beidouGridLevel.value,
      );

      // 绘制每个网格
      crossedGrids.forEach((grid: any) => {
        const gridKey = `${grid.x}_${grid.y}_${grid.z}`;

        if (!visitedGrids.has(gridKey)) {
          visitedGrids.add(gridKey);

          // 从网格索引计算边界
          const gridInfo = mapManager.calculateBeidouGridCell(
            grid.x * 0.001, // 临时坐标，用于反推网格配置
            grid.y * 0.001,
            grid.z * 1.0,
            beidouGridLevel.value,
          );

          if (gridInfo) {
            // 使用网格索引重新计算精确边界
            const levelConfig = (mapManager as any).getBeidouGridLevelConfig?.(
              beidouGridLevel.value,
            );
            let bounds;

            if (levelConfig) {
              bounds = {
                minLon: grid.x * levelConfig.lon_step,
                maxLon: (grid.x + 1) * levelConfig.lon_step,
                minLat: grid.y * levelConfig.lat_step,
                maxLat: (grid.y + 1) * levelConfig.lat_step,
                minHeight: grid.z * levelConfig.height_step,
                maxHeight: (grid.z + 1) * levelConfig.height_step,
              };
            } else {
              // 降级方案：使用从点推算的边界
              bounds = gridInfo.bounds;
            }

            // 添加网格格子到图层（浅绿色边框，透明填充）
            const gridEntities = mapManager.addBeidouGridCell(
              "trajectory-grids",
              bounds,
              {
                fillColor: "#B1EDAF",
                fillAlpha: 0.65, // 透明填充
                outlineColor: "#00FF0000",
                outlineWidth: 0,
                show: true,
              },
            );
            trajectoryGridEntities.set(gridKey, gridEntities);
          }
        }
      });
    }

    console.log("✅ 轨迹网格添加完成，总网格数:", visitedGrids.size);
  } catch (error) {
    console.error("❌ 添加轨迹网格失败:", error);
  }
};

// 高亮当前所在的北斗网格
const highlightCurrentGrid = (lon: number, lat: number, height: number) => {
  if (!mapManager) return;

  try {
    // 计算当前点所在的网格
    const gridInfo = mapManager.calculateBeidouGridCell(
      lon,
      lat,
      height,
      beidouGridLevel.value,
    );
    if (!gridInfo) return;

    // 生成网格唯一标识
    const gridKey = `${gridInfo.gridIndex.lon}_${gridInfo.gridIndex.lat}_${gridInfo.gridIndex.z}`;

    // 如果当前高亮的网格和新网格不同，则更新高亮
    if (currentHighlightedGrid.value !== gridKey) {
      hideTrajectoryGridUnderHighlight(gridKey);
      currentHighlightedGrid.value = gridKey;

      // 生成北斗三维网格码（包含高度信息）
      const gridCode = mapManager.generateBeidouGridCode(
        lon,
        lat,
        height,
        beidouGridLevel.value,
      );
      currentGridCode.value = gridCode;

      // 高亮当前网格（橙色，高亮显示）
      mapManager.highlightBeidouGridCell(
        "current-grid-highlight",
        gridInfo.bounds,
        {
          fillColor: "#F7F905",
          fillAlpha: 0.4,
          outlineColor: "#F7F90500    ",
          outlineWidth: 1,
        },
      );
    }
  } catch (error) {
    console.error("高亮北斗网格失败:", error);
  }
};

// 清除所有北斗网格
const clearAllBeidouGrids = () => {
  if (!mapManager) return;

  try {
    restoreHiddenTrajectoryGrid();
    // 清除轨迹网格图层
    mapManager.removeDataSource("trajectory-grids");
    // 清除高亮网格图层
    mapManager.clearBeidouGridCellHighlight("current-grid-highlight");
    // 清空访问记录
    visitedGrids.clear();
    trajectoryGridEntities.clear();
    hiddenTrajectoryGridKey = "";
    currentHighlightedGrid.value = null;
    currentGridCode.value = ""; // 清空网格码
  } catch (error) {
    console.error("清除北斗网格失败:", error);
  }
};

// 切换北斗网格图层显示/隐藏
const toggleBeidouGridVisibility = (visible: boolean) => {
  if (!mapManager) return;

  try {
    // 控制轨迹网格图层的显示
    const trajectoryDataSource = mapManager.getDataSource("trajectory-grids");
    if (trajectoryDataSource) {
      trajectoryDataSource.show = visible;
    }

    // 控制高亮网格图层的显示
    const highlightDataSource = mapManager.getDataSource(
      "current-grid-highlight",
    );
    if (highlightDataSource) {
      highlightDataSource.show = visible;
    }
  } catch (error) {
    console.error("切换北斗网格显示失败:", error);
  }
};

// 插值计算两个点之间的位置
const interpolatePosition = (point1: any, point2: any, t: number) => {
  if (!point1 || !point2) return point1;

  return {
    positionInfo: {
      longitude:
        point1.positionInfo.longitude +
        (point2.positionInfo.longitude - point1.positionInfo.longitude) * t,
      latitude:
        point1.positionInfo.latitude +
        (point2.positionInfo.latitude - point1.positionInfo.latitude) * t,
      height:
        point1.positionInfo.height +
        (point2.positionInfo.height - point1.positionInfo.height) * t,
      elevation:
        point1.positionInfo.elevation +
        (point2.positionInfo.elevation - point1.positionInfo.elevation) * t,
      homeDistance:
        point1.positionInfo.homeDistance +
        (point2.positionInfo.homeDistance - point1.positionInfo.homeDistance) *
          t,
    },
    attitudeInfo: {
      attitudeHead:
        point1.attitudeInfo?.attitudeHead +
        (point2.attitudeInfo?.attitudeHead -
          point1.attitudeInfo?.attitudeHead) *
          t,
      attitudePitch:
        point1.attitudeInfo?.attitudePitch +
        (point2.attitudeInfo?.attitudePitch -
          point1.attitudeInfo?.attitudePitch) *
          t,
      attitudeRoll:
        point1.attitudeInfo?.attitudeRoll +
        (point2.attitudeInfo?.attitudeRoll -
          point1.attitudeInfo?.attitudeRoll) *
          t,
    },
    deviceInfo: {
      dockPayloads:
        point1.deviceInfo?.dockPayloads?.map((payload: any, index: number) => {
          const payload2 = point2.deviceInfo?.dockPayloads?.[index];
          if (!payload2) return payload;
          return {
            ...payload,
            gimbalPitch:
              payload.gimbalPitch +
              (payload2.gimbalPitch - payload.gimbalPitch) * t,
            gimbalRoll:
              payload.gimbalRoll +
              (payload2.gimbalRoll - payload.gimbalRoll) * t,
            gimbalYaw:
              payload.gimbalYaw + (payload2.gimbalYaw - payload.gimbalYaw) * t,
          };
        }) || point1.deviceInfo?.dockPayloads,
      cameras: point1.deviceInfo?.cameras,
    },
    flightStatusInfo: point1.flightStatusInfo,
    environmentInfo: point1.environmentInfo,
    time: point1.time,
  };
};

// 更新地图航线播放进度（支持平滑插值）
const updateMapRouteProgress = async (useInterpolation: boolean = true) => {
  const sortedRecords = [...donceList].sort((a, b) => a.time - b.time);
  if (sortedRecords.length === 0) return;

  const startTime = sortedRecords[0].time;
  const targetTime = startTime + currentTime.value * 1000;

  // 找到当前时间点前后的两个记录点
  let beforeIndex = 0;
  let afterIndex = 0;

  for (let i = 0; i < sortedRecords.length - 1; i++) {
    if (
      sortedRecords[i].time <= targetTime &&
      sortedRecords[i + 1].time >= targetTime
    ) {
      beforeIndex = i;
      afterIndex = i + 1;
      break;
    }
  }

  // 如果超出范围
  if (targetTime >= sortedRecords[sortedRecords.length - 1].time) {
    beforeIndex = afterIndex = sortedRecords.length - 1;
  }

  const beforePoint = sortedRecords[beforeIndex];
  const afterPoint = sortedRecords[afterIndex];

  let currentRoute;

  // 如果启用插值且有两个不同的点
  if (
    useInterpolation &&
    beforeIndex !== afterIndex &&
    beforePoint &&
    afterPoint
  ) {
    // 计算插值系数
    const timeDiff = afterPoint.time - beforePoint.time;
    const t = timeDiff > 0 ? (targetTime - beforePoint.time) / timeDiff : 0;
    const clampedT = Math.max(0, Math.min(1, t));

    // 插值计算当前位置
    currentRoute = interpolatePosition(beforePoint, afterPoint, clampedT);
  } else {
    // 不使用插值，直接使用最近的点
    currentRoute = beforePoint;
  }

  // 检查 currentRoute 是否存在以及是否有必要的属性
  if (!currentRoute || !currentRoute.positionInfo) {
    console.warn("未找到有效的飞行记录或位置信息");
    return;
  }

  const currentLastRoute = await getPreviousFlightCoordinates(
    beforePoint, // 使用实际的点来获取之前的路径
    donceList,
  );

  const pointCenter: any = [
    currentRoute.positionInfo.longitude,
    currentRoute.positionInfo.latitude,
    currentRoute.positionInfo.height,
  ];

  // 安全地更新飞行信息
  flightInfo.longitude = currentRoute.positionInfo.longitude?.toFixed(6) || "0";
  flightInfo.latitude = currentRoute.positionInfo.latitude?.toFixed(6) || "0";
  flightInfo.elevation = currentRoute.positionInfo.elevation?.toFixed(2) || "0";
  flightInfo.flightTime = formatSeconds(currentTime.value);
  flightInfo.trackAngle =
    currentRoute.attitudeInfo?.attitudeHead?.toFixed(1) || "0";
  flightInfo.windSpeed = currentRoute.environmentInfo?.windSpeed || "0";
  flightInfo.waypoints = String(currentLastRoute.length);

  if (currentLastRoute.length >= 2) {
    let calculate = calculateDistance(
      pointCenter,
      currentLastRoute[currentLastRoute.length - 2],
    );
    flightInfo.mileage = Number(flightInfo.mileage) + Number(calculate);
  } else {
    flightInfo.mileage = 0;
  }

  flightInfo.speed = currentRoute.flightStatusInfo?.horizontalSpeed || "0";
  flightInfo.distanceToOperator =
    currentRoute.positionInfo.homeDistance?.toFixed(2) || "0";
  flightInfo.altitude = currentRoute.positionInfo.height?.toFixed(2) || "0";

  updateAnimatePoint(pointCenter);
  updateThirdPersonFollowCamera(currentRoute);
  updateRealRoute(currentLastRoute);

  // 只高亮当前所在的网格（不再动态添加网格）
  const lon = currentRoute.positionInfo.longitude;
  const lat = currentRoute.positionInfo.latitude;
  const height = currentRoute.positionInfo.height;

  highlightCurrentGrid(lon, lat, height);

  // 更新视频融合（如果已启用且视频未结束）
  if (
    videoFusionManager &&
    isVideoFusionEnabled.value &&
    videoPlayer.value &&
    currentVideo.value
  ) {
    // 检查视频是否已结束
    if (!videoPlayer.value.ended && !hasTriggeredVideoEnd) {
      const trajectoryPoint = VideoFusionManager.convertFromFlightRecord(
        currentRoute,
        beforeIndex,
      );
      videoFusionManager.updateFrustum(trajectoryPoint);
    }
  }
};

// 平滑动画循环
const smoothAnimationLoop = (timestamp: number) => {
  if (!isPlaying.value) {
    return;
  }

  // 初始化时间
  if (playbackStartTime.value === 0) {
    playbackStartTime.value = timestamp;
    lastUpdateTime.value = timestamp;
    lastRouteUpdateTime.value = timestamp;
  }

  // 计算经过的时间（秒）
  const elapsed =
    (timestamp - playbackStartTime.value) / 1000 + pausedTime.value;

  // 更新当前时间
  if (elapsed <= totalTime.value) {
    currentTime.value = elapsed;

    // 使用节流机制更新地图路线（避免每帧都更新）
    const timeSinceLastUpdate = timestamp - lastRouteUpdateTime.value;
    if (timeSinceLastUpdate >= ROUTE_UPDATE_INTERVAL) {
      if (isMapReady.value && mapManager && donceList.length > 0) {
        updateMapRouteProgress(true);
      }
      lastRouteUpdateTime.value = timestamp;
    }

    // 视频匹配检查频率较低即可
    if (matchPlay.value && timeSinceLastUpdate >= ROUTE_UPDATE_INTERVAL) {
      checkVideoVisibility();
    }
  } else {
    // 播放完成
    currentTime.value = totalTime.value;
    isPlaybackCompleted.value = true;
    isPlaying.value = false;
    return;
  }

  lastUpdateTime.value = timestamp;

  // 继续动画循环
  if (isPlaying.value) {
    animationFrameId.value = requestAnimationFrame(smoothAnimationLoop);
  }
};

// 启动平滑动画
const startSmoothAnimation = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
  }

  playbackStartTime.value = 0;
  animationFrameId.value = requestAnimationFrame(smoothAnimationLoop);
};

// 停止平滑动画
const stopSmoothAnimation = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = null;
  }

  // 保存暂停时的时间
  pausedTime.value = currentTime.value;
};

// 监听器
watch(matchPlay, watchMatchPlay);

watch(isPlaying, (newValue) => {
  if (newValue) {
    // 开始播放
    startSmoothAnimation();

    if (
      matchPlay.value &&
      videoPlayer.value &&
      currentVideo.value &&
      currentTime.value >= videoStartTime.value
    ) {
      videoPlayer.value.play().catch((error) => {});
    }
  } else {
    // 暂停播放
    stopSmoothAnimation();

    if (matchPlay.value && videoPlayer.value && currentVideo.value) {
      videoPlayer.value.pause();
    }
  }
});

// 上一次检查视频的时间
let lastVideoCheckTime = 0;
const VIDEO_CHECK_INTERVAL = 200; // 视频检查最小间隔（毫秒）

// 监听视频播放进度（优化：减少调用频率）
watch(currentTime, (newTime, oldTime) => {
  if (newTime !== oldTime && matchPlay.value && videoList.length > 0) {
    // 节流：避免过于频繁的调用
    const now = Date.now();
    if (now - lastVideoCheckTime > VIDEO_CHECK_INTERVAL) {
      updateVideoProgress();
      lastVideoCheckTime = now;
    }
  }
});

// 切换视频大小
const toggleVideoSize = (type: string) => {
  if (
    !currentVideo.value ||
    (type === "map" && mapStyle.width === "100%") ||
    (type === "video" && videoStyle.width === "100%")
  )
    return;
  isVideoEnlarged.value = type;

  if (isVideoEnlarged.value === "video") {
    videoStyle.width = "100%";
    videoStyle.height = "100%";
    videoStyle.right = "0px";
    videoStyle.bottom = "0px";
    videoStyle.zIndex = 1000;

    mapStyle.width = "30%";
    mapStyle.height = "30%";
    mapStyle.bottom = "60px";
    mapStyle.right = "110px";
    mapStyle.zIndex = 1001;
  } else {
    videoStyle.width = "30%";
    videoStyle.height = "30%";
    videoStyle.right = "110px";
    videoStyle.bottom = "60px";
    videoStyle.zIndex = 1001;

    mapStyle.width = "100%";
    mapStyle.height = "100%";
    mapStyle.right = "0px";
    mapStyle.bottom = "0px";
    mapStyle.zIndex = 1000;
  }
};

const progressWidth = computed(() => {
  return (currentTime.value / totalTime.value) * 100;
});

// 切换播放状态
const togglePlay = () => {
  if (isPlaybackCompleted.value) {
    // 重新开始播放
    currentTime.value = 0;
    pausedTime.value = 0;
    playbackStartTime.value = 0;
    isPlaybackCompleted.value = false;
    isPlaying.value = true;

    // 清除之前的高亮，但保留轨迹网格
    if (mapManager) {
      clearCurrentGridHighlight();
    }
    return;
  }

  isPlaying.value = !isPlaying.value;
};

// 格式化时间
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// 格式化视频时间（兼容 submitTime 的 ISO 字符串）
const formatVideoDisplayTime = (timeValue: string) => {
  if (!timeValue) return "";
  if (!timeValue.includes("T")) return timeValue;

  const parsedDate = new Date(timeValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return timeValue;
  }

  const yyyy = parsedDate.getFullYear();
  const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const dd = String(parsedDate.getDate()).padStart(2, "0");
  const hh = String(parsedDate.getHours()).padStart(2, "0");
  const mi = String(parsedDate.getMinutes()).padStart(2, "0");
  const ss = String(parsedDate.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

// 进度条点击
const handleProgressClick = (event: MouseEvent) => {
  if (!isDragging.value) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const newTime = (clickX / rect.width) * totalTime.value;
    currentTime.value = Math.min(Math.max(0, newTime), totalTime.value);

    // 重置时间参数以支持跳转
    pausedTime.value = currentTime.value;
    playbackStartTime.value = 0;

    // 清除当前高亮，等待更新到新位置的高亮
    if (mapManager) {
      clearCurrentGridHighlight();
    }

    // 立即更新位置
    updateMapRouteProgress(false);

    if (matchPlay.value) {
      checkVideoVisibility();
    }
  }
};

// 检查视频可见性
const checkVideoVisibility = () => {
  if (videoList.length === 0) {
    return;
  }

  if (matchPlay.value && videoList.length > 0) {
    let targetVideoIndex = -1;
    for (let i = 0; i < videoList.length; i++) {
      const video = videoList[i];
      let videoStartSeconds: number;
      if (video.startTime && mapStartTime.value > 0) {
        videoStartSeconds = (video.startTime - mapStartTime.value) / 1000;
      } else {
        videoStartSeconds = videoStartTime.value + getVideoOffsetTime(i);
      }
      const videoDurationSeconds = video.duration || 60;
      const videoEndSeconds = videoStartSeconds + videoDurationSeconds;
      if (
        currentTime.value >= videoStartSeconds &&
        currentTime.value < videoEndSeconds
      ) {
        targetVideoIndex = i;
        break;
      }
    }
    if (targetVideoIndex >= 0) {
      const targetVideo = videoList[targetVideoIndex];
      if (!currentVideo.value || currentVideo.value.url !== targetVideo.url) {
        playVideo(targetVideo, targetVideoIndex);
      }
    } else {
      if (currentVideo.value) {
        handleCloseVideo();
      }
    }
  }
};

// 拖拽相关
const startDrag = (event: MouseEvent) => {
  isDragging.value = true;
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
};

const handleDrag = (event: MouseEvent) => {
  if (isDragging.value) {
    const progressBar = document.querySelector(".progress-bar") as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const dragX = event.clientX - rect.left;
    const newTime = (dragX / rect.width) * totalTime.value;
    currentTime.value = Math.min(Math.max(0, newTime), totalTime.value);

    // 重置时间参数
    pausedTime.value = currentTime.value;
    playbackStartTime.value = 0;

    if (matchPlay.value) {
      checkVideoVisibility();
    }
  }
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);

  // 清除当前高亮，等待更新到新位置的高亮
  if (mapManager) {
    clearCurrentGridHighlight();
  }

  // 立即更新到拖拽后的位置
  updateMapRouteProgress(false);

  if (matchPlay.value) {
    checkVideoVisibility();
  }
};

// 关闭视频
const handleCloseVideo = () => {
  if (videoPlayer.value) {
    videoPlayer.value.pause();
  }
  currentVideo.value = null;
};

// 关闭模型推理
const handleCloseModel = async () => {
  try {
    if (modelWebrtcService.value) {
      modelWebrtcService.value.close();
      modelWebrtcService.value = null;
    }
    // 可以调用停止模型推理的 API
    // await $stopModelVideo({ id: processingId.value });
  } catch (err) {
    console.error("关闭模型服务失败:", err);
  } finally {
    vedioType.value = "original";
    processingId.value = "";
    // 注意：这里不要自动关闭loading，由调用方控制
    // modelLoadingState.value = false;
  }
};

// 处理视频播放结束
const handleVideoEnded = () => {
  if (!videoPlayer.value) {
    return;
  }

  // 暂停视频，停留在最后一帧
  videoPlayer.value.pause();

  // 记录当前融合状态（在清理之前）
  const wasFusionEnabled = isVideoFusionEnabled.value;

  // 无论是否有下一个视频，先清理当前视频的融合
  if (videoFusionManager) {
    isVideoFusionEnabled.value = false;
    videoFusionManager.setEnabled(false);
  }

  // 检查是否有下一个视频
  let hasNextVideo = false;
  if (matchPlay.value && videoList.length > 0) {
    const currentVideoIndex = videoList.findIndex(
      (v) => v.url === currentVideo.value?.url,
    );
    const nextVideoIndex = currentVideoIndex + 1;

    if (nextVideoIndex < videoList.length) {
      hasNextVideo = true;

      // 如果之前融合是开启的，恢复状态（playVideo 会在新视频加载后重新启用）
      if (wasFusionEnabled) {
        isVideoFusionEnabled.value = true;
      }

      playVideo(videoList[nextVideoIndex], nextVideoIndex);
    }
  }

  // 显示提示信息
  if (!hasNextVideo) {
    ElMessage.info("视频播放完成，视频融合已自动关闭");
  }
};

// 添加动态点图层
const addAnimatePointSource = () => {
  if (!mapManager) {
    console.error("❌ mapManager 未初始化");
    return;
  }

  try {
    // 创建或获取数据源
    let dataSource = mapManager.getDataSource("animatePointLayer-source");
    if (!dataSource) {
      dataSource = mapManager.createDataSource("animatePointLayer-source");
    }

    if (!dataSource) {
      console.error("❌ 无法创建动态点数据源");
      return;
    }
    // 清除旧的实体
    dataSource.entities.removeAll();
  } catch (error) {
    console.error("❌ 添加动态点图层失败:", error);
  }
};

// 添加实时轨迹线
const addRealRouteSource = () => {
  if (!mapManager) return;

  // 创建或获取数据源
  let dataSource = mapManager.getDataSource("realRouteLayer-source");
  if (!dataSource) {
    dataSource = mapManager.createDataSource("realRouteLayer-source");
  }

  // 清除旧的实体
  dataSource.entities.removeAll();

  // 如果有轨迹数据，添加实时轨迹线
  // if (realRouteGeoJson.value.features[0].geometry.coordinates.length > 0) {
  //   const coords = realRouteGeoJson.value.features[0].geometry.coordinates;
  //   const positions = coords.map((coord: any) =>
  //     Cesium.Cartesian3.fromDegrees(coord[0], coord[1], coord[2] || 0),
  //   );
  //   dataSource.entities.add({
  //     polyline: {
  //       positions: positions,
  //       width: 5,
  //       material: mapManager.createColor("#ffffff", 0.8),
  //       // clampToGround: true
  //     },
  //   });
  // }
};

// 添加航线图层
const addRoutelayer = () => {
  if (!mapManager) return;
  // 创建或获取数据源
  let dataSource = mapManager.getDataSource("routeLayer-source");
  if (!dataSource) {
    dataSource = mapManager.createDataSource("routeLayer-source");
  }

  // 清除旧的实体
  dataSource.entities.removeAll();
  // 如果有航线数据，添加航线
  if (routeGeoJson.value.features[0].geometry.coordinates.length > 0) {
    const coords = routeGeoJson.value.features[0].geometry.coordinates;
    const positions = coords.map((coord: any) =>
      Cesium.Cartesian3.fromDegrees(coord[0], coord[1], coord[2] || 0),
    );
    dataSource.entities.add({
      polyline: {
        positions: positions,
        width: 3,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString("#ffffff").withAlpha(0.8),
          outlineWidth: 1,
          outlineColor: Cesium.Color.fromCssColorString("#6F9B7C"),
        }),
        // clampToGround: true
      },
    });
    mapManager.zoomToTarget("routeLayer-source", {
      cameraHeight: 4000,
    });
  }
};

// 实时轨迹实体引用（避免频繁重建）
let realRouteEntity: any = null;
// 实时轨迹当前坐标（用于 CallbackProperty）
let currentRealRouteCoordinates: [number, number, number][] = [];

// 更新实时轨迹（使用 CallbackProperty 避免闪烁）
const updateRealRoute = (coordinates: [number, number, number][]) => {
  realRouteGeoJson.value.features[0].geometry.coordinates = coordinates;
  currentRealRouteCoordinates = coordinates; // 更新缓存坐标

  if (mapManager && coordinates.length > 1) {
    const dataSource = mapManager.getDataSource("realRouteLayer-source");
    if (dataSource) {
      // 如果实体已存在，CallbackProperty 会自动更新
      if (realRouteEntity && dataSource.entities.contains(realRouteEntity)) {
        return; // 已创建，CallbackProperty 会自动更新
      } else {
        // 清除所有旧实体（如果有的话）
        dataSource.entities.removeAll();

        // 创建新实体，使用 CallbackProperty 动态获取位置
        // realRouteEntity = dataSource.entities.add({
        //   polyline: {
        //     positions: new Cesium.CallbackProperty(() => {
        //       return currentRealRouteCoordinates.map((coord) =>
        //         Cesium.Cartesian3.fromDegrees(coord[0], coord[1], coord[2] + 1),
        //       );
        //     }, false),
        //     width: 5,
        //     material: mapManager.createColor("#ffffff", 1),
        //   },
        // });
      }
    }
  }
};

// 地图加载
const mapLoad = async (map: any) => {
  try {
    if (!currentTask.value?.executorId) return;
    mapInstance = map;
    mapManager = new CesiumMapManager(mapInstance);

    // 初始化视频融合管理器
    if (mapInstance) {
      videoFusionManager = new VideoFusionManager(mapInstance);
    }

    const { loadTotalTime, loadVideoStartSecond, FlyLineArr } =
      await GetOSDMission(
        currentTask.value.executorId,
        donceList,
        videoList,
        loadingState,
      );

    totalTime.value = loadTotalTime;
    videoStartTime.value = loadVideoStartSecond;
    flightInfo.waypointsTotal = String(FlyLineArr.length);
    flightInfo.waypoints = "1";

    if (donceList.length > 0) {
      const sortedByTime = [...donceList].sort(
        (a: any, b: any) => a.time - b.time,
      );
      mapStartTime.value = sortedByTime[0].time;
    }

    routeGeoJson.value.features[0].geometry = {
      type: "LineString",
      coordinates: FlyLineArr,
    };

    addAnimatePointSource();
    addRoutelayer();
    addRealRouteSource();

    // 一次性添加所有轨迹经过的北斗网格
    addAllTrajectoryGrids();

    // 启动平滑动画系统
    if (isPlaying.value) {
      startSmoothAnimation();
    }

    // 标记地图已准备就绪
    isMapReady.value = true;

    // 处理等待中的媒体列表
    if (pendingMediaList.value.length > 0) {
      await loadMediaList(pendingMediaList.value);
      pendingMediaList.value = [];
    }
  } catch (error) {
    console.error("加载数据失败:", error);
    loadingState.value = { loading: false, progress: 0 };
  }
};

// 获取指定飞行记录时间之前的所有坐标点位
const getPreviousFlightCoordinates = (targetRecord: any, allRecords: any) => {
  if (!allRecords || allRecords.length === 0 || !targetRecord) {
    return [];
  }

  const sortedRecords = [...allRecords].sort((a, b) => a.time - b.time);
  const targetIndex = sortedRecords.findIndex(
    (record) => record.time === targetRecord.time,
  );

  if (targetIndex === -1) {
    return [];
  }

  const coordinates: [number, number, number][] = [];
  for (let i = 0; i <= targetIndex; i++) {
    const record = sortedRecords[i];
    // 检查 positionInfo 是否存在以及经纬度是否有效
    if (
      record.positionInfo &&
      record.positionInfo.longitude != null &&
      record.positionInfo.latitude != null &&
      Number(record.positionInfo.longitude) &&
      Number(record.positionInfo.latitude)
    ) {
      coordinates.push([
        record.positionInfo.longitude,
        record.positionInfo.latitude,
        record.positionInfo.height,
      ]);
    }
  }

  return coordinates;
};

// 计算视频偏移时间
const getVideoOffsetTime = (videoIndex: number): number => {
  if (videoList.length === 0) {
    return 0;
  }

  let offsetTime = 0;
  for (let i = 0; i < videoIndex; i++) {
    offsetTime += videoList[i]?.duration || 60;
  }
  return offsetTime;
};

// 格式化速度值
const formatSpeed = (speed: any): string => {
  try {
    if (
      speed === null ||
      speed === undefined ||
      speed === "" ||
      isNaN(Number(speed))
    ) {
      return "0.0";
    }

    const numSpeed = Number(speed);
    return numSpeed.toFixed(1);
  } catch (error) {
    return "0.0";
  }
};

// 关闭详情
const closeDetail = () => {
  if (progressTimerId.value !== null) {
    clearInterval(progressTimerId.value);
    progressTimerId.value = null;
  }

  clearReplayMediaFromMap();
  replayStore.backToPage();
};

// 媒体相关
const handleOpenMediaDetail = (media: any, mediaList: any[]) => {
  currentMediaList.value = mediaList || [];
  if (replayMediaDetailPanelRef.value) {
    (replayMediaDetailPanelRef.value as any).openPanel(media);
  }
  if (
    media &&
    media?.locationInfo?.latitude &&
    media?.locationInfo?.longitude
  ) {
    locateToReplayMedia(media, mapInstance);
  }
};

const handleCloseMediaDetail = () => {
  console.log("关闭媒体详情面板");
};

// 成果文件落图
const loadMediaList = async (medias: any[], retryCount = 0) => {
  currentMediaList.value = medias;
  // 如果没有媒体数据，直接返回
  if (!medias || medias.length === 0) {
    return;
  }
  // 如果地图还未准备好，将媒体列表存储到待处理队列
  if (!isMapReady.value || !mapInstance) {
    pendingMediaList.value = medias;
    return;
  }
  try {
    await renderReplayMediaToMap(medias, mapInstance);
    setupReplayMediaInteraction(mapInstance);
  } catch (error) {
    if (retryCount < 3) {
      setTimeout(() => {
        loadMediaList(medias, retryCount + 1);
      }, 1000);
    }
  }
};

const handleOpenReplayMediaDetail = (media: any) => {
  if (replayMediaDetailPanelRef.value) {
    (replayMediaDetailPanelRef.value as any).openPanel(media);
  }
};

// 生命周期
onBeforeMount(() => {
  // 检查 store 中是否有任务信息
  if (!replayStore.hasTask) {
    ElMessage.error("缺少任务信息，请从正确的入口访问");
    router.back();
    return;
  }

  emitter.on("openReplayMediaDetail", handleOpenReplayMediaDetail);
});

onUnmounted(() => {
  emitter.off("openReplayMediaDetail", handleOpenReplayMediaDetail);
});

onBeforeUnmount(() => {
  // 停止平滑动画
  stopSmoothAnimation();

  // 清理北斗网格
  clearAllBeidouGrids();

  // 清理影像拼接资源
  cleanupImageStitching();

  // 清理精拼资源
  cleanupFineStitching();

  // 清理视频融合管理器
  if (videoFusionManager) {
    videoFusionManager.destroy();
    videoFusionManager = null;
  }

  // 清理模型视频服务
  if (modelWebrtcService.value) {
    modelWebrtcService.value.close();
    modelWebrtcService.value = null;
  }

  // 清理实体引用和缓存坐标
  realRouteEntity = null;
  animatePointEntity = null;
  currentRealRouteCoordinates = [];
  currentAnimateCoordinates = [0, 0, 0];

  clearReplayMediaFromMap();
});

const isBarVisible = ref(false); // 是否显示顶部bar
const isStitching = ref(false); // 是否正在进行影像拼接
const isFineStitching = ref(false); // 是否正在进行影像精拼

const toggleBar = () => {
  isBarVisible.value = !isBarVisible.value;
};

// 影像快拼功能切换
const toggleImageStitching = () => {
  if (isStitching.value) {
    // 停止拼接
    stopImageStitching();
  } else {
    // 开始拼接
    startImageStitching();
  }
};

// 开始影像快拼
const startImageStitching = () => {
  // 清理之前的连接和图层
  cleanupImageStitching();

  // 设置拼接状态
  isStitching.value = true;

  // 创建新的WebSocket连接
  stitchingWebSocket = new WebSocketClient(
    "ws://demo-lt.geostar.com.cn:11413/uavdom/",
    {
      maxReconnectAttempts: 3,
      reconnectInterval: 5000,
      autoReconnect: false, // 手动控制重连
    },
  );

  // 监听连接打开事件
  stitchingWebSocket.onOpen(() => {
    ElMessage.success("开始影像快拼处理");

    // 发送初始化消息
    const initMessage = {
      action: "init_stitcher",
      data: {
        canvas_width: 12000,
        canvas_height: 3000,
        temp_dir: "./temp",
      },
      timestamp: new Date().toISOString(),
    };

    stitchingWebSocket?.sendJSON(initMessage);

    // 发送开始拼接消息
    setTimeout(() => {
      const startMessage = {
        action: "start_stitching",
        data: {
          output_file: `dom_${Date.now()}.png`,
          frame_interval: 1,
          frames_per_canvas: 10,
          taskId: currentTask.value.executorId,
        },
        timestamp: new Date().toISOString(),
      };

      stitchingWebSocket?.sendJSON(startMessage);
      currentTime.value = 100;
      if (matchPlay.value) {
        checkVideoVisibility();
      }
    }, 1000); // 延迟1秒发送，确保初始化完成
  });

  // 监听消息事件
  stitchingWebSocket.onMessage((event) => {
    try {
      const message = JSON.parse(event.data);

      // 处理不同类型的消息
      switch (message.type) {
        case "init_success":
          console.log("✅ 初始化成功:", message);
          break;

        case "processing_started":
          console.log("🎬 处理开始:", message);
          break;

        case "incremental_image":
          if (message) {
            updateDOMOverlay(message);
            // 只在第一次收到影像时定位
            if (!hasFlownToStitchingArea) {
              flyToStitchingArea(message);
              hasFlownToStitchingArea = true;
            }
          }
          break;
        case "stitch_success":
          console.log("✅ 拼接完成:", message);
          if (message.data) {
            updateDOMOverlay(message);
            // 拼接完成时不再定位，保持当前视图
          }
          ElMessage.success("影像拼接完成");
          break;
      }
    } catch (error) {
      console.error("解析WebSocket消息失败:", error);
    }
  });

  // 监听连接关闭事件
  stitchingWebSocket.onClose(() => {
    console.log("影像拼接WebSocket连接已关闭");
    isStitching.value = false;
  });

  // 监听错误事件
  stitchingWebSocket.onError((error) => {
    console.error("影像拼接WebSocket连接错误:", error);
    ElMessage.error("影像拼接连接失败");
    isStitching.value = false;
  });

  // 建立连接
  stitchingWebSocket.connect();
};

// 更新DOM覆盖层 - 支持多画布（Cesium版本）
const updateDOMOverlay = (data: any) => {
  if (!mapManager || !data.image_data) {
    return;
  }

  const canvasIndex = data.canvas_index || 0;
  const isNewCanvas = data.is_new_canvas || false;
  try {
    // 生成唯一的图层ID
    const layerId = `dom-canvas-${canvasIndex}`;

    // 如果不是新画布，移除旧的覆盖层
    if (!isNewCanvas && canvasOverlays.has(canvasIndex)) {
      const oldLayerId = canvasOverlays.get(canvasIndex)!;
      const layerData = mapManager.getDataSource(oldLayerId);
      if (layerData && layerData.type === "imagery") {
        mapInstance.imageryLayers.remove(layerData.layer);
        console.log(`🗑️ 移除旧覆盖层: ${oldLayerId}`);
      }
    }

    // 计算边界 - 优先使用服务器bounds数据
    let rectangle;
    if (data.bounds) {
      rectangle = Cesium.Rectangle.fromDegrees(
        data.bounds.top_left.longitude,
        data.bounds.bottom_left.latitude,
        data.bounds.top_right.longitude,
        data.bounds.top_left.latitude,
      );
    } else {
      // 默认坐标
      console.warn("⚠️ 未收到bounds数据，使用默认坐标");
      const centerLat = 30.8389;
      const centerLon = 114.1328;
      const deltaLat = 0.003;
      const deltaLon = 0.004;

      rectangle = Cesium.Rectangle.fromDegrees(
        centerLon - deltaLon,
        centerLat - deltaLat,
        centerLon + deltaLon,
        centerLat + deltaLat,
      );
    }

    // 创建单一影像提供者
    const imageryProvider = new Cesium.SingleTileImageryProvider({
      url: data.image_data,
      rectangle: rectangle,
    });

    // 添加影像图层
    const imageryLayer =
      mapInstance.imageryLayers.addImageryProvider(imageryProvider);
    imageryLayer.alpha = 1.0;

    // 存储图层引用
    mapManager.getDataSources().set(layerId, {
      type: "imagery",
      layer: imageryLayer,
      provider: imageryProvider,
    });

    // 更新覆盖层映射
    canvasOverlays.set(canvasIndex, layerId);
  } catch (error) {
    console.error("更新DOM覆盖层失败:", error);
  }
};

// 停止影像拼接
const stopImageStitching = () => {
  ElMessage.info("停止影像拼接");
  cleanupImageStitching();
};

// 自动定位到拼接区域（仅首次定位）
const flyToStitchingArea = (data: any) => {
  if (!data.bounds || !mapManager) return;

  const bounds = data.bounds;
  const centerLat =
    (bounds.top_left.latitude + bounds.bottom_right.latitude) / 2;
  const centerLon =
    (bounds.top_left.longitude + bounds.bottom_right.longitude) / 2;

  console.log(
    `🎯 首次定位到拼接区域: ${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}`,
  );

  // 使用Cesium的flyTo方法，仅首次定位
  mapManager.flyToPosition(centerLon, centerLat, 1000, 2.0);
};

// 清理所有覆盖层（调试用）
const clearAllOverlays = () => {
  if (!mapManager) return;

  canvasOverlays.forEach((layerId, canvasIndex) => {
    try {
      const layerData = mapManager.getDataSource(layerId);
      if (layerData && layerData.type === "imagery") {
        mapInstance.imageryLayers.remove(layerData.layer);
      }
    } catch (error) {
      console.error(`清理覆盖层失败: ${layerId}`, error);
    }
  });

  canvasOverlays.clear();
};

// 获取覆盖层统计信息
const getOverlayStats = () => {
  const activeCanvases = Array.from(canvasOverlays.keys()).sort(
    (a, b) => a - b,
  );
  return {
    totalOverlays: canvasOverlays.size,
    canvasCount: canvasOverlays.size,
    activeCanvases: activeCanvases,
    canvasStats: Object.fromEntries(activeCanvases.map((idx) => [idx, 1])),
  };
};

// 清理影像拼接相关资源
const cleanupImageStitching = () => {
  // 关闭WebSocket连接
  if (stitchingWebSocket) {
    stitchingWebSocket.close();
    stitchingWebSocket = null;
  }

  // 重置拼接状态
  isStitching.value = false;
  hasFlownToStitchingArea = false; // 重置定位标记

  // 清理所有DOM覆盖层
  clearAllOverlays();

  // 清理旧版本的单一图层（向后兼容）
  if (mapManager) {
    try {
      const layerData = mapManager.getDataSource(stitchingLayerId);
      if (layerData && layerData.type === "imagery") {
        mapInstance.imageryLayers.remove(layerData.layer);
      }
    } catch (error) {
      console.error("清理影像拼接图层失败:", error);
    }
  }
};

// 影像精拼功能
const startFineStitching = async () => {
  // 如果正在快拼，先停止快拼
  if (isStitching.value) {
    stopImageStitching();
  }

  // 清理之前的精拼图层
  cleanupFineStitching();

  try {
    isFineStitching.value = true;
    // 加载WMS服务到地图
    await loadWmsToMap();
  } catch (error) {
    console.error("加载精拼WMS服务失败:", error);
    ElMessage.error("精拼WMS服务加载失败");
    isFineStitching.value = false;
  }
};

// 加载WMS服务到地图
const loadWmsToMap = async () => {
  if (!mapManager) {
    throw new Error("地图未初始化");
  }
  // 如果已经加载过，直接显示
  if (isWmsLoaded.value) {
    mapManager.showLayer(fineStitchingLayerId);
    return;
  }
  try {
    // 组装WMS URL参数
    const wmsParams = new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetMap",
      FORMAT: "image/png", // 使用PNG格式支持透明度
      TRANSPARENT: "true",
      STYLES: "",
      LAYERS: "drone:-2025-8-20-orthophoto",
      EXCEPTIONS: "application/vnd.ogc.se_inimage",
      SRS: "EPSG:4326",
      WIDTH: "256",
      HEIGHT: "256",
    });
    const wmsUrl = `${wmsBaseUrl}?${wmsParams.toString()}`;
    // 直接使用addWMSLayer方法
    mapManager.addWMSLayer(
      wmsUrl,
      fineStitchingLayerId,
      fineStitchingSourceId,
      {
        opacity: 1,
        visible: true,
      },
    );
    isWmsLoaded.value = true; // 标记为已加载
    ElMessage.success("精拼WMS服务加载完成");
  } catch (error: any) {
    console.error("WMS服务加载失败:", error);
    throw error;
  }
};

// 停止影像精拼
const stopFineStitching = () => {
  cleanupFineStitching();
};

// 清理精拼相关资源
const cleanupFineStitching = () => {
  if (mapManager && isWmsLoaded.value) {
    // 隐藏WMS图层
    mapManager.hideLayer(fineStitchingLayerId);
  }
  isFineStitching.value = false;
};

// 精拼功能切换
const toggleFineStitching = () => {
  // if (isFineStitching.value) {
  //   stopFineStitching();
  // } else {
  //   startFineStitching();
  // }
};

const handlePasteCurrentImageToMap = async (media: any) => {
  const currentMedia = currentMediaList.value.find((e) => e.id === media.id);
  if (!currentMedia) return;
  await pasteImageToMap(currentMedia, mapInstance);
};

// 切换视频融合
const toggleVideoFusion = () => {
  if (!videoFusionManager) {
    ElMessage.warning("视频融合管理器未初始化");
    return;
  }

  isVideoFusionEnabled.value = !isVideoFusionEnabled.value;
  videoFusionManager.setEnabled(isVideoFusionEnabled.value);

  ElMessage.success(
    isVideoFusionEnabled.value ? "视频融合已开启" : "视频融合已关闭",
  );
};

// 暴露调试函数到全局（开发环境）
// @ts-ignore
if (process.env.NODE_ENV === "development") {
  (window as any).clearAllOverlays = clearAllOverlays;
  (window as any).getOverlayStats = getOverlayStats;
  (window as any).canvasOverlays = canvasOverlays;
}
</script>

<style scoped lang="less">
.replay-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #000;

  .page-content {
    flex: 1;
    width: 100%;
    height: calc(100vh - 60px);
    overflow: hidden;

    .app-container {
      top: 0px;
      height: 100vh;
      :deep(.layout-main-info) {
        height: 100%;
        padding: 0px;
      }
    }

    .replay-main-info {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      color: #fff;
      position: relative;

      :deep(.el-button) {
        position: absolute;
        z-index: 1002;
        left: 20px;
        top: 70px;
        background-color: rgba(33, 150, 243, 0.7);
        border: 1px solid rgba(33, 150, 243, 0.9);
      }
    }

    .common-panel-content {
      width: 100%;
      height: 100%;
      display: flex;
    }

    .header-right {
      margin-right: 10px;
      display: flex;
      align-items: center;
      .match-play-right-title {
        color: #fff;
      }
      .el-icon {
        border-radius: 2px;
        padding: 2px;
        cursor: pointer;
      }
      .tipIcon {
        background: transparent;
        width: 24px;
        height: 24px;
        color: #fff;
      }
    }

    .data-panel {
      position: absolute;
      z-index: 1002;
      left: 20px;
      top: 110px;
      height: 32%;
      width: 20%;
      color: #333;

      .speed-height-section {
        display: flex;
        flex-direction: column;
        width: 45%;
        .speed-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          .speed-value {
            color: #4b9cfb;
            font-size: 24px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .speed-label {
            color: #fff;
            font-size: 13px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            .speed-limit {
              margin: 0 5px;
              font-size: 9px;
              color: #fff;
              padding: 2px 5px;
              background: rgba(15, 42, 90, 0.2);
              border-radius: 5px;
            }
          }
        }
      }

      .location-section {
        width: 55%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .data-item {
          flex: 1;
          width: 100%;
          display: flex;

          &:last-child {
            .label,
            .value {
              border-bottom: 1px solid #1491cd;
            }
          }
          .label {
            color: #ddd;
            width: 45%;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #19506b;
            background-color: rgba(8, 119, 152, 0.5);
            border-right: 0;
            border-bottom: 0;
          }

          .value {
            color: #fff;
            width: 55%;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(20, 145, 205, 0.8);
            border-bottom: 0;
            overflow: hidden;
          }
        }
      }
    }

    .secondary-panel {
      position: absolute;
      z-index: 1002;
      left: 20px;
      top: calc(40% + 44px);
      height: 35%;
      width: 20%;
      color: #333;
      .secondary-panel-content {
        display: flex;
        align-items: center;
      }
      .info-item-distance {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 45%;
        color: #4b9cfb;
        font-size: 13px;
        img {
          width: 48px;
          height: 48px;
          margin-left: -20px;
        }
        .label {
          margin: 6px 0 3px -24px;
        }
        .value {
          margin-left: -28px;
        }
      }
      .info-list {
        width: 55%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 120px;

        .info-item {
          flex: 1;
          width: 100%;
          display: flex;
          height: 100%;
          &:last-child {
            .label,
            .value {
              border-bottom: 1px solid rgba(175, 212, 228, 1);
            }
          }
          .label {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 45%;
            border: 1px solid rgba(175, 212, 228, 1);
            background-color: rgba(226, 240, 251, 1);
            border-bottom: 0px;
            border-right: 0px;
            font-size: 13px;
          }

          .value {
            width: 55%;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(175, 212, 228, 1);
            border-bottom: 0px;
            overflow: hidden;
          }
        }
      }
    }

    .video-box {
      position: absolute;
      z-index: 1002;
      left: 20px;
      top: calc(75% + 50px);
      height: 19%;
      width: 20%;
      flex: 1;
      color: #fff;

      .match-play {
        display: flex;
        align-items: center;
        height: 15%;
        justify-content: space-between;
        font-size: 16px;
        .match-play-right {
          display: flex;
          align-items: center;
          justify-content: center;
          .el-icon {
            cursor: pointer;
            margin-left: 5px;
            &:hover {
              color: #409eff;
            }
          }
        }
      }
      .video-list {
        height: 100%;
        width: 100%;
        overflow: auto;
        .video-item {
          cursor: pointer;
          padding: 5px;
          .video-name-row {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .video-type-tag {
            display: inline-flex;
            align-items: center;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 13px;
            color: #fff;
          }
          .tag-original {
            background: rgba(103, 194, 58, 0.5);
            border: 1px solid rgba(103, 194, 58, 0.7);
          }
          .tag-ai {
            background: rgba(230, 162, 60, 0.5);
            border: 1px solid rgba(230, 162, 60, 0.7);
          }
          .video-title {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .video-name-row {
            font-size: 13px;
          }

          > span:last-child {
            display: block;
            font-size: 11px;
            color: #7f8c8d;
          }

          &:hover {
            background-color: rgba(119, 199, 249, 0.2);
          }
        }
      }
    }

    .main-content {
      width: 100%;
      height: 100%;
      position: absolute;
      overflow: hidden;
      .map-container {
        position: absolute;
        transition: all 0.3s ease;

        .map-placeholder {
          width: 100%;
          height: 100%;
          background-color: #e0e0e0;
        }
      }

      .video-container {
        position: absolute;
        transition: all 0.3s ease;
        overflow: hidden;

        .video-placeholder {
          width: 100%;
          height: 100%;
          object-fit: fill;
          position: relative;
          z-index: 1;
        }
        .video-close-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 40px;
          height: 40px;
          background: transparent;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #fff;
          cursor: pointer;
          z-index: 999;
          &:hover {
            background-color: #2279e4;
          }
        }

        .video-fusion-btn {
          position: absolute;
          top: 5px;
          right: 95px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: transparent;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 999;
          user-select: none;
          transition: all 0.3s ease;
          &:hover {
            background-color: #2279e4;
          }
          &.active {
            background-color: #00d4ff;
            color: #000;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          }
          .fusion-icon {
            width: 24px;
            height: 24px;
            fill: currentColor;
          }
        }

        .ai-model-btn {
          position: absolute;
          top: 5px;
          right: 50px;
          min-width: 40px;
          height: 40px;
          border-radius: 20px;
          background: transparent;
          color: #fff;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 999;
          user-select: none;
          padding: 0 10px;
          transition: all 0.3s ease;

          &:hover {
            background-color: #2279e4;
          }

          &.active {
            background-color: #00d4ff;
            color: #000;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            animation: pulse 2s infinite;

            .ai-icon {
              filter: brightness(0);
            }
          }

          .ai-icon {
            width: 24px;
            height: 24px;
          }

          .model-status {
            margin-left: 5px;
            font-size: 12px;
            white-space: nowrap;
          }
        }

        .model-loading-mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          color: #fff;
          backdrop-filter: blur(2px);

          .loading-text {
            margin-top: 15px;
            font-size: 16px;
            font-weight: 500;
          }

          .el-icon {
            color: #00d4ff;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
          }
        }
      }
    }

    .floating-bar-container {
      position: absolute;
      z-index: 1002;
      right: 25px;
      top: 25px;
      display: inline-block;

      .action-bar {
        position: absolute;
        top: -5px;
        right: 60px;
        background-color: #ffffffcc;
        border-radius: 40px;
        padding: 10px;
        display: flex;

        .action-item {
          display: flex;
          // flex-direction: column;
          justify-content: center;
          align-items: center;
          margin: 0 5px;
          color: #333;
          cursor: pointer;
          width: 110px;
          height: 40px;
          transition: all 0.3s ease;

          &:hover {
            color: #409eff;
          }

          &.active {
            color: #e74c3c;

            .el-icon {
              background: #e74c3c;
              animation: pulse 1.5s infinite;
            }
          }

          .el-icon {
            font-size: 24px;
            background: #2279e4;
            width: 40px;
            height: 40px;
            color: #fff;
            border-radius: 50%;
            transition: background 0.3s ease;
          }
          span {
            margin-left: 5px;
            font-size: 13px;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      }
    }

    .progress-bar-container {
      display: flex;
      align-items: center;
      width: 30%;
      position: absolute;
      background-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0.1rem 0 rgba(19, 76, 144, 0.22);
      padding: 10px 5px;
      z-index: 1002;
      right: 110px;
      bottom: 10px;
      color: #333;
      border-radius: 5px;

      .progress-loading {
        width: 100%;
        padding: 0 10px;

        .progress-text {
          color: #409eff;
          font-size: 14px;
          font-weight: 500;
        }
      }

      .play-icon {
        cursor: pointer;
        font-size: 24px;
      }

      .current-time,
      .total-time {
        margin: 0 10px;
        text-align: center;
      }

      .progress-bar {
        flex: 1;
        height: 4px;
        background-color: #ccf6fd;
        position: relative;
        cursor: pointer;

        .progress-filled {
          height: 100%;
          background-color: #4b9cfb;
        }

        .progress-thumb {
          position: absolute;
          top: -5px;
          width: 14px;
          height: 14px;
          background-color: #409eff;
          border-radius: 50%;
          transform: translateX(-50%);
          cursor: pointer;
        }
      }
    }

    // 北斗网格码显示样式
    .beidou-grid-code {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 0.1rem 0 rgba(19, 76, 144, 0.22);
      padding: 6px 16px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      z-index: 1002;

      .grid-code-label {
        color: #333;
        font-size: 13px;
        font-weight: 500;
      }

      .grid-code-value {
        color: #000;
        font-size: 15px;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .grid-code-level {
        color: #000;
        font-size: 11px;
        font-style: italic;
      }

      .grid-toggle-switch {
        margin-left: 8px;
      }
    }
  }
}
</style>
