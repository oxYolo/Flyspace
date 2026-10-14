<template>
  <div class="media-viewer" v-show="isVisible">
    <!-- 顶部标题栏 -->
    <div class="viewer-header">
      <div class="file-title">
        {{ currentMedia?.fileName || currentMedia?.name || "" }}
      </div>
      <div class="close-btn" @click="closePanel">
        <el-icon><Close /></el-icon>
      </div>
    </div>

    <!-- 关键属性信息 -->
    <div class="meta-info">
      <div v-if="currentMedia?.createTime">
        {{ dayjs(currentMedia.createTime).format("YYYY-MM-DD HH:mm:ss") }}
      </div>
      <div v-if="imageSize">
        {{ imageSize }}
      </div>
      <div v-if="currentMedia?.latitude">
        {{ formatCoordinate(currentMedia.longitude, "lng") }}
        {{ formatCoordinate(currentMedia.latitude, "lat") }}
      </div>
      <div class="btnGroup">
        <!-- 下载按钮 -->
        <el-button
          v-tooltip="'下载标注信息文件'"
          class="downloadBtn"
          :icon="Download"
          :loading="downloadLoading"
          @click="handleDownloadAnnotation(currentMedia)"
          v-if="currentMedia?.fileType === 'PHOTO'" />

        <!-- 查看标注 -->
        <el-button
          v-tooltip="'查看标注'"
          @click="viewAnnotations(currentMedia)"
          type="success"
          icon="Picture"
          v-if="currentMedia?.fileType === 'PHOTO'">
          查看
        </el-button>
        <!-- 开始标注 -->
        <el-button
          v-tooltip="'开始标注'"
          @click="onResultClick(currentMedia)"
          type="primary"
          :icon="FullScreen"
          v-if="
            currentMedia?.fileType === 'PHOTO' ||
            currentMedia?.fileType === 'VIDEO'
          ">
          标注
        </el-button>
      </div>
    </div>

    <!-- 媒体内容展示 -->
    <div class="content-area" ref="contentAreaRef">
      <!-- 图片显示 -->
      <div
        v-if="
          currentMedia?.fileType === 'PHOTO' ||
          currentMedia?.fileType === 'MAPIMAGE'
        "
        class="photo-display-container">
        <!-- 全景预览按钮 -->
        <div class="panorama-controls" v-if="currentMedia?.filePath">
          <el-button
            @click="showPanoramaView"
            type="primary"
            v-if="currentMedia.isPanorama && !showPanorama">
            全景预览
          </el-button>
          <el-button
            @click="hidePanoramaView"
            v-if="currentMedia.isPanorama && showPanorama">
            返回图片
          </el-button>
          <!--          <el-button @click="pasteCurrentImageToMap" v-if="!currentMedia.isPanorama" type="success">-->
          <!--            一键贴图-->
          <!--          </el-button>-->
        </div>

        <div class="content-wrapper">
          <div class="image-container" ref="imageContainerRef">
            <!-- 普通图片显示 -->
            <div v-show="!showPanorama">
              <el-image
                v-if="currentMedia?.filePath"
                :src="currentMedia?.filePath"
                :preview-src-list="currentMedia?.filePath ? [currentMedia.filePath] : []"
                :initial-index="0"
                fit="contain"
                class="media-image"
                ref="imageRef"
                @load="onImageLoaded"
                preview-teleported>
                <template #error>
                  <div class="image-slot">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <div v-else class="media-placeholder">
                <el-icon><Picture /></el-icon>
                <span>暂无图片</span>
              </div>
            </div>

            <!-- 全景显示容器 -->
            <div
              v-show="showPanorama"
              class="panorama-container"
              id="panorama-container">
              <div id="panorama" class="panorama-viewer"></div>
              <el-button
                @click="togglePanoramaFullscreen"
                class="panorama-fullscreen-btn"
                type="primary"
                circle
                size="large">
                <el-icon>
                  <FullScreen />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 视频显示 -->
      <div
        v-else-if="currentMedia?.fileType === 'VIDEO'"
        class="video-container">
        <video
          :src="currentMedia?.filePath"
          controls
          class="media-video"
          ref="videoRef"
          @loadedmetadata="onVideoLoaded"
          @error="onVideoError"></video>
        <div v-if="loading" class="loading-indicator">加载中...</div>
        <div v-if="loadError" class="error-indicator">
          <el-icon><VideoCamera /></el-icon>
          <span>加载失败</span>
        </div>
      </div>

      <!-- 全景照片 -->
      <div
        v-else-if="currentMedia?.fileType === 'PANORAMA'"
        class="panorama-container">
        <iframe
          v-if="currentMedia?.filePath"
          :src="currentMedia.filePath"
          class="panorama-iframe"
          frameborder="0"
          allowfullscreen></iframe>
      </div>

      <!-- 未知类型 -->
      <div v-else class="unsupported-media">
        <el-icon><Document /></el-icon>
        <div>不支持的文件类型</div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <div class="toolbar">
      <!-- 媒体轮播图 -->
      <div class="carousel-container">
        <div
          class="carousel-arrow prev"
          @click="prevMedia"
          v-show="mediaList.length > 1">
          <el-icon><ArrowLeft /></el-icon>
        </div>

        <div class="thumbnails-wrapper" ref="carouselRef">
          <div class="thumbnails-track" :style="carouselStyle">
            <!-- 在最前面添加足够数量的克隆项，确保左侧不出现空白 -->
            <template v-if="mediaList.length > 0">
              <div
                v-for="i in actualCloneCount"
                :key="`prefix-${i}`"
                class="thumbnail-item clone-item"
                :class="{
                  active:
                    currentMedia &&
                    mediaList[mediaList.length - i].id === currentMedia.id,
                }"
                @click="
                  selectMedia(
                    mediaList[mediaList.length - i],
                    mediaList.length - i,
                  )
                ">
                <img
                  :src="getMediaThumbnail(mediaList[mediaList.length - i])"
                  :alt="mediaList[mediaList.length - i].fileName"
                  class="thumbnail" />
              </div>
            </template>

            <!-- 主要媒体列表 -->
            <div
              v-for="(media, index) in mediaList"
              :key="media.id"
              class="thumbnail-item"
              :class="{ active: currentMedia && media.id === currentMedia.id }"
              @click="selectMedia(media, index)">
              <img
                :src="getMediaThumbnail(media)"
                :alt="media.fileName"
                class="thumbnail" />
            </div>

            <!-- 在最后面添加足够数量的克隆项，确保右侧不出现空白 -->
            <template v-if="mediaList.length > 0">
              <div
                v-for="i in actualCloneCount"
                :key="`suffix-${i}`"
                class="thumbnail-item clone-item"
                :class="{
                  active:
                    currentMedia && mediaList[i - 1].id === currentMedia.id,
                }"
                @click="selectMedia(mediaList[i - 1], i - 1)">
                <img
                  :src="getMediaThumbnail(mediaList[i - 1])"
                  :alt="mediaList[i - 1].fileName"
                  class="thumbnail" />
              </div>
            </template>
          </div>
        </div>

        <div
          class="carousel-arrow next"
          @click="nextMedia"
          v-show="mediaList.length > 1">
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
    </div>

    <!-- 新增标注面板 -->
    <AnnotationPanel
      v-model:visible="annotationVisible"
      :selectedImage="activeImage" />
    <AnnotationPreviewDialog
      v-model="annotationPreviewVisible"
      :media="annotationPreviewMedia" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import {
  Close,
  Download,
  Picture,
  VideoCamera,
  Document,
  ArrowLeft,
  ArrowRight,
  FullScreen,
} from "@element-plus/icons-vue";
import { ElMessage, dayjs } from "element-plus";
import emitter from "@/stores/mitt";
// @ts-ignore
import { locateToMedia } from "@/services/mediaService_readable.js";
// @ts-ignore
import Marzipano from "marzipano";
// @ts-ignore
import { getMapManager } from "@/services/mapService";
import { $downloadInspectionAnnotation } from "@/api/flyControl/file.ts";

