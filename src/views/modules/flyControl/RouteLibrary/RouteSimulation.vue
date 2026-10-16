<template>
  <div class="route-sim-page">
    <div class="top-bar">
      <el-button type="primary" :icon="ArrowLeft" @click="router.back()">
        返回
      </el-button>
      <div class="top-title">{{ title }}</div>
      <span style="color: white;font-size: 13px;">跟随相机:</span>
      <el-switch v-model="followCamera"  @change="handleFollowCameraChange" size="small" />
    </div>

    <div class="data-panel">
      <GeoBorderBox title="基本信息" width="100%" type="small">
        <div class="common-panel-content">
          <div class="speed-height-section">
            <div class="speed-section">
              <div class="speed-value">
                {{ formatSpeed(flightInfo.speed) }}m/s
              </div>
              <div class="speed-label">
                <span class="speed-name">飞行速度</span>
              </div>
            </div>
            <div class="speed-section">
              <div class="speed-value">{{ flightInfo.elevation }}m</div>
              <div class="speed-label">
                <span class="speed-name">飞行高度</span>
              </div>
            </div>
            <div class="speed-section">
              <div class="speed-value">
                {{ flightInfo.distanceToOperator }}m
              </div>
              <div class="speed-label">
                <span class="speed-name">飞机距我</span>
              </div>
            </div>
          </div>

          <div class="location-section">
            <div class="data-item">
              <span class="label">经度</span>
              <span class="value">{{ flightInfo.longitude }}</span>
            </div>
            <div class="data-item">
              <span class="label">纬度</span>
              <span class="value">{{ flightInfo.latitude }}</span>
            </div>
            <div class="data-item">
              <span class="label">海拔高度</span>
              <span class="value">{{
                formatWithUnit(flightInfo.altitude, "m")
              }}</span>
            </div>
            <div class="data-item">
              <span class="label">飞行时间</span>
              <span class="value">{{ flightInfo.flightTime }}</span>
            </div>
            <div class="data-item">
              <span class="label">航迹角</span>
              <span class="value">{{ flightInfo.trackAngle }}°</span>
            </div>
            <div class="data-item">
              <span class="label">航点</span>
              <span class="value">{{ flightInfo.waypointsTotal }}/{{
                flightInfo.waypoints
                }}</span>
            </div>
            <div class="data-item">
              <span class="label">里程</span>
              <span class="value">{{ flightInfo.mileage.toFixed(3) }}km</span>
            </div>
            <div class="data-item">
              <span class="label">风速</span>
              <span class="value">{{
                formatWithUnit(flightInfo.windSpeed, "m/s")
              }}</span>
            </div>
          </div>
        </div>
      </GeoBorderBox>
    </div>

    <div class="secondary-panel">
      <GeoBorderBox title="航线信息" width="100%" type="small">
        <div class="common-panel-content">
          <div class="location-section">
            <div class="data-item">
              <span class="label">航线</span>
              <span class="value">{{ title }}</span>
            </div>
            <div class="data-item">
              <span class="label">航点数</span>
              <span class="value">{{
                routeDetail?.waypointCount ?? "--"
              }}</span>
            </div>
            <div class="data-item">
              <span class="label">全局高度</span>
              <span class="value">{{
                formatWithUnit(routeDetail?.globalHeight, "m")
              }}</span>
            </div>
            <div class="data-item">
              <span class="label">全局速度</span>
              <span class="value">{{
                formatWithUnit(routeDetail?.autoFlightSpeed, "m/s")
              }}</span>
            </div>
          </div>
        </div>
      </GeoBorderBox>
    </div>

    <div class="loading-mask" v-if="loading">
      <div class="loading-text">加载中...</div>
    </div>

    <div v-if="currentGridCode" class="beidou-grid-code">
      <span class="grid-code-label">北斗网格码:</span>
      <span class="grid-code-value">{{ currentGridCode }}</span>
      <span class="grid-code-level">(Level {{ beidouGridLevel }})</span>
      <el-switch v-model="showBeidouGrid" @change="toggleBeidouGridVisibility" active-color="#ff8100"
        inactive-color="#dcdfe6" class="grid-toggle-switch" />
    </div>

    <div v-if="totalDurationSeconds > 0" class="sim-progress-bar">
      <el-slider v-model="progressSeconds" :min="0" :max="totalDurationSeconds" :step="0.1" :show-tooltip="true"
        :format-tooltip="formatProgressTooltip" @input="handleProgressInput" @change="handleProgressChange" />
      <div class="sim-progress-time">
        {{ formatHMS(progressSeconds) }} / {{ formatHMS(totalDurationSeconds) }}
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowLeft } from "@element-plus/icons-vue";
import emitter from "@/stores/mitt.ts";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";
import { $createFlightSimulator, $getRouteDetailByRouteId } from "@/api/flyControl/flight.ts";
import { CesiumMapManager } from "@/map-system";
import { getImageUrl } from "@/utils/utils.ts";

