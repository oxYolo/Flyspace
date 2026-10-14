<template>
  <div
    class="waypoint-list-panel-float"
    v-loading="loading"
    element-loading-text="航点加载中...">
    <div class="panel-header" style="padding-left: 32px;">
      <span class="header-title">航点列表</span>
      <div class="header-actions">
        <el-icon
          class="header-action"
          v-tooltip="'保存'"
          @click="handleSaveFlightPoints">
          <DocumentChecked />
        </el-icon>
        <el-icon
          class="header-action"
          v-tooltip="'航线设置'"
          @click="handleChangeSettingPanel">
          <Setting />
        </el-icon>
        <el-icon class="close-btn" @click="handleClosePanel"><Close /></el-icon>
      </div>
    </div>
    <!-- 航线长度、预计执行时间、 航点、照片 -->
    <div class="waypoint-stats">
      <div
        v-for="item in routeStats"
        :key="item.label"
        class="stat-block"
        v-tooltip="item.label">
        <img class="stat-icon" :src="item.iconSrc" :alt="item.label" />
        <span class="stat-value">{{ item.value }}</span>
      </div>
    </div>
    <div class="waypoint-list">
      <div
        v-for="(wp, idx) in waypoints"
        :key="wp.id"
        class="waypoint-row"
        :class="{ selected: selectedRow === idx }"
        @click="selectRow(idx, wp.longitude, wp.latitude)"
        @contextmenu.prevent="showRowPopover(idx, $event)">
        <span class="triangle triangle-green" v-tooltip="'跟随航线'"></span>
        <span class="wp-index">{{ idx + 1 }}</span>
        <span class="wp-icons">
          <span
            v-for="(icon, iconIdx) in wp.defaultAction"
            :key="iconIdx"
            style="position: relative">
            <img
              :src="icon.image"
              :alt="icon.alt || ''"
              width="25"
              height="25"
              class="wp-icon"
              :class="{
                'icon-selected':
                  selectedRow === idx && wp.selectedIconIdx === iconIdx,
              }"
              v-tooltip="icon.alt || ''"
              @click.stop="selectIcon(idx, iconIdx, icon)"
              @contextmenu.stop.prevent="showPopover(idx, iconIdx, $event)" />
            <div
              v-if="
                popoverIdx &&
                popoverIdx.row === idx &&
                popoverIdx.iconIdx === iconIdx
              "
              class="icon-popover"
              :style="{
                left: '0',
                top: '30px',
                position: 'absolute',
                zIndex: 100,
              }">
              <div class="popover-item" @click="deleteAction(idx, iconIdx)">
                删除动作
              </div>
            </div>
          </span>
        </span>
      </div>
      <!-- 行右键popover -->
      <div
        v-if="rowPopoverIdx !== null"
        class="icon-popover"
        :style="{
          left: rowPopoverPosition.x + 'px',
          top: rowPopoverPosition.y + 'px',
          position: 'fixed',
          zIndex: 2000,
        }">
        <!-- <div class="popover-item" @click="addWaypoint(rowPopoverIdx, 'after')">在当前航点前新增航点</div>
        <div class="popover-item" @click="addWaypoint(rowPopoverIdx, 'before')">在当前航点后新增航点</div> -->
        <div class="popover-item" @click="deleteWaypoint(rowPopoverIdx)">
          删除航点
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Close, DocumentChecked, Setting } from "@element-plus/icons-vue";
import { $getFlightPoint } from "@/api/flyControl/flight";
import emitter from "@/stores/mitt";
import height from "@/assets/images/tool/高度.svg";
import waylineIcon from "@/assets/svg/wayline.svg";
import clockIcon from "@/assets/svg/clock.svg";
import photosIcon from "@/assets/svg/photos.svg";
import waypointIcon from "@/assets/svg/waypoint.svg";
import { createActionList } from "./actionList";
import {
  clearAllDroneFOVs,
  locateToWaypoint,
  createFOVAtWaypoint,
  modifyCurrentDroneFOV,
  hasActiveDroneFOV,
  setCurrentWaypointFOVContext,
  updateCurrentWaypointFOVAction,
  // 航点箭头相关方法
  createArrowAtWaypoint,
  clearAllWaypointArrows,
  modifyWaypointArrow,
  getWaypoints,
  getWaypointRouteSpeed,
  // @ts-ignore 无法找到声明文件，临时忽略类型检查
} from "@/services/waypointService";

