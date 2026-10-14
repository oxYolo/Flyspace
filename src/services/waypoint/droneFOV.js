import { ref } from "vue";
import { ElMessage } from "element-plus";
import { getMapManager } from "../mapService";

const FOV_DATA_SOURCE = "drone_fov";
const currentDroneFOV = ref(null);
const currentWaypointFOVContext = ref(null);

function getMapManagerInstance() {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }
  return mapManager;
}

function ensureFOVDataSource() {
  return FOV_DATA_SOURCE;
}

function createFOVId() {
  return `drone_fov_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

function getActionValue(waypoint, label, fallback = 0) {
  return (
    waypoint?.defaultAction?.find((action) => action.label === label)?.value ??
    fallback
  );
}

function setActionValue(waypoint, label, value) {
  const action = waypoint?.defaultAction?.find((item) => item.label === label);
  if (!action) return false;
  action.value = value;
  return true;
}

function buildFOVOrientationFromWaypoint(waypoint) {
  const heading = Number(getActionValue(waypoint, "aircraftHeading", 0));
  const yaw = Number(getActionValue(waypoint, "gimbalYawRotateAngle", 0));
  const pitch = Number(getActionValue(waypoint, "gimbalPitchRotateAngle", 0));
  const zoomLevel = Number(getActionValue(waypoint, "zoom", 0)) / 24 || 2;

  return {
    orientation: {
      heading: heading + yaw,
      pitch,
      roll: 0,
    },
    zoomLevel,
  };
}

export function createDroneFOV(options) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return null;

  try {
    clearAllDroneFOVs();

    const fovId = createFOVId();
    const fovOptions = {
      height: options.height || 500,
      orientation: {
        heading: 0,
        pitch: 0,
        roll: 0,
      },
      style: {
        material: "rgba(0, 255, 0, 0.3)",
        outlineColor: "rgba(0, 255, 0, 0.9)",
        outline: true,
      },
      ...options,
      properties: {
        fovId,
        type: "drone_fov",
        ...options.properties,
      },
    };

    const entity = mapManager.addDroneFOV(ensureFOVDataSource(), fovOptions);
    if (!entity) return null;

    currentDroneFOV.value = {
      id: fovId,
      options: fovOptions,
      entity,
      createdAt: new Date(),
    };
    return fovId;
  } catch (error) {
    console.error("创建视锥体失败:", error);
    return null;
  }
}

export function modifyDroneFOV(fovId, updates) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return false;

  const fov = currentDroneFOV.value;
  if (!fov || fov.id !== fovId) return false;

  try {
    const nextOptions = {
      ...fov.options,
      ...updates,
      orientation: {
        heading:
          updates.orientation?.heading ?? fov.options.orientation?.heading ?? 0,
        pitch:
          updates.orientation?.pitch ?? fov.options.orientation?.pitch ?? 0,
        roll: updates.orientation?.roll ?? fov.options.orientation?.roll ?? 0,
      },
      style: {
        ...fov.options.style,
        ...updates.style,
      },
      properties: {
        ...fov.options.properties,
        ...updates.properties,
      },
    };

    const updated = mapManager.updateDroneFOV(fov.entity, nextOptions);
    if (updated) {
      currentDroneFOV.value = {
        ...fov,
        options: nextOptions,
      };
    }
    return updated;
  } catch (error) {
    console.error("视锥体更新失败:", error);
    ElMessage.error("视锥体更新失败");
    return false;
  }
}

export function deleteDroneFOV(fovId) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return false;

  const fov = currentDroneFOV.value;
  if (!fov || fov.id !== fovId) return false;

  try {
    const removed = mapManager.removeDroneFOV(
      ensureFOVDataSource(),
      fov.entity,
    );
    if (removed) currentDroneFOV.value = null;
    return removed;
  } catch (error) {
    console.error("删除视锥体失败:", error);
    return false;
  }
}

export function clearAllDroneFOVs() {
  if (currentDroneFOV.value) {
    deleteDroneFOV(currentDroneFOV.value.id);
  }
}

export function createFOVAtWaypoint(waypoint, waypointIndex) {
  clearAllDroneFOVs();

  const height = Math.max(waypoint.height || 100, waypoint.height || 300);
  const fovState = buildFOVOrientationFromWaypoint(waypoint);

  return createDroneFOV({
    position: [waypoint.longitude, waypoint.latitude, height],
    zoomLevel: fovState.zoomLevel,
    height: 400,
    orientation: fovState.orientation,
    style: {
      material: "rgba(0, 255, 0, 0.3)",
      outlineColor: "rgba(0, 255, 0, 0.9)",
      outline: true,
    },
    properties: {
      waypointIndex,
      waypointName: `航点 ${waypointIndex + 1}`,
      createdBy: "waypoint-panel",
    },
  });
}

export function setCurrentWaypointFOVContext(waypoint, waypointIndex) {
  if (!waypoint) return false;

  currentWaypointFOVContext.value = {
    waypoint,
    waypointIndex,
  };
  return Boolean(createFOVAtWaypoint(waypoint, waypointIndex));
}

export function updateCurrentWaypointFOVAction(label, value) {
  const context = currentWaypointFOVContext.value;
  if (!context?.waypoint) return false;

  setActionValue(context.waypoint, label, value);
  if (!currentDroneFOV.value) {
    createFOVAtWaypoint(context.waypoint, context.waypointIndex);
  }

  const updated = modifyCurrentDroneFOV(
    buildFOVOrientationFromWaypoint(context.waypoint),
  );
  if (!updated) {
    createFOVAtWaypoint(context.waypoint, context.waypointIndex);
    return modifyCurrentDroneFOV(
      buildFOVOrientationFromWaypoint(context.waypoint),
    );
  }
  return true;
}

export function getDroneFOVs() {
  return currentDroneFOV.value ? [currentDroneFOV.value] : [];
}

export function getDroneFOVById(fovId) {
  const fov = currentDroneFOV.value;
  return fov?.id === fovId ? fov : null;
}

export function setDroneFOVVisibility(fovId, visible) {
  const fov = currentDroneFOV.value;
  if (!fov || fov.id !== fovId || !fov.entity) return false;

  try {
    if (fov.entity.show !== undefined) {
      fov.entity.show = visible;
      return true;
    }
  } catch (error) {
    console.error("设置视锥体可见性失败:", error);
  }
  return false;
}

export function getCurrentDroneFOV() {
  return currentDroneFOV.value;
}

export function getCurrentDroneFOVId() {
  return currentDroneFOV.value?.id || null;
}

export function modifyCurrentDroneFOV(updates) {
  const fovId = getCurrentDroneFOVId();
  if (!fovId) {
    console.warn("没有找到当前活跃的视锥体");
    return false;
  }
  return modifyDroneFOV(fovId, updates);
}

export function hasActiveDroneFOV() {
  return currentDroneFOV.value !== null;
}
