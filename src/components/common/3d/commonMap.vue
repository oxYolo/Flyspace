<template>
  <div ref="mapContainerRef" class="mapWrap"></div>

</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import urlConfig from "@/public-path";

// Cesium 全局（由外部脚本注入）
declare const Cesium: any;

const emit = defineEmits(["mapLoad"]);
const mapContainerRef = ref<HTMLElement | null>(null);
let viewer: any | null = null;
// 安全更新模型显示，避免异常
const installSafeModelUpdateForShow = () => {
  try {
    const Model = Cesium?.Model;
    const proto = Model?.prototype;
    if (!proto) return;
    if (proto.__safeUpdateForShowInstalled) return;
    const wrap = (methodName: string) => {
      const original = proto[methodName];
      if (typeof original !== "function") return;
      proto[methodName] = function (...args: any[]) {
        try {
          return original.apply(this, args);
        } catch (e: any) {
          const msg = e?.message ? String(e.message) : String(e);
          if (msg.includes("getEvent")) return;
          throw e;
        }
      };
    };
    wrap("_updateForShow");
    wrap("_updateForDestroy");
    proto.__safeUpdateForShowInstalled = true;
  } catch {}
};

onMounted(() => {
  const container = mapContainerRef.value;
  if (!container) return;
  (window as any).CESIUM_BASE_URL = (window as any).CESIUM_BASE_URL || "/lib/Cesium/";

  const imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
    url: `${urlConfig.tdtUrl}/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${urlConfig.getTdtToken()}`,
    layer: "img",
    style: "default",
    format: "tiles",
    tileMatrixSetID: "w",
    subdomains: ["0","1","2","3","4","5","6","7"],
    maximumLevel: 18,
  });

  viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    fullscreenButton: false,
    vrButton: false,
    selectionIndicator: false,
    imageryProvider,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });
  // 贴地
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.baseColor = Cesium.Color.BLACK;
  installSafeModelUpdateForShow();
  // 初始定位
  try {
    const [lon, lat, h = 50000] = (urlConfig as any).cesiumMapCenter || [113.9, 29.7, 50000];
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, h),
      duration: 1.5,
    });
  } catch {}

  emit("mapLoad", viewer);
});

onBeforeUnmount(() => {
  if (viewer && !viewer.isDestroyed?.()) {
    try {
      viewer.dataSources?.removeAll?.();
      viewer.entities?.removeAll?.();
      viewer.scene?.primitives?.removeAll?.();
      if (viewer.scene?.globe) viewer.scene.globe.show = false;
      viewer.destroy();
    } catch {}
  }
  viewer = null;
});
</script>

<style scoped lang="less">
.mapWrap {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