// --- Local ViewModel Interfaces ---
interface WaypointAction {
  alt: string;
  label: string;
  image: string;
  value: number | boolean;
  unit?: string;
  min?: number;
  max?: number;
  type?: string;
}

interface WaypointViewModel {
  id: number;
  waypointId: number;
  icons: object[];
  selectedIconIdx: number;
  longitude: number;
  latitude: number;
  altitude: number;
  defaultAction: WaypointAction[];
  height?: number;
}

// --- Component Props and Emits ---
const props = defineProps<{
  routeId: string | number;
}>();

const emits = defineEmits([
  "handleShowSettingsPanel",
  "handleSaveFlightPoints",
  "closePanel",
]);

// --- Component State ---
const waypoints = ref<WaypointViewModel[]>([]);
const actionList = ref(createActionList());
const loading = ref(false);
const routeDetail = ref<any>(null);
const realtimeWaypointMode = ref(false);
const currentRouteSpeed = ref(Number(getWaypointRouteSpeed?.()) || 5);

watch(
  () => props.routeId,
  () => {
    routeDetail.value = null;
    realtimeWaypointMode.value = false;
    selectedRow.value = 0;
    if (!syncRealtimeWaypoints()) getFlightPoint(props.routeId);
  },
);

const selectedRow = ref(0);
const popoverIdx = ref<{ row: number; iconIdx: number } | null>(null);

const routeStats = computed(() => {
  const distance = getRouteDistance();
  const duration = getRouteDuration(distance);

  return [
    {
      label: "航线长度",
      iconSrc: waylineIcon,
      value: formatDistance(distance),
    },
    {
      label: "预计执行时间",
      iconSrc: clockIcon,
      value: formatDuration(duration),
    },
    {
      label: "航点",
      iconSrc: waypointIcon,
      value: String(getWaypointCount()),
    },
    {
      label: "照片",
      iconSrc: photosIcon,
      value: String(getPhotoCount()),
    },
  ];
});

function getPointList() {
  const detail = routeDetail.value || {};
  if (waypoints.value.length) return waypoints.value;
  if (Array.isArray(detail.routePointList)) return detail.routePointList;
  return [];
}

function getWaypointCount() {
  if (waypoints.value.length) return waypoints.value.length;
  const count = routeDetail.value?.waypointCount;
  return Number.isFinite(Number(count)) ? Number(count) : 0;
}

function getPhotoCount() {
  return getPointList().reduce((count: number, point: any) => {
    const actions = Array.isArray(point?.actions) ? point.actions : [];
    if (!actions.length && Array.isArray(point?.defaultAction)) {
      return count + point.defaultAction.filter(isPhotoAction).length;
    }
    return count + actions.filter(isPhotoAction).length;
  }, 0);
}

function isPhotoAction(action: any) {
  const actuatorFunc = action?.actionActuatorFunc || action?.actuatorFunc;
  const label = action?.label;
  const alt = action?.alt;
  const params = action?.actParams || {};
  const hasValue = (value: any) => value !== undefined && value !== null;
  return (
    ["takePhoto", "orientedShoot", "panoShot"].includes(actuatorFunc) ||
    ["takePhotoType", "orientedPhotoMode", "panoShot"].includes(label) ||
    ["拍照", "定向拍照", "定向拍照 [F]", "全景拍照"].includes(alt) ||
    hasValue(params.takePhotoType) ||
    hasValue(params.orientedPhotoMode) ||
    hasValue(action?.takePhotoType) ||
    hasValue(action?.orientedPhotoMode)
  );
}

