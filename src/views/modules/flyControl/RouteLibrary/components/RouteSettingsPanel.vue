<!-- 航线设置面板组件 -->
<template>
  <div class="route-settings-panel" v-if="props.visible">
    <div
      class="panel-content-wrapper"
      v-loading="props.isSaving || isGeneratingObstacleAvoidance"
      :element-loading-text="props.isSaving ? '保存中...' : '航线生成中...'">
      <!-- 自定义头部 -->
      <div class="panel-header">
        <div class="headerTitles">
          <div
            class="header-title"
            :class="{
              'tab-item': currentRouteType == '0',
              'tab-active': activeTab === 'settings',
            }"
            @click="currentRouteType == '0' && (activeTab = 'settings')">
            {{
              currentRouteType == "0"
                ? "航点航线设置"
                : currentRouteType == "1"
                  ? "面状航线设置"
                  : "带状航线设置"
            }}
          </div>
          <div
            v-if="currentRouteType == '0'"
            class="header-title tab-item"
            :class="{ 'tab-active': activeTab === 'list' }"
            @click="activeTab = 'list'">
            航点列表
          </div>
        </div>
        <div class="header-actions">
          <el-icon
            class="header-action"
            v-tooltip="'保存'"
            @click="saveSettings">
            <DocumentChecked />
          </el-icon>
          <el-icon :size="20" class="close-button" @click="handleClose">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 内容区域 -->
      <div
        class="panel-content"
        v-if="activeTab === 'settings' || currentRouteType != '0'">
        <div
          v-if="currentRouteType == '1' || currentRouteType == '3'"
          id="route-settings-stats-anchor"
          class="route-settings-stats-anchor"></div>

        <!-- 工作区（所有航线类型共用） -->
        <div
          v-if="currentRouteType != '1' && currentRouteType != '3'"
          class="shared-section">
          <div class="section-title required-title">工作区</div>
          <el-select
            :model-value="airspaceManageId ?? undefined"
            placeholder="请选择工作区（必选）"
            :loading="workAreaLoading"
            style="width: 100%"
            @update:model-value="handleWorkAreaChange">
            <el-option
              v-for="area in workAreaList"
              :key="area.id"
              :label="area.name"
              :value="area.id" />
          </el-select>
        </div>

        <!-- 航点航线设置组件 -->
        <!-- 根据实际航线类型动态渲染不同的设置组件 -->
        <WaypointRouteSettings
          v-if="currentRouteType == '0'"
          ref="waypointSettings"
          v-model:selectedPhotoType="selectedPhotoType"
          v-model:smartLowLightEnabled="smartLowLightEnabled"
          v-model:flyToWaylineMode="flyToWaylineMode"
          v-model:climbAltitude="climbAltitude"
          v-model:selectedHeightMode="selectedHeightMode"
          v-model:routeAltitude="routeAltitude"
          v-model:routeSpeed="routeSpeed"
          v-model:advancedSettingsExpanded="advancedSettingsExpanded"
          v-model:takeoffSpeed="takeoffSpeed"
          v-model:selectedWaypointType="selectedWaypointType"
          v-model:selectedYawMode="selectedYawMode"
          v-model:selectedGimbalPitchMode="selectedGimbalPitchMode"
          v-model:selectedCompletionAction="selectedCompletionAction"
          @setReferencePoint="handleSetReferencePoint"
          v-model:isAdding="isAdding" />

        <!-- 巡逻航线设置组件 -->
        <PatrolRouteSettings
          v-if="currentRouteType == 'patrol'"
          v-model:intelligentAlarmEnabled="intelligentAlarmEnabled"
          v-model:personConditionOperator="personConditionOperator"
          v-model:personConditionValue="personConditionValue"
          v-model:carConditionOperator="carConditionOperator"
          v-model:carConditionValue="carConditionValue"
          v-model:boatConditionOperator="boatConditionOperator"
          v-model:boatConditionValue="boatConditionValue"
          v-model:confidence="confidence"
          v-model:fullRecordingEnabled="fullRecordingEnabled"
          v-model:alarmMessageTitle="alarmMessageTitle"
          v-model:alarmMessageContent="alarmMessageContent"
          v-model:selectedHeightMode="selectedHeightMode"
          v-model:routeAltitude="routeAltitude"
          @setReferencePoint="handleSetReferencePoint"
          @selectTriggerAction="handleSelectTriggerAction" />

        <!-- 面状航线设置组件 -->
        <AreaRouteSettings
          v-if="currentRouteType == '1'"
          :currentRoute="currentRoute"
          v-model:areaValue="areaValue"
          v-model:distanceValue="distanceValue"
          v-model:durationValue="durationValue"
          v-model:imageCount="imageCount"
          v-model:referencePointSet="referencePointSet"
          v-model:selectedCamera="selectedCamera"
          v-model:selectedCollectionMethod="selectedCollectionMethod"
          v-model:gsdValue="gsdValue"
          v-model:obliqueGsdValue="obliqueGsdValue"
          v-model:smartSwingEnabled="smartSwingEnabled"
          v-model:selectedHeightMode="selectedHeightMode"
          v-model:routeAltitude="routeAltitude"
          v-model:flyToWaylineMode="flyToWaylineMode"
          v-model:safeTakeoffHeight="safeTakeoffHeight"
          v-model:gimbalSwingAngle="gimbalSwingAngle"
          v-model:globalRouteSpeed="globalRouteSpeed"
          v-model:mainRouteAngle="mainRouteAngle"
          v-model:elevationOptimizationEnabled="elevationOptimizationEnabled"
          v-model:completionAction="completionAction"
          v-model:takeoffSpeed="takeoffSpeedArea"
          v-model:subjectSurfaceAltitude="subjectSurfaceAltitude"
          v-model:sideOverlapRate="sideOverlapRate"
          v-model:forwardOverlapRate="forwardOverlapRate"
          v-model:margin="margin"
          v-model:photoMode="photoMode"
          v-model:customCameraAngleEnabled="customCameraAngleEnabled"
          v-model:realtimeTerrainFollowingEnabled="
            realtimeTerrainFollowingEnabled
          "
          :airspaceManageId="airspaceManageId"
          :workAreaList="workAreaList"
          :workAreaLoading="workAreaLoading"
          @setReferencePoint="handleSetReferencePoint"
          @resetReferencePoint="handleResetReferencePoint"
          @setRouteStartPoint="handleSetRouteStartPoint"
          @workAreaChange="handleWorkAreaChange"
          v-model:isAdding="isAdding" />

        <!-- 带状航线设置组件 -->
        <StripRouteSettings
          v-if="currentRouteType == '3'"
          :currentRoute="currentRoute"
          v-model:selectedCollectionMethod="selectedCollectionMethod"
          v-model:selectedHeightMode="selectedHeightMode"
          v-model:routeAltitude="routeAltitude"
          v-model:flyToWaylineMode="flyToWaylineMode"
          v-model:safeTakeoffHeight="safeTakeoffHeight"
          v-model:leftExpandDistance="leftExpandDistance"
          v-model:rightExpandDistance="rightExpandDistance"
          v-model:isAdding="isAdding"
          v-model:globalRouteSpeed="globalRouteSpeed"
          v-model:mainRouteAngle="mainRouteAngle"
          v-model:sideOptimizationEnabled="sideOptimizationEnabled"
          v-model:includeCenterEnable="includeCenterEnable"
          v-model:completionAction="completionAction"
          v-model:sideOverlapRate="sideOverlapRate"
          v-model:forwardOverlapRate="forwardOverlapRate"
          v-model:margin="margin"
          v-model:photoMode="photoMode"
          v-model:stripMode="stripMode"
          v-model:cuttingDistance="cuttingDistance"
          :airspaceManageId="airspaceManageId"
          :workAreaList="workAreaList"
          :workAreaLoading="workAreaLoading"
          @workAreaChange="handleWorkAreaChange" />

        <!-- 其他航线类型的设置组件将在这里添加 -->
        <!-- <MappingRouteSettings v-if="currentRouteType === 'mapping'" ... /> -->
        <!-- <LinearRouteSettings v-if="currentRouteType === 'linear'" ... /> -->
      </div>

      <!-- 航点列表 Tab 内容 -->
      <div
        v-if="currentRouteType == '0' && activeTab === 'list'"
        class="waypoint-list-tab-wrap">
        <WaypointListPanel
          :routeId="props.currentRoute?.routeId ?? props.currentRoute?.id"
          @handleShowSettingsPanel="activeTab = 'settings'"
          @closePanel="handleClose" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from "vue";
