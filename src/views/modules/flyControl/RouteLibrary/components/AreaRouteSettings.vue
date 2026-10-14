<!-- 面状航线设置组件 -->
<template>
  <div class="area-settings-container">
    <div class="area-stats">
      <div
        v-for="item in areaStats"
        :key="item.label"
        class="area-stat-block"
        v-tooltip="item.label">
        <img class="area-stat-icon" :src="item.iconSrc" :alt="item.label" />
        <span class="area-stat-value">{{ item.value }}</span>
      </div>
    </div>

    <div class="work-area-section">
      <div class="section-title required-title">工作区</div>
      <el-select
        :model-value="props.airspaceManageId ?? undefined"
        placeholder="请选择工作区（必选）"
        :loading="props.workAreaLoading"
        style="width: 100%"
        @update:model-value="emit('workAreaChange', $event)">
        <el-option
          v-for="area in props.workAreaList"
          :key="area.id"
          :label="area.name"
          :value="area.id" />
      </el-select>
    </div>

    <!-- 参考起飞点按钮 -->
    <div
      v-if="!props.isAdding"
      class="reference-point-button"
      :class="{ disabled: props.isAdding }"
      @click="startAddArea">
      <el-icon :size="18"><MapLocation /></el-icon>
      <span>添加面状航线</span>
    </div>
    <div v-else class="reference-point-button" @click="redrawArea">
      <el-icon :size="18"><RefreshRight /></el-icon>
      <span>重新绘制</span>
    </div>

    <!-- 航点高度模式 -->
    <div class="section height-mode">
      <div class="section-title title-with-tip">
        <span>航点高度模式</span>
        <el-tooltip
          effect="dark"
          placement="right"
          popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>海拔高度：航点高度值相对于海平面高度保持不变。</p>
              <p>相对起飞点高度（ALT）：航点高度值相对起飞点的高度保持不变。</p>
              <p>
                相对地形的高度（AGL）：航点高度值相对地形/模型高度保持不变。
              </p>
            </div>
          </template>
          <el-icon class="title-tip-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div
          class="setting-button"
          :class="{ active: props.selectedHeightMode === 'EGM96' }"
          @click="selectHeightMode('EGM96')">
          海拔高度
        </div>
        <div
          class="setting-button"
          :class="{
            active: props.selectedHeightMode === 'relativeToStartPoint',
          }"
          @click="selectHeightMode('relativeToStartPoint')">
          相对起飞点高度
        </div>
        <div
          class="setting-button"
          :class="{
            active:
              props.selectedHeightMode === 'aboveGroundLevel' ||
              props.selectedHeightMode === 'terrain',
          }"
          @click="selectHeightMode('aboveGroundLevel')">
          相对地形高度
        </div>
      </div>
      <!-- 高度模式示意图和高度调整 -->
      <div class="climb-settings">
        <div class="diagram">
          <img
            v-if="props.selectedHeightMode === 'EGM96'"
            src="/src/assets/svg/海拔高度.svg"
            alt="海拔高度示意图" />
          <img
            v-if="props.selectedHeightMode === 'relativeToStartPoint'"
            src="/src/assets/svg/相对起飞点高度.svg"
            alt="相对起飞点高度示意图" />
          <img
            v-if="
              props.selectedHeightMode === 'aboveGroundLevel' ||
              props.selectedHeightMode === 'terrain'
            "
            src="/src/assets/svg/相对地形高度.svg"
            alt="相对地形高度示意图" />
        </div>
        <div class="altitude-control">
          <div class="alt-button" @click="adjustRouteAltitude(100)">+100</div>
          <div class="alt-button" @click="adjustRouteAltitude(10)">+10</div>
          <!-- 航线高度数值和单位 -->
          <div class="alt-value-input-group">
            <span
              v-if="!isRouteAltitudeEditing"
              class="alt-value"
              @click="startRouteAltitudeEdit"
              >{{ props.routeAltitude }}</span
            >
            <el-input
              v-else
              v-model.number="routeAltitudeValue"
              type="number"
              class="alt-input"
              size="small"
              :controls="false"
              @blur="stopRouteAltitudeEdit"
              @keyup.enter="stopRouteAltitudeEdit"
              ref="routeAltitudeInputRef" />
            <span class="alt-unit">m</span>
          </div>
          <div class="alt-button" @click="adjustRouteAltitude(-10)">-10</div>
          <div class="alt-button" @click="adjustRouteAltitude(-100)">-100</div>
        </div>
      </div>
    </div>

    <!-- 爬升模式 -->
    <div class="section">
      <div class="section-title title-with-tip">
        <span>爬升模式</span>
        <el-tooltip
          effect="dark"
          placement="right"
          popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>
                <strong>垂直爬升：</strong
                >飞行器爬升到航线起始点高度后，再飞向航线起始点。
              </p>
              <p>
                <strong>倾斜爬升：</strong
                >飞行器爬升到“安全起飞高度”后，再直线飞到航线起始点。
              </p>
              <p><strong>安全起飞高度：</strong>是相对起飞点的高度值。</p>
              <p>飞行器起飞后，会先上升至“安全起飞高度”，再飞向航线起始点</p>
              <img src="/src/assets/svg/returnHeight.svg" alt="返航高度说明" />
            </div>
          </template>
          <el-icon class="title-tip-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div
          class="setting-button large"
          :class="{ active: props.flyToWaylineMode === 'safely' }"
          @click="selectClimbMode('safely')">
          垂直爬升
        </div>
        <div
          class="setting-button large"
          :class="{ active: props.flyToWaylineMode === 'pointToPoint' }"
          @click="selectClimbMode('pointToPoint')">
          倾斜爬升
        </div>
      </div>
      <div class="climb-settings">
        <div class="diagram">
          <img src="/src/assets/svg/爬升.svg" alt="爬升示意图" />
        </div>
        <div class="altitude-control">
          <div class="alt-button" @click="adjustSafeTakeoffHeight(100)">
            +100
          </div>
          <div class="alt-button" @click="adjustSafeTakeoffHeight(10)">+10</div>
          <div class="alt-value-input-group">
            <span
              v-if="!isSafeTakeoffHeightEditing"
              class="alt-value"
              @click="startSafeTakeoffHeightEdit">
              {{ props.safeTakeoffHeight }}
            </span>
            <el-input
              v-else
              v-model.number="safeTakeoffHeightInternal"
              type="number"
              class="alt-input"
              size="small"
              :controls="false"
              @blur="stopSafeTakeoffHeightEdit"
              @keyup.enter="stopSafeTakeoffHeightEdit"
              ref="safeTakeoffHeightInputRef" />
            <span class="alt-unit">m</span>
          </div>
          <div class="alt-button" @click="adjustSafeTakeoffHeight(-10)">
            -10
          </div>
          <div class="alt-button" @click="adjustSafeTakeoffHeight(-100)">
            -100
          </div>
        </div>
      </div>
    </div>

    <!-- 全局航线速度 -->
    <div class="section speed-section">
      <div class="section-title">全局航线速度</div>
      <div class="speed-control">
        <div class="speed-button" @click="adjustGlobalRouteSpeed(-1)">-</div>
        <div class="speed-value-input-group">
          <span
            v-if="!isGlobalRouteSpeedEditing"
            class="speed-value"
            @click="startGlobalRouteSpeedEdit"
            >{{ props.globalRouteSpeed }}</span
          >
          <el-input
            v-else
            v-model.number="globalRouteSpeedInternal"
            type="number"
            class="speed-input"
            size="small"
            :controls="false"
            @blur="stopGlobalRouteSpeedEdit"
            @keyup.enter="stopGlobalRouteSpeedEdit"
            ref="globalRouteSpeedInputRef" />
          <span class="speed-unit">m/s</span>
        </div>
        <div class="speed-button" @click="adjustGlobalRouteSpeed(1)">+</div>
      </div>
    </div>

    <!-- 主航线角度 -->
    <div class="section">
      <div class="main-route-header">
        <div class="section-title">主航线角度</div>
        <div class="main-route-angle-display">
          <span class="main-route-angle-value">{{ props.mainRouteAngle }}</span>
          <span class="main-route-angle-unit">°</span>
        </div>
      </div>
      <div class="main-route-slider-wrapper">
        <div class="main-route-slider-button" @click="adjustMainRouteAngle(-1)">
          -
        </div>
        <el-slider
          v-model="mainRouteAngleInternal"
          :min="0"
          :max="360"
          :step="1"
          :show-tooltip="false"
          class="main-route-slider" />
        <div class="main-route-slider-button" @click="adjustMainRouteAngle(1)">
          +
        </div>
      </div>
    </div>

    <!-- 高程优化 -->
    <div class="section">
      <div class="collapsible-section">
        <div class="section-title">高程优化</div>
        <el-switch
          :model-value="props.elevationOptimizationEnabled"
          @update:model-value="
            emit('update:elevationOptimizationEnabled', $event)
          "
          style="--el-switch-off-color: #444" />
      </div>
    </div>

    <!-- 完成动作 -->
    <div class="section">
      <div class="section-title">完成动作</div>
      <el-select
        v-model="completionActionInternal"
        placeholder="请选择"
        size="small"
        class="black-select"
        popper-class="black-select"
        :teleported="false">
        <el-option label="自动返航" value="goHome"></el-option>
        <el-option label="返回航线起始点悬停" value="return_stop"></el-option>
        <el-option label="退出航线模式" value="out_route"></el-option>
        <el-option label="原地降落" value="return_down"></el-option>
        <!-- 可以根据需要添加更多选项 -->
      </el-select>
    </div>

    <!-- 高级设置 -->
    <div class="section">
      <div
        class="collapsible-section"
        @click="showAdvancedSettings = !showAdvancedSettings">
        <div class="section-title">高级设置</div>
        <el-icon :class="{ 'rotate-icon': showAdvancedSettings }"
          ><ArrowDown
        /></el-icon>
      </div>
      <!-- 高级设置内容，根据 showAdvancedSettings 决定是否显示 -->
      <div v-if="showAdvancedSettings" class="advanced-settings-content">
        <!-- 旁向重叠率 -->
        <div class="sub-section">
          <div class="sub-section-title">旁向重叠率</div>
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustSideOverlapRate(-10)">
              -10
            </div>
            <div class="adjust-button" @click="adjustSideOverlapRate(-5)">
              -5
            </div>
            <div class="adjust-button" @click="adjustSideOverlapRate(-1)">
              -1
            </div>
            <div class="value-display-group">
              <span
                v-if="!isSideOverlapRateEditing"
                class="value-display"
                @click="startSideOverlapRateEdit"
                >{{ props.sideOverlapRate }}</span
              >
              <el-input
                v-else
                v-model.number="sideOverlapRateInternal"
                type="number"
                class="value-input"
                size="small"
                :controls="false"
                @blur="stopSideOverlapRateEdit"
                @keyup.enter="stopSideOverlapRateEdit"
                ref="sideOverlapRateInputRef" />
              <span class="value-unit">%</span>
            </div>
            <div class="adjust-button" @click="adjustSideOverlapRate(1)">
              +1
            </div>
            <div class="adjust-button" @click="adjustSideOverlapRate(5)">
              +5
            </div>
            <div class="adjust-button" @click="adjustSideOverlapRate(10)">
              +10
            </div>
          </div>
        </div>

        <!-- 航向重叠率 -->
        <div class="sub-section">
          <div class="sub-section-title">航向重叠率</div>
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustForwardOverlapRate(-10)">
              -10
            </div>
            <div class="adjust-button" @click="adjustForwardOverlapRate(-5)">
              -5
            </div>
            <div class="adjust-button" @click="adjustForwardOverlapRate(-1)">
              -1
            </div>
            <div class="value-display-group">
              <span
                v-if="!isForwardOverlapRateEditing"
                class="value-display"
                @click="startForwardOverlapRateEdit"
                >{{ props.forwardOverlapRate }}</span
              >
              <el-input
                v-else
                v-model.number="forwardOverlapRateInternal"
                type="number"
                class="value-input"
                size="small"
                :controls="false"
                @blur="stopForwardOverlapRateEdit"
                @keyup.enter="stopForwardOverlapRateEdit"
                ref="forwardOverlapRateInputRef" />
              <span class="value-unit">%</span>
            </div>
            <div class="adjust-button" @click="adjustForwardOverlapRate(1)">
              +1
            </div>
            <div class="adjust-button" @click="adjustForwardOverlapRate(5)">
              +5
            </div>
            <div class="adjust-button" @click="adjustForwardOverlapRate(10)">
              +10
            </div>
          </div>
        </div>

        <!-- 边距 -->
        <div
          v-if="props.selectedCollectionMethod === 'orthophoto'"
          class="sub-section">
          <div class="sub-section-title">边距</div>
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustMargin(-10)">-10</div>
            <div class="adjust-button" @click="adjustMargin(-5)">-5</div>
            <div class="adjust-button" @click="adjustMargin(-1)">-1</div>
            <div class="value-display-group">
              <span
                v-if="!isMarginEditing"
                class="value-display"
                @click="startMarginEdit"
                >{{ props.margin }}</span
              >
              <el-input
                v-else
                v-model.number="marginInternal"
                type="number"
                class="value-input"
                size="small"
                :controls="false"
                @blur="stopMarginEdit"
                @keyup.enter="stopMarginEdit"
                ref="marginInputRef" />
              <span class="value-unit">m</span>
            </div>
            <div class="adjust-button" @click="adjustMargin(1)">+1</div>
            <div class="adjust-button" @click="adjustMargin(5)">+5</div>
            <div class="adjust-button" @click="adjustMargin(10)">+10</div>
          </div>
        </div>

        <!--        &lt;!&ndash; 拍照模式 &ndash;&gt;-->
        <!--        <div v-if="props.selectedCollectionMethod === 'orthophoto'" class="sub-section">-->
        <!--          <div class="sub-section-title">拍照模式</div>-->
        <!--          <el-select-->
        <!--            v-model="photoModeInternal"-->
        <!--            placeholder="请选择"-->
        <!--            size="small"-->
        <!--            class="black-select"-->
        <!--            popper-class="black-select"-->
        <!--            :teleported="false"-->
        <!--          >-->
        <!--            <el-option label="等时间隔拍照" value="multipleTiming"></el-option>-->
        <!--            <el-option label="等距间隔拍照" value="multipleDistance"></el-option>-->
        <!--            &lt;!&ndash; 可以根据需要添加更多选项 &ndash;&gt;-->
        <!--          </el-select>-->
        <!--        </div>-->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  nextTick,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import {
  ElSwitch,
  ElInput,
  ElIcon,
  ElSlider,
  ElSelect,
  ElOption,
  ElTooltip,
} from "element-plus"; // 导入 ElSlider, ElSelect, ElOption
import {
  MapLocation,
  ArrowDown,
  QuestionFilled,
  RefreshRight,
} from "@element-plus/icons-vue"; // 导入 ArrowDown
import emitter from "@/stores/mitt";
import { ElMessage } from "element-plus";
import { $areaPathPlanning } from "@/api/flyControl/flight";
import waylineIcon from "@/assets/svg/wayline.svg";
import photosIcon from "@/assets/svg/photos.svg";
import clockIcon from "@/assets/svg/clock.svg";
import areaIcon from "@/assets/svg/area.svg";