function getRouteDistance() {
  const estimatedDistance = Number(routeDetail.value?.estimatedDistance);
  if (Number.isFinite(estimatedDistance) && estimatedDistance > 0) {
    return estimatedDistance;
  }

  const coordinates = getRouteCoordinates();
  if (coordinates.length < 2) return 0;

  return coordinates.slice(1).reduce((total: any, point: any, index: any) => {
    return total + getDistanceBetween(coordinates[index], point);
  }, 0);
}

function getRouteDuration(distance: number) {
  const estimatedDuration = Number(routeDetail.value?.estimatedDuration);
  if (
    !realtimeWaypointMode.value &&
    Number.isFinite(estimatedDuration) &&
    estimatedDuration > 0
  ) {
    return estimatedDuration;
  }

  const coordinates = getRouteCoordinates();
  if (coordinates.length < 2 || distance <= 0) return 0;

  const pointList = getPointList();
  return coordinates.slice(1).reduce((total: any, point: any, index: any) => {
    const speed = getSegmentSpeed(pointList[index + 1], pointList[index]);
    return total + getDistanceBetween(coordinates[index], point) / speed;
  }, 0);
}

function getRouteCoordinates() {
  if (waypoints.value.length) {
    return waypoints.value
      .map((point: any) => [
        Number(point.longitude),
        Number(point.latitude),
        Number(point.height || point.altitude || 0),
      ])
      .filter((point: number[]) => point.every(Number.isFinite));
  }

  const routePointJsonCoordinates =
    routeDetail.value?.routePointJson?.coordinates;
  if (Array.isArray(routePointJsonCoordinates)) {
    return routePointJsonCoordinates
      .filter((point: any) => Array.isArray(point) && point.length >= 2)
      .map((point: any) => [
        Number(point[0]),
        Number(point[1]),
        Number(point[2] || 0),
      ]);
  }

  return getPointList()
    .map((point: any) => [
      Number(point.longitude),
      Number(point.latitude),
      Number(point.height || point.altitude || 0),
    ])
    .filter((point: number[]) => point.every(Number.isFinite));
}

function getSegmentSpeed(currentPoint: any, previousPoint: any) {
  if (
    realtimeWaypointMode.value &&
    Number.isFinite(currentRouteSpeed.value) &&
    currentRouteSpeed.value > 0
  ) {
    return currentRouteSpeed.value;
  }

  const speed = Number(currentPoint?.speed ?? previousPoint?.speed);
  const globalSpeed = Number(
    routeDetail.value?.autoFlightSpeed ?? currentRouteSpeed.value,
  );
  if (Number.isFinite(speed) && speed > 0) return speed;
  if (Number.isFinite(globalSpeed) && globalSpeed > 0) return globalSpeed;
  return 5;
}

