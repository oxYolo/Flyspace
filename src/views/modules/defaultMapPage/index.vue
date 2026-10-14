<script lang="ts" setup>
import { defineAsyncComponent } from "vue";
const CesiumMap = defineAsyncComponent(() => import('@/components/common/3d/cesiumMap.vue'))

</script>
<template>
  <div class="default-page-container">
    <CesiumMap />
    <div class="page-content">
      <router-view />
    </div>
  </div>
</template>
<style scoped lang="less">
.default-page-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.page-content {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none; /* 允许点击穿透到地图 */
}

.page-content > * {
  pointer-events: auto; /* 恢复子元素的点击事件 */
}
</style>
