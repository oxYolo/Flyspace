<template>
  <div class="strip-settings-container">
    <div class="strip-stats">
      <div v-for="item in stripStats" :key="item.label" class="strip-stat-block" v-tooltip="item.label">
        <img class="strip-stat-icon" :src="item.iconSrc" :alt="item.label" />
        <span class="strip-stat-value">{{ item.value }}</span>
      </div>
    </div>

    <div class="work-area-section">
      <div class="section-title required-title">工作区</div>
      <el-select :model-value="props.airspaceManageId ?? undefined" placeholder="请选择工作区（必选）"
        :loading="props.workAreaLoading" style="width: 100%" @update:model-value="emit('workAreaChange', $event)">
        <el-option v-for="area in props.workAreaList" :key="area.id" :label="area.name" :value="area.id" />
      </el-select>
    </div>

    <!-- 顶部按钮：添加带状航线 -->
    <div class="reference-point-button" @click="handleStripButtonClick">
      <el-icon v-if="props.isAdding" :size="18">
        <RefreshRight />
      </el-icon>
      <span>{{ props.isAdding ? "重新绘制" : "添加带状航线" }}</span>
    </div>

    <el-input v-model="spaceDistance" class="spaceDistancePanel">
      <template #prepend>航点水平间距(米):</template>
      <template #append>
        <el-button @click="scheduleStripReplan">再次生成避障航线</el-button>
      </template>
    </el-input>

    <!-- 外扩与模式（位于高度模式之前） -->
    <div class="section expand-section">
      <div class="button-group segmented-control">
        <div class="setting-button" :class="{ active: stripModeInternal === 'bow' }" @click="selectStripMode('bow')">
          弓字航线
        </div>
        <div class="setting-button" :class="{ active: stripModeInternal === 'single' }"
          @click="selectStripMode('single')">
          单航线
        </div>
      </div>

      <!-- 单航线说明文字 -->
      <div v-if="stripModeInternal === 'single'" class="single-mode-tip">
        此模式下，飞行器将沿中心线飞一条航线，外扩距离会影响飞行高度
      </div>

      <!-- 弓字模式：左右外扩 + 关联按钮 + 切割距离 -->
      <template v-if="stripModeInternal === 'bow'">
        <div class="section-title">外扩距离</div>
        <div class="expand-rows">
          <div class="expand-row">
            <div class="expand-label">左外扩距离</div>
            <div class="value-adjust-control">
              <div class="adjust-button" @click="adjustLeftExpand(-100)">
                -100
              </div>
              <div class="adjust-button" @click="adjustLeftExpand(-10)">
                -10
              </div>
              <div class="value-display-group">
                <span v-if="!isLeftExpandEditing" class="value-display" @click="startLeftExpandEdit">{{
                  props.leftExpandDistance }}</span>
                <el-input v-else v-model.number="leftExpandDistanceInternal" type="number" class="value-input"
                  size="small" :controls="false" @blur="stopLeftExpandEdit" @keyup.enter="stopLeftExpandEdit"
                  ref="leftExpandInputRef" />
                <span class="value-unit">m</span>
              </div>
              <div class="adjust-button" @click="adjustLeftExpand(10)">+10</div>
              <div class="adjust-button" @click="adjustLeftExpand(100)">
                +100
              </div>
            </div>
          </div>

          <div class="expand-link" :class="{ active: linkBothSides }">
            <el-button class="link-button" :type="linkBothSides ? 'primary' : 'default'" circle @click="toggleLink">
              <el-icon>
                <Link />
              </el-icon>
            </el-button>
          </div>

          <div class="expand-row">
            <div class="expand-label">右外扩距离</div>
            <div class="value-adjust-control">
              <div class="adjust-button" @click="adjustRightExpand(-100)">
                -100
              </div>
              <div class="adjust-button" @click="adjustRightExpand(-10)">
                -10
              </div>
              <div class="value-display-group">
                <span v-if="!isRightExpandEditing" class="value-display" @click="startRightExpandEdit">{{
                  props.rightExpandDistance }}</span>
                <el-input v-else v-model.number="rightExpandDistanceInternal" type="number" class="value-input"
                  size="small" :controls="false" @blur="stopRightExpandEdit" @keyup.enter="stopRightExpandEdit"
                  ref="rightExpandInputRef" />
                <span class="value-unit">m</span>
              </div>
              <div class="adjust-button" @click="adjustRightExpand(10)">
                +10
              </div>
              <div class="adjust-button" @click="adjustRightExpand(100)">
                +100
              </div>
            </div>
          </div>
        </div>

        <!-- 切割距离（仅弓字模式） -->
        <div class="expand-row">
          <div class="expand-label">切割距离</div>
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustCuttingDistance(-100)">
              -100
            </div>
            <div class="adjust-button" @click="adjustCuttingDistance(-10)">
              -10
            </div>
            <div class="value-display-group">
              <span v-if="!isCuttingEditing" class="value-display" @click="startCuttingEdit">{{ props.cuttingDistance
                }}</span>
              <el-input v-else v-model.number="cuttingDistanceInternal" type="number" class="value-input" size="small"
                :controls="false" @blur="stopCuttingEdit" @keyup.enter="stopCuttingEdit" ref="cuttingInputRef" />
              <span class="value-unit">m</span>
            </div>
            <div class="adjust-button" @click="adjustCuttingDistance(10)">
              +10
            </div>
            <div class="adjust-button" @click="adjustCuttingDistance(100)">
              +100
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="section-title">外扩距离</div>
        <div class="expand-row">
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustUnifiedExpand(-100)">
              -100
            </div>
            <div class="adjust-button" @click="adjustUnifiedExpand(-10)">
              -10
            </div>
            <div class="value-display-group">
              <span v-if="!isUnifiedExpandEditing" class="value-display" @click="startUnifiedExpandEdit">{{
                unifiedExpandDistanceInternal }}</span>
              <el-input v-else v-model.number="unifiedExpandDistanceInternal" type="number" class="value-input"
                size="small" :controls="false" @blur="stopUnifiedExpandEdit" @keyup.enter="stopUnifiedExpandEdit" />
              <span class="value-unit">m</span>
            </div>
            <div class="adjust-button" @click="adjustUnifiedExpand(10)">
              +10
            </div>
            <div class="adjust-button" @click="adjustUnifiedExpand(100)">
              +100
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 航点高度模式（与面状一致，含示意图） -->
    <div class="section height-mode">
      <div class="section-title title-with-tip">
        <span>航点高度模式</span>
        <el-tooltip effect="dark" placement="right" popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>海拔高度：航点高度值相对于海平面高度保持不变。</p>
              <p>相对起飞点高度（ALT）：航点高度值相对起飞点的高度保持不变。</p>
              <p>
                相对地形的高度（AGL）：航点高度值相对地形/模型高度保持不变。
              </p>
            </div>
          </template>
          <el-icon class="title-tip-icon">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div class="setting-button" :class="{ active: props.selectedHeightMode === 'EGM96' }"
          @click="selectHeightMode('EGM96')">
          海拔高度
        </div>
        <div class="setting-button" :class="{
          active: props.selectedHeightMode === 'relativeToStartPoint',
        }" @click="selectHeightMode('relativeToStartPoint')">
          相对起飞点高度
        </div>
        <div class="setting-button" :class="{
          active:
            props.selectedHeightMode === 'aboveGroundLevel' ||
            props.selectedHeightMode === 'terrain',
        }" @click="selectHeightMode('aboveGroundLevel')">
          相对地形高度
        </div>
      </div>
      <div class="climb-settings">
        <div class="diagram">
          <img v-if="props.selectedHeightMode === 'EGM96'" src="/src/assets/svg/海拔高度.svg" alt="海拔高度示意图" />
          <img v-if="props.selectedHeightMode === 'relativeToStartPoint'" src="/src/assets/svg/相对起飞点高度.svg"
            alt="相对起飞点高度示意图" />
          <img v-if="
            props.selectedHeightMode === 'aboveGroundLevel' ||
            props.selectedHeightMode === 'terrain'
          " src="/src/assets/svg/相对地形高度.svg" alt="相对地形高度示意图" />
        </div>
        <div class="altitude-control">
          <div class="alt-button" @click="adjustRouteAltitude(100)">+100</div>
          <div class="alt-button" @click="adjustRouteAltitude(10)">+10</div>
          <div class="alt-value-input-group">
            <span v-if="!isRouteAltitudeEditing" class="alt-value" @click="startRouteAltitudeEdit">
              {{ props.routeAltitude }}
            </span>
            <el-input v-else v-model.number="routeAltitudeInternal" type="number" class="alt-input" :controls="false"
              @blur="stopRouteAltitudeEdit" @keyup.enter="stopRouteAltitudeEdit" ref="routeAltitudeInputRef" />
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
        <el-tooltip effect="dark" placement="right" popper-class="route-height-tooltip">
          <template #content>
            <div class="route-height-tip-content">
              <p>
                <strong>垂直爬升：</strong>飞行器爬升到航线起始点高度后，再飞向航线起始点。
              </p>
              <p>
                <strong>倾斜爬升：</strong>飞行器爬升到“安全起飞高度”后，再直线飞到航线起始点。
              </p>
              <p><strong>安全起飞高度：</strong>是相对起飞点的高度值。</p>
              <p>飞行器起飞后，会先上升至“安全起飞高度”，再飞向航线起始点</p>
              <img src="/src/assets/svg/returnHeight.svg" alt="返航高度说明" />
            </div>
          </template>
          <el-icon class="title-tip-icon">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
      <div class="button-group segmented-control">
        <div class="setting-button" :class="{ active: props.flyToWaylineMode === 'safely' }"
          @click="selectClimbMode('safely')">
          垂直爬升
        </div>
        <div class="setting-button" :class="{ active: props.flyToWaylineMode === 'pointToPoint' }"
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
            <span v-if="!isSafeTakeoffHeightEditing" class="alt-value" @click="startSafeTakeoffHeightEdit">
              {{ props.safeTakeoffHeight }}
            </span>
            <el-input v-else v-model.number="safeTakeoffHeightInternal" type="number" class="alt-input"
              :controls="false" @blur="stopSafeTakeoffHeightEdit" @keyup.enter="stopSafeTakeoffHeightEdit"
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
          <span v-if="!isGlobalRouteSpeedEditing" class="speed-value" @click="startGlobalRouteSpeedEdit">{{
            props.globalRouteSpeed }}</span>
          <el-input v-else v-model.number="globalRouteSpeedInternal" type="number" class="speed-input" size="small"
            :controls="false" @blur="stopGlobalRouteSpeedEdit" @keyup.enter="stopGlobalRouteSpeedEdit"
            ref="globalRouteSpeedInputRef" />
          <span class="speed-unit">m/s</span>
        </div>
        <div class="speed-button" @click="adjustGlobalRouteSpeed(1)">+</div>
      </div>
    </div>

    <!-- 边缘图像优化 -->
    <div class="section">
      <div class="collapsible-section">
        <div class="section-title">边缘图像优化</div>
        <el-switch :model-value="props.sideOptimizationEnabled"
          @update:model-value="emit('update:sideOptimizationEnabled', $event)" style="--el-switch-off-color: #444" />
      </div>
    </div>

    <!-- 完成动作 -->
    <div class="section">
      <div class="section-title">完成动作</div>
      <el-select v-model="completionActionInternal" placeholder="请选择" size="small" class="black-select"
        popper-class="black-select" :teleported="false">
        <el-option label="自动返航" value="goHome"></el-option>
        <el-option label="返回航线起始点悬停" value="return_stop"></el-option>
        <el-option label="退出航线模式" value="out_route"></el-option>
        <el-option label="原地降落" value="return_down"></el-option>
      </el-select>
    </div>

    <!-- 高级设置 -->
    <div class="section">
      <div class="collapsible-section" @click="showAdvancedSettings = !showAdvancedSettings">
        <div class="section-title">高级设置</div>
        <el-icon :class="{ 'rotate-icon': showAdvancedSettings }">
          <ArrowDown />
        </el-icon>
      </div>
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
              <span v-if="!isSideOverlapRateEditing" class="value-display" @click="startSideOverlapRateEdit">{{
                props.sideOverlapRate }}</span>
              <el-input v-else v-model.number="sideOverlapRateInternal" type="number" class="value-input" size="small"
                :controls="false" @blur="stopSideOverlapRateEdit" @keyup.enter="stopSideOverlapRateEdit"
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
              <span v-if="!isForwardOverlapRateEditing" class="value-display" @click="startForwardOverlapRateEdit">{{
                props.forwardOverlapRate }}</span>
              <el-input v-else v-model.number="forwardOverlapRateInternal" type="number" class="value-input"
                size="small" :controls="false" @blur="stopForwardOverlapRateEdit"
                @keyup.enter="stopForwardOverlapRateEdit" ref="forwardOverlapRateInputRef" />
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
        <div v-if="props.selectedCollectionMethod === 'orthophoto'" class="sub-section">
          <div class="sub-section-title">边距</div>
          <div class="value-adjust-control">
            <div class="adjust-button" @click="adjustMargin(-10)">-10</div>
            <div class="adjust-button" @click="adjustMargin(-5)">-5</div>
            <div class="adjust-button" @click="adjustMargin(-1)">-1</div>
            <div class="value-display-group">
              <span v-if="!isMarginEditing" class="value-display" @click="startMarginEdit">{{ props.margin }}</span>
              <el-input v-else v-model.number="marginInternal" type="number" class="value-input" size="small"
                :controls="false" @blur="stopMarginEdit" @keyup.enter="stopMarginEdit" ref="marginInputRef" />
              <span class="value-unit">m</span>
            </div>
            <div class="adjust-button" @click="adjustMargin(1)">+1</div>
            <div class="adjust-button" @click="adjustMargin(5)">+5</div>
            <div class="adjust-button" @click="adjustMargin(10)">+10</div>
          </div>
        </div>

        <!-- 拍照模式 -->
        <div v-if="props.selectedCollectionMethod === 'orthophoto'" class="sub-section">
          <div class="sub-section-title">拍照模式</div>
          <el-select v-model="photoModeInternal" placeholder="请选择" size="small" class="black-select"
            popper-class="black-select" :teleported="false">
            <el-option label="等时间隔拍照" value="multipleTiming"></el-option>
            <el-option label="等距间隔拍照" value="multipleDistance"></el-option>
          </el-select>
        </div>

        <!-- 是否包含中心线 -->
        <div class="collapsible-section">
          <div class="section-title">是否包含中心线</div>
          <el-switch :model-value="props.includeCenterEnable"
            @update:model-value="emit('update:includeCenterEnable', $event)" style="--el-switch-off-color: #444" />
        </div>
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
  ElInput,
  ElButton,
  ElIcon,
  ElSwitch,
  ElSelect,
  ElOption,
  ElTooltip,
} from "element-plus";
import {
  Link,
  ArrowDown,
  QuestionFilled,
  RefreshRight,
} from "@element-plus/icons-vue";
import emitter from "@/stores/mitt";
import waylineIcon from "@/assets/svg/wayline.svg";
import photosIcon from "@/assets/svg/photos.svg";
import clockIcon from "@/assets/svg/clock.svg";
import areaIcon from "@/assets/svg/area.svg";
import centerLineIcon from "@/assets/svg/center_line.svg";
import { ElMessage } from "element-plus";
import {
  startDrawingStrip,
  updateStripOffsetsSmart,
  getStripCenterlinePointsSmart,
  loadAirLine,
  // @ts-ignore 无法找到声明文件，临时忽略类型检查
} from "@/services/waypointService";
import { $stripPathPlanning } from "@/api/flyControl/flight";

