<script lang="ts" setup>
import { defineAsyncComponent } from "vue";
import AirspaceControl from "@/views/modules/airspace-management/AirspaceControl.vue";
import CommonMap from "@/components/common/3d/commonMap.vue";
import { useAirspaceStore } from "@/views/modules/airspace-management/airspaceStore.ts";
import { initMapService } from "@/services/mapService";

const AirspaceMenu = defineAsyncComponent(
  () => import("@/views/modules/airspace-management/AirspaceMenu.vue"),
);
const airspaceStore = useAirspaceStore();

const mapLoad = (viewer: any) => {
  console.log('[Airspace Container] Map loaded, viewer:', viewer);
  // 初始化全局地图服务，让禁飞区模块可以通过getViewer()获取到viewer
  initMapService(viewer);
  // 同时保存到store中
  airspaceStore.setCesiumViewer(viewer);
};

const handleChangeMapSize = () => {
  airspaceStore.changeMapSize('large')
}
</script>
<template>
  <div class="airspace-container">
    <AirspaceMenu />
    <AirspaceControl />
    <CommonMap
      style="position: fixed; left: 0; top: 50px; width: 100vw; height: calc(100vh - 40px);"
      @map-load="mapLoad"
      @click="handleChangeMapSize"
    />
    <router-view />
  </div>
</template>
<style scoped lang="less">
@import "common.less";
.airspace-container {
  width: 100%;
  height: 100%;
  position: absolute;
  bottom: 0;
  pointer-events: none !important;
  & > * {
    pointer-events: all;
  }
}
</style>