declare const Cesium: any;

const router = useRouter();
const route = useRoute();

const routeId = computed(() => {
  const q = route.query.routeId as string | undefined;
  const p = route.params.routeId as string | undefined;
  return q || p || "0793f88aaabb4553937d9b078a56b504";
});

const loading = ref(false);
const routeDetail = ref<any>(null);
const lastCreatedSimulatorRouteId = ref<string>("");

const flightInfo = reactive({
  speed: 0,
  elevation: 0,
  distanceToOperator: 0,
  longitude: "--",
  latitude: "--",
  altitude: "--",
  flightTime: "00:00:00",
  trackAngle: 0,
  waypointsTotal: 0,
  waypoints: 0,
  mileage: 0,
  windSpeed: "--",
});

let viewer: any = null;
let mapManager: any = null;
let baseMapHandler: any = null;
let routeEntity: any = null;
let droneEntity: any = null;
let startTime: any = null;
let stopTime: any = null;
let sampledPosition: any = null;
let tickHandler: any = null;
let sampleTimes: any[] = [];
let totalDistanceM = 0;
let lastTickPosition: any = null;
let lastTickSeconds = 0;
let seekRestoreAnimate: boolean | null = null;

const title = computed(() => routeDetail.value?.routeName || "飞行模拟");

const droneImageUrl = getImageUrl("assets/images/map/dajiangfly.png");

const beidouGridLevel = ref(7);
const visitedGrids = new Set<string>();
const currentHighlightedGrid = ref<any>(null);
const currentGridCode = ref<string>("");
const showBeidouGrid = ref(true);

const totalDurationSeconds = ref(0);
const progressSeconds = ref(0);
const isSeeking = ref(false);
const followCamera = ref(true);

const FOLLOW_CAMERA_PITCH_DEGREES = -70;
const FOLLOW_CAMERA_RANGE = 120;

const formatSpeed = (v: number) => {
  if (!Number.isFinite(v)) return "0.0";
  return v.toFixed(1);
};

const formatNumber = (v: number, digits = 6) => {
  if (!Number.isFinite(v)) return "--";
  return v.toFixed(digits);
};

const formatHMS = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const formatProgressTooltip = (v: number) => formatHMS(v);

const formatWithUnit = (value: any, unit: string) => {
  if (value === undefined || value === null || value === "" || value === "--") {
    return "--";
  }
  return `${value}${unit}`;
};

const bearingDeg = (lon1: number, lat1: number, lon2: number, lat2: number) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.cos(toRad(lon2 - lon1));
  const brng = Math.atan2(y, x);
  const deg = (brng * 180) / Math.PI;
  return (deg + 360) % 360;
};

