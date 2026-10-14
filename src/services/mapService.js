import { CesiumMapManager } from "@/map-system";

let mapManager = null;

export function initMapService(viewer) {
  mapManager = new CesiumMapManager(viewer);
  return mapManager;
}

export function getMapManager() {
  return mapManager;
}

export function getViewer() {
  return mapManager?.getViewer?.() || null;
}

export function createDataSource(name) {
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }

  return (
    mapManager.getOrCreateDataSource?.(name) ||
    mapManager.createDataSource?.(name) ||
    null
  );
}

export function zoomToTarget(viewer, target, options = {}) {
  if (!viewer) return;

  const zoomOptions = {
    duration: 1,
    heading: 0,
    pitch: -Math.PI / 2,
    roll: 0,
    maximumHeight: 50000,
    ...options,
  };

  setTimeout(() => {
    try {
      if (mapManager?.zoomToTarget?.(target, zoomOptions)) return;

      const dataSource = findDataSource(viewer, target);
      if (!dataSource) {
        console.warn("目标数据源不存在");
        return;
      }

      viewer.flyTo(dataSource, {
        duration: zoomOptions.duration,
        maximumHeight: zoomOptions.maximumHeight,
        complete: () => applyCameraOrientation(viewer, zoomOptions),
      });
    } catch (error) {
      console.warn("缩放到目标失败:", error);
    }
  }, 100);
}

function findDataSource(viewer, target) {
  const names = Array.isArray(target) ? target : [target];

  for (const name of names) {
    const dataSource = viewer.dataSources?.getByName?.(name)?.[0];
    if (dataSource) return dataSource;
  }

  return null;
}

function applyCameraOrientation(viewer, options) {
  const cesium = globalThis.Cesium;
  if (!cesium || !viewer?.camera?.setView) return;

  try {
    viewer.camera.setView({
      orientation: {
        heading: cesium.Math.toRadians(options.heading),
        pitch: options.pitch,
        roll: cesium.Math.toRadians(options.roll),
      },
    });
  } catch (error) {
    console.warn("设置相机朝向失败:", error);
  }
}
