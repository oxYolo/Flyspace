<template>
  <div ref="mapContainerRef" class="cesium-map">
    <div class="coordinate-display">
      <span class="coordinate-text">
        {{ mousePosition.longitude }} {{ mousePosition.latitude }}
      </span>
    </div>

    <!-- 测量工具按钮 -->
    <div class="measure-tool">
      <el-dropdown placement="top-start" popper-class="measure-dropdown-popper">
        <el-button class="measure-toggle-btn" :icon="Aim" size="mini" />
        <template #dropdown>
          <el-dropdown-menu class="measure-dropdown-menu">
            <el-dropdown-item @click="startMeasure('distance')">
              <img
                width="24"
                height="24"
                src="/src/assets/svg/measureDistance.svg"
                title="距离测量"
                alt="距离测量" />
            </el-dropdown-item>
            <el-dropdown-item @click="startMeasure('area')">
              <img
                width="24"
                height="24"
                src="/src/assets/svg/measureArea.svg"
                title="面积测量"
                alt="面积测量" />
            </el-dropdown-item>
            <el-dropdown-item @click="startMeasure('height')">
              <img
                width="24"
                height="24"
                src="/src/assets/svg/measureHeight.svg"
                title="高度测量"
                alt="高度测量" />
            </el-dropdown-item>
            <el-dropdown-item @click="startMeasure('coordinate')">
              <img
                width="24"
                height="24"
                src="/src/assets/svg/coordinatePick.svg"
                title="坐标拾取"
                alt="坐标拾取" />
            </el-dropdown-item>
            <el-dropdown-item @click="clearAllMeasure">
              <img
                width="24"
                height="24"
                src="/src/assets/svg/measureClear.svg"
                title="清除"
                alt="清除" />
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { restoreAirportFocus } from '@/services/airportFocus';
import { ref, onMounted, onUnmounted } from "vue";
// @ts-ignore
import { initMapService } from "@/services/mapService";
import emitter from "@/stores/mitt.ts";
import {
  initMeasureService,
  setMeasureMode,
  clearMeasure,
  type MeasureMode,
} from "@/services/measure.service";
import { Aim } from "@element-plus/icons-vue";
import urlConfig from "@/public-path.ts";
declare const Cesium: any;

const mapContainerRef = ref<HTMLElement | null>(null);
let viewer: any | null = null;

// 鼠标位置响应式数据
const mousePosition = ref({
  longitude: "0.000000°",
  latitude: "0.000000°",
});

// 开始测量
const startMeasure = (mode: MeasureMode) => {
  setMeasureMode(mode);
};

// 清除所有测量
const clearAllMeasure = () => {
  clearMeasure();
};

// 鼠标移动事件处理器
let mouseMoveHandler: any = null;
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

// 在组件挂载后创建原生 Cesium 地图，仅用于展示三维球
onMounted(() => {
  const container = mapContainerRef.value;
  if (!container) return;
  (window as any).CESIUM_BASE_URL =
    (window as any).CESIUM_BASE_URL || "/lib/Cesium/";

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
    imageryProvider: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  });
  viewer.scene.globe.baseColor = Cesium.Color.BLACK;
  initMapService(viewer);
  installSafeModelUpdateForShow();
  (window as any).__cesiumViewer = viewer;

  // 初始定位到配置的中心点，设置45度倾斜角度
  const [lon, lat, h = 50000] = (urlConfig as any).cesiumMapCenter || [
    113.9, 29.7, 50000,
  ];
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, h),
    duration: 1.5,
    orientation: {
      heading: Cesium.Math.toRadians(0), // 水平方向（0度为正北）
      pitch: Cesium.Math.toRadians(-45), // 向下倾斜45度
      roll: 0, // 翻滚角度
    },
  });

  emitter.emit("base-map-load", viewer);
  queueMicrotask(restoreAirportFocus);
  // 可选：更贴地显示
  viewer.scene.globe.depthTestAgainstTerrain = true;
  setupMouseMoveHandler();

  // 初始化测量服务
  initMeasureService(viewer);
});

// 组件卸载时销毁 Viewer
onUnmounted(() => {
  // 清理鼠标移动事件监听器
  if (mouseMoveHandler) {
    mouseMoveHandler();
    mouseMoveHandler = null;
  }

  if (viewer && !viewer.isDestroyed?.()) {
    try {
      // 清理场景中的所有资源
      if (viewer.scene) {
        // 清理地球相关属性
        if (viewer.scene.globe) {
          viewer.scene.globe.clippingPlanes = undefined;
          viewer.scene.globe.show = false;
        }

        // 清理所有图元
        if (viewer.scene.primitives) {
          viewer.scene.primitives.removeAll();
        }

        // 清理数据源
        if (viewer.dataSources) {
          viewer.dataSources.removeAll();
        }

        // 清理实体
        if (viewer.entities) {
          viewer.entities.removeAll();
        }
      }

      // 销毁viewer
      viewer.destroy();
    } catch (error) {
      console.warn("Cesium viewer destroy error:", error);
    }
  }
  viewer = null;
});

// 设置鼠标移动监听器
function setupMouseMoveHandler() {
  if (!viewer) return;

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((event: any) => {
    try {
      // 获取鼠标位置对应的地理坐标
      const cartesian = viewer.camera.pickEllipsoid(
        event.endPosition,
        viewer.scene.globe.ellipsoid,
      );

      if (cartesian) {
        // 转换为地理坐标
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        // 更新响应式数据
        mousePosition.value = {
          longitude: longitude.toFixed(6) + "°",
          latitude: latitude.toFixed(6) + "°",
        };
      } else {
        // 鼠标不在地球表面时显示默认值
        mousePosition.value = {
          longitude: "0.000000°",
          latitude: "0.000000°",
        };
      }
    } catch (error) {
      console.warn("获取鼠标位置失败:", error);
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 保存清理函数
  mouseMoveHandler = () => {
    if (handler && !handler.isDestroyed()) {
      handler.destroy();
    }
  };
}
</script>

<style scoped>
.cesium-map {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.coordinate-display {
  position: fixed;
  bottom: 10px;
  left: 12px;
  z-index: 99999;
  color: #fff;
}

/* 测量工具 */
.measure-tool {
  position: fixed;
  bottom: 5px;
  right: 30px;
  z-index: 99999;
}

.measure-toggle-btn {
  width: 30px;
  height: 30px;
  border: 2px solid #5ec3d8;
  border-radius: 4px;
  background: transparent;
  color: #5ec3d8 !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
  transition: all 0.3s ease;
  background: transparent !important;
  padding: 0 !important;
  outline: none !important;
}

.measure-toggle-btn:hover {
  background: rgba(94, 195, 216, 0.1);
  transform: scale(1.05);
}
</style>

<!-- 全局样式用于下拉面板（因为下拉面板被挂载到body） -->
<style>
.measure-dropdown-popper {
  /* min-width: 140px !important; */
  background: rgba(33, 92, 105, 0.8) !important;
  border: 1px solid #5ec3d8 !important;
  z-index: 99999 !important;
}

.measure-dropdown-popper .el-dropdown-menu {
  background: transparent !important;
  border: none !important;
}

.measure-dropdown-popper .el-dropdown-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  color: #fff !important;
}

.measure-dropdown-popper .el-dropdown-menu__item:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

/* 隐藏下拉面板箭头 */
.measure-dropdown-popper .el-popper__arrow {
  display: none !important;
}
</style>
