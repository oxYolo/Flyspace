<!-- 航线库面板组件 -->
<template>
  <div class="route-library-panel">
    <!-- 将头部和航线列表包裹在新的容器中 -->
    <div class="main-content-area" v-loading="routeListLoading || routeDetailLoading || isDeleting"
      :element-loading-text="isDeleting
          ? '删除中...'
          : routeDetailLoading
            ? '航线详情获取中...'
            : '航线加载中...'
        ">
      <!-- 顶部标题和操作区 -->
      <div class="panel-header">
        <div class="header-title">航线库 ({{ pageOptions.total }})</div>
        <div style="display: flex; align-items: center; gap: 10px">
          <div class="header-actions" v-if="props.showBtns">
            <!-- 导入航线按钮 -->
            <el-icon v-tooltip="'导入航线'" :size="20" class="action-icon" @click="showImportDialog = true">
              <Upload />
            </el-icon>
            <!-- 创建新航线按钮 -->
            <el-icon v-tooltip="'创建新航线'" :size="20" class="action-icon" @click="handleAddPath">
              <Plus />
            </el-icon>
          </div>
          <el-icon v-else @click="handleCloseDialog">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 条件搜索区（参照 MediaPanel，仅保留输入框） -->
      <div class="search-conditions-wrapper">
        <div class="search-conditions-header">
          <el-input class="header-search-input" v-model="searchForm.routeName" placeholder="按航线名称搜索" clearable
            @clear="handleSearch" @keyup.enter="handleSearch" />
          <!-- 搜索图标，点击切换搜索框显示 -->
          <el-icon v-tooltip="'搜索'" :size="20" class="action-icon" @click="handleSearch">
            <Search />
          </el-icon>
        </div>
      </div>

      <!-- 航线列表区 -->
      <div class="route-list">
        <!-- 通过 v-for 渲染航线卡片 -->
        <div v-for="route in routes" :key="route.routeId" class="route-card"
          :class="{ active: selectedRouteId === route.routeId }" @click.stop="selectRoute(route.routeId)">
          <div v-tooltip="route.title" class="card-title">
            {{ route.title }}
          </div>
          <div class="card-meta route-meta">
            <span class="device-info">
              <img class="device-icon" src="@/assets/svg/无人机.svg" alt="" />
              <span class="device-name">{{ route.deviceName }}</span>
            </span>
            <span class="route-type-tag">
              <el-icon class="route-type-icon">
                <component :is="getRouteTypeIcon(route)" />
              </el-icon>
              <span>{{ getRouteTypeLabel(route) }}</span>
            </span>
          </div>
          <div class="card-meta">更新时间 {{ route.updateTime }}</div>
          <div class="card-actions" v-if="props.showBtns">
            <!-- 根据锁定状态显示不同的图标和行为 -->
            <el-icon v-tooltip="route.locked ? '航线已锁定，点击解锁' : '航线设置'" class="action-icon"
              :class="{ 'locked-icon': route.locked }" @click.stop="
                route.locked ? toggleRouteLock(route.id) : setRoute(route)
                ">
              <template v-if="route.locked">
                <Lock />
              </template>
              <template v-else>
                <Edit />
              </template>
            </el-icon>
            <el-popconfirm v-if="!route.locked" width="240" :title="`确定要删除航线「${route.title}」吗？此操作不可恢复。`"
              confirm-button-text="确定删除" cancel-button-text="取消" :disabled="isDeleting"
              @confirm="() => handleDeleteConfirm(route.id)">
              <template #reference>
                <el-icon v-tooltip="'删除航线'" class="action-icon deleteIcon" @click.stop>
                  <Delete />
                </el-icon>
              </template>
            </el-popconfirm>

            <!-- 使用封装的下拉菜单组件 -->
            <RouteCardActionsDropdown :actions="routeCardActions" :route-id="route.id" :is-locked="route.locked"
              :route-type="route.type" @command="handleCardAction" />
          </div>
        </div>
        <!-- 如果没有航线，可以显示一个提示 -->
        <div v-if="routes.length === 0" class="no-routes-message">
          暂无航线数据。
        </div>
      </div>
      <div class="actions">
        <el-pagination v-model:current-page="pageOptions.page" v-model:page-size="pageOptions.size" :background="false"
          :pager-count="5" size="small" layout="prev, pager, next,total" :total="pageOptions.total"
          class="white-el-pagination" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
      <div class="checkbox-container">
        <el-checkbox v-model="switchVisibleLabel" label="航点名称和高度标注" size="large"
          @change="handleSwitchVisibleLabelChange" />
      </div>
    </div>

    <!-- 航线设置面板组件，现在是 el-drawer -->
    <RouteSettingsPanel v-if="showRouteSettingsPanel" :visible="showRouteSettingsPanel" :points="points"
      :currentRouteType="currentRouteType" :currentRoute="currentRoute" :isSaving="isSaving"
      @close="handleSettingsPanelClose" @confirm="handleSettingConfirm" />

    <!-- 航线置信度面板组件，现在是 el-drawer -->
    <RouteConfidencePanel v-if="showConfidencePanel" :visible="showConfidencePanel" :loading="confidenceLoading"
      :status="confidenceStatus" :list="confidenceList" :routeName="confidenceRouteName"
      @close="closeConfidencePanel" />

    <!-- 创建航线对话框组件 -->
    <CreateRouteDialog :visible="showCreateRouteDialog" :points="points" :routeType="routeType"
      @update:visible="showCreateRouteDialog = $event" @confirm="handleCreateRouteConfirm" />

    <!-- 导入航线对话框组件 -->
    <ImportRouteDialog :visible="showImportDialog" @update:visible="handleCloseImport" />

    <!-- 新增：重命名航线对话框组件 -->
    <RenameRouteDialog :visible="showRenameDialog" :initialRouteName="renamingRouteName" :routeId="renamingRouteId"
      @update:visible="showRenameDialog = $event" @confirm="handleRenameConfirm" @cancel="handleRenameCancel" />

    <!-- 新增：移动航线对话框组件 -->
    <MoveRouteDialog :visible="showMoveDialog" :selectedRouteCount="1" :routeId="movingRouteId"
      @update:visible="showMoveDialog = $event" @confirm="handleMoveConfirm" @cancel="handleMoveCancel" />

    <!-- 新增：复制航线对话框组件 -->
    <CopyRouteDialog :visible="showCopyDialog" :initialRouteName="copyingRouteName" :routeId="copyingRouteId"
      @update:visible="showCopyDialog = $event" @confirm="handleCopyConfirm" @cancel="handleCopyCancel" />

    <!-- 新增：删除航线对话框组件 -->
    <DeleteRouteDialog :visible="showDeleteDialog" :routeName="deletingRouteName" :routeId="deletingRouteId"
      :isDeleting="isDeleting" @update:visible="showDeleteDialog = $event" @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel" />

    <!-- 新增：航线拼接抽屉组件 -->
    <SpliceRouteDrawer :visible="showSpliceRouteDrawer" :initialRoute="splicingInitialRoute" :allRoutes="routes"
      @update:visible="showSpliceRouteDrawer = $event" @close="handleSpliceDrawerClose"
      @confirm-splice="handleSpliceConfirm" />

    <WaypointDialog v-if="showWaypointDialog" ref="waypointDialog" :routeId="selectedRouteId"
      @handleShowSettingsPanel="handleShowSettingPanel" @close="showWaypointDialog = false" />
    <MapVerticalToolbar :routeId="selectedRouteId" v-if="showWaypointDialog" />
    <!-- <MapBottomToolbar :routeId= "selectedRouteId" v-if="showWaypointDialog" /> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Upload,
  Plus,
  Scissor,
  Location,
  Crop,
  TrendCharts,
  Edit,
  Lock,
  Close,
  Delete,
} from "@element-plus/icons-vue"; // 导入需要的 Element Plus 图标，新增 Lock
import RouteCardActionsDropdown from "./components/RouteCardActionsDropdown.vue"; // 导入下拉菜单组件
import CreateRouteDialog from "./components/CreateRouteDialog.vue"; // 导入新的创建航线对话框组件
import RouteSettingsPanel from "./components/RouteSettingsPanel.vue"; // 导入新的航线设置面板组件
import RouteConfidencePanel from "./components/RouteConfidencePanel.vue";
import {
  $addflight,
  $removeflight,
  $editflight,
  $exportflight,
  $saveFlightPoints,
  $getObstacleAvoidanceRoutePath,
  $saveRouteGrids,
  $getRouteConfidenceScore,
} from "@/api/flyControl/flight";
import { ElMessage } from "element-plus";
import emitter from "@/stores/mitt";
import { CesiumMapManager } from "@/map-system";

// 导入新的导入航线对话框组件
import ImportRouteDialog from "./components/ImportRouteDialog.vue";
import RenameRouteDialog from "./components/RenameRouteDialog.vue"; // 导入新的重命名对话框组件
import MoveRouteDialog from "./components/MoveRouteDialog.vue"; // 导入新的移动对话框组件
import CopyRouteDialog from "./components/CopyRouteDialog.vue"; // 导入新的复制对话框组件
import DeleteRouteDialog from "./components/DeleteRouteDialog.vue"; // 导入新的删除对话框组件
import SpliceRouteDrawer from "./components/SpliceRouteDrawer.vue"; // 新增：导入航线拼接抽屉组件
import WaypointDialog from "./components/WaypointDialog.vue";
import MapVerticalToolbar from "./components/MapVerticalToolbar.vue";
import {
  GetAllFlight,
  editFlight,
  getRouteDetail,
} from "@/transform/routeList.ts";
import type { PageOptions } from "@/model/commonModel.ts";
import {
  clearAllWaypoints,
  clearAllAreaPoints,
  getWaypoints,
  setWaypointRoutePoints,
  getClosedAreaPoints,
  locateToWaypoint,
  loadAirLine,
  switchVisibleLabelHandler,
  clearAllRouteLayers, // 导入新函数
  setDrawMode,
  stopEditingAreaPolygon,
  getStripCenterlinePointsSmart,
  startEditingAreaPolygonByRoute,
  startEditingStripWith,
  // @ts-ignore
} from "@/services/waypointService";
import type { Waypoint } from "@/components/common/3d/types";
import type { RouteDataItem } from "@/model/routeLibraryModel";