import AnnotationPanel from "./AnnotationPanel.vue";
import AnnotationPreviewDialog from "./AnnotationPreviewDialog.vue";
import videoThumb from "../assets/images/video_thumb.jpg";

// 清除当前贴图（2D/3D统一）
const clearCurrentChartlets = () => {
  try {
    const mapManager = getMapManager();
    mapManager?.clearLayerWithDerivatives("chartlet-overlays");
  } catch (e) {}
};

const handleShowPano = () => {
  const viewer = new Marzipano.Viewer(document.getElementById("panorama"));
  const source = Marzipano.ImageUrlSource.fromString(
    currentMedia.value.filePath,
  );
  //创建等圆柱体形状
  const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);

  //创建视图
  const limiter = Marzipano.RectilinearView.limit.traditional(
    1024 * 100,
    (120 * Math.PI) / 180,
  );
  //RectilinearView(初始化视角,视图限制)
  const view = new Marzipano.RectilinearView({ yaw: Math.PI });
  const scene = viewer.createScene({
    source: source,
    geometry: geometry,
    view: view,
    pinFirstLevel: true,
  });
  scene.switchTo();
};

// 显示全景视图
const showPanoramaView = () => {
  showPanorama.value = true;
  // 初始化Marzipano
  nextTick(() => {
    handleShowPano();
  });
};

