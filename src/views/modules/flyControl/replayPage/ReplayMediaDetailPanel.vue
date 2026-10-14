<template>
  <div class="replay-media-viewer" v-show="isVisible">
    <GeoBorderBox
      title="媒体预览"
      width="100%"
      :close="true"
      @change="closePanel">
      <!-- 关键属性信息 -->
      <div class="meta-info" v-if="currentMedia">
        <div class="meta-title">{{ currentMedia?.fileName || "" }}</div>
        <div class="meta-details">
          <span v-if="currentMedia?.fileMetadata?.createdTime">
            {{ currentMedia.fileMetadata.createdTime }}
          </span>
          <span v-if="imageSize">{{ imageSize }}</span>
          <span v-if="currentMedia?.locationInfo">
            {{ formatCoordinate(currentMedia.locationInfo.latitude, "lat") }}
            {{ formatCoordinate(currentMedia.locationInfo.longitude, "lng") }}
          </span>
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
                  :preview-src-list="[currentMedia?.filePath]"
                  :initial-index="0"
                  fit="contain"
                  class="media-image"
                  ref="imageRef"
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
                id="replay-panorama-container">
                <div id="replay-panorama" class="panorama-viewer"></div>
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
                    :src="
                      mediaList[mediaList.length - i].scalePath ||
                      mediaList[mediaList.length - i].filePath ||
                      getDefaultIconByFileType(
                        mediaList[mediaList.length - i].fileType,
                      )
                    "
                    :alt="mediaList[mediaList.length - i].fileName"
                    class="thumbnail" />
                </div>
              </template>

              <!-- 主要媒体列表 -->
              <div
                v-for="(media, index) in mediaList"
                :key="media.id"
                class="thumbnail-item"
                :class="{
                  active: currentMedia && media.id === currentMedia.id,
                }"
                @click="selectMedia(media, index)">
                <img
                  :src="
                    media.scalePath ||
                    media.filePath ||
                    getDefaultIconByFileType(media.fileType)
                  "
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
                    :src="
                      mediaList[i - 1].scalePath ||
                      mediaList[i - 1].filePath ||
                      getDefaultIconByFileType(mediaList[i - 1].fileType)
                    "
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
    </GeoBorderBox>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from "vue";
import {
  Picture,
  VideoCamera,
  Document,
  ArrowLeft,
  ArrowRight,
  FullScreen,
} from "@element-plus/icons-vue";
// @ts-ignore
import Marzipano from "marzipano";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";

// 定义组件的props
const props = defineProps<{
  mediaList: any[];
}>();

// 定义组件的emits（为 pasteCurrentImageToMap 声明载荷类型）
const emits = defineEmits<{
  (e: "close"): void;
  (e: "pasteCurrentImageToMap", media: any): void;
}>();

// 全景显示相关（不依赖Marzipano）
const handleShowPano = () => {
  const viewer = new Marzipano.Viewer(
    document.getElementById("replay-panorama"),
  );
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
  nextTick(() => {
    handleShowPano();
  });
};

// 隐藏全景视图
const hidePanoramaView = () => {
  showPanorama.value = false;
  isPanoramaFullscreen.value = false;
  const panoramaElement = document.getElementById("replay-panorama");
  if (panoramaElement) {
    panoramaElement.innerHTML = "";
  }
};

// 切换全景全屏
const togglePanoramaFullscreen = () => {
  const panoramaElement: any = document.getElementById(
    "replay-panorama-container",
  );
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
    if ((document as any).exitFullscreen) {
      (document as any).exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }
};