const router = useRouter();

const emits = defineEmits(["selectRoute", "handleCloseDialog"]);
declare const Cesium: any;
const getViewer = () => (window as any).__cesiumViewer;
let viewer: any = null;
let mapManager: any = null;
let baseMapHandler: any = null;
let switchVisibleLabel = ref(true);
// 处理航点名称和高度标注显隐切换
const handleSwitchVisibleLabelChange = (val: boolean) => {
  switchVisibleLabelHandler(val, currentSelectedRoute.value.id);
};

const props = withDefaults(
  defineProps<{
    showBtns?: boolean;
    defaultSelectedRouteId?: string | number | null;
  }>(),
  {
    showBtns: true,
    defaultSelectedRouteId: null,
  },
);

const handleCloseImport = (flag: boolean) => {
  showImportDialog.value = flag;
  getAllflight(false);
};

// 搜索表单
const searchForm = ref<{ routeName: string }>({ routeName: "" });

// 示例航线数据数组
const routes = ref<any[]>([]);

// 触发搜索（远端接口筛选）
const handleSearch = () => {
  getAllflight(false, searchForm.value.routeName);
};

const points = ref();
const obstacleAvoidancePoints = ref<number[][]>([]);
const areaPlannedRoutePoints = ref<number[][]>([]);
const areaClosedPolygonPoints = ref<any[]>([]);
const stripPlannedRoutePoints = ref<number[][]>([]);
const stripCenterlineRoutePoints = ref<number[][]>([]);
const stripBufferPolygons = ref<any[]>([]);
const lastObstacleAvoidanceGridCodes = ref("");
const lastObstacleAvoidanceSucceeded = ref(false);
const showConfidencePanel = ref(false);
const confidenceLoading = ref(false);
const confidenceStatus = ref<number | null>(null);
const confidenceList = ref<Array<{ gridCode: string; score: number }>>([]);
const confidenceRouteName = ref("");
const confidenceRouteId = ref<string | null>(null);
const confidenceRequestSeq = ref(0);
const isWaypointDrawing = ref(false);
const beidouGridVisitedCodes = new Set<string>();
const selectedPlanningLevel = ref(7);
const isSaving = ref(false);
const routeDetailLoading = ref(false);
const isDeleting = ref(false);

// 当前选中的航线ID
const currentSelectedRoute = ref<any>({});

// 当前选中的航线ID
const selectedRouteId = ref<any>(null);

// 当前选中的航线类型 (例如: 'waypoint', 'mapping', 'linear')
const currentRouteType = ref("0"); // 添加点：定义 currentRouteType ref，并初始化为 'waypoint'

const currentRoute = ref();

// 控制创建航线对话框的显示状态
const showCreateRouteDialog = ref(false);

// 控制航线设置面板的显示状态
const showRouteSettingsPanel = ref(false); // 添加这一行

// 控制导入航线对话框的显示/隐藏
const showImportDialog = ref(false);

// 重命名对话框相关状态 (现在用于向子组件传递数据)
const showRenameDialog = ref(false);
const renamingRouteId = ref<number | string | null>(null);
const renamingRouteName = ref("");
const routeType = ref("");

// 移动对话框相关状态
const showMoveDialog = ref(false);
const movingRouteId = ref<number | string | null>(null);

// 复制对话框相关状态
const showCopyDialog = ref(false);
const copyingRouteId = ref<number | string | null>(null);
const copyingRouteName = ref("");

// 删除对话框相关状态
const showDeleteDialog = ref(false);
const deletingRouteId = ref<number | string | null>(null);
const deletingRouteName = ref("");

// 航线拼接抽屉相关状态
const showSpliceRouteDrawer = ref(false);
const splicingInitialRoute = ref<any>(null); // 用于存储要拼接的初始航线数据

const pageOptions = ref<PageOptions>({
  page: 1,
  size: 10,
  total: 0,
});
const routeListLoading = ref(false);

const routeTypeLabelMap: Record<string, string> = {
  "0": "航点航线",
  "1": "面状航线",
  "2": "巡逻航线",
  "3": "带状航线",
};

const routeTypeIconMap: Record<string, any> = {
  "0": Location,
  "1": Crop,
  "2": Scissor,
  "3": TrendCharts,
};

const getRouteType = (route: any) =>
  String(
    route?.type ?? route?.templateType ?? route?.routeInfo?.templateType ?? "",
  );

const getRouteTypeLabel = (route: any) => {
  const type = getRouteType(route);
  return routeTypeLabelMap[type] || "未知航线";
};

const getRouteTypeIcon = (route: any) => {
  const type = getRouteType(route);
  return routeTypeIconMap[type] || Location;
};

emitter.on("save-settings", (settings: any) => {
  handleSavePath(settings);
});

emitter.on("save-flight-points", (waypoints: any) => {
  handleSaveFlightPoints(waypoints);
});

emitter.on("reset-map", () => {
  clearRouteLayersWithGrids();
  isWaypointDrawing.value = false;
  obstacleAvoidancePoints.value = [];
  areaPlannedRoutePoints.value = [];
  areaClosedPolygonPoints.value = [];
  stripPlannedRoutePoints.value = [];
  stripCenterlineRoutePoints.value = [];
  stripBufferPolygons.value = [];
  lastObstacleAvoidanceGridCodes.value = "";
  lastObstacleAvoidanceSucceeded.value = false;
  showConfidencePanel.value = false;
  confidenceLoading.value = false;
  confidenceStatus.value = null;
  confidenceList.value = [];
  confidenceRouteName.value = "";
  confidenceRouteId.value = null;
  getAllflight(false);
});