import {
  setAreaRouteAltitude,
  startDrawingArea,
  loadAirLine,
  getClosedAreaPoints,
  stopDrawing,
  // @ts-ignore
} from "@/services/waypointService";

// 定义组件接收的 props
const props = defineProps<{
  currentRoute?: any;
  // 顶部信息块数据
  areaValue: number;
  distanceValue: number;
  durationValue: number;
  imageCount: number;

  referencePointSet: boolean; // 参考起飞点是否已设置
  selectedCamera: string; // 选中的镜头类型
  selectedCollectionMethod: string; // 选中的采集方式
  gsdValue: number; // GSD 值
  obliqueGsdValue: number; // 倾斜 GSD 值
  smartSwingEnabled: boolean; // 智能摆动拍摄开关

  // 航点高度模式 (与 WaypointRouteSettings 相同)
  selectedHeightMode: string;
  routeAltitude: number;
  flyToWaylineMode: string;

  safeTakeoffHeight: number; // 安全起飞高度
  gimbalSwingAngle: number; // 云台摆动角度
  globalRouteSpeed: number; // 新增：全局航线速度
  mainRouteAngle: number; // 新增：主航线角度
  elevationOptimizationEnabled: boolean; // 新增：高程优化开关
  completionAction: string; // 新增：完成动作
  realtimeTerrainFollowingEnabled: boolean; // 新增：实时仿地开关

  // 新增：高级设置相关 props
  takeoffSpeed: number; // 起飞速度
  subjectSurfaceAltitude: number; // 被摄面海拔高度
  sideOverlapRate: number; // 旁向重叠率
  forwardOverlapRate: number; // 航向重叠率
  margin: number; // 边距
  photoMode: string; // 拍照模式
  customCameraAngleEnabled: boolean; // 自定义相机角度开关
  // routeStartPointSet: boolean; // 航线起始点是否已设置 (如果需要状态管理)
  isAdding: boolean; // 是否正在添加航线
  airspaceManageId: number | string | null;
  workAreaList: { id: number | string; name: string }[];
  workAreaLoading: boolean;
}>();