// Props，与 AreaRouteSettings 对齐，新增左右外扩距离
const props = defineProps<{
  currentRoute?: any;
  selectedCollectionMethod: string;
  selectedHeightMode: string;
  routeAltitude: number;
  flyToWaylineMode: string;
  safeTakeoffHeight: number;
  // 外扩距离
  leftExpandDistance: number;
  rightExpandDistance: number;
  // 模式：弓字航线(bow)/单航线(single)
  stripMode: string;
  // 切割距离（仅弓字模式）
  cuttingDistance: number;
  isAdding: boolean;
  // 复用：速度、角度等
  globalRouteSpeed: number;
  mainRouteAngle: number;
  sideOptimizationEnabled: boolean;
  includeCenterEnable: boolean;
  completionAction: string;
  // 高级设置
  sideOverlapRate: number;
  forwardOverlapRate: number;
  margin: number;
  photoMode: string;
  airspaceManageId: number | string | null;
  workAreaList: { id: number | string; name: string }[];
  workAreaLoading: boolean;
}>();

const STRIP_PLANNING_LEVEL = 7;
const stripPlanningLoading = ref(false);
const stripFlightGeoCenters = ref<number[][]>([]);
const stripRouteResult = ref<any>(null);
const stripCenterlinePoints = ref<any[]>([]);
const stripBufferPolygons = ref<any[]>([]);
let stripReplanTimer: ReturnType<typeof setTimeout> | null = null;
// 航点水平间距(米)
const spaceDistance = ref(10);