// 隐藏全景视图
const hidePanoramaView = () => {
  showPanorama.value = false;
  isPanoramaFullscreen.value = false;
  // 清理全景容器
  const panoramaElement = document.getElementById("panorama");
  if (panoramaElement) {
    panoramaElement.innerHTML = "";
  }
};

// 将当前图片贴到地图（驱动无关）
const pasteCurrentImageToMap = async () => {
  try {
    // 每次贴图前先清除当前展示的贴图
    clearCurrentChartlets();
    const media = currentMedia.value;
    if (!media || !media.filePath) return;
    const ci = media?.chartletInfo || {};
    const baseRotation =
      Number(media?.rotationAngle ?? ci.rotationAngle ?? 0) || 0;
    const mapManager = getMapManager();
    mapManager?.addChartlet("chartlet-overlays", {
      imageUrl: String(media.filePath),
      corners: Array.isArray(ci.cornerCoordinates)
        ? ci.cornerCoordinates
        : undefined,
      bounds: ci.bounds || undefined,
      rotationDeg: baseRotation,
    });
  } catch (e) {}
};

// 切换全景全屏
const togglePanoramaFullscreen = () => {
  const panoramaElement: any = document.getElementById("panorama-container");
  if (!panoramaElement) return;

  if (!isPanoramaFullscreen.value) {
    // 进入全屏
    if (panoramaElement.requestFullscreen) {
      panoramaElement.requestFullscreen();
    } else if (panoramaElement.webkitRequestFullscreen) {
      panoramaElement.webkitRequestFullscreen();
    } else if (panoramaElement.msRequestFullscreen) {
      panoramaElement.msRequestFullscreen();
    }
  } else {
    // 退出全屏
    if (panoramaElement.exitFullscreen) {
      panoramaElement.exitFullscreen();
    } else if (panoramaElement.webkitExitFullscreen) {
      panoramaElement.webkitExitFullscreen();
    } else if (panoramaElement.msExitFullscreen) {
      panoramaElement.msExitFullscreen();
    }
  }
};

// 组件可见性控制
const isVisible = ref(false);

// 当前显示的媒体对象
const currentMedia = ref<any>(null);

// 媒体状态
const loading = ref(false);
const loadError = ref(false);
const imageSize = ref("");

// 全景显示状态
const showPanorama = ref(false);
const isPanoramaFullscreen = ref(false);