const updateFollowCamera = (time: any) => {
  if (!followCamera.value || !viewer?.camera || !sampledPosition || !time) return;

  const position = sampledPosition.getValue(time);
  if (!position) return;

  const currentCartographic = Cesium.Cartographic.fromCartesian(position);
  const longitude = Cesium.Math.toDegrees(currentCartographic.longitude);
  const latitude = Cesium.Math.toDegrees(currentCartographic.latitude);
  let heading = flightInfo.trackAngle;

  if (stopTime && startTime) {
    const lookAheadSeconds = 1;
    let headingTime = Cesium.JulianDate.addSeconds(
      time,
      lookAheadSeconds,
      new Cesium.JulianDate(),
    );
    if (Cesium.JulianDate.greaterThan(headingTime, stopTime)) {
      headingTime = stopTime;
    }

    let headingPosition = sampledPosition.getValue(headingTime);
    if (
      !headingPosition ||
      Cesium.Cartesian3.distance(position, headingPosition) < 0.1
    ) {
      headingTime = Cesium.JulianDate.addSeconds(
        time,
        -lookAheadSeconds,
        new Cesium.JulianDate(),
      );
      if (Cesium.JulianDate.lessThan(headingTime, startTime)) {
        headingTime = startTime;
      }
      headingPosition = sampledPosition.getValue(headingTime);
    }

    if (headingPosition) {
      const nextCartographic = Cesium.Cartographic.fromCartesian(headingPosition);
      heading = bearingDeg(
        longitude,
        latitude,
        Cesium.Math.toDegrees(nextCartographic.longitude),
        Cesium.Math.toDegrees(nextCartographic.latitude),
      );
    }
  }

  viewer.camera.lookAt(
    position,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(heading),
      Cesium.Math.toRadians(FOLLOW_CAMERA_PITCH_DEGREES),
      FOLLOW_CAMERA_RANGE,
    ),
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
};

const handleFollowCameraChange = (enabled: boolean) => {
  if (enabled && viewer?.clock?.currentTime) {
    updateFollowCamera(viewer.clock.currentTime);
  } else if (!enabled && routeEntity && viewer) {
    viewer.flyTo(routeEntity, { duration: 1.2 }).catch(() => { });
  }
};