import {
  ElIcon,
  ElMessage,
  ElMessageBox,
  ElSelect,
  ElOption,
} from "element-plus"; // 导入 Element Plus 组件、Drawer 和 Input, Button
import { $getWorkAreaList, $getWorkAreaDetail } from "@/api/flyControl/flight";
import { Close, DocumentChecked } from "@element-plus/icons-vue"; // 导入需要的图标，包括 LocationInformation
import WaypointRouteSettings from "./WaypointRouteSettings.vue"; // 导入新的航点设置组件
import PatrolRouteSettings from "./PatrolRouteSettings.vue"; // 导入新的巡逻航线设置组件
import AreaRouteSettings from "./AreaRouteSettings.vue"; // 导入面状航线设置组件
import StripRouteSettings from "./StripRouteSettings.vue"; // 新增：带状航线设置组件
import WaypointListPanel from "./WaypointListPanel.vue"; // 导入航点列表面板
import emitter from "@/stores/mitt";

import {
  setDrawMode,
  stopEditingAreaPolygon,
  // @ts-ignore
} from "@/services/waypointService.js";

// 定义组件接收的 props
const props = defineProps<{
  visible: boolean; // 控制面板是否可见
  currentRouteType: string; // 当前选中的航线类型
  currentRoute: any;
  points: any[];
  isSaving: boolean;
}>();

