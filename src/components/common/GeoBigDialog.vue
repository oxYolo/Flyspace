<template>
  <div class="app-container" :style="{ width: containerWidth }">
    <el-button
      v-if="showBackButton"
      :icon="Back"
      style="margin: 10px 0 0 10px"
      @click="$emit('close')">
      返回
    </el-button>
    <div class="layout-main-info">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { Back } from "@element-plus/icons-vue";

const props = defineProps({
  showBackButton: {
    type: Boolean,
    default: true,
  },
  // 容器宽度，默认占满视口；需要让出右侧空间时由父组件传入（如 calc(100vw - Xvw)）
  width: {
    type: String,
    default: "",
  },
});

// 未传 width 时回退到 CSS 默认值 100vw，传值则用动态 style 覆盖
const containerWidth = computed(() => props.width || "");

defineEmits(["close"]);
</script>

<style lang="less" scoped>
.app-container {
  position: fixed;
  top: 60px; /* 系统头部高度 */
  left: 0;
  width: 100vw; /* 占满整个页面宽度（默认值，可被父组件传入的 width 覆盖） */
  height: calc(100vh - 60px); /* 减去系统头部高度，确保占满下方空间 */
  background: rgba(88, 180, 230, 0.1);
  z-index: 999;
  .el-button {
    background-color: rgba(33, 150, 243, 0.1);
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  .layout-main-info {
    width: 100%;
    height: calc(100% - 40px);
    padding: 10px;
    display: flex;
    flex-direction: column;
    color: #fff;
    position: relative;
  }
}
</style>