// DOM引用
const contentAreaRef = ref<HTMLElement | null>(null);
const imageContainerRef = ref<HTMLElement | null>(null);
const imageRef = ref<any>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

// 全屏状态
let isFullscreen = false;

// 修复自定义事件处理函数的类型
const customEventListener = (event: Event) => {
  // 将Event类型转换为CustomEvent类型
  const customEvent = event as CustomEvent;
  if (customEvent.detail) {
    currentMedia.value = customEvent.detail;
    isVisible.value = true;
    loading.value = true;
    loadError.value = false;
    imageSize.value = "";
  }
};

// 轮播图相关数据
const mediaList = ref<any[]>([]);
const currentIndex = ref(0);

// 添加轮播图滚动相关ref
const carouselRef = ref<HTMLElement | null>(null);
const isTransitioning = ref(false);

// 添加一个计算属性，确定需要克隆的项目数量
// 这个数量应该至少能填满轮播图的可视区域
const displayCloneCount = computed(() => {
  if (!carouselRef.value || mediaList.value.length === 0) return 3; // 默认至少显示3个克隆项

  // 每个缩略图的宽度加上间距
  const itemWidth = 86;

  // 计算可见缩略图的数量
  const visibleCount = Math.ceil(carouselRef.value.clientWidth / itemWidth);

  // 返回足够填满一个屏幕的数量，至少3个
  return Math.max(visibleCount, 3);
});

// 实际需要克隆的项目数量，不能超过列表总数，以避免访问未定义索引
const actualCloneCount = computed(() => {
  // 当列表项较少（小于等于4）时，不进行克隆，以避免视觉上出现重复项。
  if (mediaList.value.length <= 4) {
    return 0;
  }
  return Math.min(displayCloneCount.value, mediaList.value.length);
});

const carouselStyle = computed(() => {
  // 每个缩略图的宽度加上间距
  const itemWidth = 86;

  // 计算可见缩略图的数量
  const visibleCount = carouselRef.value
    ? Math.floor(carouselRef.value.clientWidth / itemWidth)
    : 5;

  let offset = 0;
  let justifyContent: "center" | undefined = undefined;

  if (mediaList.value.length > 0) {
    // 如果不启用克隆（列表项少），则为常规的、非循环的轮播
    if (actualCloneCount.value === 0) {
      const trackWidth = mediaList.value.length * itemWidth;
      const wrapperWidth = carouselRef.value?.clientWidth ?? 0;

      // 如果总宽度小于容器宽度，则居中显示
      if (trackWidth < wrapperWidth) {
        justifyContent = "center";
      } else {
        // 否则，计算滚动偏移
        let desiredOffset = -currentIndex.value * itemWidth;
        desiredOffset = Math.max(desiredOffset, -(trackWidth - wrapperWidth));
        offset = desiredOffset;
      }
    } else {
      // 启用克隆和无缝轮播的逻辑
      const cloneOffset = actualCloneCount.value * itemWidth;
      const centerOffset = ((visibleCount - 1) / 2) * itemWidth;
      offset = -cloneOffset - currentIndex.value * itemWidth + centerOffset;
    }
  }

  return {
    transform: `translateX(${offset}px)`,
    transition: isTransitioning.value ? "transform 0.3s ease" : "none",
    justifyContent,
  };
});

// 获取默认图标
const getDefaultIconByFileType = (fileType: string): string => {
  switch (fileType) {
    case "PHOTO":
      return "/images/icons/photo-thumbnail.png";
    case "VIDEO":
      return "/images/icons/video-thumbnail.png";
    case "MAPIMAGE":
      return "/images/icons/map-thumbnail.png";
    default:
      return "/images/icons/photo-thumbnail.png";
  }
};

const getMediaThumbnail = (media: any): string => {
  if (media?.fileType === "VIDEO") return videoThumb;
  return (
    media?.scalePath ||
    media?.filePath ||
    getDefaultIconByFileType(media?.fileType)
  );
};