const normalizePointsToArray = (raw: any[], defaultAlt: number) => {
  const result: number[][] = [];
  (raw || []).forEach((p: any) => {
    if (Array.isArray(p)) {
      const lon = Number(p[0]);
      const lat = Number(p[1]);
      const alt = Number(p[2] ?? defaultAlt);
      if (Number.isFinite(lon) && Number.isFinite(lat)) {
        result.push([lon, lat, Number.isFinite(alt) ? alt : defaultAlt]);
      }
      return;
    }
    const lon = Number(p?.longitude ?? p?.lon ?? p?.lng);
    const lat = Number(p?.latitude ?? p?.lat);
    const alt = Number(p?.altitude ?? p?.height ?? p?.z ?? defaultAlt);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      result.push([lon, lat, Number.isFinite(alt) ? alt : defaultAlt]);
    }
  });
  return result;
};
// 获取航线的航点JSON坐标
const getRoutePointJsonCoordinates = (routeInfo: any) => {
  const rawRoutePointJson =
    routeInfo?.routePointJson || routeInfo?.routePoint?.routePointJson;
  if (!rawRoutePointJson) return [];
  let routePointJson = rawRoutePointJson;
  if (typeof routePointJson === "string") {
    try {
      routePointJson = JSON.parse(routePointJson);
    } catch {
      return [];
    }
  }
  return Array.isArray(routePointJson?.coordinates)
    ? routePointJson.coordinates
    : [];
};
// 获取面状航线的区域多边形点
const getAreaPolygonPoints = (
  rawPoints: any[],
  routeInfo: any,
  defaultAlt: number,
) => {
  if (Array.isArray(rawPoints) && rawPoints.length > 0) return rawPoints;
  if (Array.isArray(routeInfo?.mappingTypeReq?.coordinatesJson)) {
    return routeInfo.mappingTypeReq.coordinatesJson;
  }
  const geoJsonCoordinates =
    routeInfo?.mappingTypeReq?.coordinatesGeoJson?.coordinates;
  if (Array.isArray(geoJsonCoordinates?.[0])) {
    return normalizePointsToArray(geoJsonCoordinates[0], defaultAlt);
  }
  return [];
};
// 获取面状航线的区域航线点
const getAreaRouteLinePoints = (routeInfo: any, defaultAlt: number) => {
  if (areaPlannedRoutePoints.value.length > 0) {
    return areaPlannedRoutePoints.value;
  }
  if (
    Array.isArray(routeInfo?.routePointList) &&
    routeInfo.routePointList.length > 0
  ) {
    return normalizePointsToArray(routeInfo.routePointList, defaultAlt);
  }
  return normalizePointsToArray(
    getRoutePointJsonCoordinates(routeInfo),
    defaultAlt,
  );
};
// 获取带状航线的中心线点
const getStripCenterlineRoutePoints = (routeInfo: any, defaultAlt: number) => {
  if (stripCenterlineRoutePoints.value.length > 0) {
    return stripCenterlineRoutePoints.value;
  }
  const centerlineCoordinates =
    routeInfo?.stripLineRoute?.centerlineJson?.coordinates;
  if (
    Array.isArray(centerlineCoordinates) &&
    centerlineCoordinates.length > 0
  ) {
    return normalizePointsToArray(centerlineCoordinates, defaultAlt);
  }
  return [];
};
// 获取带状航线的规划航线点
const getStripRouteLinePoints = (routeInfo: any, defaultAlt: number) => {
  if (stripPlannedRoutePoints.value.length > 0) {
    return stripPlannedRoutePoints.value;
  }
  if (
    Array.isArray(routeInfo?.routePointList) &&
    routeInfo.routePointList.length > 0
  ) {
    return normalizePointsToArray(routeInfo.routePointList, defaultAlt);
  }
  return normalizePointsToArray(
    getRoutePointJsonCoordinates(routeInfo),
    defaultAlt,
  );
};
// 构建面状航线的航点操作列表
const buildAreaRoutePointActions = () => [
  {
    actionIndex: 0,
    actionActuatorFunc: "gimbalRotate",
    gimbalPitchRotateAngle: -90,
  },
  {
    actionIndex: 1,
    actionActuatorFunc: "zoom",
    zoom: 1,
  },
  {
    actionIndex: 2,
    actionActuatorFunc: "takePhoto",
    useGlobalImageFormat: 1,
    imageFormat: "visable",
  },
];
// 构建面状航线的航点列表
const buildAreaRoutePointList = (
  routePoints: number[][],
  defaultHeight: number,
  speed: number,
) => {
  return routePoints.map((point: number[], index: number) => {
    const longitude = Number(point[0]);
    const latitude = Number(point[1]);
    const height = Number(point[2] ?? defaultHeight);
    const normalizedHeight = Number.isFinite(height) ? height : defaultHeight;
    return {
      pointIndex: index,
      longitude,
      latitude,
      height: normalizedHeight,
      speed,
      waypointHeading: {
        waypointHeadingMode: "0",
        waypointHeadingAngle: 0,
      },
      waypointTurn: {
        waypointTurnMode: "0",
        useStraightLine: 0,
      },
      gimbalPitchAngle: -90,
      actions: buildAreaRoutePointActions(),
      locationJson: {
        coordinates: [longitude, latitude, normalizedHeight],
        type: "Point",
      },
    };
  });
};
// 构建带状航线的航点操作列表
const buildStripRoutePointActions = (stripMode: string) => {
  if (stripMode === "single") {
    return [
      {
        actionIndex: 0,
        actionActuatorFunc: "gimbalRotate",
        gimbalPitchRotateAngle: -90,
      },
      {
        actionIndex: 1,
        actionActuatorFunc: "zoom",
        zoom: 1,
      },
      {
        actionIndex: 2,
        actionActuatorFunc: "takePhoto",
        useGlobalImageFormat: 0,
        imageFormat: "wide",
      },
    ];
  }
  return [
    {
      actionIndex: 0,
      actionActuatorFunc: "gimbalRotate",
      gimbalYawRotateAngle: 0,
      gimbalPitchRotateAngle: -90,
    },
    {
      actionIndex: 1,
      actionActuatorFunc: "zoom",
      zoom: 1,
    },
    {
      actionIndex: 2,
      actionActuatorFunc: "takePhoto",
    },
  ];
};
// 构建带状航线的航点列表
const buildStripRoutePointList = (
  routePoints: number[][],
  defaultHeight: number,
  stripMode: string,
  speed: number,
) => {
  const normalizedSpeed =
    stripMode === "single"
      ? Number.isFinite(speed) && speed > 0
        ? speed
        : 5
      : Number.isFinite(speed) && speed > 0
        ? speed
        : 10;
  return routePoints.map((point: number[], index: number) => {
    const longitude = Number(point[0]);
    const latitude = Number(point[1]);
    const height = Number(point[2] ?? defaultHeight);
    const normalizedHeight = Number.isFinite(height) ? height : defaultHeight;
    return {
      pointIndex: index,
      longitude,
      latitude,
      height: normalizedHeight,
      speed: normalizedSpeed,
      gimbalPitchAngle: -90,
      actions: buildStripRoutePointActions(stripMode),
      actionTrigger:
        stripMode === "single"
          ? {
            actionTriggerType: "reachPoint",
            actionTriggerParam: 0,
          }
          : null,
      locationJson: {
        coordinates: [longitude, latitude, normalizedHeight],
        type: "Point",
      },
    };
  });
};
// 构建航线的 routePointJson
const buildRoutePointJson = (routePoints: number[][]) => {
  return {
    type: "LineString",
    coordinates: routePoints.map((point: number[]) => [
      Number(point[0]),
      Number(point[1]),
      Number(point[2] ?? 0),
    ]),
  };
};

const formatWaypointHeight = (val: any) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-6) return String(rounded);
  return n.toFixed(1);
};

const applyWaypointHeightLabelToLineData = (lineData: any) => {
  const features = Array.isArray(lineData?.features) ? lineData.features : [];
  if (features.length === 0) return;

  let autoIndex = 1;
  features.forEach((f: any) => {
    const g = f?.geometry;
    if (g?.type !== "Point" || !Array.isArray(g.coordinates)) return;
    const h = formatWaypointHeight(g.coordinates[2]);
    if (!h) return;
    const rawIdx = Number(f?.properties?.name);
    const idx = Number.isFinite(rawIdx) ? rawIdx : autoIndex++;
    if (!f.properties) f.properties = {};
    f.properties.name = `${idx}\n高度:${h}m`;
    f.properties.height = h;
  });
};

// 渲染避障航线到地图
const renderAvoidanceRouteToMap = (coords: number[][]) => {
  if (!coords || coords.length < 2) return;
  const baseProps =
    currentSelectedRoute.value?.routeInfo || currentRoute.value || {};
  const features: any[] = [];
  const lineFeature: any = {
    type: "FeatureCollection",
    features,
  };

  features.push({
    type: "Feature",
    properties: {
      ...baseProps,
      routeType: "waypoint",
    },
    geometry: {
      type: "LineString",
      coordinates: coords.map((c) => [c[0], c[1], c[2]]),
    },
  });
  coords.forEach((c, idx) => {
    const pointHeight = formatWaypointHeight(c[2]) || "0";
    features.push({
      type: "Feature",
      properties: {
        ...baseProps,
        name: `${idx + 1}\n高度:${pointHeight}m`,
        height: pointHeight,
        status: 1,
        routeType: "waypoint",
      },
      geometry: {
        type: "Point",
        coordinates: [c[0], c[1], c[2]],
      },
    });
  });
  clearAllRouteLayers(); // 清除所有航线
  lineFeature.__noFlyTo = true;
  loadAirLine(lineFeature);
};

const beidouGridDataSourceId = "obstacle-avoidance-grids";

// 清除所有避障网格
const clearBeidouGrids = () => {
  if (!mapManager) return;
  try {
    mapManager.removeDataSource(beidouGridDataSourceId);
  } catch { }
  beidouGridVisitedCodes.clear();
};

// 清除所有航线和避障网格
const clearRouteLayersWithGrids = (
  options: { notifyWaypoints?: boolean } = {},
) => {
  clearAllRouteLayers({ notify: options.notifyWaypoints !== false });
  clearBeidouGrids();
};

const resetWaypointRouteSettingsPanel = () => {
  emitter.emit("reset-map");
  emitter.emit("beidou-route-path", []);
  emitter.emit("changeAdding", false);
  try {
    setDrawMode(null);
  } catch { }
  try {
    stopEditingAreaPolygon();
  } catch { }
};

// 渲染避障网格到地图
const renderBeidouGridsToMap = (list: any[]) => {
  if (!mapManager) return;
  if (!Array.isArray(list) || list.length === 0) return;
  try {
    clearBeidouGrids();
    list.forEach((item: any) => {
      const key = [
        item?.west,
        item?.east,
        item?.south,
        item?.north,
        item?.minHeight,
        item?.maxHeight,
        item?.status,
        item?.gridCode,
      ]
        .map((v) => String(v ?? ""))
        .join("|");
      if (beidouGridVisitedCodes.has(key)) return;
      beidouGridVisitedCodes.add(key);
      const west = Number(item.west);
      const east = Number(item.east);
      const south = Number(item.south);
      const north = Number(item.north);
      const minHeight = Number(item.minHeight);
      const maxHeight = Number(item.maxHeight);
      if (
        !Number.isFinite(west) ||
        !Number.isFinite(east) ||
        !Number.isFinite(south) ||
        !Number.isFinite(north) ||
        !Number.isFinite(minHeight) ||
        !Number.isFinite(maxHeight)
      ) {
        return;
      }
      const status = Number(item.status);
      const isFree = status === 0;
      const options = isFree
        ? {
          // fillColor: "#00FF00",
          // fillAlpha: 0.1,
          // outlineColor: "#00FF00",
          fillColor: "#B1EDAF",
          fillAlpha: 0.6, // 透明填充
          outlineColor: "#B1EDAF",
          outlineWidth: 1,
          show: true,
        }
        : {
          fillColor: "#FF0000",
          fillAlpha: 0.4,
          outlineColor: "#FF0000",
          outlineWidth: 1,
          show: true,
        };
      mapManager.addBeidouGridCell(
        beidouGridDataSourceId,
        {
          minLon: west,
          maxLon: east,
          minLat: south,
          maxLat: north,
          minHeight,
          maxHeight,
        },
        options,
      );
    });
  } catch (e) {
    console.error(e);
  }
};

const collectGridCodesFromAvoidanceData = (data: any) => {
  const codes = new Set<string>();
  const list = [
    ...(Array.isArray(data?.flight_grids) ? data.flight_grids : []),
    ...(Array.isArray(data?.obstacle_grids) ? data.obstacle_grids : []),
  ];
  list.forEach((item: any) => {
    const code = String(item?.gridCode ?? "").trim();
    if (code) codes.add(code);
  });
  return Array.from(codes).join(",");
};