const stripStats = computed(() => {
  const centerlineLength = getCenterlineLength();
  const routeDistance = getRouteDistance();

  return [
    {
      label: "中心线长度",
      iconSrc: centerLineIcon,
      value: formatDistance(centerlineLength),
    },
    {
      label: "面积",
      iconSrc: areaIcon,
      value: formatArea(getStripArea(centerlineLength)),
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

function getCenterlineLength() {
  const coordinates =
    routeDetail.value?.stripLineRoute?.centerlineJson?.coordinates;
  return getPolylineLength(normalizeCoordinates(coordinates));
}

function getStripArea(centerlineLength: number) {
  if (!Number.isFinite(centerlineLength) || centerlineLength <= 0) return 0;
  const left = Number(
    routeDetail.value?.stripLineRoute?.leftExtend ?? props.leftExpandDistance,
  );
  const right = Number(
    routeDetail.value?.stripLineRoute?.rightExtend ?? props.rightExpandDistance,
  );
  const width = [left, right].reduce((total, value) => {
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
  return centerlineLength * width;
}

function getRouteDistance() {
  const estimatedDistance = Number(routeDetail.value?.estimatedDistance);
  if (Number.isFinite(estimatedDistance) && estimatedDistance > 0) {
    return estimatedDistance;
  }
  if (stripFlightGeoCenters.value.length > 0) {
    return getPolylineLength(stripFlightGeoCenters.value);
  }
  const coordinates = normalizeCoordinates(
    routeDetail.value?.routePointJson?.coordinates,
  );
  return getPolylineLength(coordinates);
}

function getRouteDuration(routeDistance: number) {
  if (
    Number.isFinite(routeDistance) &&
    routeDistance > 0 &&
    Number.isFinite(Number(props.globalRouteSpeed)) &&
    Number(props.globalRouteSpeed) > 0
  ) {
    return routeDistance / Number(props.globalRouteSpeed);
  }

  const estimatedDurationMinutes = Number(routeDetail.value?.estimatedDuration);
  if (
    Number.isFinite(estimatedDurationMinutes) &&
    estimatedDurationMinutes > 0
  ) {
    return estimatedDurationMinutes * 60;
  }
  const speed = Number(
    routeDetail.value?.autoFlightSpeed ?? props.globalRouteSpeed,
  );
  if (
    !Number.isFinite(routeDistance) ||
    routeDistance <= 0 ||
    !Number.isFinite(speed) ||
    speed <= 0
  ) {
    return 0;
  }
  return routeDistance / speed;
}

function getPhotoCount() {
  const flightPointCount = Number(stripRouteResult.value?.flight_point_count);
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
  return `${Math.round(value)}m`;
}

function formatArea(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0m²";
  return `${Math.round(value)}m²`;
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

function resetStripPlanningState() {
  stripFlightGeoCenters.value = [];
  stripRouteResult.value = null;
  stripCenterlinePoints.value = [];
  stripBufferPolygons.value = [];
}

function clearStripReplanTimer() {
  if (stripReplanTimer) {
    clearTimeout(stripReplanTimer);
    stripReplanTimer = null;
  }
}

function normalizeStripCenterlinePoints(rawPoints: any[] = []) {
  return rawPoints
    .map((point: any) => {
      if (Array.isArray(point)) {
        const longitude = Number(point[0]);
        const latitude = Number(point[1]);
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
          return null;
        return {
          longitude,
          latitude,
          altitude: Number(props.routeAltitude),
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
        altitude: Number.isFinite(altitude) ? altitude : Number(props.routeAltitude),
      };
    })
    .filter(Boolean);
}

function getCurrentStripCenterlineForPlanning() {
  if (stripCenterlinePoints.value.length >= 2) {
    return normalizeStripCenterlinePoints(stripCenterlinePoints.value);
  }
  const currentCenterline = getStripCenterlinePointsSmart?.() || [];
  if (Array.isArray(currentCenterline) && currentCenterline.length >= 2) {
    return normalizeStripCenterlinePoints(currentCenterline);
  }
  const routeCenterline =
    routeDetail.value?.stripLineRoute?.centerlineJson?.coordinates;
  if (Array.isArray(routeCenterline) && routeCenterline.length >= 2) {
    return normalizeStripCenterlinePoints(routeCenterline);
  }
  return [];
}

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

function formatPointHeight(val: any) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-6) return String(rounded);
  return n.toFixed(1);
}

function buildStripPlannedRouteFeatureCollection(
  routePoints: number[][],
  bufferPolygons: any[] = [],
) {
  // 航线 id：loadAirLine 依靠 line.properties.id === point.properties.id
  // 来配对渲染航点 Point 与垂直虚线，必须显式给出且 line/point 一致
  const routeId = "strip-route";
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

  bufferPolygons.forEach((polygon: any, index: number) => {
    if (
      polygon?.type !== "Polygon" ||
      !Array.isArray(polygon?.coordinates) ||
      polygon.coordinates.length === 0
    ) {
      return;
    }
    features.push({
      type: "Feature",
      properties: {
        routeId: `strip-buffer-${index + 1}`,
      },
      geometry: polygon,
    });
  });

  return {
    type: "FeatureCollection",
    features,
    __noFlyTo: true,
  };
}

async function requestStripPathPlanning(
  centerlinePoints: any[],
  options: { showSuccessMessage?: boolean } = {},
) {
  const { showSuccessMessage = false } = options;
  if (!Array.isArray(centerlinePoints) || centerlinePoints.length < 2) return false;

  const routeType = stripModeInternal.value === "single" ? "single" : "zigzag";
  const line = {
    type: "LineString",
    coordinates: centerlinePoints.map((point: any) => [
      Number(point.longitude),
      Number(point.latitude),
    ]),
  };

  const params: any = {
    route_type: routeType,
    line,
    height: props.routeAltitude,
    level: STRIP_PLANNING_LEVEL,
    
  };

  if (routeType === "zigzag") {
    params.left_extension_m = Number(props.leftExpandDistance) || 0;
    params.right_extension_m = Number(props.rightExpandDistance) || 0;
    params.cut_distance_m = Number(props.cuttingDistance) || 0;
    params.waypoint_spacing_m = Number(spaceDistance.value) || 10;
  }

  stripPlanningLoading.value = true;
  emitter.emit("obstacle-avoidance-loading", true);

  try {
    const res: any = await $stripPathPlanning(params, 10 * 60 * 1000);
    const success = res?.success === true || res?.code === 200;
    const resultData = res?.data?.data ?? res?.data ?? null;
    if (!success || !resultData) {
      ElMessage.error(res?.msg || res?.message || "带状航线生成失败");
      return false;
    }

    const flightCenters = normalizePlanningPoints(resultData.flight_geo_centers);
    const bufferPolygons = Array.isArray(resultData.buffer_polygons)
      ? resultData.buffer_polygons
      : [];
    stripCenterlinePoints.value = normalizeStripCenterlinePoints(centerlinePoints);
    stripFlightGeoCenters.value = flightCenters;
    stripRouteResult.value = resultData.strip_route || {};
    stripBufferPolygons.value = bufferPolygons;

    if (flightCenters.length >= 2) {
      loadAirLine(
        buildStripPlannedRouteFeatureCollection(flightCenters, bufferPolygons),
      );
    }

    emitter.emit("strip-route-points-change", {
      centerlinePoints: stripCenterlinePoints.value,
      flightCenters,
      stripRoute: resultData.strip_route || {},
      bufferPolygons,
      gridList: [
        ...(Array.isArray(resultData.flight_grids) ? resultData.flight_grids : []),
        ...(Array.isArray(resultData.obstacle_grids)
          ? resultData.obstacle_grids
          : []),
      ],
      rawData: resultData,
    });
    emitter.emit("changeAdding", true);
    if (showSuccessMessage) {
      ElMessage.success("带状航线已生成");
    }
    return true;
  } catch (e: any) {
    ElMessage.error(e?.message || "带状航线生成失败，请重试");
    return false;
  } finally {
    stripPlanningLoading.value = false;
    emitter.emit("obstacle-avoidance-loading", false);
  }
}

const emit = defineEmits([
  "update:selectedCollectionMethod",
  "update:selectedHeightMode",
  "update:routeAltitude",
  "update:flyToWaylineMode",
  "update:safeTakeoffHeight",
  "update:leftExpandDistance",
  "update:rightExpandDistance",
  "update:stripMode",
  "update:cuttingDistance",
  "update:isAdding",
  // 复用：速度、角度等
  "update:globalRouteSpeed",
  "update:mainRouteAngle",
  "update:sideOptimizationEnabled",
  "update:includeCenterEnable",
  "update:completionAction",
  // 高级设置
  "update:sideOverlapRate",
  "update:forwardOverlapRate",
  "update:margin",
  "update:photoMode",
  "workAreaChange",
]);

// 采集方式
const selectCollectionMethod = (method: string) => {
  emit("update:selectedCollectionMethod", method);
};

// 高度模式
const selectHeightMode = (mode: string) => {
  emit("update:selectedHeightMode", mode);
};

const selectClimbMode = (mode: string) => {
  emit("update:flyToWaylineMode", mode);
};

// 航线高度
const routeAltitudeInternal = ref(props.routeAltitude);
const isRouteAltitudeEditing = ref(false);
const routeAltitudeInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const safeTakeoffHeightInternal = ref(props.safeTakeoffHeight);
const isSafeTakeoffHeightEditing = ref(false);
const safeTakeoffHeightInputRef = ref<InstanceType<typeof ElInput> | null>(
  null,
);

watch(
  () => props.routeAltitude,
  (v) => {
    routeAltitudeInternal.value = v;
  },
);
watch(
  () => props.safeTakeoffHeight,
  (v) => {
    safeTakeoffHeightInternal.value = v;
  },
);

const adjustRouteAltitude = (delta: number) => {
  const finalValue = Math.max(0, Number(props.routeAltitude || 0) + delta);
  routeAltitudeInternal.value = finalValue;
  emit("update:routeAltitude", finalValue);
};
const startRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = true;
  nextTick(() => routeAltitudeInputRef.value?.focus());
};
const stopRouteAltitudeEdit = () => {
  isRouteAltitudeEditing.value = false;
  const finalValue = Math.max(0, Number(routeAltitudeInternal.value || 0));
  routeAltitudeInternal.value = finalValue;
  emit("update:routeAltitude", finalValue);
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

// 模式切换
const stripModeInternal = ref<"bow" | "single">(
  props.stripMode === "single" ? "single" : "bow",
);
watch(
  () => props.stripMode,
  (v) => {
    const nextMode: "bow" | "single" = v === "single" ? "single" : "bow";
    stripModeInternal.value = nextMode;
  },
);
const selectStripMode = (mode: "bow" | "single") => {
  if (stripModeInternal.value === mode) return;
  stripModeInternal.value = mode;
  emit("update:stripMode", mode);
  if (mode === "single") {
    // 切到单航线时，用左外扩初始化统一外扩，并同步到右侧
    unifiedExpandDistanceInternal.value = leftExpandDistanceInternal.value;
    emit("update:rightExpandDistance", unifiedExpandDistanceInternal.value);
  } else {
    // 切回弓字模式时，保持当前左右数值不变，由统一侦听器触发一次带状重绘
  }
};

// 开始绘制带状航线（线）
function startAddStrip() {
  if (props.isAdding) return;
  emit("update:isAdding", true);
  startDrawingStrip(props.leftExpandDistance, props.rightExpandDistance);
  ElMessage.info("左键添加中心线点，右键结束绘制并生成避障航线");
}

async function redrawStrip() {
  emit("update:isAdding", false);
  emitter.emit("changeAdding", false);
  emitter.emit("reset-map");
  await nextTick();
  startAddStrip();
}

function handleStripButtonClick() {
  if (props.isAdding) {
    redrawStrip();
    return;
  }
  startAddStrip();
}

// 监听绘制开始与结束，自动同步按钮状态
const onStripStarted = () => {
  emit("update:isAdding", true);
  resetStripPlanningState();
};
const onStripFinished = async (payload: any) => {
  if (!payload?.success) return;
  emit("update:isAdding", false);
  const centerlinePoints = normalizeStripCenterlinePoints(payload.points || []);
  await requestStripPathPlanning(centerlinePoints, { showSuccessMessage: true });
};
onMounted(() => {
  emitter.on("stripDrawingStarted", onStripStarted);
  emitter.on("stripDrawingFinished", onStripFinished);
});
onBeforeUnmount(() => {
  emitter.off("stripDrawingStarted", onStripStarted);
  emitter.off("stripDrawingFinished", onStripFinished);
  clearStripReplanTimer();
  resetStripPlanningState();
});

// 外扩距离 - 内部编辑与联动（弓字模式）
const leftExpandDistanceInternal = ref(props.leftExpandDistance);
const rightExpandDistanceInternal = ref(props.rightExpandDistance);

// 先声明是否联动，后续侦听会用到
const linkBothSides = ref(true);

watch(
  () => props.leftExpandDistance,
  (v) => {
    leftExpandDistanceInternal.value = v;
  },
);
watch(
  () => props.rightExpandDistance,
  (v) => {
    rightExpandDistanceInternal.value = v;
  },
);

watch(leftExpandDistanceInternal, (v) => {
  emit("update:leftExpandDistance", v);
  if (linkBothSides.value) {
    rightExpandDistanceInternal.value = v;
    emit("update:rightExpandDistance", v);
  }
});
watch(rightExpandDistanceInternal, (v) => {
  emit("update:rightExpandDistance", v);
  if (linkBothSides.value) {
    leftExpandDistanceInternal.value = v;
    emit("update:leftExpandDistance", v);
  }
});

// 合并侦听：弓字模式下集中触发一次带状外扩更新
watch(
  [
    leftExpandDistanceInternal,
    rightExpandDistanceInternal,
    stripModeInternal,
    linkBothSides,
  ],
  ([l, r, mode]) => {
    if (mode === "bow") {
      updateStripOffsetsSmart(l, r);
    }
  },
  { flush: "post" },
);

const toggleLink = () => {
  const willLink = !linkBothSides.value;
  linkBothSides.value = willLink;
  if (willLink) {
    if (
      rightExpandDistanceInternal.value !== leftExpandDistanceInternal.value
    ) {
      rightExpandDistanceInternal.value = leftExpandDistanceInternal.value;
    }
  }
};

// 编辑模式切换（弓字）
const isLeftExpandEditing = ref(false);
const isRightExpandEditing = ref(false);
const leftExpandInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const rightExpandInputRef = ref<InstanceType<typeof ElInput> | null>(null);

const startLeftExpandEdit = () => {
  isLeftExpandEditing.value = true;
  nextTick(() => leftExpandInputRef.value?.focus());
};
const stopLeftExpandEdit = () => {
  isLeftExpandEditing.value = false;
};
const startRightExpandEdit = () => {
  isRightExpandEditing.value = true;
  nextTick(() => rightExpandInputRef.value?.focus());
};
const stopRightExpandEdit = () => {
  isRightExpandEditing.value = false;
};

// 外扩调整函数（弓字）
function clampExpand(v: number) {
  return Math.max(10, Math.min(1000, v));
}
const adjustLeftExpand = (delta: number) => {
  leftExpandDistanceInternal.value = clampExpand(
    leftExpandDistanceInternal.value + delta,
  );
};
const adjustRightExpand = (delta: number) => {
  rightExpandDistanceInternal.value = clampExpand(
    rightExpandDistanceInternal.value + delta,
  );
};

// 统一外扩（单航线）
const unifiedExpandDistanceInternal = ref<number>(props.leftExpandDistance);
watch(
  () => props.leftExpandDistance,
  (v) => {
    if (stripModeInternal.value === "single")
      unifiedExpandDistanceInternal.value = v;
  },
);
const isUnifiedExpandEditing = ref(false);
const startUnifiedExpandEdit = () => {
  isUnifiedExpandEditing.value = true;
  nextTick(() => { });
};
const stopUnifiedExpandEdit = () => {
  isUnifiedExpandEditing.value = false;
  unifiedExpandDistanceInternal.value = clampExpand(
    unifiedExpandDistanceInternal.value,
  );
};
const adjustUnifiedExpand = (delta: number) => {
  unifiedExpandDistanceInternal.value = clampExpand(
    unifiedExpandDistanceInternal.value + delta,
  );
};
watch(unifiedExpandDistanceInternal, (v) => {
  if (stripModeInternal.value !== "single") return;
  emit("update:leftExpandDistance", v);
  emit("update:rightExpandDistance", v);
  updateStripOffsetsSmart(v, v);
});

// 切割距离（弓字）
const cuttingDistanceInternal = ref<number>(props.cuttingDistance || 1000);
const isCuttingEditing = ref(false);
const cuttingInputRef = ref<InstanceType<typeof ElInput> | null>(null);
watch(
  () => props.cuttingDistance,
  (v) => {
    cuttingDistanceInternal.value = v;
  },
);
watch(cuttingDistanceInternal, (v) => {
  emit("update:cuttingDistance", v);
});
const clampCutting = (v: number) => Math.max(0, Math.min(10000, v));
const adjustCuttingDistance = (delta: number) => {
  cuttingDistanceInternal.value = clampCutting(
    (cuttingDistanceInternal.value || 0) + delta,
  );
};
const startCuttingEdit = () => {
  isCuttingEditing.value = true;
  nextTick(() => cuttingInputRef.value?.focus());
};
const stopCuttingEdit = () => {
  isCuttingEditing.value = false;
  cuttingDistanceInternal.value = clampCutting(
    cuttingDistanceInternal.value || 0,
  );
};

// --- 复用：全局航线速度 ---
const globalRouteSpeedInternal = ref(props.globalRouteSpeed);
const isGlobalRouteSpeedEditing = ref(false);
const globalRouteSpeedInputRef = ref<InstanceType<typeof ElInput> | null>(null);

watch(
  () => props.globalRouteSpeed,
  (v) => {
    globalRouteSpeedInternal.value = v;
  },
);
watch(globalRouteSpeedInternal, (v) => {
  emit("update:globalRouteSpeed", v);
});

const adjustGlobalRouteSpeed = (delta: number) => {
  const newValue = globalRouteSpeedInternal.value + delta;
  const finalValue = Math.max(1, Math.min(15, newValue));
  globalRouteSpeedInternal.value = finalValue;
};
const startGlobalRouteSpeedEdit = () => {
  isGlobalRouteSpeedEditing.value = true;
  nextTick(() => globalRouteSpeedInputRef.value?.focus());
};
const stopGlobalRouteSpeedEdit = () => {
  isGlobalRouteSpeedEditing.value = false;
  const finalValue = Math.max(1, Math.min(15, globalRouteSpeedInternal.value));
  globalRouteSpeedInternal.value = finalValue;
};

// --- 复用：主航线角度 ---
const mainRouteAngleInternal = ref(props.mainRouteAngle);
watch(
  () => props.mainRouteAngle,
  (v) => {
    mainRouteAngleInternal.value = v;
  },
);
watch(mainRouteAngleInternal, (v) => {
  emit("update:mainRouteAngle", v);
});
const adjustMainRouteAngle = (delta: number) => {
  let newValue = mainRouteAngleInternal.value + delta;
  if (newValue > 360) newValue = 0;
  else if (newValue < 0) newValue = 360;
  mainRouteAngleInternal.value = newValue;
};

// --- 复用：完成动作 ---
const completionActionInternal = ref(props.completionAction);
watch(
  () => props.completionAction,
  (v) => {
    completionActionInternal.value = v;
  },
);
watch(completionActionInternal, (v) => {
  emit("update:completionAction", v);
});

// --- 复用：高级设置 ---
const showAdvancedSettings = ref(false);
const sideOverlapRateInternal = ref(props.sideOverlapRate);
const forwardOverlapRateInternal = ref(props.forwardOverlapRate);
const marginInternal = ref(props.margin);
const photoModeInternal = ref(props.photoMode);

const isSideOverlapRateEditing = ref(false);
const isForwardOverlapRateEditing = ref(false);
const isMarginEditing = ref(false);

const sideOverlapRateInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const forwardOverlapRateInputRef = ref<InstanceType<typeof ElInput> | null>(
  null,
);
const marginInputRef = ref<InstanceType<typeof ElInput> | null>(null);

watch(
  () => props.sideOverlapRate,
  (v) => {
    sideOverlapRateInternal.value = v;
  },
);
watch(
  () => props.forwardOverlapRate,
  (v) => {
    forwardOverlapRateInternal.value = v;
  },
);
watch(
  () => props.margin,
  (v) => {
    marginInternal.value = v;
  },
);
watch(
  () => props.photoMode,
  (v) => {
    photoModeInternal.value = v;
  },
);

watch(sideOverlapRateInternal, (v) => {
  emit("update:sideOverlapRate", v);
});
watch(forwardOverlapRateInternal, (v) => {
  emit("update:forwardOverlapRate", v);
});
watch(marginInternal, (v) => {
  emit("update:margin", v);
});
watch(photoModeInternal, (v) => {
  emit("update:photoMode", v);
});

const adjustSideOverlapRate = (delta: number) => {
  const newValue = sideOverlapRateInternal.value + delta;
  const finalValue = Math.max(0, Math.min(100, newValue));
  sideOverlapRateInternal.value = finalValue;
};
const startSideOverlapRateEdit = () => {
  isSideOverlapRateEditing.value = true;
  nextTick(() => sideOverlapRateInputRef.value?.focus());
};
const stopSideOverlapRateEdit = () => {
  isSideOverlapRateEditing.value = false;
  const finalValue = Math.max(0, Math.min(100, sideOverlapRateInternal.value));
  sideOverlapRateInternal.value = finalValue;
};

const adjustForwardOverlapRate = (delta: number) => {
  const newValue = forwardOverlapRateInternal.value + delta;
  const finalValue = Math.max(0, Math.min(100, newValue));
  forwardOverlapRateInternal.value = finalValue;
};
const startForwardOverlapRateEdit = () => {
  isForwardOverlapRateEditing.value = true;
  nextTick(() => forwardOverlapRateInputRef.value?.focus());
};
const stopForwardOverlapRateEdit = () => {
  isForwardOverlapRateEditing.value = false;
  const finalValue = Math.max(
    0,
    Math.min(100, forwardOverlapRateInternal.value),
  );
  forwardOverlapRateInternal.value = finalValue;
};

const adjustMargin = (delta: number) => {
  const newValue = marginInternal.value + delta;
  const finalValue = Math.max(0, Math.min(100, newValue));
  marginInternal.value = finalValue;
};
const startMarginEdit = () => {
  isMarginEditing.value = true;
  nextTick(() => marginInputRef.value?.focus());
};
const stopMarginEdit = () => {
  isMarginEditing.value = false;
  const finalValue = Math.max(0, Math.min(100, marginInternal.value));
  marginInternal.value = finalValue;
};

function scheduleStripReplan() {
  const centerlinePoints = getCurrentStripCenterlineForPlanning();
  if (centerlinePoints.length < 2) return;
  clearStripReplanTimer();
  stripReplanTimer = setTimeout(() => {
    void requestStripPathPlanning(centerlinePoints);
  }, 300);
}

watch(
  () => props.routeAltitude,
  (v, oldVal) => {
    routeAltitudeInternal.value = v;
    if (oldVal === undefined || Number(v) === Number(oldVal)) return;
    scheduleStripReplan();
  },
);

watch(
  () => props.leftExpandDistance,
  (v, oldVal) => {
    if (stripModeInternal.value !== "bow") return;
    if (oldVal === undefined || Number(v) === Number(oldVal)) return;
    scheduleStripReplan();
  },
);

watch(
  () => props.rightExpandDistance,
  (v, oldVal) => {
    if (stripModeInternal.value !== "bow") return;
    if (oldVal === undefined || Number(v) === Number(oldVal)) return;
    scheduleStripReplan();
  },
);

watch(
  () => props.cuttingDistance,
  (v, oldVal) => {
    if (stripModeInternal.value !== "bow") return;
    if (oldVal === undefined || Number(v) === Number(oldVal)) return;
    scheduleStripReplan();
  },
);

watch(
  () => props.stripMode,
  (v, oldVal) => {
    if (oldVal === undefined || v === oldVal) return;
    scheduleStripReplan();
  },
);
</script>

<style lang="less" scoped>
.strip-settings-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spaceDistancePanel {
  padding: 0px 5px;

  :deep(.el-input-group__prepend) {
    background: transparent;
    box-shadow: none;
    padding: 0;
    font-size: 14px;
    font-weight: bold;
    color: white;
  }

  :deep(.el-input__wrapper) {
    margin: 0 5px;
    padding: 0 5px;
  }
  :deep(.el-input-group__append){
        background-color: #2d8cf0;
    color: white;
    /* padding: 12px 20px; */
    border-radius: 8px;
    /* display: flex; */
    /* align-items: center; */
    /* justify-content: center; */
    /* cursor: pointer; */
    /* font-size: 14px; */
    /* font-weight: bold; */
    /* gap: 8px; */
    /* transition: background-color 0.2s ease; */
    /* border: none; */
    box-shadow: none;
  }
}

.strip-stats {
  display: flex;
  align-items: center;
  height: 72px;
}

.strip-stat-block {
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

.strip-stat-block:last-child {
  border-right: none;
}

.strip-stat-icon {
  width: 21px;
  height: 21px;
  font-size: 21px;
  color: rgba(255, 255, 255, 0.92);
}

.strip-stat-value {
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

.reference-point-button {
  background-color: #2d8cf0;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  gap: 8px;
  transition: background-color 0.2s ease;
}

.reference-point-button:hover {
  background-color: #1a7cdb;
}

.reference-point-button.disabled {
  background-color: #888 !important;
  color: #ccc !important;
  cursor: not-allowed !important;
  pointer-events: none;
}

.section {
  background-color: rgba(51, 51, 51, 0.6);
  padding: 15px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  background-color: #444;
  color: #fff;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  min-width: 0;
}

.setting-button:hover {
  background-color: #484848;
}

.setting-button.active {
  background-color: #2d8cf0;
  color: white;
}

.button-group.segmented-control {
  gap: 0;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #444;
}

.button-group.segmented-control .setting-button {
  border-right: 1px solid #444;
  border-radius: 0;
  flex-basis: 0;
}

.button-group.segmented-control .setting-button:last-child {
  border-right: none;
}

/* 航点高度模式图示 */
.climb-settings,
.height-settings {
  display: flex;
  align-items: center;
  gap: 0px;
}

.diagram {
  flex-shrink: 0;
  width: 220px;
  height: 158px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
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
  flex-grow: 1;
}

.alt-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  text-align: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  box-sizing: border-box;
  width: 50px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.alt-button:hover {
  background-color: #484848;
}

.alt-value-input-group {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px 0;
  min-height: 25px;
}

.alt-value {
  font-size: 20px;
  font-weight: bold;
  color: #2d8cf0;
  cursor: pointer;
  min-width: 60px;
  text-align: center;
  display: inline-block;
}

:deep(.alt-input .el-input__wrapper) {
  background-color: #444 !important;
  box-shadow: none !important;
  border: 1px solid #444 !important;
  border-radius: 4px !important;
  padding: 0 8px !important;
  height: 25px !important;
}

:deep(.alt-input .el-input__inner) {
  color: white !important;
  text-align: center !important;
  padding: 0 !important;
  height: 23px !important;
  line-height: 23px !important;
  font-size: 14px !important;
  font-weight: bold !important;
}

.alt-unit {
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}

/* 外扩距离 */
.expand-section {
  padding-bottom: 10px;
}

.expand-rows {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 6px 10px;
  align-items: center;
  grid-auto-rows: auto;
}

.expand-rows .expand-row {
  grid-column: 2;
}

.expand-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.expand-label {
  font-size: 13px;
  color: #ccc;
}

.expand-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  grid-row: 1 / span 2;
  grid-column: 1;
}

/* 左侧括号装饰 */
.expand-link::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 14px;
  border: 2px solid #3e3e3e;
  border-right: none;
  border-radius: 10px 0 0 10px;
}

.expand-link.active::before {
  border-color: #2d8cf0;
}

/* 调整：外扩距离连线贯穿两行且不超出容器；收紧整体宽度 */
.expand-link {
  align-self: stretch;
}

.expand-rows {
  grid-template-columns: 26px 1fr;
}

.expand-section .value-adjust-control {
  gap: 6px;
}

.expand-section .adjust-button {
  min-width: 36px;
  padding: 0 4px;
}

.expand-section .value-display-group {
  flex-grow: 0;
}

.expand-section .value-display {
  min-width: 56px;
  font-size: 24px;
}

.expand-section .single-mode-tip {
  font-size: 12px;
  color: #ccc;
}

/* 链接按钮外观（覆盖 circle 为圆角方形） */
:deep(.link-button.el-button) {
  width: 28px;
  height: 28px;
  padding: 0;
  background-color: #2b2b2b;
  border: 1px solid #3a3a3a;
  color: #bbb;
  border-radius: 6px !important;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2) inset;
}

:deep(.link-button.el-button.is-circle) {
  border-radius: 6px !important;
}

:deep(.link-button.el-button--primary) {
  background-color: #2d8cf0;
  border-color: #2d8cf0;
  color: #fff;
}

/* 数值调节通用样式 */
.value-adjust-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: space-around;
}

.adjust-button {
  background-color: #444;
  color: #fff;
  border: 1px solid #4f4f4f;
  border-radius: 4px;
  padding: 0 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s ease;
  min-width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.adjust-button:hover {
  background-color: #4a4a4a;
}

.value-display-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-height: 26px;
  flex-grow: 1;
  justify-content: center;
}

.value-display {
  font-size: 26px;
  font-weight: bold;
  color: #2d8cf0;
  text-align: center;
  cursor: pointer;
  min-width: 70px;
  letter-spacing: 0.5px;
}

.value-unit {
  font-size: 14px;
  color: #fff;
}

:deep(.value-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important;
  box-shadow: none !important;
  border: 1px solid #444 !important;
  border-radius: 4px !important;
  padding: 0 8px !important;
  height: 30px !important;
  max-width: 70px;
}

:deep(.value-input.el-input--small .el-input__inner) {
  color: white !important;
  text-align: center !important;
  padding: 0 !important;
  height: 28px !important;
  line-height: 28px !important;
  font-size: 18px !important;
  font-weight: bold !important;
  // -webkit-appearance: none;
  // -moz-appearance: textfield;
}

/* 速度/GSD/等样式复用 */
.speed-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.speed-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  border-radius: 4px;
  padding: 8px 10px;
}

.speed-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
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
  flex-grow: 1;
  justify-content: center;
}

.speed-value {
  font-size: 24px;
  font-weight: bold;
  color: #2d8cf0;
  text-align: center;
  cursor: pointer;
  min-width: 60px;
}

:deep(.speed-input.el-input--small .el-input__wrapper) {
  background-color: #444 !important;
  box-shadow: none !important;
  border: 1px solid #444 !important;
  border-radius: 4px !important;
  padding: 0 8px !important;
  height: 30px !important;
  max-width: 50px;
}

:deep(.speed-input.el-input--small .el-input__inner) {
  color: white !important;
  text-align: center !important;
  padding: 0 !important;
  height: 28px !important;
  line-height: 28px !important;
  font-size: 20px !important;
  font-weight: bold !important;
  // -webkit-appearance: none;
  // -moz-appearance: textfield;
}

.speed-unit {
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}

/* 主航线角度样式复用 */
.main-route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.main-route-angle-display {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: -10px;
}

.main-route-angle-value {
  font-size: 28px;
  font-weight: bold;
  color: #2d8cf0;
}

.main-route-angle-unit {
  font-size: 16px;
  color: #fff;
}

.main-route-slider-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.main-route-slider-button {
  background-color: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.main-route-slider-button:hover {
  background-color: #484848;
}

:deep(.main-route-slider.el-slider) {
  height: 30px;
}

:deep(.main-route-slider.el-slider) .el-slider__runway {
  background-color: #444;
  height: 6px;
  border-radius: 3px;
}

:deep(.main-route-slider.el-slider) .el-slider__bar {
  background-color: #2d8cf0;
  height: 6px;
  border-radius: 3px;
}

:deep(.main-route-slider.el-slider) .el-slider__button-wrapper {
  top: -15px;
}

:deep(.main-route-slider.el-slider) .el-slider__button {
  width: 16px;
  height: 16px;
  background-color: #fff;
  border: none;
  box-shadow: none;
}

/* 高级设置样式复用 */
.collapsible-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: default;
  padding: 0;
}

.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.advanced-settings-content {
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sub-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  background-color: transparent;
  border-radius: 0;
}

.sub-section-title {
  font-size: 13px;
  font-weight: bold;
  color: #ccc;
}

/* Select 样式复用 */
:deep(.black-select.el-select) {
  width: 100%;
}

:deep(.black-select.el-select) .el-input__wrapper {
  background-color: #444 !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 4px !important;
  height: 30px !important;
  padding: 0 10px !important;
}

:deep(.black-select.el-select) .el-input__inner {
  color: white !important;
  font-size: 14px !important;
}

:deep(.black-select.el-select) .el-select__suffix {
  color: #fff !important;
}

:deep(.black-select.el-popper.is-light) {
  border: none;
  background-color: rgba(51, 51, 51, 0.9) !important;
}

:deep(.black-select.el-popper.is-light) .el-select-dropdown__item {
  color: #ccc;
}

:deep(.black-select.el-popper.is-light) .el-select-dropdown__item.hover,
:deep(.black-select.el-popper.is-light) .el-select-dropdown__item:hover {
  background-color: rgba(70, 70, 70, 0.9) !important;
  color: white;
}

:deep(.black-select.el-popper.is-light) .el-select-dropdown__item.selected {
  color: #2d8cf0;
  font-weight: bold;
}

:deep(.black-select.el-popper.is-light) .el-select-dropdown {
  border: none;
}
</style>
