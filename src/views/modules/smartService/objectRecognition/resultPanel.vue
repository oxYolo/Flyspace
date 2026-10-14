<template>
  <div class="result-viewer" :style="videoStyle" @click="handleChangeSize">
    <div class="close-btn" @click.stop="closePanel">
      <el-icon><Close /></el-icon>
    </div>

    <div
      class="video-container">
      <video
        :src="!resultInfo?.isModelStream ? resultInfo?.url : undefined"
        controls
        autoplay
        muted
        playsinline
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

  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineEmits, onBeforeUnmount, nextTick} from "vue";
import {
  Close,
  VideoCamera,
} from "@element-plus/icons-vue";
import { useSmartServiceStore } from "@/views/modules/smartService/commonStore.ts";
const smartServiceStore = useSmartServiceStore();

const emits = defineEmits(['closePanel']);

// 媒体状态
const loading = ref(false);
const loadError = ref(false);

const videoRef = ref<HTMLVideoElement | null>(null);

const resultInfo = ref({})
let unsubscribeStream: (() => void) | null = null;

watch(() => smartServiceStore.resultInfo, async (newVal) => {
  loadError.value = false;

  // 清理之前的 WebRTC 监听
  if (unsubscribeStream) {
    unsubscribeStream();
    unsubscribeStream = null;
  }

  if (newVal?.url) {
    resultInfo.value = newVal

    // 如果是模型推理流，设置 WebRTC 流
    if (newVal.isModelStream && newVal.webrtcService) {
      // 确保DOM已经渲染
      await nextTick();
      
      if (!videoRef.value) {
        console.error('视频元素未就绪');
        loadError.value = true;
        return;
      }

      unsubscribeStream = newVal.webrtcService.onStream((e: RTCTrackEvent) => {
        console.log('收到WebRTC流事件:', e);
        if (e.streams && e.streams.length > 0 && videoRef.value) {
          console.log('设置视频流:', e.streams[0]);
          videoRef.value.srcObject = e.streams[0];
          videoRef.value.play().catch((err: Error) => {
            console.error('模型视频播放失败:', err);
            loadError.value = true;
          });
        } else {
          console.warn('WebRTC流事件无有效流数据');
        }
      });
      
      console.log('已注册WebRTC流监听器');
    }
  }
},{
  immediate: true,
})

// 视频加载完成
const onVideoLoaded = (e: Event) => {
  loading.value = false;
  loadError.value = false;
};

// 视频加载失败
const onVideoError = () => {
  loading.value = false;
  loadError.value = true;
};

// 关闭面板
const closePanel = () => {
  // 清理 WebRTC 监听
  if (unsubscribeStream) {
    unsubscribeStream();
    unsubscribeStream = null;
  }
  emits('closePanel');
};

const videoStyle = ref({
  right: '10px',
  bottom: '20px',
  width: '400px',
  height: '300px'
})
watch(() => smartServiceStore.mapSize, (newVal) => {
  if (newVal === 'large') {
    videoStyle.value = {
      right: '10px',
      bottom: '20px',
      width: '400px',
      height: '300px'
    }
  } else {
    videoStyle.value = {
      left: '0px',
      top: '50px',
      width: '100vw',
      height: 'calc(100vh - 40px)'
    }
  }
})
const handleChangeSize = () => {
  if (smartServiceStore.mapSize === 'small') {
    return
  } else {
    smartServiceStore.changeMapSize('small')
  }
}

// 组件卸载前清理资源
onBeforeUnmount(() => {
  // 清理 WebRTC 监听
  if (unsubscribeStream) {
    unsubscribeStream();
    unsubscribeStream = null;
  }
  // 清理视频源
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
});
</script>

<style scoped>
.result-viewer {
  position: fixed;
  color: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  z-index: 100;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 9;
  cursor: pointer;
  font-size: 18px;
  color: #ccc;
  transition: color 0.3s;
}

.close-btn:hover {
  color: white;
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
</style>