const saveObstacleAvoidanceGrids = async (routeId: string) => {
  if (!lastObstacleAvoidanceSucceeded.value) return;
  const gridCode = lastObstacleAvoidanceGridCodes.value;
  if (!gridCode) return;
  try {
    const res: any = await $saveRouteGrids({ routeId, gridCode });
    if (res?.code !== 200) {
      ElMessage.error(
        JSON.stringify({
          msg: res?.msg || res?.message || "保存网格失败",
          code: res?.code,
        }),
      );
    }
  } catch (e: any) {
    const msg =
      e?.response?.data?.msg ||
      e?.response?.data?.error ||
      e?.message ||
      "保存网格失败";
    const code = e?.response?.data?.code;
    ElMessage.error(JSON.stringify({ msg, code }));
  }
};

// 请求避障航线
const requestObstacleAvoidance = async (coords: number[][]) => {
  if (!coords || coords.length < 2) return null;
  ElMessage.info(`避障请求：${coords.length} 个点`);
  emitter.emit("obstacle-avoidance-loading", true);
  lastObstacleAvoidanceGridCodes.value = "";
  lastObstacleAvoidanceSucceeded.value = false;
  const payload = {
    level: selectedPlanningLevel.value,
    points: coords.map((c) => [c[0], c[1], c[2]]),
    // 行程点沿途找附近无碰撞的格点进行水平吸附，成功时响应会多出 adjustments 数组，标记每个被偏移点的原始坐标、生效坐标和偏移距离
    auto_snap: true,
    // max_snap_distance_m: 10,
  };

  let res: any;
  try {
    res = await $getObstacleAvoidanceRoutePath(payload);
  } catch (e: any) {
    const errMsg =
      e?.response?.data?.error || e?.response?.data?.msg || e?.message;
    ElMessage.error(errMsg || "避障航线获取失败");
    return null;
  } finally {
    emitter.emit("obstacle-avoidance-loading", false);
  }
  // 检查响应状态
  const success = res?.success === true;
  if (!success) {
    ElMessage.error(res?.error || res?.msg || "避障航线获取失败");
    return null;
  }

  const data = res?.data?.data ?? res?.data ?? res;
  lastObstacleAvoidanceGridCodes.value =
    collectGridCodesFromAvoidanceData(data);
  lastObstacleAvoidanceSucceeded.value = true;
  const gridList = [
    ...(Array.isArray(data?.flight_grids) ? data.flight_grids : []),
    ...(Array.isArray(data?.obstacle_grids) ? data.obstacle_grids : []),
  ];
  if (gridList.length > 0) {
    // 如果有避障网格数据，先渲染网格再处理航线数据
    renderBeidouGridsToMap(gridList);
  }
  // 从数据中提取避障航线
  const list = data?.flight_geo_centers || [];

  if (!Array.isArray(list) || list.length < 2) {
    ElMessage.warning("避障航线为空");
    return null;
  }

  const normalized = normalizePointsToArray(list, coords[0]?.[2] ?? 115);
  ElMessage.success(`避障返回：${normalized.length} 个点`);
  return normalized;
};

// 处理避障航线绘制右键点击事件
const handleWaypointDrawRightClick = async () => {
  if (!showRouteSettingsPanel.value) return;
  if (String(currentRouteType.value) !== "0") return;
  if (!isWaypointDrawing.value) return;
  isWaypointDrawing.value = false;

  const defaultAlt = 115;
  setTimeout(async () => {
    try {
      const waypointRaw = getWaypoints?.() || [];
      const stripRaw = getStripCenterlinePointsSmart?.() || [];
      const raw =
        Array.isArray(waypointRaw) && waypointRaw.length > 0
          ? waypointRaw
          : stripRaw;
      const coords = normalizePointsToArray(raw, defaultAlt);
      if (coords.length < 2) return;

      const avoided = await requestObstacleAvoidance(coords);
      if (!avoided || avoided.length < 2) return;

      obstacleAvoidancePoints.value = avoided;
      points.value = avoided;
      renderAvoidanceRouteToMap(avoided);
      setWaypointRoutePoints(avoided, { render: false });
      ElMessage.success("避障航线已生成");
      emitter.emit("changeAdding", true);
    } catch (e) {
      console.error(e);
    }
  }, 80);
};

// 全局上下文菜单捕获事件
const onGlobalContextMenuCapture = () => {
  if (!isWaypointDrawing.value) return;
  handleWaypointDrawRightClick();
};

// 航点绘制开始事件
const onWaypointDrawingStart = () => {
  isWaypointDrawing.value = true;
  obstacleAvoidancePoints.value = [];
};

// 区域航线点改变事件
const onAreaRoutePointsChange = (payload: any) => {
  areaPlannedRoutePoints.value = normalizePointsToArray(
    payload?.flightCenters || [],
    100,
  );
  areaClosedPolygonPoints.value = Array.isArray(payload?.closedPoints)
    ? payload.closedPoints
    : [];
  points.value = areaPlannedRoutePoints.value;
  if (Array.isArray(payload?.gridList) && payload.gridList.length > 0) {
    renderBeidouGridsToMap(payload.gridList);
    return;
  }
  clearBeidouGrids();
};
// 带状航线点改变事件
const onStripRoutePointsChange = (payload: any) => {
  stripCenterlineRoutePoints.value = normalizePointsToArray(
    payload?.centerlinePoints || [],
    100,
  );
  stripPlannedRoutePoints.value = normalizePointsToArray(
    payload?.flightCenters || [],
    100,
  );
  stripBufferPolygons.value = Array.isArray(payload?.bufferPolygons)
    ? payload.bufferPolygons
    : [];
  points.value =
    stripPlannedRoutePoints.value.length > 0
      ? stripPlannedRoutePoints.value
      : stripCenterlineRoutePoints.value;
  if (Array.isArray(payload?.gridList) && payload.gridList.length > 0) {
    renderBeidouGridsToMap(payload.gridList);
    return;
  }
  clearBeidouGrids();
};

// 航点绘制结束事件
emitter.on("waypoint-route-drawing-start", onWaypointDrawingStart);
emitter.on("area-route-points-change", onAreaRoutePointsChange);
emitter.on("strip-route-points-change", onStripRoutePointsChange);

// 添加缺失的分页处理函数
const handleSizeChange = (size: number) => {
  pageOptions.value.size = size;
  getAllflight(false);
};

// 分页当前页改变事件
const handleCurrentChange = (page: number) => {
  pageOptions.value.page = page;
  getAllflight(false);
};

// 定义航线卡片操作的下拉菜单项
const routeCardActions = [
  { command: "simulate", label: "飞行模拟" },
  { command: "confidenceScore", label: "航线置信度" },
  { command: "rename", label: "重命名" },
  { command: "download", label: "下载" },
  // { command: "createRouteFile", label: "生成" },
];
// 平滑飞行到航线概览
const flyToRouteOverviewSmooth = (routeData: any) => {
  if (!viewer || !Cesium) return;
  const lons: number[] = [];
  const lats: number[] = [];

  const pushLonLat = (p: any) => {
    const lon = Number(p?.[0]);
    const lat = Number(p?.[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      lons.push(lon);
      lats.push(lat);
    }
  };

  const walkCoords = (coords: any) => {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && typeof coords[0] === "number") {
      pushLonLat(coords);
      return;
    }
    coords.forEach(walkCoords);
  };

  const collectFromGeoJsonLike = (geo: any) => {
    if (!geo) return;
    if (geo.type === "FeatureCollection" && Array.isArray(geo.features)) {
      geo.features.forEach((f: any) => collectFromGeoJsonLike(f));
      return;
    }
    if (geo.type === "Feature") {
      collectFromGeoJsonLike(geo.geometry);
      return;
    }
    if (geo.type && geo.coordinates) {
      walkCoords(geo.coordinates);
    }
  };

  const routePointJson =
    routeData?.routePointJson ||
    routeData?.routeInfo?.routePointJson ||
    routeData?.routeInfo?.routePoint?.routePointJson;
  if (!routePointJson) return;
  let geo: any = routePointJson;
  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return;
    }
  }
  collectFromGeoJsonLike(geo);

  if (lons.length === 0 || lats.length === 0) return;
  let west = Math.min(...lons);
  let east = Math.max(...lons);
  let south = Math.min(...lats);
  let north = Math.max(...lats);
  if (![west, east, south, north].every((v) => Number.isFinite(v))) return;

  try {
    const rect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    const boundingSphere = Cesium.BoundingSphere.fromRectangle3D(rect);
    const distance = Math.max(2000, boundingSphere.radius * 6.0);
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1.2,
      offset: new Cesium.HeadingPitchRange(
        viewer.camera.heading,
        Cesium.Math.toRadians(-90),
        distance,
      ),
    });
  } catch { }
};

// 选择航线卡片
const selectRoute = async (routeId: any) => {
  const selectedRoute = routes.value.find((route) => route.routeId === routeId); // 查找选中的航线
  if (!selectedRoute) {
    currentRouteType.value = ""; // 如果没有选中航线，可以设置为空或其他默认值
    return;
  }
  switchVisibleLabel.value = true;

  closeRoutePanels();
  await displayRouteOnMap(selectedRoute);
};
// 刷新航线列表并选择指定航线
const refreshRouteListAndSelect = async (routeId: any) => {
  await getAllflight(false);
  await nextTick();
  const matchedRoute = routes.value.find(
    (route: any) => String(route?.routeId) === String(routeId),
  );
  if (matchedRoute?.routeId) {
    await selectRoute(matchedRoute.routeId);
    return;
  }
  selectedRouteId.value = routeId;
};

const showWaypointDialog = ref(false);