// 全屏状态变更
const onFullscreenChange = () => {
  // 检查全景元素是否处于全屏状态
  const panoramaElement: any = document.getElementById(
    "replay-panorama-container",
  );
  if (panoramaElement) {
    isPanoramaFullscreen.value =
      (document as any).fullscreenElement === panoramaElement ||
      (document as any).webkitFullscreenElement === panoramaElement ||
      (document as any).mozFullScreenElement === panoramaElement ||
      (document as any).msFullscreenElement === panoramaElement;
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
const imageRef = ref<HTMLImageElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);

// 轮播图相关数据
const currentIndex = ref(0);

// 添加轮播图滚动相关ref
const carouselRef = ref<HTMLElement | null>(null);
const isTransitioning = ref(false);

// 添加一个计算属性，确定需要克隆的项目数量
const displayCloneCount = computed(() => {
  if (!carouselRef.value || props.mediaList.length === 0) return 3;

  const itemWidth = 86;
  const visibleCount = Math.ceil(carouselRef.value.clientWidth / itemWidth);
  return Math.max(visibleCount, 3);
});

// 实际需要克隆的项目数量
const actualCloneCount = computed(() => {
  if (props.mediaList.length <= 4) {
    return 0;
  }
  return Math.min(displayCloneCount.value, props.mediaList.length);
});

const carouselStyle = computed(() => {
  const itemWidth = 86;
  const visibleCount = carouselRef.value
    ? Math.floor(carouselRef.value.clientWidth / itemWidth)
    : 5;

  let offset = 0;
  let justifyContent: "center" | undefined = undefined;

  if (props.mediaList.length > 0) {
    if (actualCloneCount.value === 0) {
      const trackWidth = props.mediaList.length * itemWidth;
      const wrapperWidth = carouselRef.value?.clientWidth ?? 0;

      if (trackWidth < wrapperWidth) {
        justifyContent = "center";
      } else {
        let desiredOffset = -currentIndex.value * itemWidth;
        desiredOffset = Math.max(desiredOffset, -(trackWidth - wrapperWidth));
        offset = desiredOffset;
      }
    } else {
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

// 上一个媒体
const prevMedia = () => {
  if (props.mediaList.length <= 1) return;

  if (actualCloneCount.value === 0) {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      selectMedia(props.mediaList[currentIndex.value], currentIndex.value);
    }
    return;
  }

  isTransitioning.value = true;

  if (currentIndex.value === 0) {
    isTransitioning.value = false;
    currentIndex.value = props.mediaList.length;

    requestAnimationFrame(() => {
      isTransitioning.value = true;
      requestAnimationFrame(() => {
        currentIndex.value = props.mediaList.length - 1;
        selectMedia(
          props.mediaList[props.mediaList.length - 1],
          props.mediaList.length - 1,
          false,
        );
      });
    });
  } else {
    currentIndex.value--;
    selectMedia(props.mediaList[currentIndex.value], currentIndex.value);
  }
};

// 下一个媒体
const nextMedia = () => {
  if (props.mediaList.length <= 1) return;

  if (actualCloneCount.value === 0) {
    if (currentIndex.value < props.mediaList.length - 1) {
      currentIndex.value++;
      selectMedia(props.mediaList[currentIndex.value], currentIndex.value);
    }
    return;
  }

  isTransitioning.value = true;

  if (currentIndex.value === props.mediaList.length - 1) {
    isTransitioning.value = false;
    currentIndex.value = -1;

    requestAnimationFrame(() => {
      isTransitioning.value = true;
      // 使用 setTimeout 替代嵌套的 requestAnimationFrame
      setTimeout(() => {
        currentIndex.value = 0;
        selectMedia(props.mediaList[0], 0, false);
      }, 16); // 约1帧的时间
    });
  } else {
    currentIndex.value++;
    selectMedia(props.mediaList[currentIndex.value], currentIndex.value);
  }
};

// 选择媒体函数
const selectMedia = (media: any, index: number, shouldLocate = true) => {
  if (!media) return;

  currentMedia.value = media;
  currentIndex.value = index;
  loading.value = true;
  loadError.value = false;

  // 回放场景下可能不需要地图定位，或者使用不同的定位逻辑
  // if (shouldLocate && media.locationInfo) {
  //   // 可以在这里添加回放场景的地图定位逻辑
  // }

  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);
};

// 视频加载完成
const onVideoLoaded = (e: Event) => {
  loading.value = false;
  const video = e.target as HTMLVideoElement;
  if (video.videoWidth && video.videoHeight) {
    imageSize.value = `${video.videoWidth} × ${video.videoHeight}`;
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

// 关闭面板
const closePanel = () => {
  // 如果是全屏状态，先退出全屏
  if (isPanoramaFullscreen.value && document.exitFullscreen) {
    document.exitFullscreen();
  }

  // 重置全景状态
  showPanorama.value = false;
  isPanoramaFullscreen.value = false;
  const panoramaElement = document.getElementById("replay-panorama");
  if (panoramaElement) {
    panoramaElement.innerHTML = "";
  }

  isVisible.value = false;
  emits("close");
};

// 暴露组件方法
const openPanel = (media: any) => {
  if (!media) {
    return;
  }

  // 设置当前媒体
  currentMedia.value = media;
  isVisible.value = true;
  loading.value = true;
  loadError.value = false;

  // 如果有媒体列表，找到当前媒体在列表中的索引
  if (props.mediaList && props.mediaList.length > 0) {
    const index = props.mediaList.findIndex((item) => item.id === media.id);
    if (index !== -1) {
      currentIndex.value = index;
    } else {
      // 如果在列表中找不到，设置为0
      currentIndex.value = 0;
    }
  } else {
    // 如果没有媒体列表，设置为0
    currentIndex.value = 0;
  }

  // 延迟一帧应用转场效果，确保DOM已更新 - 优化动画帧调用
  nextTick(() => {
    isTransitioning.value = false;
    requestAnimationFrame(() => {
      // 使用 setTimeout 替代嵌套的 requestAnimationFrame
      setTimeout(() => {
        isTransitioning.value = true;
      }, 16); // 约1帧的时间
    });
  });
};

const pasteCurrentImageToMap = async () => {
  emits("pasteCurrentImageToMap", currentMedia.value);
};

// 监听当前媒体变化，切换文件时回到原始显示模式
watch(
  () => currentMedia.value,
  (newMedia, oldMedia) => {
    if (newMedia && oldMedia && newMedia.id !== oldMedia.id) {
      hidePanoramaView();
    }
  },
);

// 窗口大小变化处理函数
const onWindowResize = () => {
  isTransitioning.value = false;
  nextTick(() => {
    requestAnimationFrame(() => {
      isTransitioning.value = true;
    });
  });
};

onMounted(() => {
  window.addEventListener("resize", onWindowResize);

  // 监听全屏变化
  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  document.addEventListener("mozfullscreenchange", onFullscreenChange);
  document.addEventListener("MSFullscreenChange", onFullscreenChange);
});

onUnmounted(() => {
  window.removeEventListener("resize", onWindowResize);

  // 移除全屏变化监听
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  document.removeEventListener("mozfullscreenchange", onFullscreenChange);
  document.removeEventListener("MSFullscreenChange", onFullscreenChange);
});

defineExpose({
  openPanel,
  closePanel,
});
</script>

<style scoped lang="less">
.replay-media-viewer {
  position: fixed;
  right: 20px;
  top: 130px;
  width: 600px;
  height: calc(100vh - 200px);
  z-index: 2000;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  color: #333333;

  :deep(.common-component-content) {
    height: calc(100vh - 220px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.meta-info {
  padding: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #5ec0d2;

  .meta-title {
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    margin-bottom: 8px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .meta-details {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: #666;

    span {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
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
  min-height: 400px;
  background: #245663;
  border-radius: 4px;
  margin: 0 10px 10px 10px;
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
  max-width: 100%;
  max-height: 100%;
}

.panorama-container {
  width: 100%;
  height: 100%;
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
  color: #666;
  padding: 12px 20px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error-indicator .el-icon {
  font-size: 32px;
  color: #ccc;
}

.toolbar {
  border-top: 1px solid #5ec0d2;
  padding: 12px 10px;
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
  border-radius: 4px;
  overflow: hidden;
}

.thumbnail-item.clone-item {
  position: relative;
}

.thumbnail-item:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.thumbnail-item.active {
  border-color: #409eff;
  opacity: 1;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.3);
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}

.carousel-arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  border: 1px solid #ddd;
}

.carousel-arrow:hover {
  background: #409eff;
  color: white;
  border-color: #409eff;
  transform: scale(1.1);
}

.panorama-controls {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(64, 158, 255, 0.1);
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
  min-height: 0;
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

.media-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  height: 200px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #999;
  height: 200px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 2px dashed #ddd;
}
</style>

<style>
/* Elevate the z-index of the Element Plus image viewer to ensure it appears above all other UI elements. */
.el-image-viewer__wrapper {
  z-index: 1000000 !important;
}
</style>