const getViewer = () => (window as any).__cesiumViewer;
// 从航线点JSON构建WKT字符串
const buildLineWktFromRoutePointJson = (routePointJson: any) => {
  const coords = routePointJson?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return "";
  const pairs = coords
    .map((c: any) => {
      if (!Array.isArray(c) || c.length < 2) return null;
      const lon = Number(c[0]);
      const lat = Number(c[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      return `${lon} ${lat}`;
    })
    .filter(Boolean);
  if (pairs.length < 2) return "";
  return `LINESTRING(${pairs.join(",")})`;
};
// 创建航线模拟器
const createFlightSimulatorByDetail = async (detail: any) => {
  const rid = String(detail?.routeId || "");
  if (!rid) return;
  if (lastCreatedSimulatorRouteId.value === rid) return;

  const lineWkt = buildLineWktFromRoutePointJson(detail?.routePointJson);
  if (!lineWkt) return;

  const flightSpeed = Number(detail?.autoFlightSpeed);
  const flightHeight = Number(detail?.globalHeight);
  const payload = {
    lineWkt,
    flightSpeed: Number.isFinite(flightSpeed) ? flightSpeed : 0,
    flightHeight: Number.isFinite(flightHeight) ? flightHeight : 0,
  };

  try {
    const res: any = await $createFlightSimulator(payload);
    if (res?.code !== 200 && res?.code !== 0) {
      ElMessage.error(res?.msg || "创建飞行模拟器失败");
      return;
    }
    lastCreatedSimulatorRouteId.value = rid;
  } catch (e: any) {
    ElMessage.error(e?.message || "创建飞行模拟器失败");
  }
};

const highlightCurrentGrid = (lon: number, lat: number, height: number) => {
  if (!mapManager) return;
  try {
    const gridInfo = mapManager.calculateBeidouGridCell(
      lon,
      lat,
      height,
      beidouGridLevel.value,
    );
    if (!gridInfo) return;

    const gridKey = `${gridInfo.gridIndex.lon}_${gridInfo.gridIndex.lat}_${gridInfo.gridIndex.z}`;
    if (currentHighlightedGrid.value !== gridKey) {
      currentHighlightedGrid.value = gridKey;
      const gridCode = mapManager.generateBeidouGridCode(
        lon,
        lat,
        height,
        beidouGridLevel.value,
      );
      currentGridCode.value = gridCode;
      if (showBeidouGrid.value) {
        mapManager.highlightBeidouGridCell(
          "current-grid-highlight",
          gridInfo.bounds,
          {
            fillColor: "#F7F905",
            fillAlpha: 0.4,
            outlineColor: "#F7F90500",
            outlineWidth: 1,
          },
        );
      }
    }
  } catch { }
};

const toggleBeidouGridVisibility = (visible: boolean) => {
  if (!mapManager) return;
  try {
    const trajectoryDataSource = mapManager.getDataSource("trajectory-grids");
    if (trajectoryDataSource) {
      trajectoryDataSource.show = visible;
    }
    const highlightDataSource = mapManager.getDataSource(
      "current-grid-highlight",
    );
    if (highlightDataSource) {
      highlightDataSource.show = visible;
    }
  } catch { }
};

const addAllTrajectoryGrids = (
  points: Array<{ lon: number; lat: number; height: number }>,
) => {
  if (!mapManager) return;
  if (!points || points.length < 2) return;
  try {
    visitedGrids.clear();
    try {
      mapManager.removeDataSource("trajectory-grids");
    } catch { }

    const addGridByInfo = (gridInfo: any) => {
      if (!gridInfo?.gridIndex || !gridInfo?.bounds) return;
      const key = `${gridInfo.gridIndex.lon}_${gridInfo.gridIndex.lat}_${gridInfo.gridIndex.z}`;
      if (visitedGrids.has(key)) return;
      visitedGrids.add(key);
      mapManager.addBeidouGridCell("trajectory-grids", gridInfo.bounds, {
        fillColor: "#B1EDAF",
        fillAlpha: 0.6, // 透明填充
        outlineColor: "#00FF0000",
        outlineWidth: 0,
        show: true,
      });
    };

    const estimateCellStepMeters = (
      lon: number,
      lat: number,
      height: number,
    ) => {
      try {
        const gridInfo = mapManager.calculateBeidouGridCell(
          lon,
          lat,
          height,
          beidouGridLevel.value,
        );
        const b = gridInfo?.bounds;
        if (!b) return 50;
        const midLat = (b.minLat + b.maxLat) / 2;
        const w = Cesium.Cartesian3.distance(
          Cesium.Cartesian3.fromDegrees(b.minLon, midLat, height),
          Cesium.Cartesian3.fromDegrees(b.maxLon, midLat, height),
        );
        const h = Cesium.Cartesian3.distance(
          Cesium.Cartesian3.fromDegrees(lon, b.minLat, height),
          Cesium.Cartesian3.fromDegrees(lon, b.maxLat, height),
        );
        const base = Math.min(w, h);
        if (!Number.isFinite(base) || base <= 0) return 50;
        return Math.max(5, base / 2);
      } catch {
        return 50;
      }
    };

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (
        !Number.isFinite(a.lon) ||
        !Number.isFinite(a.lat) ||
        !Number.isFinite(b.lon) ||
        !Number.isFinite(b.lat)
      ) {
        continue;
      }

      const startHeight = Number.isFinite(a.height) ? a.height : 0;
      const endHeight = Number.isFinite(b.height) ? b.height : startHeight;

      const ca = Cesium.Cartesian3.fromDegrees(a.lon, a.lat, startHeight);
      const cb = Cesium.Cartesian3.fromDegrees(b.lon, b.lat, endHeight);
      const dist = Cesium.Cartesian3.distance(ca, cb);
      const step = estimateCellStepMeters(a.lon, a.lat, startHeight);
      const segments = Math.max(1, Math.ceil(dist / step));

      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const lon = a.lon + (b.lon - a.lon) * t;
        const lat = a.lat + (b.lat - a.lat) * t;
        const height = startHeight + (endHeight - startHeight) * t;
        const gridInfo = mapManager.calculateBeidouGridCell(
          lon,
          lat,
          height,
          beidouGridLevel.value,
        );
        addGridByInfo(gridInfo);
      }
    }

    toggleBeidouGridVisibility(showBeidouGrid.value);
  } catch { }
};

