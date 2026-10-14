import { ref } from "vue";
import { ElMessage } from "element-plus";
import { getMapManager } from "../mapService";
import arrowImage from "@/assets/images/drone/arrow.png";

const WAYPOINT_ARROW_DATA_SOURCE = "waypoint_arrows";
const currentWaypointArrow = ref(null);

function getMapManagerInstance() {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }
  return mapManager;
}

function createArrowId() {
  return `waypoint_arrow_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

function getActionValue(waypoint, label, fallback = 0) {
  return (
    waypoint?.defaultAction?.find((action) => action.label === label)?.value ??
    fallback
  );
}

export function createArrowAtWaypoint(waypoint, waypointIndex) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return null;

  try {
    if (currentWaypointArrow.value) {
      deleteWaypointArrow(currentWaypointArrow.value.id);
    }

    const arrowId = createArrowId();
    const heading = Number(getActionValue(waypoint, "aircraftHeading", 0));
    const height = waypoint.height || waypoint.altitude || 100;
    const options = {
      position: [waypoint.longitude, waypoint.latitude, height],
      image: arrowImage,
      rotation: (heading * Math.PI) / 180,
      billboardStyle: {
        scale: 0.2,
      },
      properties: {
        arrowId,
        waypointIndex,
        waypointName: `航点 ${waypointIndex + 1}`,
        type: "waypoint_arrow",
        createdBy: "waypoint-panel",
      },
    };

    const entity = mapManager.addBillboard(WAYPOINT_ARROW_DATA_SOURCE, options);
    if (!entity) return null;

    currentWaypointArrow.value = {
      id: arrowId,
      options,
      entity,
      waypointIndex,
      createdAt: new Date(),
    };
    return arrowId;
  } catch (error) {
    console.error("创建航点箭头失败:", error);
    return null;
  }
}

export function modifyWaypointArrow(updates) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return false;

  const arrow = currentWaypointArrow.value;
  if (!arrow) return false;

  try {
    const nextOptions = {
      ...arrow.options,
      ...updates,
      billboardStyle: {
        ...arrow.options.billboardStyle,
        ...updates.billboardStyle,
      },
      properties: {
        ...arrow.options.properties,
        ...updates.properties,
      },
    };

    const updated = mapManager.updateBillboard(arrow.entity, nextOptions);
    if (updated) {
      arrow.options = nextOptions;
    }
    return updated;
  } catch (error) {
    console.error("航点箭头更新失败:", error);
    ElMessage.error("航点箭头更新失败");
    return false;
  }
}

export function deleteWaypointArrow() {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return false;

  const arrow = currentWaypointArrow.value;
  if (!arrow) return false;

  try {
    const removed = mapManager.removeBillboard(
      WAYPOINT_ARROW_DATA_SOURCE,
      arrow.entity,
    );
    if (removed) {
      currentWaypointArrow.value = null;
    } else {
      ElMessage.error("航点箭头移除失败");
    }
    return removed;
  } catch (error) {
    console.error("删除航点箭头失败:", error);
    ElMessage.error("航点箭头移除失败");
    return false;
  }
}

export function clearAllWaypointArrows() {
  if (currentWaypointArrow.value) {
    deleteWaypointArrow(currentWaypointArrow.value.id);
  }
}

export function getWaypointArrows() {
  return currentWaypointArrow.value ? [currentWaypointArrow.value] : [];
}

export function getWaypointArrowById(arrowId) {
  const arrow = currentWaypointArrow.value;
  return arrow?.id === arrowId ? arrow : null;
}

export function getWaypointArrowByIndex(waypointIndex) {
  const arrow = currentWaypointArrow.value;
  return arrow?.waypointIndex === waypointIndex ? arrow : null;
}

export function setWaypointArrowVisibility(arrowId, visible) {
  const arrow = currentWaypointArrow.value;
  if (!arrow || arrow.id !== arrowId || !arrow.entity) return false;

  try {
    if (arrow.entity.show !== undefined) {
      arrow.entity.show = visible;
      return true;
    }
  } catch (error) {
    console.error("设置航点箭头可见性失败:", error);
  }
  return false;
}