// 设置航线
const setRoute = async (route: any) => {
  closeRoutePanels();
  await displayRouteOnMap(route);

  showWaypointDialog.value = false;
  showRouteSettingsPanel.value = false;
  showConfidencePanel.value = false;

  if (String(route.type) === "0") {
    showWaypointDialog.value = true;
    waypointDialog?.value?.showVisible();
    return;
  }

  showRouteSettingsPanel.value = true;

  if (String(route.type) === "1") {
    try {
      startEditingAreaPolygonByRoute(currentSelectedRoute.value);
      if (
        currentSelectedRoute.value?.routeInfo?.mappingTypeReq?.coordinatesJson
          ?.length > 0
      ) {
        emitter.emit("changeAdding", true);
      }
    } catch (e) {
      console.error("启动面编辑失败:", e);
    }
  } else if (String(route.type) === "3") {
    try {
      const stripLineRoute =
        currentSelectedRoute.value?.routeInfo?.stripLineRoute;
      if (stripLineRoute?.centerlineJson?.coordinates) {
        emitter.emit("changeAdding", true);
        startEditingStripWith(
          stripLineRoute.centerlineJson.coordinates,
          stripLineRoute.leftExtend,
          stripLineRoute.rightExtend,
          currentSelectedRoute.value.routeId,
        );
      }
    } catch (e) {
      console.error("启动带状航线编辑失败:", e);
    }
  }
};
// 关闭航线面板
function closeRoutePanels() {
  showWaypointDialog.value = false;
  showRouteSettingsPanel.value = false;
  showConfidencePanel.value = false;
  obstacleAvoidancePoints.value = [];
  areaPlannedRoutePoints.value = [];
  areaClosedPolygonPoints.value = [];
  stripPlannedRoutePoints.value = [];
  stripCenterlineRoutePoints.value = [];
  stripBufferPolygons.value = [];
  try {
    setDrawMode(null);
  } catch { }
  emitter.emit("changeAdding", false);
}

async function displayRouteOnMap(route: any) {
  if (!route) return;
  obstacleAvoidancePoints.value = [];
  areaPlannedRoutePoints.value = [];
  areaClosedPolygonPoints.value = [];
  stripPlannedRoutePoints.value = [];
  stripCenterlineRoutePoints.value = [];
  stripBufferPolygons.value = [];
  currentSelectedRoute.value = route;
  selectedRouteId.value = route.routeId;
  currentRouteType.value = route.type;
  const selectedRoute = routes.value.find((r) => r.routeId === route.routeId);
  if (selectedRoute) {
    currentRoute.value = selectedRoute.routeInfo;
  }

  routeDetailLoading.value = true;
  try {
    const { routeData, lineData } = await getRouteDetail(route.routeId);
    currentRoute.value =
      routeData || selectedRoute?.routeInfo || route.routeInfo;
    currentSelectedRoute.value = {
      ...route,
      routeInfo: currentRoute.value,
    };
    clearRouteLayersWithGrids(); // 清除所有航线和避障网格
    try {
      if (lineData && typeof lineData === "object") {
        (lineData as any).__noFlyTo = true;
      }
    } catch { }
    // applyWaypointHeightLabelToLineData(lineData); // 应用航点高度标签
    loadAirLine(lineData); // 加载航线
    flyToRouteOverviewSmooth(routeData); // 平滑飞行到航线
  } finally {
    routeDetailLoading.value = false;
  }

  emits("selectRoute", currentSelectedRoute.value);
  if (String(route.type) === "0") {
    routeType.value = "0";
  } else if (String(route.type) === "1") {
    routeType.value = "1";
  } else if (String(route.type) === "3") {
    routeType.value = "3";
  }
}

// 显示航线设置面板
const handleShowSettingPanel = () => {
  showRouteSettingsPanel.value = true; //设置航线
};

// 保存航线航点
const handleSaveFlightPoints = (waypoints: any) => {
  let droneRoutePoints = waypoints.map((item: any) => {
    return {
      ...item,
      height:
        item.defaultAction.find((action: any) => action.label === "height")
          ?.value || 100.0,
      actions: item.defaultAction
        .filter(
          (e: any) => !["waypointHeadingAngle", "height"].includes(e.label),
        )
        .map((action: any, index: number) => {
          const label = action.label;
          const data = {
            ...action.actParams,
            actionIndex: index,
          };
          if (action.actuatorFunc) {
            data["actionActuatorFunc"] = action.actuatorFunc;
          }
          data[label] = action.value;
          return data;
        }),
    };
  });
  //保存航线航点
  $saveFlightPoints(droneRoutePoints, currentSelectedRoute.value.routeId).then(
    async (res: any) => {
      if (res?.code == 200) {
        ElMessage({ message: `保存成功`, type: "success" });
        clearRouteLayersWithGrids();
        await refreshRouteListAndSelect(currentSelectedRoute.value.routeId);
      } else {
        ElMessage({ message: `保存失败`, type: "error" });
        clearRouteLayersWithGrids();
        await getAllflight(false);
      }
    },
  );
};

const closeConfidencePanel = () => {
  showConfidencePanel.value = false;
};

const openConfidenceScorePanel = async (route: any) => {
  if (!route?.routeId) {
    ElMessage.warning("未找到航线ID");
    return;
  }
  const reqSeq = ++confidenceRequestSeq.value;
  showRouteSettingsPanel.value = false;
  showConfidencePanel.value = true;
  confidenceRouteId.value = String(route.routeId);
  confidenceRouteName.value = String(route.title || "");
  confidenceLoading.value = true;
  confidenceStatus.value = null;
  confidenceList.value = [];
  try {
    const res: any = await $getRouteConfidenceScore({
      routeId: String(route.routeId),
    });
    if (reqSeq !== confidenceRequestSeq.value) return;
    const data = res?.data?.data ?? res?.data ?? res;
    const statusVal = data?.status;
    confidenceStatus.value =
      statusVal === 0 || statusVal === 1 ? statusVal : null;
    const list = Array.isArray(data?.list) ? data.list : [];
    confidenceList.value = list
      .map((item: any) => ({
        gridCode: String(item?.gridCode ?? ""),
        score: Number(item?.score),
      }))
      .filter((item: any) => item.gridCode);
  } catch (e: any) {
    const msg =
      e?.response?.data?.msg ||
      e?.response?.data?.error ||
      e?.message ||
      "获取航线置信度失败";
    ElMessage.error(msg);
  } finally {
    if (reqSeq === confidenceRequestSeq.value) {
      confidenceLoading.value = false;
    }
  }
};

// 处理航线卡片操作下拉菜单的命令
const handleCardAction = ({
  command,
  routeId,
}: {
  command: string;
  routeId: number | string;
}) => {
  const route = routes.value.find((route) => route.id === routeId);
  switch (command) {
    case "simulate":
      if (!route?.routeId) {
        ElMessage.warning("未找到航线ID");
        break;
      }
      router.push({
        path: "/defaultMapPage/flyControl/routeSim",
        query: { routeId: String(route.routeId) },
      });
      break;
    case "rename":
      const routeToRename = routes.value.find((route) => route.id === routeId);
      if (routeToRename) {
        renamingRouteId.value = routeId;
        renamingRouteName.value = routeToRename.title;
        showRenameDialog.value = true; // 显示重命名对话框
      }
      break;
    case "move":
      movingRouteId.value = routeId;
      showMoveDialog.value = true;
      break;
    case "copy":
      const routeToCopy = routes.value.find((route) => route.id === routeId);
      if (routeToCopy) {
        copyingRouteId.value = routeId;
        copyingRouteName.value = `${routeToCopy.title}(1)`; // 默认新名称
        showCopyDialog.value = true;
      }
      break;
    case "download":
      // 执行下载操作
      handleDownload(route?.routeId);
      break;
    // case "createRouteFile":
    //   // 执行下载操作
    //   handleCreateFile(route?.routeId);
    //   break;
    case "lock": // 处理锁定/解锁命令
    case "unlock":
      toggleRouteLock(routeId);
      break;
    case "delete":
      const routeToDelete = routes.value.find((route) => route.id === routeId);
      if (routeToDelete) {
        deletingRouteId.value = routeId;
        deletingRouteName.value = routeToDelete.title;
        showDeleteDialog.value = true; // 显示删除确认对话框
      }
      break;
    case "splice": // 处理航线拼接命令
      const routeToSplice = routes.value.find((route) => route.id === routeId);
      if (routeToSplice) {
        splicingInitialRoute.value = routeToSplice;
        showSpliceRouteDrawer.value = true;
      }
      break;
    case "confidenceScore": // 处理航线置信度
      openConfidenceScorePanel(route);
      break;
    // ... 处理其他命令 ...
    default:
      break;
  }
};

/**
 * 新增航线
 */
function handleAddPath() {
  showCreateRouteDialog.value = true;
  //  新增航线时，清空选中的航线
  selectedRouteId.value = null;
  obstacleAvoidancePoints.value = [];
  areaPlannedRoutePoints.value = [];
  areaClosedPolygonPoints.value = [];
  clearRouteLayersWithGrids();
}

// 保存航线
const bdRouters = ref([]);
emitter.on("beidou-route-path", (path: any) => {
  bdRouters.value = path;
});