// 上一个媒体
const prevMedia = () => {
  if (mediaList.value.length <= 1) return;

  // 如果不启用克隆（列表项少），则为常规的、非循环的轮播
  if (actualCloneCount.value === 0) {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      selectMedia(mediaList.value[currentIndex.value], currentIndex.value);
    }
    return;
  }

  isTransitioning.value = true;

  // 当前是第一项，需要无缝切换到最后一项
  if (currentIndex.value === 0) {
    // 先立即切换到"克隆"位置（无动画）
    isTransitioning.value = false;
    currentIndex.value = mediaList.value.length;

    // 然后在下一帧开启动画，切换到真实的最后一项 - 优化动画帧调用
    requestAnimationFrame(() => {
      isTransitioning.value = true;
      // 使用 setTimeout 替代嵌套的 requestAnimationFrame
      setTimeout(() => {
        currentIndex.value = mediaList.value.length - 1;
        selectMedia(
          mediaList.value[mediaList.value.length - 1],
          mediaList.value.length - 1,
          false,
        );
      }, 16); // 约1帧的时间
    });
  } else {
    // 普通情况，直接切换到上一项
    currentIndex.value--;
    selectMedia(mediaList.value[currentIndex.value], currentIndex.value);
  }
};

// 下一个媒体
const nextMedia = () => {
  if (mediaList.value.length <= 1) return;

  // 如果不启用克隆（列表项少），则为常规的、非循环的轮播
  if (actualCloneCount.value === 0) {
    if (currentIndex.value < mediaList.value.length - 1) {
      currentIndex.value++;
      selectMedia(mediaList.value[currentIndex.value], currentIndex.value);
    }
    return;
  }

  isTransitioning.value = true;

  // 当前是最后一项，需要无缝切换到第一项
  if (currentIndex.value === mediaList.value.length - 1) {
    // 先立即切换到"克隆"位置（无动画）
    isTransitioning.value = false;
    currentIndex.value = -1;

    // 然后在下一帧开启动画，切换到真实的第一项 - 优化动画帧调用
    requestAnimationFrame(() => {
      isTransitioning.value = true;
      // 使用 setTimeout 替代嵌套的 requestAnimationFrame
      setTimeout(() => {
        currentIndex.value = 0;
        selectMedia(mediaList.value[0], 0, false);
      }, 16); // 约1帧的时间
    });
  } else {
    // 普通情况，直接切换到下一项
    currentIndex.value++;
    selectMedia(mediaList.value[currentIndex.value], currentIndex.value);
  }
};

// 修改选择媒体函数，添加转场效果，增加参数控制是否定位
const selectMedia = (media: any, index: number, shouldLocate = true) => {
  if (!media) return;

  currentMedia.value = media;
  currentIndex.value = index;
  loading.value = true;
  loadError.value = false;
  imageSize.value = "";

  // 定位到地图上的媒体
  if (
    shouldLocate &&
    media.locationInfo &&
    media.locationInfo.latitude &&
    media.locationInfo.longitude
  ) {
    locateToMedia(media);
  }

  // 发送事件通知 MediaPanel 更新选中状态
  emitter.emit("updateSelectedMedia", media.id);

  // 100ms后重置转场状态，防止连续点击时出现动画问题
  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
};