// 定义组件可以触发的事件
const emit = defineEmits([
  "close",
  "save-settings",
  "setReferencePoint",
  "selectTriggerAction",
  "resetReferencePoint",
  "setRouteStartPoint",
]); // 添加 setRouteStartPoint 事件

// --- 航线设置状态 (这些状态现在由子组件通过 v-model 更新) ---

// 航点航线设置状态 (WaypointRouteSettings props)
const selectedPhotoType = ref<string[]>(["wide"]); // 默认选中广角
const smartLowLightEnabled = ref(false); // 智能低光
const flyToWaylineMode = ref("safely"); // 默认垂直爬升
const climbAltitude = ref(120); // 默认爬升高度
const routeSpeed = ref(5); // 默认航线速度
const advancedSettingsExpanded = ref(false); // 高级设置是否展开
const takeoffSpeed = ref(3); // 起飞速度
const selectedWaypointType = ref("toPointAndStopWithDiscontinuityCurvature"); // 默认航点类型
const selectedYawMode = ref("followWayline"); // 默认偏航角模式
const selectedGimbalPitchMode = ref("manual"); // 默认云台俯仰控制模式
const selectedCompletionAction = ref("goHome"); // 默认完成动作

// 工作区
const airspaceManageId = ref<number | string | null>(null);
const airspaceManageName = ref("");
const workAreaList = ref<{ id: number | string; name: string }[]>([]);
const workAreaLoading = ref(false);

// ---------- 地图工作区显示 ----------
declare const Cesium: any;
const WORK_AREA_DS_ID = "work-area-boundary";
const getViewer = () => (window as any).__cesiumViewer;

/** 解析 WKT MULTIPOLYGON，返回第一个多边形的外圈坐标 [[lon, lat], ...] */
function parseWktFirstRing(wkt: string): number[][] {
  const match = wkt.match(/MULTIPOLYGON\s*\(\s*\(\s*\(([^)]+)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((pair) => {
      const parts = pair.trim().split(/\s+/);
      return [parseFloat(parts[0]), parseFloat(parts[1])];
    })
    .filter((p) => !isNaN(p[0]) && !isNaN(p[1]));
}

const clearWorkAreaFromMap = () => {
  const viewer = getViewer();
  if (!viewer) return;
  try {
    const ds = viewer.dataSources.getByName(WORK_AREA_DS_ID)[0];
    if (ds) viewer.dataSources.remove(ds, true);
  } catch {}
};

/** 判断当前视口安全区域是否已经处于工作区四至矩形内部 */
function isCurrentViewWithinWorkArea(
  viewer: any,
  coords: number[][],
  marginRatio = 0.1,
): boolean {
  try {
    const viewRectangle = viewer.camera.computeViewRectangle(
      Cesium.Ellipsoid.WGS84,
    );
    if (!viewRectangle) return false;

    const longitudes = coords.map(([longitude]) => longitude);
    const latitudes = coords.map(([, latitude]) => latitude);
    const workAreaRectangle = Cesium.Rectangle.fromDegrees(
      Math.min(...longitudes),
      Math.min(...latitudes),
      Math.max(...longitudes),
      Math.max(...latitudes),
    );

    const horizontalPadding = viewRectangle.width * marginRatio;
    const verticalPadding = viewRectangle.height * marginRatio;
    if (
      viewRectangle.width <= horizontalPadding * 2 ||
      viewRectangle.height <= verticalPadding * 2
    ) {
      return false;
    }

    const safeViewRectangle = new Cesium.Rectangle(
      viewRectangle.west + horizontalPadding,
      viewRectangle.south + verticalPadding,
      viewRectangle.east - horizontalPadding,
      viewRectangle.north - verticalPadding,
    );

    const safeViewCorners = [
      new Cesium.Cartographic(
        safeViewRectangle.west,
        safeViewRectangle.south,
      ),
      new Cesium.Cartographic(safeViewRectangle.west, safeViewRectangle.north),
      new Cesium.Cartographic(safeViewRectangle.east, safeViewRectangle.south),
      new Cesium.Cartographic(safeViewRectangle.east, safeViewRectangle.north),
    ];

    return safeViewCorners.every((corner) =>
      Cesium.Rectangle.contains(workAreaRectangle, corner),
    );
  } catch {
    return false;
  }
}

const showWorkAreaOnMap = async (id: number | string) => {
  const viewer = getViewer();
  if (!viewer || !Cesium) return;
  clearWorkAreaFromMap();
  try {
    const res: any = await $getWorkAreaDetail(String(id));
    if (res?.code !== 200 || !res.data?.wktStr) return;
    const coords = parseWktFirstRing(res.data.wktStr);
    if (coords.length < 3) return;

    const degreesArray: number[] = [];
    coords.forEach(([lon, lat]) => {
      degreesArray.push(lon, lat);
    });

    const ds = new Cesium.CustomDataSource(WORK_AREA_DS_ID);
    await viewer.dataSources.add(ds);
    ds.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(degreesArray),
        ),
        material: Cesium.Color.fromCssColorString("#52c41a").withAlpha(0.15),
        outline: false,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
        width: 2,
        material: Cesium.Color.fromCssColorString("#52c41a"),
        clampToGround: true,
      },
    });

    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      Cesium.Cartesian3.fromDegreesArray(degreesArray),
    );
    if (!isCurrentViewWithinWorkArea(viewer, coords)) {
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-90),
          boundingSphere.radius * 3.5,
        ),
      });
    }
  } catch (e) {
    console.error("工作区地图显示失败", e);
  }
};