const clearSimulation = () => {
  if (viewer?.clock?.onTick && tickHandler) {
    viewer.clock.onTick.removeEventListener(tickHandler);
  }
  tickHandler = null;
  sampledPosition = null;
  sampleTimes = [];
  totalDistanceM = 0;
  lastTickPosition = null;
  lastTickSeconds = 0;
  if (droneEntity && viewer?.entities) {
    try {
      viewer.entities.remove(droneEntity);
    } catch { }
  }
  if (routeEntity && viewer?.entities) {
    try {
      viewer.entities.remove(routeEntity);
    } catch { }
  }
  droneEntity = null;
  routeEntity = null;

  if (mapManager) {
    try {
      mapManager.removeDataSource("trajectory-grids");
      mapManager.clearBeidouGridCellHighlight("current-grid-highlight");
    } catch { }
  }
  visitedGrids.clear();
  currentHighlightedGrid.value = null;
  currentGridCode.value = "";
  totalDurationSeconds.value = 0;
  progressSeconds.value = 0;
  isSeeking.value = false;
  seekRestoreAnimate = null;
};

const getRoutePoints = (detail: any) => {
  const list = Array.isArray(detail?.routePointList)
    ? detail.routePointList
    : [];
  if (list.length) {
    return list
      .slice()
      .sort((a: any, b: any) => Number(a.pointIndex) - Number(b.pointIndex))
      .map((p: any) => ({
        lon: Number(p.longitude),
        lat: Number(p.latitude),
        height: Number(p.height ?? detail?.globalHeight ?? 100),
        speed: Number(p.speed ?? detail?.autoFlightSpeed ?? 5),
      }))
      .filter((p: any) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
  }
  const coords = detail?.routePointJson?.coordinates;
  if (Array.isArray(coords) && coords.length) {
    return coords
      .map((c: any) => ({
        lon: Number(c?.[0]),
        lat: Number(c?.[1]),
        height: Number(c?.[2] ?? detail?.globalHeight ?? 100),
        speed: Number(detail?.autoFlightSpeed ?? 5),
      }))
      .filter((p: any) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
  }
  return [];
};

const startSimulation = () => {
  if (!viewer || !routeDetail.value) return;
  const points = getRoutePoints(routeDetail.value);
  if (points.length < 2) {
    ElMessage.warning("航线点不足，无法模拟");
    return;
  }

  clearSimulation();

  flightInfo.waypointsTotal = points.length;
  flightInfo.waypoints = 0;
  flightInfo.mileage = 0;

  const positions = points.map((p: any) =>
    Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height),
  );

  routeEntity = viewer.entities.add({
    id: `route-sim-line-${routeId.value}`,
    polyline: {
      positions,
      width: 3,
      material: Cesium.Color.LIME.withAlpha(0.9),
      clampToGround: false,
    },
  });

  sampledPosition = new Cesium.SampledPositionProperty();
  sampleTimes = [];
  startTime = Cesium.JulianDate.now();
  let t = startTime.clone();
  sampledPosition.addSample(t, positions[0]);
  sampleTimes.push(t.clone());

  totalDistanceM = 0;
  for (let i = 1; i < positions.length; i++) {
    const dist = Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
    const speed = Math.max(0.1, Number(points[i - 1]?.speed ?? 5));
    const dt = Math.max(1, dist / speed);
    totalDistanceM += dist;
    t = Cesium.JulianDate.addSeconds(t, dt, new Cesium.JulianDate());
    sampledPosition.addSample(t, positions[i]);
    sampleTimes.push(t.clone());
  }
  stopTime = t.clone();
  totalDurationSeconds.value = Math.max(
    0,
    Cesium.JulianDate.secondsDifference(stopTime, startTime),
  );
  progressSeconds.value = 0;

  droneEntity = viewer.entities.add({
    id: `route-sim-drone-${routeId.value}`,
    position: sampledPosition,
    orientation: new Cesium.VelocityOrientationProperty(sampledPosition),
    billboard: {
      image: droneImageUrl,
      scale: 0.2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.NONE,
    },
    path: {
      leadTime: 0,
      trailTime: 120,
      width: 2,
      material: Cesium.Color.CYAN.withAlpha(0.6),
      resolution: 1,
    },
  });

  viewer.clock.startTime = startTime.clone();
  viewer.clock.stopTime = stopTime.clone();
  viewer.clock.currentTime = startTime.clone();
  viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
  viewer.clock.multiplier = 1;
  viewer.clock.shouldAnimate = true;

  if (followCamera.value) {
    updateFollowCamera(startTime);
  } else {
    viewer.flyTo(routeEntity, { duration: 1.2 }).catch(() => { });
  }
  addAllTrajectoryGrids(points);

  tickHandler = (clock: any) => {
    const pos = sampledPosition?.getValue(clock.currentTime);
    if (!pos) return;
    const carto = Cesium.Cartographic.fromCartesian(pos);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const alt = carto.height;

    flightInfo.longitude = formatNumber(lon, 6);
    flightInfo.latitude = formatNumber(lat, 6);
    flightInfo.altitude = formatNumber(alt, 2);
    flightInfo.elevation = Number.isFinite(alt) ? Number(alt.toFixed(0)) : 0;
    updateFollowCamera(clock.currentTime);
    highlightCurrentGrid(lon, lat, alt);

    const elapsed = Cesium.JulianDate.secondsDifference(
      clock.currentTime,
      startTime,
    );
    flightInfo.flightTime = formatHMS(elapsed);
    if (!isSeeking.value) {
      progressSeconds.value = Math.max(
        0,
        Math.min(totalDurationSeconds.value, elapsed),
      );
    }

    let idx = 0;
    for (let i = 0; i < sampleTimes.length; i++) {
      if (
        Cesium.JulianDate.lessThanOrEquals(sampleTimes[i], clock.currentTime)
      ) {
        idx = i;
      } else {
        break;
      }
    }
    flightInfo.waypoints = Math.min(points.length, idx + 1);

    if (idx === 0) {
      const first = points[0];
      flightInfo.speed = Number(first?.speed ?? 0);
      flightInfo.distanceToOperator = 0;
      flightInfo.trackAngle = 0;
      flightInfo.mileage = 0;
      lastTickPosition = pos;
      lastTickSeconds = elapsed;
      return;
    }

    const currentSpeed = Number(
      points[Math.min(idx, points.length - 1)]?.speed ?? 0,
    );
    flightInfo.speed = currentSpeed;

    const basePos = positions[0];
    flightInfo.distanceToOperator = Math.round(
      Cesium.Cartesian3.distance(basePos, pos),
    );

    if (lastTickPosition && Number.isFinite(lastTickSeconds)) {
      const deltaSeconds = Math.max(0.001, elapsed - lastTickSeconds);
      const deltaDist = Cesium.Cartesian3.distance(lastTickPosition, pos);
      flightInfo.mileage += deltaDist / 1000;
      const lastCarto = Cesium.Cartographic.fromCartesian(lastTickPosition);
      const lastLon = Cesium.Math.toDegrees(lastCarto.longitude);
      const lastLat = Cesium.Math.toDegrees(lastCarto.latitude);
      flightInfo.trackAngle = Math.round(
        bearingDeg(lastLon, lastLat, lon, lat),
      );
      if (!Number.isFinite(currentSpeed) || currentSpeed <= 0) {
        flightInfo.speed = deltaDist / deltaSeconds;
      }
    }

    lastTickPosition = pos;
    lastTickSeconds = elapsed;
  };
  viewer.clock.onTick.addEventListener(tickHandler);
};

const setClockByProgressSeconds = (seconds: number) => {
  if (!viewer || !startTime) return;
  const s = Math.max(0, Math.min(totalDurationSeconds.value, Number(seconds)));
  const t = Cesium.JulianDate.addSeconds(startTime, s, new Cesium.JulianDate());
  viewer.clock.currentTime = t;
  progressSeconds.value = s;
  updateFollowCamera(t);
};

const handleProgressInput = (val: number) => {
  if (!viewer || !startTime) return;
  if (!isSeeking.value) {
    isSeeking.value = true;
    seekRestoreAnimate = Boolean(viewer.clock.shouldAnimate);
    viewer.clock.shouldAnimate = false;
  }
  setClockByProgressSeconds(val);
};

const handleProgressChange = (val: number) => {
  if (!viewer || !startTime) return;
  setClockByProgressSeconds(val);
  if (seekRestoreAnimate !== null) {
    viewer.clock.shouldAnimate = seekRestoreAnimate;
    seekRestoreAnimate = null;
  }
  isSeeking.value = false;
};

const loadRouteDetail = async () => {
  loading.value = true;
  try {
    const res: any = await $getRouteDetailByRouteId(routeId.value);
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取航线详情失败");
      routeDetail.value = null;
      clearSimulation();
      return;
    }
    routeDetail.value = res.data;
    await createFlightSimulatorByDetail(routeDetail.value);
    if (viewer) {
      startSimulation();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取航线详情失败");
    routeDetail.value = null;
    clearSimulation();
  } finally {
    loading.value = false;
  }
};

watch(routeId, async () => {
  await loadRouteDetail();
});

onMounted(async () => {
  viewer = getViewer();
  if (!viewer) {
    baseMapHandler = (v: any) => {
      viewer = v;
      mapManager = new CesiumMapManager(viewer);
      if (routeDetail.value) {
        startSimulation();
      }
    };
    emitter.on("base-map-load", baseMapHandler);
  } else {
    mapManager = new CesiumMapManager(viewer);
  }
  await loadRouteDetail();
});

onUnmounted(() => {
  if (baseMapHandler) {
    emitter.off("base-map-load", baseMapHandler);
  }
  clearSimulation();
});
</script>

<style scoped lang="less">
.route-sim-page {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.top-bar {
  position: fixed;
  top: 90px;
  left: 20px;
  z-index: 2001;
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}

.top-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.35);
}