// 监听媒体点击事件
onMounted(() => {
  // 主要事件监听
  emitter.on("openMediaDetail", (media) => {
    currentMedia.value = media;
    isVisible.value = true;
    loading.value = true;
    loadError.value = false;
    imageSize.value = "";

    // 通过事件总线获取当前媒体列表
    emitter.emit("requestMediaList");
  });

  // 接收媒体列表数据
  emitter.on("receiveMediaList", (list) => {
    if (Array.isArray(list) && list.length > 0) {
      mediaList.value = list;

      // 找到当前媒体在新列表中的索引；如果不在新页，则默认切到第一张
      const currentMediaId = currentMedia.value?.id;
      const index = currentMediaId
        ? list.findIndex((item) => item.id === currentMediaId)
        : -1;

      const targetIndex = index !== -1 ? index : 0;
      const targetMedia = list[targetIndex];

      if (targetMedia) {
        currentIndex.value = targetIndex;
        currentMedia.value = targetMedia;
        emitter.emit("updateSelectedMedia", targetMedia.id);
      }

      // 延迟一帧应用转场效果，确保DOM已更新 - 优化动画帧调用
      nextTick(() => {
        // 先禁用转场效果，确保初始位置正确
        isTransitioning.value = false;

        // 使用单个 requestAnimationFrame 替代嵌套调用
        requestAnimationFrame(() => {
          // 小延迟确保DOM已正确定位，然后启用转场效果
          setTimeout(() => {
            isTransitioning.value = true;
          }, 16); // 约1帧的时间（16ms）
        });
      });
    }
  });

  emitter.on("updateMediaBreadcrumbPrefix", (name) => {
    breadcrumbPrefixName.value = String(name || "").trim();
  });

  // 备用事件监听 - 通过window全局事件
  window.addEventListener("openMediaDetail", customEventListener);

  // 监听全屏变化
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  document.addEventListener("mozfullscreenchange", onFullscreenChange);
  document.addEventListener("MSFullscreenChange", onFullscreenChange);

  // 添加窗口大小变化监听
  window.addEventListener("resize", onWindowResize);
});

onUnmounted(() => {
  // 移除自定义事件监听器，使用之前保存的引用
  window.removeEventListener("openMediaDetail", customEventListener);

  // 移除mitt事件监听器
  if (emitter && typeof emitter.off === "function") {
    emitter.off("openMediaDetail");
    emitter.off("receiveMediaList");
    emitter.off("updateMediaBreadcrumbPrefix");
  }

  // 移除全屏变化监听
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  document.removeEventListener("mozfullscreenchange", onFullscreenChange);
  document.removeEventListener("MSFullscreenChange", onFullscreenChange);

  // 移除窗口大小变化监听
  window.removeEventListener("resize", onWindowResize);
});

// 视频加载完成
const onVideoLoaded = (e: Event) => {
  loading.value = false;
  const video = e.target as HTMLVideoElement;
  if (video.videoWidth && video.videoHeight) {
    imageSize.value = `${video.videoWidth} × ${video.videoHeight}`;
  }
};

const onImageLoaded = (e: Event) => {
  loading.value = false;
  const img = e.target as HTMLImageElement;
  const w = img?.naturalWidth || img?.width;
  const h = img?.naturalHeight || img?.height;
  if (w && h) {
    imageSize.value = `${w} × ${h}`;
  }
};

// 视频加载失败
const onVideoError = () => {
  loading.value = false;
  loadError.value = true;
};