const fetchWorkAreas = async () => {
  workAreaLoading.value = true;
  try {
    const res: any = await $getWorkAreaList();
    if (res?.code === 200 && Array.isArray(res.data)) {
      workAreaList.value = res.data;
    }
  } catch (e) {
    // ignore
  } finally {
    workAreaLoading.value = false;
  }
};

const handleWorkAreaChange = async (id: number | string | null) => {
  airspaceManageId.value = id;
  const found = workAreaList.value.find((item) => item.id === id);
  airspaceManageName.value = found ? found.name : "";
  if (id) {
    await showWorkAreaOnMap(id);
  } else {
    clearWorkAreaFromMap();
  }
};

// 巡逻航线设置状态 (PatrolRouteSettings props)
const intelligentAlarmEnabled = ref(false);
const personConditionOperator = ref("gte");
const personConditionValue = ref(0);
const carConditionOperator = ref("gte");
const carConditionValue = ref(0);
const boatConditionOperator = ref("gte");
const boatConditionValue = ref(0);
const confidence = ref(80); // 默认置信度
const fullRecordingEnabled = ref(false);
const alarmMessageTitle = ref("");
const alarmMessageContent = ref("");

// 面状航线设置状态 (AreaRouteSettings props)
const areaValue = ref(0);
const distanceValue = ref(0);
const durationValue = ref(0);
const imageCount = ref(0);
const referencePointSet = ref(false); // 参考起飞点是否已设置
const selectedCamera = ref("visible_light"); // 选中的镜头类型
const selectedCollectionMethod = ref("orthophoto"); // 选中的采集方式
const gsdValue = ref(5); // GSD 值
const obliqueGsdValue = ref(10); // 倾斜 GSD 值
const smartSwingEnabled = ref(false); // 智能摆动拍摄开关
const safeTakeoffHeight = ref(30); // 安全起飞高度
const gimbalSwingAngle = ref(10); // 初始化一个默认值，例如 0 度
const globalRouteSpeed = ref(5); // 新增：全局航线速度
const mainRouteAngle = ref(0); // 新增：主航线角度
const elevationOptimizationEnabled = ref(false); // 新增：高程优化开关
const completionAction = ref("goHome"); // 新增：完成动作
const realtimeTerrainFollowingEnabled = ref(false); // 默认设置为 false

// 新增：面状航线高级设置状态
const takeoffSpeedArea = ref(5); // 起飞速度 (面状航线)
const subjectSurfaceAltitude = ref(0); // 被摄面海拔高度
const sideOverlapRate = ref(70); // 旁向重叠率
const forwardOverlapRate = ref(80); // 航向重叠率
const margin = ref(10); // 边距
const photoMode = ref("multipleTiming"); // 拍照模式
const customCameraAngleEnabled = ref(false); // 自定义相机角度开关

// 通用设置状态 (可能在多种航线类型中存在)
const selectedHeightMode = ref("relativeToStartPoint"); // 默认相对起飞点高度
const routeAltitude = ref(100); // 默认航线高度
const sideOptimizationEnabled = ref(false); // 高程优化开关
const includeCenterEnable = ref(false); // 是否包含中心线

// Tab 切换
const activeTab = ref<"settings" | "list">("settings");

// 切换航线类型时重置到设置 tab
watch(
  () => props.currentRouteType,
  () => {
    activeTab.value = "settings";
  },
);

// 航点航线设置组件
const waypointSettings = ref(null);
const isAdding = ref(false);
const isGeneratingObstacleAvoidance = ref(false);

// 带状航线设置
const leftExpandDistance = ref<number>(50);
const rightExpandDistance = ref<number>(50);
const stripMode = ref("bow"); // 模式：弓字航线(bow)/单航线(single)
const cuttingDistance = ref<number>(1000); // 切割距离（仅弓字模式）

// --- 方法 ---

const getCurrentRouteInfo = () => {
  return (
    props.currentRoute?.routeInfo ??
    props.currentRoute?.data ??
    props.currentRoute ??
    {}
  );
};

const toFiniteNumber = (value: unknown, fallback: number) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toPositiveNumber = (value: unknown, fallback: number) => {
  const numberValue = toFiniteNumber(value, fallback);
  return numberValue > 0 ? numberValue : fallback;
};

