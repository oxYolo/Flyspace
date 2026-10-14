<script setup lang="ts">
import { computed, defineProps } from "vue";
const props = defineProps({
  zoom: {
    type: Number,
    default: 2,
  },
  minWidth: {
    type: Number,
    default: 100
  },
  maxWidth: {
    type: Number,
    default: 400
  },
  minZoom: {
    type: Number,
    default: 2
  },
  maxZoom: {
    type: Number,
    default: 100
  },
  sizeUnit: {
    type: String,
    default: 'px',
  }
})
// 聚焦框样式计算
const focusFrameStyle = computed(() => {
  // 缩放因子越大，聚焦框越小（表示放大）
  const width = (props.zoom - props.minZoom) * (props.maxWidth - props.minWidth) / (props.maxZoom - props.minZoom) + props.minWidth;
  // 保持16:9比例
  const height = Number(width * 9 / 16);

  return {
    width: `${width}${props.sizeUnit}`,
    height: `${height}${props.sizeUnit}`,
  };
});
</script>
<template>
  <div class="focus-frame" :style="focusFrameStyle">
    <div class="corner top-left"></div>
    <div class="corner top-right"></div>
    <div class="corner bottom-left"></div>
    <div class="corner bottom-right"></div>
    <!-- 显示焦距值 -->
    <div v-show="zoom" class="zoom-display">{{ zoom.toFixed(0) }}x</div>
  </div>
</template>
<style scoped lang="less">
.focus-frame {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  // 不设置边框，只有四个角
  border: none;
  // 四个角的共同样式
  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: #37ff00 !important;
  }

  .top-left {
    top: 0;
    left: 0;
    border-top: 2px solid;
    border-left: 2px solid;
  }

  .top-right {
    top: 0;
    right: 0;
    border-top: 2px solid;
    border-right: 2px solid;
  }

  .bottom-left {
    bottom: 0;
    left: 0;
    border-bottom: 2px solid;
    border-left: 2px solid;
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    border-bottom: 2px solid;
    border-right: 2px solid;
  }

  // 焦距显示样式
  .zoom-display {
    position: absolute;
    bottom: -25px;
    right: 0;
    color: #37ff00;
    font-size: 12px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }
}
</style>