// 定义组件可以触发的事件
const emit = defineEmits([
  "update:referencePointSet", // 用于更新参考起飞点状态
  "update:selectedCamera",
  "update:selectedCollectionMethod",
  "update:gsdValue",
  "update:obliqueGsdValue",
  "update:smartSwingEnabled",
  "update:selectedHeightMode",
  "update:routeAltitude",
  "update:flyToWaylineMode",
  "update:safeTakeoffHeight",
  "update:gimbalSwingAngle", // 新增：更新云台摆动角度
  "update:globalRouteSpeed", // 新增：更新全局航线速度
  "update:mainRouteAngle", // 新增：更新主航线角度
  "update:elevationOptimizationEnabled", // 新增：更新高程优化开关
  "update:completionAction", // 新增：更新完成动作
  "update:realtimeTerrainFollowingEnabled", // 新增：更新实时仿地开关
  "setReferencePoint", // 触发设置参考起飞点事件
  "resetReferencePoint", // 触发重设参考起飞点事件
  // 新增：高级设置相关 emit 事件
  "update:takeoffSpeed",
  "update:subjectSurfaceAltitude",
  "update:sideOverlapRate",
  "update:forwardOverlapRate",
  "update:margin",
  "update:photoMode",
  "update:customCameraAngleEnabled",
  "setRouteStartPoint", // 设置航线起始点事件
  "update:isAdding",
  "workAreaChange",
]);

const areaStats = computed(() => {
  const area = getAreaValue();
  const routeDistance = getRouteDistance();

  return [
    {
      label: "面积",
      iconSrc: areaIcon,
      value: formatArea(area),
    },
    {
      label: "航线总长度",
      iconSrc: waylineIcon,
      value: formatDistance(routeDistance),
    },
    {
      label: "预计总时间",
      iconSrc: clockIcon,
      value: formatDuration(getRouteDuration(routeDistance)),
    },
    {
      label: "总照片数",
      iconSrc: photosIcon,
      value: String(getPhotoCount()),
    },
  ];
});

const routeDetail = computed(() => {
  return (
    props.currentRoute?.routeInfo ??
    props.currentRoute?.data ??
    props.currentRoute ??
    {}
  );
});
// 计算区域面积
function getAreaValue() {
  const propArea = Number(props.areaValue);
  if (Number.isFinite(propArea) && propArea > 0) return propArea;

  if (areaClosedPoints.value.length > 0) {
    return getPolygonArea(
      normalizeCoordinates(
        areaClosedPoints.value.map((point: any) => [
          point?.longitude,
          point?.latitude,
          point?.altitude ?? point?.height ?? props.routeAltitude,
        ]),
      ),
    );
  }

  const polygonCoordinates =
    routeDetail.value?.mappingTypeReq?.coordinatesGeoJson?.coordinates?.[0] ??
    routeDetail.value?.mappingTypeReq?.coordinatesJson;
  return getPolygonArea(normalizeCoordinates(polygonCoordinates));
}
// 计算航线总长度
function getRouteDistance() {
  const propDistance = Number(props.distanceValue);
  if (Number.isFinite(propDistance) && propDistance > 0) return propDistance;

  if (areaFlightGeoCenters.value.length > 0) {
    return getPolylineLength(areaFlightGeoCenters.value);
  }

  const estimatedDistance = Number(routeDetail.value?.estimatedDistance);
  if (Number.isFinite(estimatedDistance) && estimatedDistance > 0) {
    return estimatedDistance;
  }

  return getPolylineLength(normalizeCoordinates(getRouteCoordinates()));
}
// 计算预计总时间
function getRouteDuration(routeDistance: number) {
  if (
    Number.isFinite(routeDistance) &&
    routeDistance > 0 &&
    Number.isFinite(Number(props.globalRouteSpeed)) &&
    Number(props.globalRouteSpeed) > 0
  ) {
    return routeDistance / Number(props.globalRouteSpeed);
  }

  const propDuration = Number(props.durationValue);
  if (Number.isFinite(propDuration) && propDuration > 0) return propDuration;

  const estimatedDuration = Number(routeDetail.value?.estimatedDuration);
  if (Number.isFinite(estimatedDuration) && estimatedDuration > 0) {
    return estimatedDuration * 60;
  }

  const flightPointCount = Number(areaRouteResult.value?.flight_point_count);
  if (Number.isFinite(flightPointCount) && flightPointCount > 0) {
    return flightPointCount;
  }

  return 0;
}
// 计算总照片数
function getPhotoCount() {
  const propImageCount = Number(props.imageCount);
  if (Number.isFinite(propImageCount) && propImageCount > 0) {
    return propImageCount;
  }

  const flightPointCount = Number(areaRouteResult.value?.flight_point_count);
  if (Number.isFinite(flightPointCount) && flightPointCount > 0) {
    return flightPointCount;
  }

  const points = Array.isArray(routeDetail.value?.routePointList)
    ? routeDetail.value.routePointList
    : [];
  return points.reduce((count: number, point: any) => {
    const actions = Array.isArray(point?.actions) ? point.actions : [];
    return count + actions.filter(isPhotoAction).length;
  }, 0);
}

function getRouteCoordinates() {
  if (areaFlightGeoCenters.value.length > 0) {
    return areaFlightGeoCenters.value;
  }
  if (Array.isArray(routeDetail.value?.routePointJson?.coordinates)) {
    return routeDetail.value.routePointJson.coordinates;
  }
  return Array.isArray(routeDetail.value?.routePointList)
    ? routeDetail.value.routePointList.map((point: any) => [
        point?.longitude,
        point?.latitude,
        point?.height,
      ])
    : [];
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

function normalizeCoordinates(coordinates: any) {
  if (!Array.isArray(coordinates)) return [];
  return coordinates
    .map((point: any) => {
      if (Array.isArray(point)) return point;
      return [point?.longitude, point?.latitude, point?.height || 0];
    })
    .filter((point: any) => Array.isArray(point) && point.length >= 2)
    .map((point: any) => [
      Number(point[0]),
      Number(point[1]),
      Number(point[2] || 0),
    ])
    .filter((point: number[]) => point.every(Number.isFinite));
}

function getPolylineLength(coordinates: number[][]) {
  if (coordinates.length < 2) return 0;
  return coordinates.slice(1).reduce((total, point, index) => {
    return total + getDistanceBetween(coordinates[index], point);
  }, 0);
}

function getPolygonArea(coordinates: number[][]) {
  const polygon = removeRepeatedLastCoordinate(coordinates);
  if (polygon.length < 3) return 0;

  const origin = getProjectionOrigin(polygon);
  const projected = polygon.map((point) => projectPoint(point, origin));
  const area = projected.reduce((total, point, index) => {
    const nextPoint = projected[(index + 1) % projected.length];
    return total + point[0] * nextPoint[1] - nextPoint[0] * point[1];
  }, 0);
  return Math.abs(area) / 2;
}

function removeRepeatedLastCoordinate(coordinates: number[][]) {
  if (coordinates.length < 2) return coordinates;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates.slice(0, -1);
  }
  return coordinates;
}

function getProjectionOrigin(coordinates: number[][]) {
  const totals = coordinates.reduce(
    (acc, point) => {
      acc.longitude += point[0];
      acc.latitude += point[1];
      return acc;
    },
    { longitude: 0, latitude: 0 },
  );
  return {
    longitude: totals.longitude / coordinates.length,
    latitude: totals.latitude / coordinates.length,
  };
}

function projectPoint(
  point: number[],
  origin: { longitude: number; latitude: number },
) {
  const earthRadius = 6371000;
  const x =
    toRadians(point[0] - origin.longitude) *
    earthRadius *
    Math.cos(toRadians(origin.latitude));
  const y = toRadians(point[1] - origin.latitude) * earthRadius;
  return [x, y];
}

function getDistanceBetween(pointA: number[], pointB: number[]) {
  const earthRadius = 6371000;
  const lat1 = toRadians(pointA[1]);
  const lat2 = toRadians(pointB[1]);
  const deltaLat = toRadians(pointB[1] - pointA[1]);
  const deltaLon = toRadians(pointB[0] - pointA[0]);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDistance(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}m`;
}

function formatArea(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}m²`;
}