function getDistanceBetween(start: number[], end: number[]) {
  const earthRadius = 6371000;
  const startLat = toRadians(start[1]);
  const endLat = toRadians(end[1]);
  const deltaLat = toRadians(end[1] - start[1]);
  const deltaLon = toRadians(end[0] - start[0]);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) ** 2;
  const groundDistance =
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const heightDiff = Number(end[2] || 0) - Number(start[2] || 0);
  return Math.sqrt(groundDistance ** 2 + heightDiff ** 2);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDistance(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0m";
  return `${value.toFixed(1)}m`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m${restSeconds}s`;
  return `${restSeconds}s`;
}

function cloneActionDefinition(predicate: (action: any) => boolean) {
  const matched = actionList.value.find(predicate);
  return matched ? JSON.parse(JSON.stringify(matched)) : null;
}

function buildActionFromApi(action: any) {
  const defActions = JSON.parse(JSON.stringify(actionList.value)).filter(
    (item: any) => item.actuatorFunc === action.actionActuatorFunc,
  );
  let defAction = null;

  if (defActions.length === 0) {
    return null;
  } else if (defActions.length === 1) {
    defAction = defActions[0];
  } else {
    defAction = defActions.find(
      (item: any) => action[item.label] !== 0 && action[item.label] !== null,
    );
    if (!defAction) {
      defAction = defActions.find((item: any) => action[item.label] !== null);
    }
  }

  if (!defAction) return null;
  defAction.value = action[defAction.label];

  const param = defAction.actParams || {};
  for (const key in param) {
    param[key] = action[key] || param[key];
  }
  return defAction;
}

function buildDefaultRouteActions(point: any) {
  const actionValues: Record<string, number> = {
    aircraftHeading: point?.waypointHeading?.waypointHeadingAngle ?? 0,
    gimbalPitchRotateAngle: point?.gimbalPitchAngle ?? 0,
    zoom: 24,
    takePhotoType: 0,
  };

  return ["aircraftHeading", "gimbalPitchRotateAngle", "zoom", "takePhotoType"]
    .map((label) => {
      const action = cloneActionDefinition((item: any) => item.label === label);
      if (!action) return null;
      action.value = actionValues[label];
      if (action.actParams && label in action.actParams) {
        action.actParams[label] = actionValues[label];
      }
      return action;
    })
    .filter(Boolean);
}

function buildWaypointViewModel(item: any) {
  const heightValue = Number(item?.height ?? item?.altitude ?? 100);
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const defaultAction = actions.length
    ? actions.map(buildActionFromApi).filter(Boolean)
    : buildDefaultRouteActions(item);

  defaultAction.unshift({
    alt: "高度",
    label: "height",
    image: height,
    value: Number.isFinite(heightValue) ? heightValue : 100.0,
    unit: "m",
    min: 5,
    max: 500,
    type: "angle",
  });

  return {
    ...item,
    height: Number.isFinite(heightValue) ? heightValue : 100,
    altitude: Number.isFinite(heightValue) ? heightValue : 100,
    selectedIconIdx: -1,
    icons: [],
    defaultAction,
  };
}

function handleRealtimeWaypointsChanged(points: any[] = []) {
  realtimeWaypointMode.value = true;
  routeDetail.value = {
    ...(routeDetail.value || {}),
    routePointList: points,
    waypointCount: points.length,
    autoFlightSpeed: currentRouteSpeed.value,
    estimatedDistance: null,
    estimatedDuration: null,
  };
  waypoints.value = points.map(buildWaypointViewModel);
  if (selectedRow.value >= waypoints.value.length) {
    selectedRow.value = Math.max(0, waypoints.value.length - 1);
  }
}

function syncRealtimeWaypoints() {
  const realtimeWaypoints = getWaypoints?.() || [];
  if (!Array.isArray(realtimeWaypoints) || realtimeWaypoints.length === 0) {
    return false;
  }
  handleRealtimeWaypointsChanged(realtimeWaypoints);
  return true;
}

function handleRouteSpeedChanged(speed: number) {
  const value = Number(speed);
  if (!Number.isFinite(value) || value <= 0) return;
  currentRouteSpeed.value = value;
  routeDetail.value = {
    ...(routeDetail.value || {}),
    autoFlightSpeed: value,
    estimatedDuration: realtimeWaypointMode.value
      ? null
      : routeDetail.value?.estimatedDuration,
  };
}

function showPopover(row: number, iconIdx: number, event: MouseEvent) {
  popoverIdx.value = { row, iconIdx };
  document.addEventListener("click", hidePopover);
}
function hidePopover() {
  popoverIdx.value = null;
  document.removeEventListener("click", hidePopover);
}
function deleteAction(rowIdx: number, iconIdx: number) {
  waypoints.value[rowIdx].defaultAction.splice(iconIdx, 1);
  waypoints.value[rowIdx].defaultAction = [
    ...waypoints.value[rowIdx].defaultAction,
  ];
  hidePopover();
}
onBeforeUnmount(() => {
  document.removeEventListener("click", hidePopover);
});

const rowPopoverIdx = ref<number | null>(null);
const rowPopoverPosition = ref({ x: 0, y: 0 });

function showRowPopover(idx: number, event: MouseEvent) {
  rowPopoverIdx.value = idx;
  rowPopoverPosition.value = { x: event.clientX, y: event.clientY };
  document.addEventListener("click", hideRowPopover);
}
function hideRowPopover() {
  rowPopoverIdx.value = null;
  document.removeEventListener("click", hideRowPopover);
}
function deleteWaypoint(idx: number | null) {
  if (idx === null) return;
  waypoints.value.splice(idx, 1);
  // emitter.emit("save-flight-points", waypoints.value);
  hideRowPopover();
}

function selectRow(idx: number, longitude: number, latitude: number) {
  selectedRow.value = idx;
  const waypoint = waypoints.value[idx];

  //选择航点
  locateToWaypoint({
    longitude: longitude,
    latitude: latitude,
    altitude: waypoint.height ? waypoint.height + 200 : 500,
  });

  // 创建视锥体
  createFOVAtWaypoint(waypoint, idx);

  // 创建航点箭头
  createArrowAtWaypoint(waypoint, idx);
}

function activateWaypointFOV(idx = selectedRow.value) {
  const waypoint = waypoints.value[idx];
  if (!waypoint) return false;

  selectedRow.value = idx;
  setCurrentWaypointFOVContext(waypoint, idx);
  createArrowAtWaypoint(waypoint, idx);
  return true;
}

function selectIcon(idx: number, iconIdx: number, icon: any) {
  selectedRow.value = idx;
  waypoints.value[idx].selectedIconIdx = iconIdx;
  activateWaypointFOV(idx);
  emitter.emit("changeIcon", icon);
}
const handleChangeSettingPanel = () => {
  emits("handleShowSettingsPanel");
  emitter.emit("changeAdding", true);
};

const handleSaveFlightPoints = () => {
  emitter.emit("save-flight-points", waypoints.value);
};

const handleClosePanel = () => {
  emits("closePanel");
  emitter.emit("showAllRoutes");
};

const getFlightPoint = (routeId: any) => {
  loading.value = true;
  $getFlightPoint(routeId)
    .then((res: any) => {
      if (res?.code === 200) {
        const routeData = Array.isArray(res.data)
          ? { routePointList: res.data }
          : res.data || {};
        const routePointList = Array.isArray(routeData.routePointList)
          ? routeData.routePointList
          : [];

        realtimeWaypointMode.value = false;
        routeDetail.value = routeData;
        const speed = Number(routeData.autoFlightSpeed);
        if (Number.isFinite(speed) && speed > 0) {
          currentRouteSpeed.value = speed;
        }
        //获取航点数据
        waypoints.value = routePointList.map(buildWaypointViewModel);
      }
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(() => {
  emitter.on("add-action-to-waypoint", handleAddActionToWaypoint);
  emitter.on("update-action-value", handleUpdateActionValue as any); // 类型兼容
  emitter.on(
    "waypoint-route-points-change",
    handleRealtimeWaypointsChanged as any,
  );
  emitter.on("waypoint-route-speed-change", handleRouteSpeedChanged as any);
  if (!syncRealtimeWaypoints()) getFlightPoint(props.routeId);
});

onBeforeUnmount(() => {
  emitter.off("add-action-to-waypoint", handleAddActionToWaypoint);
  emitter.off("update-action-value", handleUpdateActionValue as any); // 类型兼容
  emitter.off(
    "waypoint-route-points-change",
    handleRealtimeWaypointsChanged as any,
  );
  emitter.off("waypoint-route-speed-change", handleRouteSpeedChanged as any);

  // 清理资源
  clearAllDroneFOVs();
  clearAllWaypointArrows();
});

function handleUpdateActionValue(payload: any) {
  const { label, value } = payload || {};
  if (
    selectedRow.value == null ||
    !waypoints.value[selectedRow.value] ||
    !Array.isArray(waypoints.value[selectedRow.value].defaultAction)
  ) {
    return;
  }
  // 更新已选择的动作
  const actions = waypoints.value[selectedRow.value].defaultAction;
  const selectedIndex = waypoints.value[selectedRow.value].selectedIconIdx;
  const selectedAction = actions[selectedIndex];

  if (!selectedAction) return;

  if (selectedAction.label === label) {
    selectedAction.value = value;
    // 更新视锥体
    if (selectedAction.unit && ["°", "X"].includes(selectedAction.unit)) {
      if (!hasActiveDroneFOV()) {
        activateWaypointFOV(selectedRow.value);
      }
      updateCurrentWaypointFOVAction(label, value);
      // 飞行器偏航角
      const aircraftHeading = Number(
        actions.find((e: any) => e.label === "aircraftHeading")?.value || 0,
      );
      // 云台偏航角
      const gimbalYawRotateAngle = Number(
        actions.find((e: any) => e.label === "gimbalYawRotateAngle")?.value ||
          0,
      );
      // 云台俯仰角
      const gimbalPitchRotateAngle = Number(
        actions.find((e: any) => e.label === "gimbalPitchRotateAngle")?.value ||
          0,
      );
      // 变焦倍率
      const zoom =
        Number(actions.find((e: any) => e.label === "zoom")?.value || 0) / 24 ||
        2;

      modifyCurrentDroneFOV({
        orientation: {
          heading: aircraftHeading + gimbalYawRotateAngle,
          pitch: gimbalPitchRotateAngle,
          roll: 0,
        },
        zoomLevel: zoom,
      });
      if (selectedAction.label === "aircraftHeading") {
        modifyWaypointArrow({
          rotation: (aircraftHeading * Math.PI) / 180,
        });
      }
    }
  }
}

function handleAddActionToWaypoint(action: any) {
  if (selectedRow.value == null) return;
  // 构造要插入的动作对象，假设 item 结构和 defaultAction 兼容
  const item: any = actionList.value.find((item) => item.label === action.id);
  if (item) {
    waypoints.value[selectedRow.value].defaultAction.push(
      JSON.parse(JSON.stringify(item)),
    );
    waypoints.value[selectedRow.value].defaultAction = [
      ...waypoints.value[selectedRow.value].defaultAction,
    ];
  }
}
</script>
<style lang="less" scoped>
.waypoint-list-panel-float {
  position: absolute;
  left: calc(100% + 10px);
  top: 0;
  height: 100%;
  z-index: 2000;
  width: 340px;
  min-height: 500px;
  background: rgba(23, 44, 44, 0.9);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 44px;
  border-bottom: 1px solid #444;
  background: transparent;
}
.header-title {
  font-weight: bold;
  font-size: 16px;
  letter-spacing: 1px;
  color: #fff;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-action {
  font-size: 18px;
  color: #aaa;
  cursor: pointer;
  transition: color 0.2s;
}
.header-action:hover {
  color: #4fa3ff;
}
.close-btn {
  font-size: 20px;
  color: #aaa;
  cursor: pointer;
  margin-left: 4px;
}
.close-btn:hover {
  color: #f56c6c;
}
.waypoint-stats {
  display: flex;
  align-items: center;
  height: 72px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.stat-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 48px;
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  &:last-child {
    border-right: none;
  }
}
.stat-icon {
  width: 22px;
  height: 22px;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.92);
}
.stat-value {
  max-width: 100%;
  font-size: 15px;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.waypoint-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
.waypoint-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #444;
  margin-bottom: 0;
  &:last-child {
    border-bottom: none;
  }
  &.selected {
    background: #225c5c;
  }
}
.triangle {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 12px solid #2196f3;
  margin-right: 8px;
  &.triangle-green {
    border-top-color: #4caf50;
  }
  &.triangle-blue {
    border-top-color: #2196f3;
  }
}
.wp-index {
  color: #fff;
  font-size: 15px;
  margin-right: 8px;
  min-width: 18px;
  text-align: center;
}
.wp-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: 6px;
  .wp-icon {
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    padding: 3px;
  }
}
.wp-icon {
  font-size: 20px;
  color: #fff;
  background: transparent;
  border-radius: 4px;
  padding: 2px 4px;
  margin-right: 2px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
}
.wp-icon:hover {
  background: #2a3d39;
  color: #4fa3ff;
}
.wp-icon.selected {
  background: #2196f3;
  color: #fff !important;
}
.icon-selected {
  background: #2196f3;
  color: #fff !important;
}
.waypoint-row.selected {
  background: #225c5c;
}
.icon-popover {
  background: #222;
  color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 6px 12px;
  min-width: 80px;
}
.popover-item {
  cursor: pointer;
  padding: 4px 0;
}
.popover-item:hover {
  background: #222;
  color: #fff;
}
</style>