const readFlag = (value: unknown) => {
  return value === true || value === 1 || value === "1";
};

const hasUsableCoordinates = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;
  if (value.length >= 2 && value.every((item) => Number.isFinite(Number(item))))
    return true;
  return value.some((item) => hasUsableCoordinates(item));
};

const hasRouteGeometry = (
  routeInfo: any,
  routeType = props.currentRouteType,
) => {
  if (routeType == "1") {
    const mappingTypeReq = routeInfo?.mappingTypeReq ?? {};
    return (
      hasUsableCoordinates(mappingTypeReq?.coordinatesGeoJson?.coordinates) ||
      hasUsableCoordinates(
        mappingTypeReq?.coordinatesJson?.map((point: any) => [
          point?.longitude,
          point?.latitude,
          point?.height,
        ]),
      ) ||
      Boolean(mappingTypeReq?.coordinates) ||
      hasUsableCoordinates(routeInfo?.routePointJson?.coordinates)
    );
  }

  if (routeType == "3") {
    const stripLineRoute = routeInfo?.stripLineRoute ?? {};
    return (
      hasUsableCoordinates(stripLineRoute?.centerlineJson?.coordinates) ||
      Boolean(stripLineRoute?.centerlineWkt || stripLineRoute?.lineString) ||
      hasUsableCoordinates(routeInfo?.routePointJson?.coordinates)
    );
  }

  return (
    hasUsableCoordinates(routeInfo?.routePointJson?.coordinates) ||
    hasUsableCoordinates(
      routeInfo?.routePointList?.map((point: any) => [
        point?.longitude,
        point?.latitude,
        point?.height,
      ]),
    )
  );
};

const applyCommonRouteEcho = (routeInfo: any) => {
  airspaceManageId.value =
    routeInfo?.airspaceManageId ?? routeInfo?.workspaceId ?? null;
  airspaceManageName.value = routeInfo?.airspaceManageName ?? "";
  selectedHeightMode.value =
    routeInfo?.heightMode ??
    routeInfo?.selectedHeightMode ??
    "relativeToStartPoint";
  routeAltitude.value = toPositiveNumber(routeInfo?.globalHeight, 100);
  globalRouteSpeed.value = toPositiveNumber(routeInfo?.autoFlightSpeed, 5);
  flyToWaylineMode.value = routeInfo?.flyToWaylineMode || "safely";
  safeTakeoffHeight.value = toPositiveNumber(
    routeInfo?.takeOffSecurityHeight,
    120,
  );
  completionAction.value = routeInfo?.finishAction || "goHome";
};

// 处理关闭按钮点击事件 (由 el-drawer 的 @close 事件触发)
const handleClose = () => {
  if (isAdding.value === false) {
    ElMessageBox.confirm("当前航线未绘制，是否关闭？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
      customClass: "clear-roampath-confirm-box",
    })
      .then(() => {
        emit("close"); // 触发 close 事件通知父组件隐藏面板
        emitter.emit("reset-map");
        emitter.emit("beidou-route-path", []);
        isAdding.value = false;
        setDrawMode(null);
        // 结束面编辑
        try {
          stopEditingAreaPolygon();
        } catch {}
      })
      .catch(() => {});
  } else {
    emit("close"); // 触发 close 事件通知父组件隐藏面板
    emitter.emit("reset-map");
    isAdding.value = false;
    setDrawMode(null);
    // 结束面编辑
    try {
      stopEditingAreaPolygon();
    } catch {}
  }
};

// 处理子组件发出的设置参考起飞点事件
const handleSetReferencePoint = () => {
  emit("setReferencePoint");
};

// 处理子组件发出的重设参考起飞点事件
const handleResetReferencePoint = () => {
  emit("resetReferencePoint");
};

// 处理子组件发出的选择触发动作事件 (巡逻航线特有)
const handleSelectTriggerAction = () => {
  emit("selectTriggerAction");
};

// 新增：处理子组件发出的设置航线起始点事件
const handleSetRouteStartPoint = () => {
  emit("setRouteStartPoint");
};