// 保存航线
async function handleSavePath(settings: any) {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    //获取绘制航线坐标
    let data = [];
    if (currentRouteType.value == "0") {
      if (obstacleAvoidancePoints.value.length > 0) {
        points.value = obstacleAvoidancePoints.value;
        data = [];
      } else {
        const waypoints: any[] = getWaypoints();
        if (waypoints.length > 0) {
          data = waypoints;
        } else {
          data = bdRouters.value;
        }
      }
    } else if (currentRouteType.value == "1") {
      data = getClosedAreaPoints();
    } else {
      data = getStripCenterlinePointsSmart();
    }
    // emitter.emit("getAirLineData", (data: any) => {
    if (obstacleAvoidancePoints.value.length === 0) {
      const coordinates = [];
      for (let i = 0; i < data.length; i++) {
        coordinates.push([
          data[i].longitude,
          data[i].latitude,
          data[i].altitude,
        ]);
      }
      points.value = coordinates;
    }
    // showCreateRouteDialog.value = true;
    let newRouteData: any = {};
    if (currentSelectedRoute.value) {
      if (currentSelectedRoute.value.type == "0") {
        //航点航线
        newRouteData = {
          routeId: currentSelectedRoute.value.routeId, //航线id
          routeName: currentSelectedRoute.value.title, //航线名称
          routeDesc: currentSelectedRoute.value.routeInfo.routeDesc, //航线描述
          workspaceId: currentSelectedRoute.value.routeInfo.workspaceId,
          templateType: currentSelectedRoute.value.routeInfo.templateType, //	航线类型
          droneType: currentSelectedRoute.value.routeInfo.droneType, //无人机类型
          subDroneType: currentSelectedRoute.value.routeInfo.subDroneType, //无人机子类型
          finishAction: settings.advancedSettings.selectedCompletionAction, //航线结束动作
          exitOnRcLostAction:
            currentSelectedRoute.value.routeInfo.exitOnRcLostAction, //失控动作
          globalHeight:
            currentSelectedRoute.value.routeInfo.globalHeight ||
            settings.heightSettings.routeAltitude ||
            100, //全局航线高度
          autoFlightSpeed: settings.speedSettings.routeSpeed, //全局航线飞行速度
          flyToWaylineMode: settings.climbSettings.flyToWaylineMode, // 爬升模式（垂直、倾斜）
          takeOffSecurityHeight: settings.climbSettings.climbAltitude, // 安全起飞高度
          waypointHeading: {
            waypointHeadingMode: settings.advancedSettings.selectedYawMode, //偏航角类型
          },
          waypointTurn: {
            waypointTurnMode: settings.advancedSettings.selectedWaypointType, //转弯类型
          },
          gimbalPitchMode: settings.advancedSettings.selectedGimbalPitchMode, //云台俯仰角控制模式
          status: currentSelectedRoute.value.routeInfo.status,
          imageFormat: settings.photoSettings.selectedPhotoType.join(),
          routePointList: currentSelectedRoute.value.routeInfo?.routePointList,
          heightMode: settings.heightSettings.selectedHeightMode,
          airspaceManageId: settings.airspaceManageId, //工作区id
          airspaceManageName: settings.airspaceManageName, //工作区名称
        };
        //设置航线路径
        if (points.value.length > 0) {
          newRouteData.routePointList = [];
          newRouteData.takeOffRefPoint =
            points.value[0][1] +
            "," +
            points.value[0][0] +
            "," +
            points.value[0][2];
          // 航点航线
          for (let i = 0; i < points.value.length; i++) {
            let pointObj = {
              pointIndex: i,
              longitude: points.value[i][0],
              latitude: points.value[i][1],
              height: Number(points.value[i][2] ?? 100.0),
              speed: 10,
              waypointHeading: {
                waypointHeadingAngle: 0, // 飞行器偏航角
              },
              actions: [
                {
                  actionIndex: 0,
                  aircraftHeading: 0, // 飞行器偏航角
                  aircraftPathMode: "counterClockwise",
                  actionActuatorFunc: "rotateYaw",
                },
                {
                  actionIndex: 1,
                  gimbalPitchRotateAngle: 0, // 云台俯仰角
                  actionActuatorFunc: "gimbalRotate",
                },
                {
                  actionIndex: 2,
                  zoom: 24, // 变焦
                  actionActuatorFunc: "zoom",
                },
                {
                  actionIndex: 3,
                  takePhotoType: 0, // 0：普通拍照
                  actionActuatorFunc: "takePhoto",
                },
              ],
            };
            newRouteData?.routePointList?.push(pointObj);
          }
        }
      } else if (currentSelectedRoute.value.type == "1") {
        //面状航线
        const routeInfo = currentSelectedRoute.value.routeInfo || {};
        const defaultHeight = Number(
          routeInfo.globalHeight ||
          settings.heightSettings.routeAltitude ||
          100.0,
        );
        const closedPolygonPoints = getAreaPolygonPoints(
          areaClosedPolygonPoints.value.length > 0
            ? areaClosedPolygonPoints.value
            : data,
          routeInfo,
          defaultHeight,
        );
        const routeLinePoints = getAreaRouteLinePoints(
          routeInfo,
          defaultHeight,
        );
        const takeOffPoints =
          routeLinePoints.length > 0
            ? routeLinePoints
            : normalizePointsToArray(closedPolygonPoints, defaultHeight);
        const pointSpeed = Number(settings.globalRouteSpeed);
        newRouteData = {
          routeId: currentSelectedRoute.value.routeId, //航线id
          routeName: currentSelectedRoute.value.title, //航线名称
          routeDesc: routeInfo.routeDesc, //航线描述
          workspaceId: routeInfo.workspaceId,
          templateType: routeInfo.templateType, //	航线类型
          droneType: routeInfo.droneType, //无人机类型
          subDroneType: routeInfo.subDroneType, //无人机子类型
          finishAction: settings.completionAction, //航线结束动作
          exitOnRcLostAction: routeInfo.exitOnRcLostAction, //失控动作
          autoFlightSpeed: Number.isFinite(pointSpeed) ? pointSpeed : 5, //全局航线飞行速度
          status: routeInfo.status,
          heightMode: settings.heightSettings.selectedHeightMode,
          globalHeight: defaultHeight, //全局航线高度
          mappingTypeReq: {
            collectionMethod:
              settings.collectionSettings.selectedCollectionMethod,
            direction: settings.mainRouteAngle,
            elevationOptimizeEnable: settings.elevationOptimizationEnabled
              ? 1
              : 0,
            overlapW: settings.advancedSettings.sideOverlapRate,
            overlapH: settings.advancedSettings.forwardOverlapRate,
            margin: settings.advancedSettings.margin,
            photoMode: settings.advancedSettings.photoMode,
            coordinatesJson: [],
          },
          routePointList: [],
          imageFormat: "wide",
          flyToWaylineMode: settings.climbSettings.flyToWaylineMode, // 爬升模式（垂直、倾斜）
          takeOffSecurityHeight: settings.climbSettings.climbAltitude, // 安全起飞高度
          waypointHeading: {
            waypointHeadingMode: "followWayline", //偏航角类型
          },
          waypointTurn: {
            waypointTurnMode: "toPointAndStopWithDiscontinuityCurvature", //转弯类型
          },
          gimbalPitchMode: "manual", //云台俯仰角控制模式
          airspaceManageId: settings.airspaceManageId, //工作区id
          airspaceManageName: settings.airspaceManageName, //工作区名称
        };
        if (routeLinePoints.length > 0) {
          newRouteData.routePointList = buildAreaRoutePointList(
            routeLinePoints,
            defaultHeight,
            Number.isFinite(pointSpeed) ? pointSpeed : 5,
          );
        }
        if (takeOffPoints.length > 0) {
          newRouteData.takeOffRefPoint =
            takeOffPoints[0][1] +
            "," +
            takeOffPoints[0][0] +
            "," +
            takeOffPoints[0][2];
        }
        newRouteData.mappingTypeReq.coordinatesJson = closedPolygonPoints.map(
          (item: any) => {
            return {
              longitude: Number(item?.longitude ?? item?.[0]),
              latitude: Number(item?.latitude ?? item?.[1]),
              height: Number(item?.altitude ?? item?.height ?? item?.[2] ?? 0),
            };
          },
        );
      } else if (currentSelectedRoute.value.type == "3") {
        //带状航线
        const routeInfo = currentSelectedRoute.value.routeInfo || {};
        const defaultHeight = Number(
          routeInfo.globalHeight ||
          settings.heightSettings.routeAltitude ||
          100.0,
        );
        const centerlinePoints = getStripCenterlineRoutePoints(
          routeInfo,
          defaultHeight,
        );
        const routeLinePoints = getStripRouteLinePoints(
          routeInfo,
          defaultHeight,
        );
        const pointSpeed = Number(settings.globalRouteSpeed);
        const normalizedSpeed = Number.isFinite(pointSpeed) ? pointSpeed : 5;
        const stripMode = settings.stripMode === "single" ? "single" : "bow";
        const takeOffPoints =
          routeLinePoints.length > 0 ? routeLinePoints : centerlinePoints;
        newRouteData = {
          routeId: currentSelectedRoute.value.routeId, //航线id
          routeName: currentSelectedRoute.value.title, //航线名称
          routeDesc: routeInfo.routeDesc, //航线描述
          workspaceId: routeInfo.workspaceId,
          templateType: routeInfo.templateType, //	航线类型
          droneType: routeInfo.droneType, //无人机类型
          subDroneType: routeInfo.subDroneType, //无人机子类型
          finishAction: settings.completionAction, //航线结束动作
          exitOnRcLostAction: routeInfo.exitOnRcLostAction, //失控动作
          autoFlightSpeed: normalizedSpeed, //全局航线飞行速度
          status: routeInfo.status,
          heightMode: settings.heightSettings.selectedHeightMode,
          globalHeight:
            routeInfo.globalHeight ||
            settings.heightSettings.routeAltitude ||
            100.0, //全局航线高度
          stripLineRoute: {
            singleLineEnable: stripMode == "single" ? "1" : "0", // 单航线模式
            cuttingDistance: settings.cuttingDistance || 1000, // 切割距离
            boundaryOptimEnable: settings.sideOptimizationEnabled ? "1" : "0", // 边缘图像优化
            leftExtend: settings.leftExtend, // 左外扩距离
            rightExtend: settings.rightExtend, // 右外扩距离
            includeCenterEnable: settings.includeCenterEnable ? "1" : "0", // 是否包含中心线
            stripUseTemplateAltitude: "0", // 是否开启变高航带
            overlapW: settings.advancedSettings.sideOverlapRate,
            overlapH: settings.advancedSettings.forwardOverlapRate,
            margin: settings.advancedSettings.margin,
            photoMode: settings.advancedSettings.photoMode,
            centerlineJson: {
              type: "LineString",
              coordinates: [],
            },
          },
          routePointList: [],
          routePointJson: null,
          imageFormat: "wide",
          flyToWaylineMode: settings.climbSettings.flyToWaylineMode, // 爬升模式（垂直、倾斜）
          takeOffSecurityHeight: settings.climbSettings.climbAltitude, // 安全起飞高度
          waypointHeading: {
            waypointHeadingMode: "followWayline", //偏航角类型
          },
          waypointTurn: {
            waypointTurnMode: "toPointAndStopWithDiscontinuityCurvature", //转弯类型
          },
          gimbalPitchMode: "manual", //云台俯仰角控制模式
          airspaceManageId: settings.airspaceManageId, //工作区id
          airspaceManageName: settings.airspaceManageName, //工作区名称
        };
        if (routeLinePoints.length > 0) {
          newRouteData.routePointList = buildStripRoutePointList(
            routeLinePoints,
            defaultHeight,
            stripMode,
            normalizedSpeed,
          );
          newRouteData.routePointJson = buildRoutePointJson(routeLinePoints);
        }
        if (takeOffPoints.length > 0) {
          newRouteData.takeOffRefPoint =
            takeOffPoints[0][1] +
            "," +
            takeOffPoints[0][0] +
            "," +
            takeOffPoints[0][2];
        }
        newRouteData.stripLineRoute.centerlineJson.coordinates =
          centerlinePoints.map((item: any) => {
            return [item[0], item[1]];
          });
      }
      if (currentSelectedRoute.value.type == "1") {
        //面状航线
        const { code }: any = await editFlight(newRouteData);
        if (code != 200) return;
        ElMessage({ message: `保存成功`, type: "success" });
        handleSettingsPanelClose();
        clearRouteLayersWithGrids();
        await refreshRouteListAndSelect(newRouteData.routeId);
      } else if (currentSelectedRoute.value.type == "3") {
        //带状航线
        const { code }: any = await editFlight(newRouteData);
        if (code != 200) return;
        ElMessage({ message: `保存成功`, type: "success" });
        handleSettingsPanelClose();
        clearRouteLayersWithGrids();
        await refreshRouteListAndSelect(newRouteData.routeId);
      } else {
        //航点航线
        let res: any;
        try {
          res = await $editflight(newRouteData);
        } catch (e) {
          console.error(e);
        }
        if (res?.code == 200) {
          ElMessage({ message: `保存成功`, type: "success" });
          await saveObstacleAvoidanceGrids(newRouteData.routeId);
          handleSettingsPanelClose();
          clearRouteLayersWithGrids();
          await refreshRouteListAndSelect(newRouteData.routeId);
        } else {
          handleSettingsPanelClose();
        }
      }
    } else {
      // ElMessage({ message: `请绘制航线后提交`, type: 'warning' })
    }
    // });
  } finally {
    isSaving.value = false;
  }
}