.common-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
}

.data-panel {
  position: absolute;
  z-index: 1002;
  left: 20px;
  top: 136px;
  height: 40%;
  width: 20%;
  color: #333;
  pointer-events: auto;
}

.data-panel {
  .speed-height-section {
    display: flex;
    flex-direction: column;
    width: 45%;

    .speed-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .speed-value {
        color: #4b9cfb;
        font-size: 24px;
        text-align: center;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .speed-label {
        color: #fff;
        font-size: 13px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
      }
    }
  }
}

.secondary-panel {
  position: absolute;
  z-index: 1002;
  left: 20px;
  top: calc(50% + 60px);
  height: 26%;
  width: 20%;
  color: #333;
  pointer-events: auto;
}

.secondary-panel {
  .location-section {
    width: 100%;
  }
}

.location-section {
  width: 55%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .data-item {
    flex: 1;
    width: 100%;
    display: flex;

    &:last-child {

      .label,
      .value {
        border-bottom: 1px solid #1491cd;
      }
    }

    .label {
      color: #ddd;
      width: 45%;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #19506b;
      background-color: rgba(8, 119, 152, 0.5);
      border-right: 0;
      border-bottom: 0;
    }

    .value {
      color: #fff;
      width: 55%;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(20, 145, 205, 0.8);
      border-bottom: 0;
      overflow: hidden;
    }
  }
}

.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.loading-text {
  color: #fff;
  font-size: 14px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(0, 10, 20, 0.65);
  box-shadow: 0 8px 24px rgba(0, 255, 255, 0.12);
}

.sim-progress-bar {
  display: flex;
  align-items: center;

  position: fixed;
  left: 64%;
  bottom: 6px;
  transform: translateX(-50%);
  z-index: 2001;
  width: min(830px, calc(100vw - 40px));
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0, 10, 20, 0.65);
  box-shadow: 0 8px 24px rgba(0, 255, 255, 0.12);
  pointer-events: auto;
}

.sim-progress-time {
  width: 20%;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  text-align: center;
  margin-left: 10px;
}

.beidou-grid-code {
  position: fixed;
  bottom: 10px;
  left: 30%;
  transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0.1rem 0 rgba(19, 76, 144, 0.22);
  padding: 6px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  z-index: 2001;
  pointer-events: auto;

  .grid-code-label {
    color: #333;
    font-size: 13px;
    font-weight: 500;
  }

  .grid-code-value {
    color: #000;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .grid-code-level {
    color: #000;
    font-size: 11px;
    font-style: italic;
  }

  .grid-toggle-switch {
    margin-left: 8px;
  }
}
</style>