// 保存设置 (此逻辑保留在父组件)
const saveSettings = () => {
  if (props.isSaving) return;
  if (isAdding.value === false && !hasRouteGeometry(getCurrentRouteInfo())) {
    ElMessage({ message: "请先绘制航线", type: "warning" });
    return;
  }
  if (!airspaceManageId.value) {
    ElMessage({ message: "请选择工作区", type: "warning" });
    return;
  }
  let settings: any = {
    routeType: props.currentRouteType,
    airspaceManageId: airspaceManageId.value, // 工作区id
    airspaceManageName: airspaceManageName.value, // 工作区名称
  };

  // 根据当前航线类型收集对应的设置数据，0为航点航线
  if (props.currentRouteType == "0") {
    settings = {
      ...settings,
      photoSettings: {
        selectedPhotoType: selectedPhotoType.value,
        smartLowLightEnabled: smartLowLightEnabled.value,
      },
      climbSettings: {
        flyToWaylineMode: flyToWaylineMode.value,
        climbAltitude: climbAltitude.value,
      },
      heightSettings: {
        selectedHeightMode: selectedHeightMode.value,
        routeAltitude: routeAltitude.value,
      },
      speedSettings: {
        routeSpeed: routeSpeed.value,
      },
      advancedSettings: {
        takeoffSpeed: takeoffSpeed.value,
        selectedWaypointType: selectedWaypointType.value,
        selectedYawMode: selectedYawMode.value,
        selectedGimbalPitchMode: selectedGimbalPitchMode.value,
        selectedCompletionAction: selectedCompletionAction.value,
      },
    };
  } else if (props.currentRouteType == "1") {
    settings = {
      ...settings,
      collectionSettings: {
        selectedCollectionMethod: selectedCollectionMethod.value,
      },
      heightSettings: {
        selectedHeightMode: selectedHeightMode.value,
        routeAltitude: routeAltitude.value,
      },
      climbSettings: {
        flyToWaylineMode: flyToWaylineMode.value,
        climbAltitude: safeTakeoffHeight.value,
      },
      safeTakeoff: {
        height: safeTakeoffHeight.value,
      },
      globalRouteSpeed: globalRouteSpeed.value, // 添加全局航线速度
      mainRouteAngle: mainRouteAngle.value, // 添加主航线角度
      elevationOptimizationEnabled: elevationOptimizationEnabled.value, // 添加高程优化
      completionAction: completionAction.value, // 添加完成动作
      // 新增：高级设置
      advancedSettings: {
        takeoffSpeed: takeoffSpeedArea.value,
        sideOverlapRate: sideOverlapRate.value, // 旁向重叠率
        forwardOverlapRate: forwardOverlapRate.value, // 航向重叠率
        margin: margin.value,
        photoMode: photoMode.value,
      },
    };
  } else if (props.currentRouteType == "3") {
    settings = {
      ...settings,
      collectionSettings: {
        selectedCollectionMethod: selectedCollectionMethod.value,
      },
      heightSettings: {
        selectedHeightMode: selectedHeightMode.value,
        routeAltitude: routeAltitude.value,
      },
      climbSettings: {
        flyToWaylineMode: flyToWaylineMode.value,
        climbAltitude: safeTakeoffHeight.value,
      },
      safeTakeoff: {
        height: safeTakeoffHeight.value,
      },
      globalRouteSpeed: globalRouteSpeed.value, // 添加全局航线速度
      mainRouteAngle: mainRouteAngle.value, // 添加主航线角度
      completionAction: completionAction.value, // 添加完成动作
      // 新增：高级设置
      advancedSettings: {
        takeoffSpeed: takeoffSpeedArea.value,
        sideOverlapRate: sideOverlapRate.value, // 旁向重叠率
        forwardOverlapRate: forwardOverlapRate.value, // 航向重叠率
        margin: margin.value,
        photoMode: photoMode.value,
      },
      sideOptimizationEnabled: sideOptimizationEnabled.value, // 添加边缘图像优化
      includeCenterEnable: includeCenterEnable.value, // 添加是否包含中心线
      cuttingDistance: cuttingDistance.value, // 添加切割距离
      stripMode: stripMode.value, // 添加模式
      leftExtend: leftExpandDistance.value, // 添加左外扩距离
      rightExtend: rightExpandDistance.value, // 添加右外扩距离
    };
  }
  // TODO: 添加其他航线类型的设置收集逻辑

  emitter.emit("save-settings", settings); // 触发保存事件，将设置数据传递出去
};