function formatDuration(value: number) {
  const seconds = Math.round(Number.isFinite(value) ? value : 0);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;
    return restSeconds > 0 ? `${minutes}m${restSeconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}
// 格式化点的高度
function formatPointHeight(val: any) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-6) return String(rounded);
  return n.toFixed(1);
}
// 格式化规划点
function normalizePlanningPoints(raw: any[]) {
  return (Array.isArray(raw) ? raw : [])
    .map((point: any) => {
      if (Array.isArray(point)) {
        return [Number(point[0]), Number(point[1]), Number(point[2] ?? 0)];
      }
      return [
        Number(point?.longitude ?? point?.lon ?? point?.lng),
        Number(point?.latitude ?? point?.lat),
        Number(point?.altitude ?? point?.height ?? point?.z ?? 0),
      ];
    })
    .filter(
      (point: number[]) =>
        Number.isFinite(point[0]) && Number.isFinite(point[1]),
    )
    .map((point: number[]) => [
      point[0],
      point[1],
      Number.isFinite(point[2]) ? point[2] : 0,
    ]);
}
// 构建规划航线特征集合
function buildPlannedRouteFeatureCollection(routePoints: number[][]) {
  // 航线 id：loadAirLine 依靠 line.properties.id === point.properties.id
  // 来配对渲染航点 Point 与垂直虚线，必须显式给出且 line/point 一致
  const routeId = "area-route";
  const features: any[] = [
    {
      type: "Feature",
      properties: {
        id: routeId,
        routeType: "waypoint",
      },
      geometry: {
        type: "LineString",
        coordinates: routePoints.map((point) => [point[0], point[1], point[2]]),
      },
    },
  ];

  routePoints.forEach((point, index) => {
    const pointHeight = formatPointHeight(point[2]);
    features.push({
      type: "Feature",
      properties: {
        id: routeId,
        routeType: "waypoint",
        status: 1,
        name: `${index + 1}\n高度:${pointHeight}m`,
        height: pointHeight,
      },
      geometry: {
        type: "Point",
        coordinates: [point[0], point[1], point[2]],
      },
    });
  });

  return {
    type: "FeatureCollection",
    features,
    __noFlyTo: true,
  };
}

// 内部状态用于编辑输入框，与 prop 同步
const gsdValueInternal = ref(props.gsdValue);
const obliqueGsdValueInternal = ref(props.obliqueGsdValue);
const routeAltitudeValue = ref(props.routeAltitude);
const safeTakeoffHeightInternal = ref(props.safeTakeoffHeight);
const gimbalSwingAngleInternal = ref(props.gimbalSwingAngle);
const globalRouteSpeedInternal = ref(props.globalRouteSpeed); // 新增：全局航线速度内部状态
const mainRouteAngleInternal = ref(props.mainRouteAngle); // 新增：主航线角度内部状态
const completionActionInternal = ref(props.completionAction); // 新增：完成动作内部状态

// 新增：高级设置内部状态
const takeoffSpeedInternal = ref(props.takeoffSpeed);
const subjectSurfaceAltitudeInternal = ref(props.subjectSurfaceAltitude);
const sideOverlapRateInternal = ref(props.sideOverlapRate);
const forwardOverlapRateInternal = ref(props.forwardOverlapRate);
const marginInternal = ref(props.margin);
const photoModeInternal = ref(props.photoMode);

// 编辑状态 (航线高度)
const isRouteAltitudeEditing = ref(false);
const routeAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const isSafeTakeoffHeightEditing = ref(false);
const safeTakeoffHeightInputRef = ref<InstanceType<typeof ElInput> | null>(
  null,
);
// 航线高度开始编辑
const startRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = true;
  nextTick(() => {
    routeAltitudeInputRef.value?.focus();
  });
};

// 航线高度停止编辑
const stopRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = false;
  // 可以在这里添加数值验证或格式化
  emit("update:routeAltitude", routeAltitudeValue.value);
  setAreaRouteAltitude(routeAltitudeValue.value);
};

// 新增：高级设置的展开/收起状态
const showAdvancedSettings = ref(false);

// 监听 props 变化，同步到内部编辑状态
watch(
  () => props.gsdValue,
  (newVal) => {
    gsdValueInternal.value = newVal;
  },
);
watch(
  () => props.obliqueGsdValue,
  (newVal) => {
    obliqueGsdValueInternal.value = newVal;
  },
);
watch(
  () => props.safeTakeoffHeight,
  (newVal) => {
    safeTakeoffHeightInternal.value = newVal;
  },
);
watch(
  () => props.gimbalSwingAngle,
  (newVal) => {
    gimbalSwingAngleInternal.value = newVal;
  },
);
// 新增：监听全局航线速度 prop 变化，同步到内部状态
watch(
  () => props.globalRouteSpeed,
  (newVal) => {
    globalRouteSpeedInternal.value = newVal;
  },
);
// 新增：监听主航线角度 prop 变化，同步到内部状态
watch(
  () => props.mainRouteAngle,
  (newVal) => {
    mainRouteAngleInternal.value = newVal;
  },
);
// 新增：监听完成动作 prop 变化，同步到内部状态
watch(
  () => props.completionAction,
  (newVal) => {
    completionActionInternal.value = newVal;
  },
);

// 新增：监听高级设置 prop 变化，同步到内部状态
watch(
  () => props.takeoffSpeed,
  (newVal) => {
    takeoffSpeedInternal.value = newVal;
  },
);
watch(
  () => props.subjectSurfaceAltitude,
  (newVal) => {
    subjectSurfaceAltitudeInternal.value = newVal;
  },
);
watch(
  () => props.sideOverlapRate,
  (newVal) => {
    sideOverlapRateInternal.value = newVal;
  },
);
watch(
  () => props.forwardOverlapRate,
  (newVal) => {
    forwardOverlapRateInternal.value = newVal;
  },
);
watch(
  () => props.margin,
  (newVal) => {
    marginInternal.value = newVal;
  },
);
watch(
  () => props.photoMode,
  (newVal) => {
    photoModeInternal.value = newVal;
  },
);

// 监听内部状态变化，并触发 emit 事件
watch(gimbalSwingAngleInternal, (newVal) => {
  emit("update:gimbalSwingAngle", newVal);
});
// 新增：监听全局航线速度内部状态变化，并触发 emit 事件
watch(globalRouteSpeedInternal, (newVal) => {
  emit("update:globalRouteSpeed", newVal);
});
// 新增：监听主航线角度内部状态变化，并触发 emit 事件
watch(mainRouteAngleInternal, (newVal) => {
  emit("update:mainRouteAngle", newVal);
});
// 新增：监听完成动作内部状态变化，并触发 emit 事件
watch(completionActionInternal, (newVal) => {
  emit("update:completionAction", newVal);
});
// 新增：监听高级设置内部状态变化，并触发 emit 事件
watch(takeoffSpeedInternal, (newVal) => {
  emit("update:takeoffSpeed", newVal);
});
watch(subjectSurfaceAltitudeInternal, (newVal) => {
  emit("update:subjectSurfaceAltitude", newVal);
});
watch(sideOverlapRateInternal, (newVal) => {
  emit("update:sideOverlapRate", newVal);
});
watch(forwardOverlapRateInternal, (newVal) => {
  emit("update:forwardOverlapRate", newVal);
});
watch(marginInternal, (newVal) => {
  emit("update:margin", newVal);
});
watch(photoModeInternal, (newVal) => {
  emit("update:photoMode", newVal);
});

// 编辑状态
const isGlobalRouteSpeedEditing = ref(false); // 新增：全局航线速度编辑状态
const isTakeoffSpeedEditing = ref(false);
const isSubjectSurfaceAltitudeEditing = ref(false);
const isSideOverlapRateEditing = ref(false);
const isForwardOverlapRateEditing = ref(false);
const isMarginEditing = ref(false);

// Input 元素的引用，用于聚焦
const globalRouteSpeedInputRef = ref<InstanceType<typeof ElInput> | null>(null); // 新增：全局航线速度 Input 引用
const takeoffSpeedInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const subjectSurfaceAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(
  null,
);
const sideOverlapRateInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const forwardOverlapRateInputRef = ref<InstanceType<typeof ElInput> | null>(
  null,
);
const marginInputRef = ref<InstanceType<typeof ElInput> | null>(null);
// --- 方法 ---

// 选择镜头
const selectCamera = (camera: string) => {
  emit("update:selectedCamera", camera);
};

// 选择采集方式
const selectCollectionMethod = (method: string) => {
  emit("update:selectedCollectionMethod", method);
};

// 选择航点高度模式 (与 WaypointRouteSettings 相同)
const selectHeightMode = (mode: string) => {
  emit("update:selectedHeightMode", mode);
};

const selectClimbMode = (mode: string) => {
  emit("update:flyToWaylineMode", mode);
};

// 调整航线高度
const adjustRouteAltitude = (delta: number) => {
  const newValue = props.routeAltitude + delta;
  // 可以添加边界检查
  const finalValue = newValue < 0 ? 0 : newValue;
  emit("update:routeAltitude", finalValue); // 触发更新事件
  setAreaRouteAltitude(finalValue);
};

const adjustSafeTakeoffHeight = (delta: number) => {
  const finalValue = Math.max(0, Number(props.safeTakeoffHeight || 0) + delta);
  safeTakeoffHeightInternal.value = finalValue;
  emit("update:safeTakeoffHeight", finalValue);
};

const startSafeTakeoffHeightEdit = () => {
  isSafeTakeoffHeightEditing.value = true;
  nextTick(() => safeTakeoffHeightInputRef.value?.focus());
};

const stopSafeTakeoffHeightEdit = () => {
  isSafeTakeoffHeightEditing.value = false;
  const finalValue = Math.max(0, Number(safeTakeoffHeightInternal.value || 0));
  safeTakeoffHeightInternal.value = finalValue;
  emit("update:safeTakeoffHeight", finalValue);
};

// 新增：调整全局航线速度
const adjustGlobalRouteSpeed = (delta: number) => {
  const newValue = globalRouteSpeedInternal.value + delta;
  // 假设全局航线速度范围为 1 到 15 m/s (根据图片推测)
  const finalValue = Math.max(1, Math.min(15, newValue));
  globalRouteSpeedInternal.value = finalValue;
};

// 新增：全局航线速度开始编辑
const startGlobalRouteSpeedEdit = () => {
  isGlobalRouteSpeedEditing.value = true;
  nextTick(() => {
    globalRouteSpeedInputRef.value?.focus();
  });
};

// 新增：全局航线速度停止编辑
const stopGlobalRouteSpeedEdit = () => {
  isGlobalRouteSpeedEditing.value = false;
  // 确保输入的值在有效范围内
  const finalValue = Math.max(1, Math.min(15, globalRouteSpeedInternal.value));
  globalRouteSpeedInternal.value = finalValue;
  // emit('update:globalRouteSpeed', globalRouteSpeedInternal.value); // watch 会处理
};

// 新增：调整主航线角度
const adjustMainRouteAngle = (delta: number) => {
  let newValue = mainRouteAngleInternal.value + delta;
  // 假设主航线角度范围为 0 到 360 度，并循环
  if (newValue > 360) {
    newValue = 0;
  } else if (newValue < 0) {
    newValue = 360;
  }
  mainRouteAngleInternal.value = newValue;
};

// 新增：调整起飞速度
const adjustTakeoffSpeed = (delta: number) => {
  const newValue = takeoffSpeedInternal.value + delta;
  // 假设起飞速度范围为 1 到 15 m/s (根据图片推测)
  const finalValue = Math.max(1, Math.min(15, newValue));
  takeoffSpeedInternal.value = finalValue;
};

// 新增：起飞速度开始编辑
const startTakeoffSpeedEdit = () => {
  isTakeoffSpeedEditing.value = true;
  nextTick(() => {
    takeoffSpeedInputRef.value?.focus();
  });
};

// 新增：起飞速度停止编辑
const stopTakeoffSpeedEdit = () => {
  isTakeoffSpeedEditing.value = false;
  const finalValue = Math.max(1, Math.min(15, takeoffSpeedInternal.value));
  takeoffSpeedInternal.value = finalValue;
};

// 新增：调整旁向重叠率
const adjustSideOverlapRate = (delta: number) => {
  const newValue = sideOverlapRateInternal.value + delta;
  // 假设重叠率范围为 0 到 100
  const finalValue = Math.max(0, Math.min(100, newValue));
  sideOverlapRateInternal.value = finalValue;
};

// 新增：旁向重叠率开始编辑
const startSideOverlapRateEdit = () => {
  isSideOverlapRateEditing.value = true;
  nextTick(() => {
    sideOverlapRateInputRef.value?.focus();
  });
};

// 新增：旁向重叠率停止编辑
const stopSideOverlapRateEdit = () => {
  isSideOverlapRateEditing.value = false;
  const finalValue = Math.max(0, Math.min(100, sideOverlapRateInternal.value));
  sideOverlapRateInternal.value = finalValue;
};

// 新增：调整航向重叠率
const adjustForwardOverlapRate = (delta: number) => {
  const newValue = forwardOverlapRateInternal.value + delta;
  // 假设重叠率范围为 0 到 100
  const finalValue = Math.max(0, Math.min(100, newValue));
  forwardOverlapRateInternal.value = finalValue;
};

// 新增：航向重叠率开始编辑
const startForwardOverlapRateEdit = () => {
  isForwardOverlapRateEditing.value = true;
  nextTick(() => {
    forwardOverlapRateInputRef.value?.focus();
  });
};

// 新增：航向重叠率停止编辑
const stopForwardOverlapRateEdit = () => {
  isForwardOverlapRateEditing.value = false;
  const finalValue = Math.max(
    0,
    Math.min(100, forwardOverlapRateInternal.value),
  );
  forwardOverlapRateInternal.value = finalValue;
};

// 新增：调整边距
const adjustMargin = (delta: number) => {
  const newValue = Number(marginInternal.value) + delta;
  // 假设边距范围为 0 到 100 (根据图片推测)
  const finalValue = Math.max(0, Math.min(100, newValue));
  marginInternal.value = finalValue;
};

// 新增：边距开始编辑
const startMarginEdit = () => {
  isMarginEditing.value = true;
  nextTick(() => {
    marginInputRef.value?.focus();
  });
};

// 新增：边距停止编辑
const stopMarginEdit = () => {
  isMarginEditing.value = false;
  const finalValue = Math.max(0, Math.min(100, marginInternal.value));
  marginInternal.value = finalValue;
};

// 新增：设置航线起始点
const setRouteStartPoint = () => {
  emit("setRouteStartPoint");
};

function startAddArea() {
  if (props.isAdding) return;
  emit("update:isAdding", true);
  setAreaRouteAltitude(props.routeAltitude);

  startDrawingArea();
  ElMessage.info("左键添加区域点，右键结束绘制并生成避障航线");
}

async function redrawArea() {
  resetAreaPlanningState();
  emit("update:isAdding", false);
  emitter.emit("changeAdding", false);
  emitter.emit("reset-map");
  await nextTick();
  startAddArea();
}

// ---- 面状航线避障规划 ----
const areaPlanningLoading = ref(false);
const areaFlightGeoCenters = ref<number[][]>([]);
const areaRouteResult = ref<any>(null);
const areaClosedPoints = ref<any[]>([]);

function resetAreaPlanningState() {
  areaFlightGeoCenters.value = [];
  areaRouteResult.value = null;
  areaClosedPoints.value = [];
}

let areaAltitudeReplanTimer: ReturnType<typeof setTimeout> | null = null;
// 清除区域高度重新规划定时器
function clearAreaAltitudeReplanTimer() {
  if (areaAltitudeReplanTimer) {
    clearTimeout(areaAltitudeReplanTimer);
    areaAltitudeReplanTimer = null;
  }
}

// 格式化区域点
function normalizeClosedPoints(rawPoints: any[] = []) {
  return rawPoints
    .map((point: any) => {
      if (Array.isArray(point)) {
        const longitude = Number(point[0]);
        const latitude = Number(point[1]);
        const altitude = Number(point[2] ?? props.routeAltitude);
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
          return null;
        return {
          longitude,
          latitude,
          altitude: Number.isFinite(altitude) ? altitude : props.routeAltitude,
        };
      }

      const longitude = Number(point?.longitude ?? point?.lon ?? point?.lng);
      const latitude = Number(point?.latitude ?? point?.lat);
      const altitude = Number(
        point?.altitude ?? point?.height ?? point?.z ?? props.routeAltitude,
      );
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
        return null;
      return {
        ...point,
        longitude,
        latitude,
        altitude: Number.isFinite(altitude) ? altitude : props.routeAltitude,
      };
    })
    .filter(Boolean);
}
// 获取当前区域点
function getCurrentClosedPointsForPlanning() {
  if (areaClosedPoints.value.length > 0) {
    return normalizeClosedPoints(areaClosedPoints.value);
  }

  const drawnClosedPoints = getClosedAreaPoints();
  if (Array.isArray(drawnClosedPoints) && drawnClosedPoints.length > 0) {
    return normalizeClosedPoints(drawnClosedPoints);
  }

  const coordinatesJson = routeDetail.value?.mappingTypeReq?.coordinatesJson;
  if (Array.isArray(coordinatesJson) && coordinatesJson.length > 0) {
    return normalizeClosedPoints(coordinatesJson);
  }

  const geoJsonCoordinates =
    routeDetail.value?.mappingTypeReq?.coordinatesGeoJson?.coordinates?.[0];
  if (Array.isArray(geoJsonCoordinates) && geoJsonCoordinates.length > 0) {
    return normalizeClosedPoints(geoJsonCoordinates);
  }

  return [];
}
// 构建区域多边形
function buildGeoJsonPolygon(closedPoints: any[]) {
  const coords = closedPoints.map((p: any) => [
    Number(p.longitude),
    Number(p.latitude),
  ]);
  if (
    coords.length >= 3 &&
    (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1])
  ) {
    coords.push([...coords[0]]);
  }
  return {
    type: "Polygon" as const,
    coordinates: [coords],
  };
}
// 请求区域覆盖规划
async function requestAreaPathPlanning(
  closedPoints: any[],
  options: { showSuccessMessage?: boolean } = {},
) {
  const { showSuccessMessage = false } = options;
  if (!Array.isArray(closedPoints) || closedPoints.length < 3) return false;

  areaPlanningLoading.value = true;
  emitter.emit("obstacle-avoidance-loading", true);

  try {
    const polygon = buildGeoJsonPolygon(closedPoints);

    const res: any = await $areaPathPlanning(
      {
        polygon,
        height: props.routeAltitude,
        level: 7,
      },
      10 * 60 * 1000,
    );

    const success = res?.success === true || res?.code === 200;
    const resultData = res?.data?.data ?? res?.data ?? null;
    if (!success || !resultData) {
      ElMessage.error(res?.msg || res?.message || "航线生成失败");
      return false;
    }

    const flightCenters = normalizePlanningPoints(
      resultData.flight_geo_centers,
    );
    areaClosedPoints.value = normalizeClosedPoints(closedPoints);
    areaFlightGeoCenters.value = flightCenters;
    areaRouteResult.value = resultData.area_route || {};

    if (flightCenters.length >= 2) {
      loadAirLine(buildPlannedRouteFeatureCollection(flightCenters));
    }

    emitter.emit("area-route-points-change", {
      closedPoints: areaClosedPoints.value,
      flightCenters,
      areaRoute: resultData.area_route || {},
      gridList: [
        ...(Array.isArray(resultData.flight_grids)
          ? resultData.flight_grids
          : []),
        ...(Array.isArray(resultData.obstacle_grids)
          ? resultData.obstacle_grids
          : []),
      ],
      rawData: resultData,
    });
    emitter.emit("changeAdding", true);
    if (showSuccessMessage) {
      ElMessage.success("面状航线已生成");
    }
    return true;
  } catch (e: any) {
    ElMessage.error(e?.message || "航线生成失败，请重试");
    return false;
  } finally {
    areaPlanningLoading.value = false;
    emitter.emit("obstacle-avoidance-loading", false);
  }
}
// 处理区域绘制完成
async function handleAreaDrawingFinished(payload: any) {
  if (!payload?.success) return;

  emit("update:isAdding", false);
  const closedPoints = payload.closedPoints || getClosedAreaPoints();
  await requestAreaPathPlanning(normalizeClosedPoints(closedPoints), {
    showSuccessMessage: true,
  });
}

watch(
  () => props.routeAltitude,
  (newVal, oldVal) => {
    routeAltitudeValue.value = newVal;
    setAreaRouteAltitude(newVal);
    if (oldVal === undefined || Number(newVal) === Number(oldVal)) return;

    const closedPoints = getCurrentClosedPointsForPlanning();
    if (closedPoints.length < 3) return;

    clearAreaAltitudeReplanTimer();
    areaAltitudeReplanTimer = setTimeout(() => {
      void requestAreaPathPlanning(closedPoints);
    }, 300);
  },
  { immediate: true },
);

onMounted(() => {
  emitter.on("areaDrawingFinished", handleAreaDrawingFinished);
});

onBeforeUnmount(() => {
  emitter.off("areaDrawingFinished", handleAreaDrawingFinished);
  stopDrawing();
  clearAreaAltitudeReplanTimer();
  resetAreaPlanningState();
});
</script>

<style lang="less" scoped>
.area-settings-container {
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 之间的间距 */

  /* 顶部的参考起飞点按钮样式 (从 RouteSettingsPanel.vue 迁移过来) */
  .reference-point-button {
    background-color: #2d8cf0; /* 蓝色背景 */
    color: white;
    padding: 12px 20px; /* 调整内边距 */
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 5px; /* 与下方第一个 section 的间距，减小 */
    gap: 8px; /* 图标和文字的间距 */
    transition: background-color 0.2s ease;
  }

  .reference-point-button:hover {
    background-color: #1a7cdb; /* 悬停颜色 */
  }

  .reference-point-button.disabled {
    background-color: #888 !important;
    color: #ccc !important;
    cursor: not-allowed !important;
    pointer-events: none;
  }
}

.area-stats {
  display: flex;
  align-items: center;
  height: 72px;
}

.area-stat-block {
  flex: 1;
  min-width: 0;
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-right: 1px solid rgba(255, 255, 255, 0.16);
}

.area-stat-block:last-child {
  border-right: none;
}

.area-stat-icon {
  width: 21px;
  height: 21px;
  font-size: 21px;
  color: rgba(255, 255, 255, 0.92);
}

.area-stat-value {
  max-width: 100%;
  font-size: 15px;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.work-area-section {
  background-color: rgba(51, 51, 51, 0.6);
  padding: 15px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.required-title::before {
  content: "* ";
  color: #f56c6c;
}

/* 顶部的四个信息展示块样式 (参考 PatrolRouteSettings.vue) */
.info-blocks {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 四列平均分配 */
  gap: 0; /* 移除块之间的间距 */
  margin-bottom: 10px; /* 与下方内容的间距 */
  border-radius: 8px; /* 整体圆角 */
  overflow: hidden; /* 隐藏内部边框溢出 */
}

.info-block {
  background-color: rgba(51, 51, 51, 0.6); /* 背景色 */
  padding: 10px 5px; /* 内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  text-align: center;
  position: relative; /* 用于伪元素分隔线 */
}

/* 使用伪元素添加分隔线 */
.info-block:not(:last-child)::after {
  content: "";
  position: absolute;
  right: 0;
  top: 10%; /* 调整位置 */
  bottom: 10%; /* 调整位置 */
  width: 1px; /* 分隔线宽度 */
  background-color: #444; /* 分隔线颜色 */
}

.info-icon-wrapper {
  margin-bottom: 5px; /* 图标与数值的间距 */
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 16px; /* SVG 图标大小 */
    height: 16px; /* SVG 图标大小 */
  }
}

.info-value {
  font-size: 14px; /* 调整字体大小 */
  font-weight: bold;
  color: white; /* 数值颜色改为白色 */
}

/* 参考起飞点按钮样式 (参考 WaypointRouteSettings.vue) */
.reference-point-button {
  color: white;
  padding: 12px 20px; /* 调整内边距 */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 5px; /* 与下方第一个 section 的间距，减小 */
  gap: 8px; /* 图标和文字的间距 */
  transition: background-color 0.2s ease;
}

.reference-point-button.not-set {
  background-color: #2d8cf0; /* 蓝色背景 */
}

.reference-point-button.not-set:hover {
  background-color: #1a7cdb; /* 悬停颜色 */
}

.reference-point-button.is-set {
  background-color: rgba(51, 51, 51, 0.6); /* 深灰色背景 */
}

.reference-point-button.is-set:hover {
  background-color: rgba(60, 60, 60, 0.6); /* 悬停颜色 */
}

.reference-point-button .reset-link {
  color: #2d8cf0; /* 重设链接颜色 */
  margin-left: 10px; /* 与文字的间距 */
  cursor: pointer;
  text-decoration: underline;
}

/* 通用 section 样式 (参考 WaypointRouteSettings.vue) */
.section {
  background-color: rgba(51, 51, 51, 0.6); /* 功能块背景色，比抽屉背景稍浅 */
  padding: 15px; /* 功能块内边距 */
  border-radius: 8px; /* 功能块圆角 */
  display: flex;
  flex-direction: column;
  gap: 10px; /* section 内部元素间距 */
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.title-tip-icon {
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  font-size: 15px;
}

.title-tip-icon:hover {
  color: #fff;
}

:global(.route-height-tooltip) {
  max-width: 360px;
  padding: 18px 20px !important;
  border: none !important;
  background-color: rgba(51, 51, 51, 0.9) !important;
}

:global(.route-height-tip-content) {
  color: #fff;
  font-size: 14px;
  line-height: 1.7;
}

:global(.route-height-tip-content p) {
  margin: 0 0 12px;
}

:global(.route-height-tip-content img) {
  display: block;
  width: 300px;
  max-width: 100%;
  margin: 8px auto 0;
}

.button-group {
  display: flex;
}

.setting-button {
  background-color: #444; /* 按钮背景色，比功能块背景浅 */
  color: #fff;
  border: none; /* 移除边框 */
  padding: 8px 0px; /* 调整内边距 */
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1; /* 使按钮组中的按钮平均分配空间 */
  min-width: 0; /* 允许缩小 */
}

.setting-button:hover {
  background-color: #484848; /* 悬停背景色 */
}

.setting-button.active {
  background-color: #2d8cf0; /* 选中背景色 */
  color: white; /* 选中文字颜色 */
}

/* 分段控制样式 (参考 WaypointRouteSettings.vue) */
.button-group.segmented-control {
  gap: 0; /* 移除 gap */
  border-radius: 4px; /* 整体圆角 */
  overflow: hidden; /* 隐藏内部按钮的溢出边框 */
  border: 1px solid #444; /* 整体边框 */
}

.button-group.segmented-control .setting-button {
  background-color: #444; /* 分段控制按钮背景色，比普通按钮深 */
  border: none; /* 移除内部按钮的独立边框 */
  border-right: 1px solid #444; /* 添加右侧边框作为分隔线 */
  border-radius: 0; /* 移除内部按钮圆角 */
  flex-basis: 0; /* 确保 flex-grow 1 有效 */
}

.button-group.segmented-control .setting-button:last-child {
  border-right: none; /* 最后一个按钮没有右侧边框 */
}

.button-group.segmented-control .setting-button.active {
  background-color: #2d8cf0;
  color: white;
}

/* 单选分段控制样式 */
.button-group.segmented-control.single-select .setting-button {
  border-right: none; /* 单选时不需要分隔线 */
  border-radius: 20px; /* 调整为更圆的圆角 */
  margin-right: 5px; /* 按钮之间有间距 */
  padding: 4px 16px; /* 调整内边距，与拍照按钮保持一致 */
}
.button-group.segmented-control.single-select {
  border: none; /* 整体无边框 */
  overflow: visible; /* 允许溢出 */
  gap: 5px; /* 按钮间距 */
  width: 30%;
}

/* 速度/GSD/安全高度调节样式 (参考 WaypointRouteSettings.vue 的 speed-section) */
.speed-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.speed-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px; /* 减小间距 */
  border-radius: 4px;
  padding: 8px 10px; /* 调整内边距 */
}

.speed-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  width: 30px; /* 按钮宽度 */
  height: 30px; /* 按钮高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px; /* 调整字体大小 */
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.speed-button:hover {
  background-color: #484848;
}

.speed-value-input-group {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  flex-grow: 1; /* 占据剩余空间 */
  justify-content: center; /* 内容居中 */
}

.speed-value {
  font-size: 24px; /* 调整字体大小 */
  font-weight: bold;
  color: #2d8cf0;
  text-align: center;
  cursor: pointer;
  min-width: 60px;
}

/* 覆盖 Element Plus Input 默认样式 - 编辑状态 */
:deep(.speed-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important; /* 输入框背景色改为深灰色 */
  box-shadow: none !important;
  border: 1px solid #444 !important; /* 边框颜色 */
  border-radius: 4px !important;
  padding: 0 8px !important; /* 调整内边距 */
  height: 30px !important; /* 调整高度 */
  max-width: 50px; /* 新增：限制最大宽度 */
}

:deep(.speed-input.el-input--small .el-input__inner) {
  color: white !important; /* 数值颜色改为白色 */
  text-align: center !important; /* 数值居中 */
  padding: 0 !important; /* 移除内边距 */
  height: 28px !important; /* 调整高度 */
  line-height: 28px !important; /* 调整行高 */
  font-size: 20px !important; /* 调整字体大小，与非编辑状态保持一致 */
  font-weight: bold !important;
  /* 移除上下箭头按钮 */
  // -webkit-appearance: none; /* Chrome, Safari */
  // -moz-appearance: textfield; /* Firefox */
}

.speed-unit {
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}

/* 航点高度模式样式 (参考 WaypointRouteSettings.vue) */
.climb-settings,
.height-settings {
  /* 复用样式 */
  display: flex;
  align-items: center;
  gap: 0px; /* 减小间距 */
}

.diagram {
  flex-shrink: 0; /* 防止示意图被压缩 */
  width: 220px; /* 示例宽度，增大 */
  height: 158px; /* 示例高度，增大 */
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box; /* 边框和内边距包含在尺寸内 */
}

.diagram img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.altitude-control {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  flex-grow: 1; /* 占据剩余空间 */
}

.alt-button {
  background-color: #444; /* 深灰色按钮背景 */
  color: #fff;
  border: none; /* 移除边框 */
  border-radius: 4px; /* 圆角 */
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  box-sizing: border-box; /* 边框和内边边距包含在尺寸内 */
  width: 50px; /* 固定宽度 */
  height: 25px; /* 固定高度 */
  display: flex; /* 使内容居中 */
  align-items: center;
  justify-content: center;
  padding: 0; /* 移除内边距 */
}

.alt-button:hover {
  background-color: #484848;
}

.alt-value-input-group {
  display: flex;
  align-items: center;
  gap: 5px; /* 数值和单位的间距 */
  margin: 5px 0; /* 与上下按钮的间距 */
  min-height: 25px; /* 确保高度一致 */
}

.alt-value {
  font-size: 20px; /* 数值字体大小 */
  font-weight: bold;
  color: #2d8cf0; /* 蓝色数值 */
  cursor: pointer;
  min-width: 60px; /* 最小宽度 */
  text-align: center; /* 文本居中 */
  display: inline-block; /* 使 min-width 生效 */
}

/* 覆盖 Element Plus Input 默认样式 - 编辑状态 */
:deep(.alt-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important; /* 输入框背景色改为深灰色 */
  box-shadow: none !important;
  border: 1px solid #444 !important; /* 边框颜色 */
  border-radius: 4px !important;
  padding: 0 8px !important; /* 调整内边距 */
  height: 25px !important; /* 调整高度 */
}

:deep(.alt-input.el-input--small .el-input__inner) {
  color: white !important; /* 数值颜色改为白色 */
  text-align: center !important; /* 数值居中 */
  padding: 0 !important; /* 移除内边距 */
  height: 23px !important; /* 调整高度 */
  line-height: 23px !important; /* 调整行高 */
  font-size: 20px !important; /* 调整字体大小，与非编辑状态保持一致 */
  font-weight: bold !important;
  /* 移除上下箭头按钮 */
  // -webkit-appearance: none; /* Chrome, Safari */
  // -moz-appearance: textfield; /* Firefox */
}

.alt-unit {
  font-size: 14px; /* 单位字体大小 */
  color: #fff; /* 单位颜色 */
  flex-shrink: 0; /* 防止单位被压缩 */
}

/* 智能摆动拍摄开关样式 */
.collapsible-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: default; /* 默认光标，因为没有折叠功能 */
  padding: 0; /* 调整内边距 */
}
//去掉number输入框的上下箭头
:deep(.el-input__inner) {
  /* 隐藏 Webkit 浏览器中的上下箭头 */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox 兼容 */
  // -moz-appearance: textfield;
}
.gimbal-swing-settings {
  display: flex;
  align-items: center;
  gap: 15px;
}

.gimbal-diagram {
  position: relative;
  width: 80px; /* 缩小示意图宽度 */
  height: 80px; /* 缩小示意图高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.gimbal-diagram img {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gimbal-base-img {
  z-index: 1; /* 最底层 */
}

.gimbal-middle-img {
  z-index: 3; /* 中间层 */
}

.gimbal-top-img {
  z-index: 2; /* 最上层，确保旋转部分可见 */
  transform-origin: center; /* 调整为绕图片中心旋转 */
  transition: transform 0.1s ease-out; /* 添加过渡效果 */
}

/* 新增：角度提示文字样式 */
.gimbal-angle-label-10,
.gimbal-angle-label-45 {
  position: absolute;
  font-size: 12px; /* 字体大小 */
  color: #fff; /* 文字颜色 */
  font-weight: bold;
  white-space: nowrap; /* 防止文字换行 */
}

.gimbal-angle-label-10 {
  bottom: -15px; /* 调整位置 */
  left: 23px; /* 调整位置 */
}

.gimbal-angle-label-45 {
  bottom: -5px; /* 调整位置 */
  left: -5px; /* 调整位置 */
}

.gimbal-angle-control {
  display: flex;
  flex-direction: column;
  gap: 10px; /* 调整上下部分间距 */
  align-items: flex-end; /* 将子元素（包括度数和滑块）右对齐 */
  flex-grow: 1;
}

.gimbal-angle-display {
  display: flex;
  align-items: baseline; /* 底部对齐，使单位看起来更自然 */
  gap: 5px;
}

.gimbal-angle-value {
  font-size: 28px; /* 角度数值字体大小 */
  font-weight: bold;
  color: #2d8cf0; /* 蓝色数值 */
}

.gimbal-angle-unit {
  font-size: 16px; /* 角度单位字体大小 */
  color: #fff;
}

.gimbal-slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px; /* 按钮与滑块的间距 */
  width: 100%; /* 占据父容器宽度 */
}

.gimbal-slider-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  width: 30px; /* 按钮宽度 */
  height: 30px; /* 按钮高度 */
  display: flex;
  // align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px; /* 调整字体大小 */
  font-weight: bold;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.gimbal-slider-button:hover {
  background-color: #484848;
}

/* 覆盖 Element Plus Slider 样式 */
:deep(.gimbal-slider.el-slider) {
  height: 30px; /* 确保滑块高度与按钮一致 */
  .el-slider__runway {
    background-color: #444; /* 滑轨背景色 */
    height: 6px; /* 滑轨高度 */
    border-radius: 3px;
  }
  .el-slider__bar {
    background-color: #2d8cf0; /* 进度条颜色 */
    height: 6px;
    border-radius: 3px;
  }
  .el-slider__button-wrapper {
    top: -14px; /* 调整滑块位置，使其垂直居中 (滑轨高6px，圆点高16px，(6-16)/2 = -5) */
    .el-slider__button {
      width: 16px; /* 滑块大小 */
      height: 16px;
      background-color: #fff; /* 滑块颜色 */
      border: none; /* 移除蓝色边框 */
      box-shadow: none; /* 移除阴影效果 */
    }
  }
}

/* 新增：主航线角度头部样式 */
.main-route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 移除或修改不再需要的样式 */
/* .main-route-angle-settings {
    display: flex;
    align-items: center;
    gap: 15px;
} */

/* .main-route-angle-control {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
    flex-grow: 1;
} */

.main-route-angle-display {
  display: flex;
  align-items: baseline; /* 底部对齐，使单位看起来更自然 */
  gap: 5px;
  margin-top: -10px;
}

.main-route-angle-value {
  font-size: 28px; /* 角度数值字体大小 */
  font-weight: bold;
  color: #2d8cf0; /* 蓝色数值 */
}

.main-route-angle-unit {
  font-size: 16px; /* 角度单位字体大小 */
  color: #fff;
}

.main-route-slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px; /* 按钮与滑块的间距 */
  width: 100%; /* 占据父容器宽度 */
}

.main-route-slider-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  width: 30px; /* 按钮宽度 */
  height: 30px; /* 按钮高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px; /* 调整字体大小 */
  font-weight: bold;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.main-route-slider-button:hover {
  background-color: #484848;
}

/* 覆盖 Element Plus Slider 样式 */
:deep(.main-route-slider.el-slider) {
  height: 30px; /* 确保滑块高度与按钮一致 */
  .el-slider__runway {
    background-color: #444; /* 滑轨背景色 */
    height: 6px; /* 滑轨高度 */
    border-radius: 3px;
  }
  .el-slider__bar {
    background-color: #2d8cf0; /* 进度条颜色 */
    height: 6px;
    border-radius: 3px;
  }
  .el-slider__button-wrapper {
    top: -15px; /* 调整滑块位置，使其垂直居中于滑轨 */
    .el-slider__button {
      width: 16px; /* 滑块大小 */
      height: 16px;
      background-color: #fff; /* 滑块颜色 */
      border: none; /* 移除蓝色边框 */
      box-shadow: none; /* 移除阴影效果 */
    }
  }
}

/* 新增：自定义 Element Plus Select 样式 */
:deep(.black-select.el-select) {
  width: 100%; /* 占据父容器宽度 */
  .el-input__wrapper {
    background-color: #444 !important; /* 背景色 */
    box-shadow: none !important;
    border: none !important;
    border-radius: 4px !important;
    height: 30px !important; /* 高度 */
    padding: 0 10px !important; /* 内边距 */
  }
  .el-input__inner {
    color: white !important; /* 文字颜色 */
    font-size: 14px !important;
  }
  .el-select__suffix {
    color: #fff !important; /* 下拉箭头颜色 */
  }
}

/* 新增：高级设置展开/收起图标旋转 */
.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.advanced-settings-content {
  /* 可以在这里添加高级设置内容的样式 */
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 10px; /* 高级设置内部子section的间距 */
}
/* 新增：高级设置内部的子section样式 */
.sub-section {
  display: flex;
  flex-direction: column;
  gap: 8px; /* 标题与内容之间的间距 */
  padding: 0; /* 移除内边距，由父级 advanced-settings-content 控制 */
  background-color: transparent; /* 透明背景 */
  border-radius: 0; /* 移除圆角 */
}

.sub-section-title {
  font-size: 13px; /* 字体大小略小 */
  font-weight: bold;
  color: #ccc; /* 颜色略浅 */
}

/* 新增：多步调整按钮组样式 */
.value-adjust-control {
  display: flex;
  align-items: center;
  gap: 5px; /* 按钮之间的间距 */
  flex-wrap: wrap; /* 允许换行 */
}

.adjust-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 2px 1px; /* 调整内边距 */
  cursor: pointer;
  font-size: 12px; /* 字体大小 */
  transition: background-color 0.2s ease;
  flex-shrink: 0; /* 防止按钮被压缩 */
  min-width: 30px; /* 最小宽度 */
  text-align: center;
}

/* Element Plus Select 下拉菜单的样式穿透 */
:deep(.black-select.el-popper.is-light) {
  border: none;
  background-color: rgba(51, 51, 51, 0.9) !important; /* 下拉菜单背景色 */
  margin-left: 22px;
  .el-select-dropdown__item {
    color: #ccc; /* 选项文字颜色 */
    &.hover,
    &:hover {
      background-color: rgba(70, 70, 70, 0.9) !important; /* 悬停背景色 */
      color: white;
    }
    &.selected {
      color: #2d8cf0; /* 选中文字颜色 */
      font-weight: bold;
    }
  }
  .el-select-dropdown {
    border: none;
  }
}
/* 新增：数值显示和输入组样式 (复用 speed-value-input-group 类似样式) */
.value-display-group {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  flex-grow: 1; /* 占据剩余空间 */
  justify-content: center; /* 内容居中 */
}

.value-display {
  font-size: 20px; /* 调整字体大小 */
  font-weight: bold;
  color: #2d8cf0;
  text-align: center;
  cursor: pointer;
  min-width: 60px;
}

/* 覆盖 Element Plus Input 默认样式 - 编辑状态 */
:deep(.value-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important; /* 输入框背景色改为深灰色 */
  box-shadow: none !important;
  border: 1px solid #444 !important; /* 边框颜色 */
  border-radius: 4px !important;
  padding: 0 8px !important; /* 调整内边距 */
  height: 30px !important; /* 调整高度 */
  max-width: 50px; /* 新增：限制最大宽度 */
}

:deep(.value-input.el-input--small .el-input__inner) {
  color: white !important; /* 数值颜色改为白色 */
  text-align: center !important; /* 数值居中 */
  padding: 0 !important; /* 移除内边距 */
  height: 28px !important; /* 调整高度 */
  line-height: 28px !important; /* 调整行高 */
  font-size: 20px !important; /* 调整字体大小，与非编辑状态保持一致 */
  font-weight: bold !important;
  /* 移除上下箭头按钮 */
  // -webkit-appearance: none; /* Chrome, Safari */
  // -moz-appearance: textfield; /* Firefox */
}

.value-unit {
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}

/* 新增：设置航线起始点链接样式 */
.set-route-start-point-link {
  color: #2d8cf0;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  align-self: flex-start; /* 左对齐 */
}

/* Element Plus Select 下拉菜单的样式穿透 */
:deep(.black-select.el-popper.is-light) {
  border: none;
  background-color: rgba(51, 51, 51, 0.9) !important; /* 下拉菜单背景色 */
  margin-left: 22px;
  .el-select-dropdown__item {
    color: #ccc; /* 选项文字颜色 */
    &.hover,
    &:hover {
      background-color: rgba(70, 70, 70, 0.9) !important; /* 悬停背景色 */
      color: white;
    }
    &.selected {
      color: #2d8cf0; /* 选中文字颜色 */
      font-weight: bold;
    }
  }
  .el-select-dropdown {
    border: none;
  }
}
/* 新增：全球高程数据按钮样式 */
.elevation-data-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s ease;
  margin-top: 5px; /* 与标题的间距 */
}

.elevation-data-button:hover {
  background-color: #555;
}

/* 新增：免责声明文本样式 */
.elevation-data-disclaimer {
  font-size: 12px;
  color: #ffcc00; /* 黄色 */
  margin-top: 8px;
  text-align: left;
}
</style>