// 格式化坐标
const formatCoordinate = (value: number, type: "lat" | "lng") => {
  if (value === undefined || value === null) return "";

  const absValue = Math.abs(value);
  const degrees = Math.floor(absValue);
  const minutes = Math.floor((absValue - degrees) * 60);
  const seconds = Math.floor(((absValue - degrees) * 60 - minutes) * 60);

  let direction = "";
  if (type === "lat") {
    direction = value >= 0 ? "N" : "S";
  } else {
    direction = value >= 0 ? "E" : "W";
  }

  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

// 全屏状态变更
const onFullscreenChange = () => {
  isFullscreen = !!document.fullscreenElement;

  // 检查全景元素是否处于全屏状态
  const panoramaElement: any = document.getElementById("panorama-container");
  if (panoramaElement) {
    isPanoramaFullscreen.value =
      panoramaElement.fullscreenElement === panoramaElement ||
      panoramaElement.webkitFullscreenElement === panoramaElement ||
      panoramaElement.mozFullScreenElement === panoramaElement ||
      panoramaElement.msFullscreenElement === panoramaElement;
  }
};

// 关闭面板
const closePanel = () => {
  // 关闭弹窗时清除当前贴图
  clearCurrentChartlets();
  // 如果是全屏状态，先退出全屏
  if (isFullscreen && document.exitFullscreen) {
    document.exitFullscreen();
  }

  // 重置全景状态
  showPanorama.value = false;
  isPanoramaFullscreen.value = false;
  const panoramaElement = document.getElementById("panorama");
  if (panoramaElement) {
    panoramaElement.innerHTML = "";
  }

  isVisible.value = false;
};

// 暴露组件方法
defineExpose({
  openPanel: (media: any) => {
    currentMedia.value = media;
    isVisible.value = true;
    loading.value = true;
    loadError.value = false;

    // 请求媒体列表
    emitter.emit("requestMediaList");
  },
  closePanel,
});

// 监听当前媒体变化，切换文件时回到原始显示模式
watch(
  () => currentMedia.value,
  (newMedia, oldMedia) => {
    if (newMedia && oldMedia && newMedia.id !== oldMedia.id) {
      // 文件切换时，重置全景状态
      hidePanoramaView();
    }
  },
);

// 监听全景全屏状态变化，确保状态同步
watch(isPanoramaFullscreen, (newValue) => {
  if (!newValue && showPanorama.value) {
    // 退出全屏时，确保全景视图仍然可见
    nextTick(() => {
      const panoramaElement = document.getElementById("panorama");
      if (panoramaElement && panoramaElement.innerHTML === "") {
        // 如果全景容器被清空，重新初始化
        handleShowPano();
      }
    });
  }
});

// 窗口大小变化处理函数
const onWindowResize = () => {
  // 窗口大小变化时，重新计算轮播图位置（不需要动画）
  isTransitioning.value = false;
  nextTick(() => {
    // 在下一帧恢复动画
    requestAnimationFrame(() => {
      isTransitioning.value = true;
    });
  });
};
const activeImage = ref<any>(null);
const annotationVisible = ref(false);
// 成果库列表点击时赋值
const onResultClick = (item: any) => {
  if (!item?.filePath) return;

  activeImage.value = {
    ...item,
    name: item.fileName || item.name || "未命名图片",
    url: item.filePath,
    fileType: item.fileType,
  };
  annotationVisible.value = true;
};

const downloadLoading = ref(false);
const breadcrumbPrefixName = ref("");
const annotationPreviewVisible = ref(false);
const annotationPreviewMedia = ref<any>(null);

const viewAnnotations = async (item: any) => {
  if (!item) return;
  annotationPreviewMedia.value = {
    ...item,
    name: item.fileName || item.name || "未命名图片",
  };
  annotationPreviewVisible.value = true;
};
// 下载标注信息文件
const handleDownloadAnnotation = async (item: any) => {
  if (!item) return;
  if (downloadLoading.value) return;
  const fileId = item.fileId || item.id;
  if (!fileId) return;

  downloadLoading.value = true;
  try {
    const res: any = await $downloadInspectionAnnotation(
      { imageId: fileId },
      { responseType: "blob" },
    );

    if (!res || !(res instanceof Blob) || res.size === 0) {
      ElMessage.warning("暂无可下载内容");
      return;
    }

    const mimeExtMap: Record<string, string> = {
      "image/png": ".png",
      "image/jpeg": ".jpeg",
      "image/jpg": ".jpg",
      "application/zip": ".zip",
      "application/x-zip-compressed": ".zip",
      "application/pdf": ".pdf",
    };

    const baseName = String(item.fileName || item.name || "annotation")
      .trim()
      .replace(/\.[^.]+$/, "");

    const prefixName = String(breadcrumbPrefixName.value || "")
      .trim()
      .replace(/\.[^.]+$/, "");

    const combinedBaseName =
      prefixName && baseName && !baseName.startsWith(`${prefixName}_`)
        ? `${prefixName}_${baseName}`
        : baseName || prefixName || "annotation";

    const fallbackExtFromName = (() => {
      const rawName = String(item.fileName || item.name || "").trim();
      const m = rawName.match(/(\.[^.]+)$/);
      return m?.[1] || "";
    })();

    const ext = mimeExtMap[res.type] || fallbackExtFromName;
    const filename = `${combinedBaseName}${ext}`;

    // 下载文件
    const url = URL.createObjectURL(res);
    // 创建下载链接
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // 触发点击事件
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 释放 URL 对象
    URL.revokeObjectURL(url);
  } catch (e) {
    ElMessage.error("下载失败");
  } finally {
    downloadLoading.value = false;
  }
};
</script>

<style scoped lang="less">
.media-viewer {
  position: fixed;
  right: 10px;
  top: 90px;
  width: 600px;
  height: calc(100vh - 160px);
  background-color: rgba(23, 44, 44, 0.9);
  color: white;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.file-title {
  font-size: 16px;
  font-weight: 500;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 530px;
}

.close-btn {
  cursor: pointer;
  font-size: 18px;
  color: #ccc;
  transition: color 0.3s;
}

.close-btn:hover {
  color: white;
}

.meta-info {
  padding: 8px 16px;
  font-size: 12px;
  color: #aaa;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;

  .btnGroup {
    display: flex;
    .el-button {
      margin-left: 6px;
    }
    .downloadBtn {
      background: #2d8cf0 !important;
      color: white !important;
      padding: 8px !important;
      :deep(.el-icon) {
        font-size: 18px;
      }
    }
  }
}

.content-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.media-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.video-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.panorama-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.unsupported-media {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
}

.unsupported-media .el-icon {
  font-size: 48px;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}

.error-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #aaa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.error-indicator .el-icon {
  font-size: 32px;
}

.toolbar {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.carousel-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  height: 72px;
}

.thumbnails-wrapper {
  width: 450px;
  overflow: hidden;
  position: relative;
}

.thumbnails-track {
  display: flex;
  position: relative;
  /* 创建一个包含所有项目的轨道，包括克隆项 */
  /* 转场效果在JS中动态控制，避免初始加载时的动画 */
}

.thumbnail-item {
  width: 80px;
  height: 60px;
  flex-shrink: 0;
  margin: 0 3px;
  border: 2px solid transparent;
  opacity: 0.7;
  transition: all 0.2s ease;
  cursor: pointer;
}

/* 为克隆项目添加特殊样式 */
.thumbnail-item.clone-item {
  position: relative; /* 确保克隆项在适当位置 */
}

.thumbnail-item:hover {
  opacity: 0.9;
}

.thumbnail-item.active {
  border-color: #4dabf7;
  opacity: 1;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}

.carousel-arrow {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(30, 30, 30, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
}

.carousel-arrow:hover {
  background: rgba(50, 50, 50, 0.9);
}

/* 全屏样式 */
.content-area:fullscreen {
  background-color: black;
  padding: 20px;
}

.content-area:fullscreen .media-image,
.content-area:fullscreen .media-video {
  max-width: calc(100% - 40px);
  max-height: calc(100% - 40px);
}

/* 移除不再使用的工具按钮样式 */
.tool-button {
  display: none;
}

.panorama-controls {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  flex-shrink: 0; /* 防止被压缩 */
}

.photo-display-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-wrapper {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许内容收缩 */
}

/* 全景显示容器 */
.panorama-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.panorama-viewer {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  position: relative;
}

/* 全景全屏按钮 */
.panorama-fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: white;
  transition: all 0.3s ease;
}

.panorama-fullscreen-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

/* 全屏时的全景样式 */
.panorama-viewer:fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  background: #000;
}

.panorama-viewer:-webkit-full-screen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  background: #000;
}

.panorama-viewer:-moz-full-screen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  background: #000;
}

.panorama-viewer:-ms-fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  background: #000;
}
</style>

<style>
/* Elevate the z-index of the Element Plus image viewer to ensure it appears above all other UI elements. */
.el-image-viewer__wrapper {
  z-index: 1000000 !important;
}
</style>