// 监听 visible 或 currentRouteType 变化，可以在面板打开或切换航线类型时加载当前航线的设置
watch(
  [() => props.visible, () => props.currentRouteType, () => props.currentRoute],
  (newValues, oldValues) => {
    const [newVisible, newType, newRoute] = newValues;
    const [oldVisible, oldType, oldRoute] = oldValues;
    if (
      newVisible &&
      newRoute &&
      (!oldVisible || newType !== oldType || newRoute !== oldRoute)
    ) {
      const routeInfo = getCurrentRouteInfo();
      console.log(`航线设置面板打开，类型: ${newType}`);
      isAdding.value = hasRouteGeometry(routeInfo, newType);
      // TODO: 根据 props.currentRouteType 和 props.currentRouteId 加载对应的设置数据
      // 例如：loadRouteSettings(props.currentRouteId, newType);
      // 加载数据后，更新对应的 ref 状态
      // 为了演示，这里可以根据类型设置一些默认值或模拟加载
      if (newType == "0") {
        // 模拟加载航点设置
        selectedPhotoType.value = routeInfo.imageFormat?.split(",") || ["wide"]; // 默认选中广角相机
        smartLowLightEnabled.value = false; // 智能低光
        flyToWaylineMode.value = routeInfo.flyToWaylineMode || "safely"; // 默认垂直爬升
        climbAltitude.value = toPositiveNumber(
          routeInfo.takeOffSecurityHeight,
          120,
        ); // 默认爬升高度
        routeSpeed.value = toPositiveNumber(routeInfo.autoFlightSpeed, 5); // 默认航线速度
        advancedSettingsExpanded.value = true; // 高级设置是否展开
        takeoffSpeed.value = 3; // 起飞速度
        selectedWaypointType.value =
          routeInfo?.waypointTurn?.waypointTurnMode ||
          "toPointAndStopWithDiscontinuityCurvature"; // 默认航点类型
        selectedYawMode.value =
          routeInfo?.waypointHeading?.waypointHeadingMode || "followWayline"; // 默认偏航角模式
        selectedGimbalPitchMode.value = routeInfo.gimbalPitchMode || "manual"; // 默认云台俯仰控制模式
        selectedCompletionAction.value = routeInfo.finishAction || "goHome"; // 默认完成动作
        applyCommonRouteEcho(routeInfo);
      } else if (newType == "1") {
        // 模拟加载面状航线设置
        const mappingTypeReq = routeInfo?.mappingTypeReq ?? {};
        applyCommonRouteEcho(routeInfo);
        areaValue.value = 0;
        distanceValue.value = toFiniteNumber(routeInfo?.estimatedDistance, 0);
        durationValue.value =
          toFiniteNumber(routeInfo?.estimatedDuration, 0) * 60;
        imageCount.value = 0;
        referencePointSet.value = Boolean(routeInfo?.takeOffRefPoint);
        selectedCamera.value = "visible_light";
        selectedCollectionMethod.value =
          mappingTypeReq?.collectionMethod || "orthophoto";
        gsdValue.value = 5;
        obliqueGsdValue.value = 10;
        smartSwingEnabled.value = false;
        gimbalSwingAngle.value = 10; // 初始化云台摆动角度
        mainRouteAngle.value = toFiniteNumber(mappingTypeReq?.direction, 0); // 初始化主航线角度
        elevationOptimizationEnabled.value = readFlag(
          mappingTypeReq?.elevationOptimizeEnable,
        ); // 初始化高程优化
        // 新增：高级设置初始化
        takeoffSpeedArea.value = 5;
        subjectSurfaceAltitude.value = 0;
        sideOverlapRate.value = toFiniteNumber(mappingTypeReq?.overlapW, 70);
        forwardOverlapRate.value = toFiniteNumber(mappingTypeReq?.overlapH, 80);
        margin.value = toFiniteNumber(mappingTypeReq?.margin, 10);
        photoMode.value = mappingTypeReq?.photoMode || "multipleTiming";
        customCameraAngleEnabled.value = false;
      } else if (newType == "3") {
        // 模拟加载带状航线设置
        const stripLineRoute = routeInfo?.stripLineRoute ?? {};
        applyCommonRouteEcho(routeInfo);
        selectedCamera.value = "visible_light";
        selectedCollectionMethod.value = "orthophoto";
        gsdValue.value = 5;
        obliqueGsdValue.value = 10;
        smartSwingEnabled.value = false;
        gimbalSwingAngle.value = 10; // 初始化云台摆动角度
        // 新增：高级设置初始化
        takeoffSpeedArea.value = 5;
        subjectSurfaceAltitude.value = 0;
        sideOverlapRate.value = toFiniteNumber(stripLineRoute?.overlapW, 70);
        forwardOverlapRate.value = toFiniteNumber(stripLineRoute?.overlapH, 80);
        margin.value = toFiniteNumber(stripLineRoute?.margin, 10);
        photoMode.value = stripLineRoute?.photoMode || "multipleTiming";
        customCameraAngleEnabled.value = false;
        stripMode.value =
          stripLineRoute?.singleLineEnable == "1" ? "single" : "bow"; // 模式：弓字航线(bow)/单航线(single)
        leftExpandDistance.value = toFiniteNumber(
          stripLineRoute?.leftExtend,
          50,
        );
        rightExpandDistance.value = toFiniteNumber(
          stripLineRoute?.rightExtend,
          50,
        );
        cuttingDistance.value = toFiniteNumber(
          stripLineRoute?.cuttingDistance,
          1000,
        ); // 切割距离
        selectedHeightMode.value =
          routeInfo?.heightMode ||
          stripLineRoute?.heightMode ||
          "relativeToStartPoint"; // 高度模式
        sideOptimizationEnabled.value =
          stripLineRoute?.boundaryOptimEnable == "1"; // 边缘图像优化
        includeCenterEnable.value = stripLineRoute?.includeCenterEnable == "1"; // 是否包含中心线
      } else {
        // 重置或清空其他类型的设置状态
      }
      //获取航线详情
      // if (props.currentRoute) {
      //   if (newType == '0') {
      //     // 模拟加载航点设置
      //     selectedPhotoType.value = [props.currentRoute.imageFormat];// 默认选中广角
      //     smartLowLightEnabled.value = false;// 智能低光
      //     flyToWaylineMode.value = 'safely';// 默认垂直爬升
      //     climbAltitude.value = 120;// 默认爬升高度
      //     routeSpeed.value = 5;// 默认航线速度
      //     advancedSettingsExpanded.value = false;// 高级设置是否展开
      //     takeoffSpeed.value = 3;// 起飞速度
      //     selectedWaypointType.value = 'toPointAndStopWithDiscontinuityCurvature';// 默认航点类型
      //     selectedYawMode.value = 'followWayline';// 默认偏航角模式
      //     selectedGimbalPitchMode.value = 'manual';// 默认云台俯仰控制模式
      //     selectedCompletionAction.value = 'goHome';// 默认完成动作
      //     selectedHeightMode.value = 'relativeToStartPoint'; // 通用设置
      //     routeAltitude.value = 100; // 通用设置

      //   }
      // }
    }
  },
  { immediate: true },
);

