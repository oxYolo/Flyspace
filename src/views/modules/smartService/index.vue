<script lang="ts" setup>
import { defineAsyncComponent, computed, ref, watch } from "vue";
import Control from "@/views/modules/smartService/control.vue";
import CommonMap from "@/components/common/3d/commonMap.vue";
import { useSmartServiceStore } from "@/views/modules/smartService/commonStore.ts";
import ResultPanel from "@/views/modules/smartService/objectRecognition/resultPanel.vue";
const Menu = defineAsyncComponent(
  () => import("@/views/modules/smartService/menu.vue"),
);
const smartServiceStore = useSmartServiceStore();

const mapLoad = (viewer: any) => {
  smartServiceStore.setCesiumViewer(viewer);
};

const resultDialogVisible = computed(() => {
  return smartServiceStore.resultInfo?.resultType === "objectRecognitionVedio";
});

const mapStyle = ref({
  position: "fixed",
  left: "0px",
  top: "50px",
  width: "100vw",
  height: "calc(100vh - 40px)",
});
watch(
  () => smartServiceStore.mapSize,
  (newVal) => {
    if (newVal === "large") {
      mapStyle.value = {
        position: "fixed",
        left: "0px",
        top: "50px",
        width: "100vw",
        height: "calc(100vh - 40px)",
      };
    } else {
      mapStyle.value = {
        position: "fixed",
        right: "10px",
        bottom: "20px",
        width: "400px",
        height: "300px",
        zIndex: "101",
      };
    }
  },
);

const handleCloseResult = () => {
  smartServiceStore.setResultInfo(null);
};

const handleChangeMapSize = () => {
  smartServiceStore.changeMapSize("large");
};
</script>
<template>
  <div class="fly-control-contain">
    <!-- <Menu /> -->
    <Control />
    <CommonMap
      :style="mapStyle"
      @map-load="mapLoad"
      @click="handleChangeMapSize" />
    <router-view />
    <ResultPanel v-if="resultDialogVisible" @closePanel="handleCloseResult" />
  </div>
</template>
<style scoped lang="less">
@import "common.less";
.fly-control-contain {
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