function handleClearAllPath() {
  clearAllWaypoints();
  clearAllAreaPoints();
}

// 处理创建航线对话框的确认事件
const handleCreateRouteConfirm = (routeData: any) => {
  // 在这里添加处理创建航线成功后的逻辑，例如刷新列表等
  // 创建新航线后，通常会打开设置面板，并设置新航线的类型
  currentRoute.value = routeData;
  currentRouteType.value = routeData.templateType; // 假设新创建的是航点航线 // 修改点：创建航线后更新 currentRouteType
  showRouteSettingsPanel.value = true;
  if (routeData.templateType == 0) {
    //航点航线
    // emitter.emit("draw_line_string");
    routeType.value = "0";
  } else if (routeData.templateType == 1) {
    //面状航线
    routeType.value = "1";
  }
  $addflight(routeData).then((res: any) => {
    if (res.code == 200) {
      ElMessage({ message: `创建成功`, type: "success" });
      handleClearAllPath();
      getAllflight(true);
    }
  });
};

const handleSettingConfirm = (routeData: any) => {
  $editflight(routeData).then((res: any) => {
    if (res.code == 200) {
      showRouteSettingsPanel.value = false;
      ElMessage({ message: `提交成功`, type: "success" });
      handleClearAllPath();
      getAllflight(false);
    }
  });
};

const waypointDialog = ref<any>();
// 处理航线设置面板关闭事件
const handleSettingsPanelClose = () => {
  showRouteSettingsPanel.value = false; // 关闭面板
  if (currentRouteType.value === "0") {
    waypointDialog?.value?.showVisible();
  }
};

async function getAllflight(flag: boolean, routeName?: string) {
  routeListLoading.value = true;
  try {
    const { data, lineData } = await GetAllFlight(flag, pageOptions, routeName);
    routes.value = data;
    if (flag) {
      const targetRoute = data.find(
        (item: any) => item.title == currentRoute.value.routeName,
      );
      if (targetRoute) {
        selectedRouteId.value = targetRoute.routeId;
        currentSelectedRoute.value = targetRoute;
      }
    }
    showWaypointDialog.value = false;
    // //加载航线
    // try {
    //   if (lineData) {
    //     const airLineData = JSON.parse(JSON.stringify(lineData));
    //     loadAirLine(airLineData);
    //   }
    // } catch (e) {
    //   console.error("Failed to parse airLineData:", e);
    // }
  } finally {
    routeListLoading.value = false;
  }
}

onMounted(async () => {
  await getAllflight(false);
  const wanted = String(props.defaultSelectedRouteId ?? "");
  const matched =
    wanted && Array.isArray(routes.value)
      ? routes.value.find((r: any) => String(r?.routeId) === wanted)
      : null;
  if (matched?.routeId) {
    selectRoute(matched.routeId);
  } else if (!props.showBtns && wanted) {
    selectedRouteId.value = wanted;
  }
  window.addEventListener("contextmenu", onGlobalContextMenuCapture, true);
  viewer = getViewer();
  if (!viewer) {
    baseMapHandler = (v: any) => {
      viewer = v;
      mapManager = new CesiumMapManager(viewer);
    };
    emitter.on("base-map-load", baseMapHandler);
  } else {
    mapManager = new CesiumMapManager(viewer);
  }
});

onBeforeUnmount(() => {
  emitter.off("save-flight-points");
  emitter.off("reset-map");
  emitter.off("save-settings");
  if (props.showBtns) {
    emitter.emit("toggle-left-panel", true);
  }
  emitter.off("waypoint-route-drawing-start", onWaypointDrawingStart);
  emitter.off("area-route-points-change", onAreaRoutePointsChange);
  emitter.off("strip-route-points-change", onStripRoutePointsChange);
  window.removeEventListener("contextmenu", onGlobalContextMenuCapture, true);
  if (baseMapHandler) {
    emitter.off("base-map-load", baseMapHandler);
  }
  clearRouteLayersWithGrids();
});

// 处理重命名对话框的确认事件 (由 RenameRouteDialog 触发)
const handleRenameConfirm = ({
  id,
  newName,
}: {
  id: number | string | null;
  newName: string;
}) => {
  if (id !== null && newName.trim() !== "") {
    const index = routes.value.findIndex((route) => route.id === id);
    if (index !== -1) {
      routes.value[index].routeName = newName.trim();
      // 可以在这里添加保存到后端或本地存储的逻辑
      $editflight(routes.value[index]).then((res: any) => {
        if (res.code == 200) {
          ElMessage({ message: `重命名成功`, type: "success" });
          handleClearAllPath();
          getAllflight(false);
        }
      });
    }
  }
  // 重置状态
  renamingRouteId.value = null;
  renamingRouteName.value = "";
};

// 处理重命名对话框的取消事件 (由 RenameRouteDialog 触发)
const handleRenameCancel = () => {
  // 重置状态
  renamingRouteId.value = null;
  renamingRouteName.value = "";
};

// 处理移动对话框的确认事件 (由 MoveRouteDialog 触发)
const handleMoveConfirm = ({
  routeId,
  targetFolder,
}: {
  routeId: number | string | null;
  targetFolder: string;
}) => {
  console.log(`移动航线 ${routeId} 到文件夹: ${targetFolder}`);
  // 在这里实现实际的移动逻辑，例如更新数据源
  // 假设移动成功后，关闭对话框并重置状态
  showMoveDialog.value = false;
  movingRouteId.value = null;
};

// 处理移动对话框的取消事件 (由 MoveRouteDialog 触发)
const handleMoveCancel = () => {
  showMoveDialog.value = false;
  movingRouteId.value = null;
};