const onChangeAdding = (val: unknown) => {
  isAdding.value = Boolean(val);
};

const onObstacleAvoidanceLoading = (val: unknown) => {
  isGeneratingObstacleAvoidance.value = Boolean(val);
};

onMounted(() => {
  emitter.on("changeAdding", onChangeAdding);
  emitter.on("obstacle-avoidance-loading", onObstacleAvoidanceLoading);
  fetchWorkAreas();
});

onBeforeUnmount(() => {
  emitter.off("changeAdding", onChangeAdding);
  emitter.off("obstacle-avoidance-loading", onObstacleAvoidanceLoading);
  clearWorkAreaFromMap();
});
</script>

<style lang="less" scoped>
.route-settings-panel {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  width: 350px;
  height: 100%;
  background-color: rgba(23, 44, 44, 0.9);
  pointer-events: auto;
  z-index: 1000;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);

  .panel-content-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    color: #fff;
  }

  /* 覆盖 Element Plus Input 默认样式 */
  :deep(.el-input__wrapper) {
    background-color: transparent !important; /* 输入框背景透明 */
    box-shadow: none !important; /* 移除阴影 */
    // padding: 0 !important; /* 移除内边距 */
    height: auto !important; /* 高度自适应 */
  }

  :deep(.el-input__inner) {
    color: #2d8cf0 !important; /* 数值颜色 */
    text-align: center !important; /* 数值居中 */
    padding: 0 !important; /* 移除内边距 */
    height: auto !important; /* 高度自适应 */
    line-height: normal !important; /* 行高正常 */
    font-size: 20px;
    font-weight: bold;
  }

  /* 移除 Element Plus Input number 类型的上下箭头 */
  :deep(.el-input-number__decrease),
  :deep(.el-input-number__increase) {
    display: none !important;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .panel-header {
    height: 44px;
    color: #fff;
    box-shadow: inset 0 -1px 0 0 #4f4f4f;
    padding: 10px 16px;
    padding-left: 32px;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;

    .headerTitles {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-title {
      font-size: 16px;
      font-weight: bold;
      color: white;

      &.tab-item {
        cursor: pointer;
        color: rgba(255, 255, 255, 0.5);
        position: relative;
        transition: color 0.2s;

        &::after {
          content: "";
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 100%;
          height: 2px;
          background: #4fa3ff;
          border-radius: 2px;
          transform: scaleX(0);
          transition: transform 0.25s ease;
        }

        &.tab-active {
          color: #fff;
          text-shadow: 0 0 5px #4fa3ff;

          &::after {
            transform: scaleX(1);
          }
        }

        &:hover {
          color: #ddd;
        }
      }
    }

    .header-actions {
      display: flex;
      gap: 15px;
    }

    .header-action {
      font-size: 22px;
      color: #aaa;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: #4fa3ff;
      }
    }

    .close-button {
      cursor: pointer;
      color: #ccc;
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }
  }

  .waypoint-list-tab-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    :deep(.waypoint-list-panel-float) {
      position: static;
      width: 100%;
      height: 100%;
      box-shadow: none;
      min-height: unset;
      .panel-header {
        display: none;
      }
    }
  }

  .panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 16px;
    overflow-y: auto;
    padding-top: 0px;
    // gap: 10px;
  }

  .route-settings-stats-anchor {
    width: 100%;
  }

  .shared-section {
    background-color: rgba(51, 51, 51, 0.6);
    padding: 15px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 14px;
    font-weight: bold;
    color: white;
  }

  .required-title::before {
    content: "* ";
    color: #f56c6c;
  }

  /* 保存按钮样式 */
  .panel-footer {
    margin-top: auto;
    padding: 15px 20px;
    border-top: 1px solid #555;
    display: flex;
    justify-content: center;
    flex-shrink: 0;

    .el-button {
      width: 100%;
      max-width: 200px;
    }
  }
}
</style>