// 处理复制对话框的确认事件 (由 CopyRouteDialog 触发)
const handleCopyConfirm = ({
  originalId,
  newName,
}: {
  originalId: number | string | null;
  newName: string;
}) => {
  if (originalId !== null && newName.trim() !== "") {
    const originalRoute = routes.value.find((route) => route.id === originalId);
    if (originalRoute) {
      // 生成新的唯一ID
      const newId =
        Math.max(
          ...routes.value.map((r) => (typeof r.id === "number" ? r.id : 0)),
        ) + 1;
      const now = new Date();
      const newRoute = {
        ...originalRoute, // 复制所有属性
        id: newId, // 新ID
        title: newName.trim(), // 新名称
        updateTime: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`, // 更新时间
      };
      routes.value.unshift(newRoute); // 将新航线添加到列表最上方
      console.log("复制航线成功:", newRoute);
    }
  }
  // 重置状态
  copyingRouteId.value = null;
  copyingRouteName.value = "";
};

// 处理复制对话框的取消事件 (由 CopyRouteDialog 触发)
const handleCopyCancel = () => {
  // 重置状态
  copyingRouteId.value = null;
  copyingRouteName.value = "";
};

// 新增：处理删除对话框的确认事件 (由 DeleteRouteDialog 触发)
const handleDeleteConfirm = async (routeId: number | string | null) => {
  if (isDeleting.value) return;
  if (showRouteSettingsPanel.value && String(currentRouteType.value) === "0") {
    resetWaypointRouteSettingsPanel();
    showRouteSettingsPanel.value = false;
  }
  if (routeId === null || routeId === undefined || routeId === "") return;

  isDeleting.value = true;
  let removedIndex = -1;
  let removedItem: any = null;
  try {
    removedIndex = routes.value.findIndex((route) => route.id === routeId);
    if (removedIndex !== -1) {
      removedItem = routes.value[removedIndex];
      routes.value.splice(removedIndex, 1);
    }

    const res: any = await $removeflight(routeId);
    if (res?.code == 200) {
      ElMessage({ message: `航线已成功删除。`, type: "success" });
      clearRouteLayersWithGrids();
      getAllflight(false);
      showDeleteDialog.value = false;
      return;
    }

    if (removedItem && removedIndex !== -1) {
      routes.value.splice(removedIndex, 0, removedItem);
    }
  } catch (e) {
    if (removedItem && removedIndex !== -1) {
      routes.value.splice(removedIndex, 0, removedItem);
    }
    console.error(e);
  } finally {
    isDeleting.value = false;
    deletingRouteId.value = null;
    deletingRouteName.value = "";
  }
};

// 新增：处理删除对话框的取消事件 (由 DeleteRouteDialog 触发)
const handleDeleteCancel = () => {
  if (isDeleting.value) return;
  // 重置状态
  deletingRouteId.value = null;
  deletingRouteName.value = "";
};

// 新增：处理下载功能
const handleDownload = (routeId: string) => {
  $exportflight(routeId).then((res: any) => {
    const url = URL.createObjectURL(res);
    const a = document.createElement("a");
    a.href = url;
    a.download = routeId + ".kmz"; // 指定KMZ文件名
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  });
};

// 生成航线文件
const handleCreateFile = (routeId: string) => {
  $exportflight(routeId).then(() => {
    ElMessage.success("生成成功");
  });
};

// 新增：切换航线锁定状态
const toggleRouteLock = (routeId: number | string) => {
  const index = routes.value.findIndex((route) => route.id === routeId);
  if (index !== -1) {
    routes.value[index].locked = !routes.value[index].locked;
    console.log(
      `航线 ${routeId} 锁定状态已切换为: ${routes.value[index].locked}`,
    );
    // 可以在这里添加保存到后端或本地存储的逻辑
  }
};

// 新增：处理航线拼接抽屉关闭事件
const handleSpliceDrawerClose = () => {
  showSpliceRouteDrawer.value = false; // 关闭航线拼接抽屉
};

// 新增：处理航线拼接确认事件
const handleSpliceConfirm = (splicedRoutesList: any[]) => {
  console.log("确认拼接的航线列表:", splicedRoutesList);
  // 在这里处理拼接逻辑，例如生成新的航线并添加到 routes 数组中
  // 假设拼接成功后，关闭抽屉
  showSpliceRouteDrawer.value = false;
};

/**
 * 关闭弹框
 */
const handleCloseDialog = () => {
  emits("handleCloseDialog");
};

// 保证 RouteSettingsPanel 和 WaypointDialog 互斥显示
const syncLeftPanelWithInnerPanels = () => {
  if (!props.showBtns) return;
  emitter.emit(
    "toggle-left-panel",
    !(showRouteSettingsPanel.value || showWaypointDialog.value),
  );
};

watch(showRouteSettingsPanel, (val) => {
  if (val) {
    showWaypointDialog.value = false;
    showConfidencePanel.value = false;
  }
  syncLeftPanelWithInnerPanels();
});
watch(showWaypointDialog, (val) => {
  if (val) {
    showRouteSettingsPanel.value = false;
    showConfidencePanel.value = false;
  }
  syncLeftPanelWithInnerPanels();
});
watch(showConfidencePanel, (val) => {
  if (val) {
    showWaypointDialog.value = false;
    showRouteSettingsPanel.value = false;
  }
});

const locateRoute = (route: RouteDataItem) => {
  if (route && route.longitude && route.latitude) {
    const tempWaypoint: Waypoint = {
      id: String(route.id),
      name: route.title,
      longitude: route.longitude,
      latitude: route.latitude,
      altitude: 1000, // Default altitude for fly-to
      description: "Route Center",
    };
    locateToWaypoint(tempWaypoint);
  } else {
    ElMessage.warning("该航线缺少位置信息");
  }
};
</script>

<style lang="less" scoped>
/* 强制覆盖 Element Plus 输入框样式 */
:deep(.el-input) {
  .el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;

    .el-input__inner {
      background-color: #333 !important;
      color: #ccc !important;
    }
  }

  &.is-focused .el-input__wrapper {
    box-shadow: 0 0 0 1px #2d8cf0 inset !important;
  }
}

.route-library-panel {
  color: #ccc;
  /* 文字颜色适应深色背景 */
  height: 100%;
  /* 确保占据父容器 panel-content 的高度 */
  display: flex;
  /* 应用 Flexbox 布局 */
  flex-direction: row;
  /* 子元素水平排列 */
}

.main-content-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  /* 占据剩余空间 */
  .actions {
    width: 100%;
    padding: 20px 10px;
    height: 65px;
    border-top: 1px solid #4f4f4f;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  /* 左右对齐 */
  align-items: center;
  padding: 10px 20px;
  /* 调整内边距 */
  border-bottom: 1px solid #444;
  /* 底部灰色边框 */
  flex-shrink: 0;
  /* 防止被压缩 */
  font-size: 16px;
  color: #fff;

  .el-icon {
    cursor: pointer;
  }
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: white;
  /* 标题颜色 */
}

.header-actions {
  display: flex;
  gap: 15px;
  /* 图标之间的间距 */
}

.action-icon {
  cursor: pointer;
  color: #ccc;
  /* 默认图标颜色 */
  transition: color 0.2s ease;
  /* 添加颜色过渡 */

  &:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
    color: white;
    /* 鼠标悬停时颜色变亮 */
  }
}

.deleteIcon :hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.12);
}

.route-list {
  flex-grow: 1;
  /* 占据剩余空间 */
  padding: 10px;
  /* 列表内边距 */
  overflow-y: auto;
  /* 内容超出时允许垂直滚动 */
  min-height: 0;
  /* 允许 Flex 项目缩小到小于其内容的最小高度 */
  /* height: calc(100% - 45px); /* 设置高度为父容器高度减去头部高度 */
  /* 移除 calc 高度 */
}

.route-card {
  background-color: rgba(51, 51, 51, 0.6);
  /* 卡片默认背景色 */
  padding: 10px;
  margin-bottom: 10px;
  /* 卡片之间的间距 */
  border-radius: 4px;
  /* 圆角 */
  position: relative;
  /* 用于定位卡片内的操作按钮 */
  cursor: pointer;
  /* 鼠标悬停时显示手型 */
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  /* 添加过渡效果 */
}

.route-card:hover {
  background-color: #444;
  /* 鼠标悬停时背景变浅 */
}

.route-card.active {
  background-color: #444;
  border: 1px solid #007bff;
  /* 选中状态边框变蓝 */
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  /* 预留右侧按钮的空间 */
}

.card-meta {
  font-size: 12px;
  color: #aaa;
  /* 元信息文字颜色 */
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;

  img {
    width: 13px;
    height: 13px;
  }

  .device-info {
    display: flex;
    align-items: center;
    gap: 3px;
  }
}

.route-meta {
  gap: 40px;
}

.device-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-type-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #aaa;
}

.card-meta .route-type-tag .route-type-icon {
  margin-right: 0;
  font-size: 15px;
  color: #aaa;
}

.card-meta .el-icon {
  margin-right: 5px;
  font-size: 14px;
  /* 元信息图标大小 */
  color: #aaa;
  /* 元信息图标颜色 */
}

.card-actions {
  position: absolute;
  /* 绝对定位到卡片右上角 */
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  /* 操作图标间距 */
}

.card-actions .action-icon {
  font-size: 16px;
  /* 卡片内操作图标大小 */
}

.card-actions .action-icon.locked-icon {
  color: #2d8cf0;
  /* 锁定图标的蓝色 */
}

.no-routes-message {
  text-align: center;
  color: #aaa;
  padding-top: 20px;
}

.search-conditions-wrapper {
  width: 100%;
  padding: 10px;

  .search-conditions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
}

.checkbox-container {
  position: fixed;
  bottom: 5px;
  right: 70px;

  :deep(.el-checkbox__label) {
    color: #5ec3d8;
  }

  :deep(.el-checkbox__inner) {
    background-color: transparent;
    border: 1px solid #5ec3d8;
  }

  :deep(.el-checkbox__input.is-checked .el-checkbox__inner:after) {
    // background-color: #5ec3d8;
    border-color: #5ec3d8;
  }

  // border: 2px solid #5ec3d8;
  // border-radius: 4px;
  // background: transparent;
  // color: #5ec3d8 !important;
}
</style>

<style lang="less">
.el-popover.el-popper {
  background: #172c2ce6;
  border: 1px solid #444;
  color: #fff;

  .el-popper__arrow:before {
    background: #172c2ce6;
    border: 1px solid #444;
  }
}
</style>
