import { ref } from "vue";
import { ElMessage } from "element-plus";
import cleanCoords from "@turf/clean-coords";
import unkinkPolygon from "@turf/unkink-polygon";
import turfUnion from "@turf/union";
import { polygon as turfPolygon } from "@turf/helpers";
import emitter from "@/stores/mitt";
import { getMapManager, zoomToTarget } from "./mapService";
import {
  stopEditingAreaPolygon as stopEditingAreaPolygonFromEdit,
  getEditedAreaPolygonCoordinates,
} from "./waypoint/areaEdit";

export {
  createDroneFOV,
  modifyDroneFOV,
  deleteDroneFOV,
  clearAllDroneFOVs,
  createFOVAtWaypoint,
  getDroneFOVs,
  getDroneFOVById,
  setDroneFOVVisibility,
  getCurrentDroneFOV,
  getCurrentDroneFOVId,
  modifyCurrentDroneFOV,
  hasActiveDroneFOV,
  setCurrentWaypointFOVContext,
  updateCurrentWaypointFOVAction,
} from "./waypoint/droneFOV";
export {
  createArrowAtWaypoint,
  modifyWaypointArrow,
  deleteWaypointArrow,
  clearAllWaypointArrows,
  getWaypointArrows,
  getWaypointArrowById,
  getWaypointArrowByIndex,
  setWaypointArrowVisibility,
} from "./waypoint/waypointArrows";
export {
  startEditingAreaPolygonByRoute,
  stopEditingAreaPolygon,
  getEditedAreaPolygonCoordinates,
} from "./waypoint/areaEdit";

const WAYPOINT_LAYER = "waypoints";
const WAYPOINT_PREVIEW_LAYER = "waypoint_drawing_preview";
const AREA_LAYER = "area_route";
const ROUTE_LAYER_PREFIX = "route-";
const STRIP_LAYER = "strip_route";
const STRIP_EDIT_LAYER = "strip_edit_overlay";
const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_DEGREE = 111320;
const MIN_VERTEX_MERGE_DISTANCE_M = 0.5;

let __waypointDefaultAltitude = 100;
let __waypointRouteSpeed = 5;

const waypoints = ref([]);
const areaPoints = ref([]);
const stripPoints = ref([]);
const currentStripOffsets = ref({ left: 0, right: 0 });
const selectedWaypoint = ref(null);
const selectedAreaPoint = ref(null);
const selectedStripPoint = ref(null);
const isStripFinalized = ref(false);
const loadedRouteLayerNames = ref([]);
const drawMode = ref(null);

let leftClickListenerCleanup = null;
let rightClickListenerCleanup = null;
let waypointMouseMoveListenerCleanup = null;
let dragHandlerCleanups = [];
let stripEditState = null;
let stripEditCleanupFns = [];
let hiddenStripLayerNameDuringEdit = null;

export function setWaypointDefaultAltitude(altitude) {
  const value = Number(altitude);
  if (Number.isFinite(value) && value >= 0) {
    __waypointDefaultAltitude = value;
  }
}

export function setAreaRouteAltitude(altitude) {
  const value = Number(altitude);
  if (!Number.isFinite(value) || value < 0) return;
  __waypointDefaultAltitude = value;
  if (!areaPoints.value.length) return;
  areaPoints.value = areaPoints.value.map((point) => ({
    ...point,
    altitude: value,
  }));
  renderAreaRouteToMap();
}

export function setWaypointRouteSpeed(speed) {
  const value = Number(speed);
  if (Number.isFinite(value) && value > 0) {
    __waypointRouteSpeed = value;
    renderWaypointsToMap();
    emitter.emit("waypoint-route-speed-change", value);
    notifyWaypointRoutePointsChanged();
  }
}

export function getWaypointRouteSpeed() {
  return __waypointRouteSpeed;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function getMapManagerInstance() {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }
  return mapManager;
}

function clearLayer(layerName) {
  getMapManagerInstance()?.clearLayer(layerName);
}

function addPoints(layerName, pointConfigs) {
  return getMapManagerInstance()?.addPoints(layerName, pointConfigs) || [];
}

function addLines(layerName, lineConfigs) {
  const mapManager = getMapManagerInstance();
  const entities = [];
  lineConfigs.forEach((lineConfig) => {
    const entity = mapManager?.addLine(layerName, lineConfig);
    if (entity) entities.push(entity);
  });
  return entities;
}

function addPolygons(layerName, polygonConfigs) {
  const mapManager = getMapManagerInstance();
  const entities = [];
  polygonConfigs.forEach((polygonConfig) => {
    const entity = mapManager?.addPolygon(layerName, polygonConfig);
    if (entity) entities.push(entity);
  });
  return entities;
}

function addMapEventListener(eventName, handler) {
  return (
    getMapManagerInstance()?.addEventListener(eventName, handler) || (() => {})
  );
}

function clearWaypointDrawingPreview() {
  clearLayer(WAYPOINT_PREVIEW_LAYER);
}

function removeWaypointMouseMoveListener() {
  if (typeof waypointMouseMoveListenerCleanup === "function") {
    waypointMouseMoveListenerCleanup();
    waypointMouseMoveListenerCleanup = null;
  }
}

function renderWaypointDrawingPreview(event) {
  clearWaypointDrawingPreview();

  const lastWaypoint = waypoints.value[waypoints.value.length - 1];
  if (
    !lastWaypoint ||
    typeof event.longitude !== "number" ||
    typeof event.latitude !== "number"
  ) {
    return;
  }

  addLines(WAYPOINT_PREVIEW_LAYER, [
    {
      coordinates: [
        [
          lastWaypoint.longitude,
          lastWaypoint.latitude,
          lastWaypoint.altitude || 0,
        ],
        [event.longitude, event.latitude, __waypointDefaultAltitude],
      ],
      lineStyle: {
        width: 3,
        material: {
          type: "PolylineDash",
          color: "rgba(185, 246, 202, 0.9)",
          dashLength: 16,
        },
      },
    },
  ]);

  addPoints(WAYPOINT_PREVIEW_LAYER, [
    {
      coordinates: [
        event.longitude,
        event.latitude,
        Number.isFinite(event.altitude)
          ? event.altitude
          : __waypointDefaultAltitude,
      ],
      pointStyle: {
        pixelSize: 1,
        color: "rgba(255, 255, 255, 0)",
        outlineColor: "rgba(255, 255, 255, 0)",
        outlineWidth: 0,
      },
      labelStyle: {
        text: "右键结束绘制",
        font: "14px sans-serif",
        fillColor: "WHITE",
        outlineColor: "BLACK",
        outlineWidth: 3,
        style: "FILL_AND_OUTLINE",
        pixelOffset: [16, -16],
        horizontalOrigin: "LEFT",
        verticalOrigin: "BOTTOM",
      },
    },
  ]);
}

function setLayerVisibility(layerName, visible) {
  getMapManagerInstance()?.setLayerVisibility(layerName, visible);
}

function setMapInteractionEnabled(enabled) {
  getMapManagerInstance()?.setMapInteractionEnabled(enabled);
}

function clearLayerWithDerivatives(layerName) {
  getMapManagerInstance()?.clearLayerWithDerivatives(layerName);
}

function getEntityProperty(entity, path) {
  if (!entity) return undefined;

  let value = entity;
  for (const key of path.split(".")) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function haversineDistance(pointA, pointB) {
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const deltaLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const deltaLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMeters([lngA, latA], [lngB, latB]) {
  return haversineDistance(
    { longitude: lngA, latitude: latA },
    { longitude: lngB, latitude: latB },
  );
}

function createVerticalLine(point, selected, color) {
  return {
    coordinates: [
      [point.longitude, point.latitude, 0],
      [point.longitude, point.latitude, point.altitude || 0],
    ],
    lineStyle: {
      width: selected ? 3 : 2,
      material: {
        type: "PolylineDash",
        color,
        dashLength: 12,
      },
    },
  };
}

function getWaypointSegmentDistance(pointA, pointB) {
  const groundDistance = haversineDistance(pointA, pointB);
  const heightDiff =
    Number(pointB.altitude || 0) - Number(pointA.altitude || 0);
  return Math.sqrt(groundDistance ** 2 + heightDiff ** 2);
}

function getWaypointRouteDistance(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;

  return points.slice(1).reduce((total, point, index) => {
    return total + getWaypointSegmentDistance(points[index], point);
  }, 0);
}

function formatWaypointRouteDistance(distance) {
  if (!Number.isFinite(distance) || distance <= 0) return "0m";
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(2)}km`;
}

function formatWaypointRouteDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m${restSeconds}s`;
  return `${restSeconds}s`;
}

function createWaypointRouteSummaryPoint(points) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const previousPoint = points[points.length - 2];
  const lastPoint = points[points.length - 1];
  const distance = getWaypointRouteDistance(points);
  const speed =
    Number.isFinite(__waypointRouteSpeed) && __waypointRouteSpeed > 0
      ? __waypointRouteSpeed
      : 5;

  return {
    id: "waypoint_route_summary",
    coordinates: [
      (Number(previousPoint.longitude) + Number(lastPoint.longitude)) / 2,
      (Number(previousPoint.latitude) + Number(lastPoint.latitude)) / 2,
      (Number(previousPoint.altitude || 0) + Number(lastPoint.altitude || 0)) /
        2,
    ],
    pointStyle: {
      pixelSize: 1,
      color: "rgba(255, 255, 255, 0)",
      outlineColor: "rgba(255, 255, 255, 0)",
      outlineWidth: 1,
    },
    labelStyle: {
      text: `${formatWaypointRouteDistance(distance)}\n${formatWaypointRouteDuration(
        distance / speed,
      )}`,
      font: "16px sans-serif",
      fillColor: "WHITE",
      outlineColor: "BLACK",
      outlineWidth: 5,
      style: "FILL_AND_OUTLINE",
      verticalOrigin: "CENTER",
      horizontalOrigin: "CENTER",
      pixelOffset: [0, 0],
    },
    properties: {
      id: "waypoint_route_summary",
      type: "waypoint_route_summary",
    },
  };
}

function renderWaypointsToMap() {
  clearLayer(WAYPOINT_LAYER);

  const pointConfigs = [];
  const verticalLines = [];

  waypoints.value.forEach((waypoint, index) => {
    const selected = selectedWaypoint.value?.id === waypoint.id;
    const isLastWaypoint = index === waypoints.value.length - 1;
    pointConfigs.push({
      id: waypoint.id,
      coordinates: [waypoint.longitude, waypoint.latitude, waypoint.altitude],
      pointStyle: {
        pixelSize: selected ? 13 : 10,
        color: "rgba(67, 160, 71, 0.85)",
        outlineColor: "rgba(185, 246, 202, 0.8)",
        outlineWidth: 2,
      },
      labelStyle: isLastWaypoint
        ? {
            text: `${waypoint.name}\n高度: ${waypoint.altitude}m`,
            font: "16px sans-serif",
            fillColor: "BLACK",
            outlineColor: "WHITE",
            outlineWidth: 4,
            style: "FILL_AND_OUTLINE",
            verticalOrigin: "BOTTOM",
            pixelOffset: { x: 0, y: 0 },
            backgroundColor: selected ? "rgba(255, 255, 255, 0.7)" : undefined,
          }
        : undefined,
      properties: {
        id: String(waypoint.id),
        type: "waypoint",
        waypointIndex: index,
      },
    });
    verticalLines.push(
      createVerticalLine(waypoint, selected, "rgba(105, 240, 174, 0.5)"),
    );
  });

  const routeSummaryPoint = createWaypointRouteSummaryPoint(waypoints.value);
  if (routeSummaryPoint) pointConfigs.push(routeSummaryPoint);

  if (pointConfigs.length) addPoints(WAYPOINT_LAYER, pointConfigs);
  if (verticalLines.length) addLines(WAYPOINT_LAYER, verticalLines);
  if (waypoints.value.length > 1) {
    addLines(WAYPOINT_LAYER, [
      {
        coordinates: waypoints.value.map((point) => [
          point.longitude,
          point.latitude,
          point.altitude || 0,
        ]),
        lineStyle: {
          width: 6,
          material: { type: "Color", color: "rgba(67, 160, 71, 0.85)" },
        },
      },
    ]);
  }
}

function renderAreaRouteToMap() {
  clearLayer(AREA_LAYER);
  if (!areaPoints.value.length) return;

  const pointConfigs = [];
  const lineConfigs = [];
  const polygonConfigs = [];

  areaPoints.value.forEach((point, index) => {
    const selected = selectedAreaPoint.value?.id === point.id;
    pointConfigs.push({
      id: point.id,
      coordinates: [
        point.longitude,
        point.latitude,
        point.altitude ?? __waypointDefaultAltitude,
      ],
      pointStyle: {
        pixelSize: selected ? 13 : 10,
        color: "rgba(255, 152, 0, 0.85)",
        outlineColor: "rgba(255, 224, 178, 0.8)",
        outlineWidth: 2,
      },
      labelStyle: {
        text: `${point.name}\n高度: ${point.altitude ?? __waypointDefaultAltitude}m`,
        font: "16px sans-serif",
        fillColor: "BLACK",
        outlineColor: "WHITE",
        outlineWidth: 4,
        style: "FILL_AND_OUTLINE",
        verticalOrigin: "BOTTOM",
        pixelOffset: { x: 0, y: -10 },
        backgroundColor: selected ? "rgba(255, 255, 255, 0.7)" : undefined,
      },
      properties: {
        id: String(point.id),
        type: "area_point",
        pointIndex: index,
      },
    });
    lineConfigs.push(
      createVerticalLine(point, selected, "rgba(255, 183, 77, 0.5)"),
    );
  });

  if (areaPoints.value.length >= 2) {
    for (let index = 0; index < areaPoints.value.length; index += 1) {
      const current = areaPoints.value[index];
      const next = areaPoints.value[(index + 1) % areaPoints.value.length];
      lineConfigs.push({
        coordinates: [
          [
            current.longitude,
            current.latitude,
            current.altitude ?? __waypointDefaultAltitude,
          ],
          [
            next.longitude,
            next.latitude,
            next.altitude ?? __waypointDefaultAltitude,
          ],
        ],
        lineStyle: {
          width: 2,
          material: { type: "Color", color: "rgba(255, 152, 0, 0.6)" },
        },
      });
    }
  }

  if (areaPoints.value.length >= 3) {
    const ring = areaPoints.value.map((point) => [
      point.longitude,
      point.latitude,
    ]);
    ring.push(ring[0]);
    polygonConfigs.push({
      coordinates: [ring],
      polygonStyle: {
        material: "rgba(255, 152, 0, 0.2)",
        outline: true,
      },
      outlineStyle: {
        material: "rgba(255, 152, 0, 0.8)",
        width: 3,
      },
      properties: { type: "area_polygon" },
    });
  }

  if (pointConfigs.length) addPoints(AREA_LAYER, pointConfigs);
  if (lineConfigs.length) addLines(AREA_LAYER, lineConfigs);
  if (polygonConfigs.length) addPolygons(AREA_LAYER, polygonConfigs);
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

function lngLatToMeters(longitude, latitude, referenceLatitude) {
  return [
    longitude *
      METERS_PER_DEGREE *
      Math.cos((referenceLatitude * Math.PI) / 180),
    latitude * METERS_PER_DEGREE,
  ];
}

function metersToLngLat(x, y, referenceLatitude) {
  return [
    x / (METERS_PER_DEGREE * Math.cos((referenceLatitude * Math.PI) / 180)),
    y / METERS_PER_DEGREE,
  ];
}

function buildStripPolygonRing(centerPoints, leftOffsetM, rightOffsetM) {
  if (!centerPoints || centerPoints.length < 2) return [];

  const referenceLatitude =
    centerPoints.reduce((sum, point) => sum + point.latitude, 0) /
    centerPoints.length;
  const projected = centerPoints.map((point) =>
    lngLatToMeters(point.longitude, point.latitude, referenceLatitude),
  );
  const normals = [];

  for (let index = 0; index < projected.length - 1; index += 1) {
    const dx = projected[index + 1][0] - projected[index][0];
    const dy = projected[index + 1][1] - projected[index][1];
    const [ux, uy] = normalizeVector(dx, dy);
    normals.push([-uy, ux]);
  }

  const leftSide = [];
  const rightSide = [];

  for (let index = 0; index < projected.length; index += 1) {
    const [x, y] = projected[index];

    if (index === 0) {
      const [nx, ny] = normals[0];
      leftSide.push([x + nx * leftOffsetM, y + ny * leftOffsetM]);
      rightSide.push([x - nx * rightOffsetM, y - ny * rightOffsetM]);
      continue;
    }

    if (index === projected.length - 1) {
      const [nx, ny] = normals[normals.length - 1];
      leftSide.push([x + nx * leftOffsetM, y + ny * leftOffsetM]);
      rightSide.push([x - nx * rightOffsetM, y - ny * rightOffsetM]);
      continue;
    }

    const [prevNx, prevNy] = normals[index - 1];
    const [nextNx, nextNy] = normals[index];
    let leftNx = prevNx + nextNx;
    let leftNy = prevNy + nextNy;
    const leftLength = Math.hypot(leftNx, leftNy);
    if (leftLength < 1e-6) {
      leftNx = nextNx;
      leftNy = nextNy;
    } else {
      leftNx /= leftLength;
      leftNy /= leftLength;
    }
    const leftDot = dot(leftNx, leftNy, nextNx, nextNy);
    const leftScale =
      Math.abs(leftDot) > 0.001 ? leftOffsetM / leftDot : leftOffsetM;
    const cappedLeftScale = Math.min(leftScale, 4 * leftOffsetM);
    leftSide.push([x + leftNx * cappedLeftScale, y + leftNy * cappedLeftScale]);

    const rightPrevNx = -prevNx;
    const rightPrevNy = -prevNy;
    const rightNextNx = -nextNx;
    const rightNextNy = -nextNy;
    let rightNx = rightPrevNx + rightNextNx;
    let rightNy = rightPrevNy + rightNextNy;
    const rightLength = Math.hypot(rightNx, rightNy);
    if (rightLength < 1e-6) {
      rightNx = rightNextNx;
      rightNy = rightNextNy;
    } else {
      rightNx /= rightLength;
      rightNy /= rightLength;
    }
    const rightDot = dot(rightNx, rightNy, rightNextNx, rightNextNy);
    const rightScale =
      Math.abs(rightDot) > 0.001 ? rightOffsetM / rightDot : rightOffsetM;
    const cappedRightScale = Math.min(rightScale, 4 * rightOffsetM);
    rightSide.push([
      x + rightNx * cappedRightScale,
      y + rightNy * cappedRightScale,
    ]);
  }

  const ring = [...leftSide, ...rightSide.reverse()];
  if (ring.length) ring.push(ring[0]);
  return ring.map(([x, y]) => metersToLngLat(x, y, referenceLatitude));
}

function mergeSelfIntersections(ring) {
  if (!ring || ring.length < 4) return [];

  const closedRing =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];

  try {
    const sourcePolygon = turfPolygon([closedRing]);
    const cleanedPolygon = cleanCoords(sourcePolygon);
    const unkinked = unkinkPolygon(cleanedPolygon);

    if (!unkinked?.features?.length) return [[closedRing]];

    let merged = null;
    for (const feature of unkinked.features) {
      merged = merged ? turfUnion(merged, feature) : feature;
    }

    if (!merged?.geometry) return [[closedRing]];
    if (merged.geometry.type === "Polygon")
      return [merged.geometry.coordinates];
    if (merged.geometry.type === "MultiPolygon")
      return merged.geometry.coordinates;
    return [[closedRing]];
  } catch {
    return [[closedRing]];
  }
}

function polygonArea(polygonCoordinates) {
  const ring = polygonCoordinates?.[0] || [];
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function clearStripLayerSmart() {
  try {
    clearLayer(STRIP_LAYER);
    clearLayerWithDerivatives(STRIP_LAYER);
  } catch {}
}

function renderStripPolygons(layerName, ring, properties) {
  if (!ring?.length) return;

  const polygonConfigs = mergeSelfIntersections(ring).map((coordinates) => ({
    coordinates,
    polygonStyle: {
      material: "rgba(0, 188, 212, 0.2)",
      fillOpacity: 0.25,
    },
    outlineStyle: {
      material: "rgba(0, 188, 212, 0.95)",
      width: 2,
    },
    properties,
  }));

  if (polygonConfigs.length) addPolygons(layerName, polygonConfigs);
}

function renderStripToMap(finalize = false) {
  if (finalize === true) isStripFinalized.value = true;
  clearStripLayerSmart();

  if (!stripPoints.value.length) return;

  addPoints(
    STRIP_LAYER,
    stripPoints.value.map((point, index) => {
      const selected = selectedStripPoint.value?.id === point.id;
      return {
        id: point.id,
        coordinates: [point.longitude, point.latitude, point.altitude || 0],
        pointStyle: {
          pixelSize: selected ? 11 : 9,
          color: "rgba(0, 188, 212, 0.95)",
          outlineColor: "rgba(178, 235, 242, 0.9)",
          outlineWidth: 2,
        },
        properties: {
          type: "strip_point",
          id: String(point.id),
          pointIndex: index,
        },
      };
    }),
  );

  if (stripPoints.value.length >= 2) {
    addLines(STRIP_LAYER, [
      {
        coordinates: stripPoints.value.map((point) => [
          point.longitude,
          point.latitude,
          point.altitude || 0,
        ]),
        lineStyle: {
          width: 4,
          material: { type: "Color", color: "rgba(0, 188, 212, 0.95)" },
        },
      },
    ]);
  }

  if (
    (isStripFinalized.value || finalize === true) &&
    stripPoints.value.length >= 2
  ) {
    const ring = buildStripPolygonRing(
      stripPoints.value,
      Math.max(0, currentStripOffsets.value.left),
      Math.max(0, currentStripOffsets.value.right),
    );
    renderStripPolygons(STRIP_LAYER, ring, { type: "strip_polygon" });
  }
}

function clearDragHandlers() {
  dragHandlerCleanups.forEach((cleanup) => cleanup());
  dragHandlerCleanups = [];
}

function enablePointDrag({ selectedRef, entityType, render }) {
  if (!selectedRef.value) return;

  clearDragHandlers();
  let dragging = false;

  dragHandlerCleanups.push(
    addMapEventListener("leftDown", (event) => {
      const type = getEntityProperty(event.pickedEntity, "type");
      const id = getEntityProperty(event.pickedEntity, "id");
      if (type === entityType && id === selectedRef.value?.id) {
        dragging = true;
        setMapInteractionEnabled(false);
      }
    }),
  );

  dragHandlerCleanups.push(
    addMapEventListener("mouseMove", (event) => {
      if (!dragging || !selectedRef.value) return;
      if (
        typeof event.longitude !== "number" ||
        typeof event.latitude !== "number"
      )
        return;

      selectedRef.value.longitude = event.longitude;
      selectedRef.value.latitude = event.latitude;
      render();
      if (entityType === "waypoint") notifyWaypointRoutePointsChanged();
    }),
  );

  dragHandlerCleanups.push(
    addMapEventListener("leftUp", () => {
      if (dragging) {
        dragging = false;
        setMapInteractionEnabled(true);
        selectedRef.value = null;
        render();
      }
      clearDragHandlers();
    }),
  );
}

function enableWaypointDrag() {
  enablePointDrag({
    selectedRef: selectedWaypoint,
    entityType: "waypoint",
    render: renderWaypointsToMap,
  });
}

function enableAreaPointDrag() {
  enablePointDrag({
    selectedRef: selectedAreaPoint,
    entityType: "area_point",
    render: renderAreaRouteToMap,
  });
}

function enableStripPointDrag() {
  enablePointDrag({
    selectedRef: selectedStripPoint,
    entityType: "strip_point",
    render: renderStripToMap,
  });
}

export function setDrawMode(mode) {
  drawMode.value = mode;
  if (mode !== "waypoint") {
    removeWaypointMouseMoveListener();
    clearWaypointDrawingPreview();
  }
  if (mode) selectedWaypoint.value = null;
}

export function startDrawingWaypoints() {
  setDrawMode("waypoint");
  clearWaypointDrawingPreview();

  removeWaypointMouseMoveListener();
  waypointMouseMoveListenerCleanup = addMapEventListener(
    "mouseMove",
    (event) => {
      if (drawMode.value !== "waypoint") return;
      renderWaypointDrawingPreview(event);
    },
  );

  notifyWaypointRoutePointsChanged();
}

export function stopDrawing() {
  setDrawMode(null);
}

export function clearAllWaypoints() {
  waypoints.value = [];
  selectedWaypoint.value = null;
  clearLayer(WAYPOINT_LAYER);
  clearWaypointDrawingPreview();
  notifyWaypointRoutePointsChanged();
}

export function clearAllRouteLayers(options = {}) {
  const { notify = true } = options;
  removeWaypointMouseMoveListener();
  clearLayer(WAYPOINT_LAYER);
  clearWaypointDrawingPreview();
  loadedRouteLayerNames.value.forEach(clearLayerWithDerivatives);
  loadedRouteLayerNames.value = [];
  waypoints.value = [];
  selectedWaypoint.value = null;
  if (notify) notifyWaypointRoutePointsChanged();

  try {
    stopEditingAreaPolygonFromEdit(false);
  } catch {}
  clearAllAreaLayers();
  areaPoints.value = [];
  selectedAreaPoint.value = null;

  try {
    stopEditingStrip(false);
  } catch {}
  clearStripLayerSmart();
  stripPoints.value = [];
  selectedStripPoint.value = null;
  isStripFinalized.value = false;
  currentStripOffsets.value = { left: 0, right: 0 };
}

export function getWaypoints() {
  return [...waypoints.value];
}

export function setWaypointRoutePoints(points = [], options = {}) {
  const { render = false } = options;
  waypoints.value = (Array.isArray(points) ? points : [])
    .map((point, index) => {
      const coordinate = Array.isArray(point) ? point : null;
      const longitude = Number(coordinate ? coordinate[0] : point?.longitude);
      const latitude = Number(coordinate ? coordinate[1] : point?.latitude);
      const altitude = Number(
        coordinate
          ? (coordinate[2] ?? __waypointDefaultAltitude)
          : (point?.altitude ?? point?.height ?? __waypointDefaultAltitude),
      );

      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        return null;
      }

      return {
        id: point?.id ?? generateId(),
        name: point?.name ?? `航点 ${index + 1}`,
        longitude,
        latitude,
        altitude: Number.isFinite(altitude)
          ? altitude
          : __waypointDefaultAltitude,
        description: point?.description ?? "",
      };
    })
    .filter(Boolean);
  selectedWaypoint.value = null;
  if (render) renderWaypointsToMap();
  notifyWaypointRoutePointsChanged();
}

function notifyWaypointRoutePointsChanged() {
  emitter.emit("waypoint-route-points-change", getWaypoints());
}

export function getAreaPoints() {
  return [...areaPoints.value];
}

function closePointLoop(points) {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];
  if (first.longitude !== last.longitude || first.latitude !== last.latitude) {
    points.push({ ...first });
  }
  return points;
}

export function getClosedAreaPoints() {
  const editedCoordinates = getEditedAreaPolygonCoordinates();
  if (editedCoordinates?.length) {
    const editedPoints = editedCoordinates.map(
      ([longitude, latitude], index) => ({
        id: generateId(),
        name: `区域点 ${index + 1}`,
        longitude,
        latitude,
        altitude: __waypointDefaultAltitude,
        description: "",
      }),
    );
    return closePointLoop(editedPoints);
  }

  return closePointLoop([...areaPoints.value]);
}

export function startDrawingArea() {
  setDrawMode("area");
}

export function clearAllAreaPoints() {
  stopEditingAreaPolygonFromEdit(false);
  areaPoints.value = [];
  selectedAreaPoint.value = null;
  clearAllAreaLayers();
}

function clearAllAreaLayers() {
  try {
    clearLayerWithDerivatives(AREA_LAYER);
  } catch {}

  loadedRouteLayerNames.value.forEach((routeLayerName) => {
    try {
      clearLayer(`${routeLayerName}-polygon`);
    } catch {}
  });

  const mapManager = getMapManagerInstance();
  if (!mapManager?.getAllDataSourceNames) return;

  mapManager
    .getAllDataSourceNames()
    .filter((name) => {
      const lowerName = name.toLowerCase();
      return lowerName.includes("area") || lowerName.includes("polygon");
    })
    .forEach((name) => {
      try {
        clearLayer(name);
      } catch {}
    });
}

export function startDrawingStrip(leftOffset = 0, rightOffset = 0) {
  clearStripLayerSmart();
  stripPoints.value = [];
  selectedStripPoint.value = null;
  isStripFinalized.value = false;
  currentStripOffsets.value = { left: leftOffset, right: rightOffset };
  drawMode.value = "strip";
  emitter.emit("stripDrawingStarted", { left: leftOffset, right: rightOffset });
}

export function updateStripOffsets(leftOffset, rightOffset) {
  currentStripOffsets.value = {
    left: Math.max(-1000, Math.min(1000, Number(leftOffset) || 0)),
    right: Math.max(-1000, Math.min(1000, Number(rightOffset) || 0)),
  };

  if (isStripFinalized.value && stripPoints.value.length >= 2) {
    renderStripToMap();
  }
}

export function locateToWaypoint(waypoint) {
  if (!waypoint) return;
  getMapManagerInstance()?.flyToPosition(
    waypoint.longitude,
    waypoint.latitude,
    waypoint.altitude ? waypoint.altitude + 1000 : 5000,
  );
}

export function switchVisibleLabelHandler(val,routeId) {
  setLayerVisibility(`${ROUTE_LAYER_PREFIX}${routeId}-routeLabel`, val);
}


export function loadAirLine(featureCollection) {
  if (!featureCollection?.features?.length) return;

  const previousRouteLayerNames = [...loadedRouteLayerNames.value];
  previousRouteLayerNames.forEach((layerName) => {
    try {
      clearLayerWithDerivatives(layerName);
    } catch {}
  });
  loadedRouteLayerNames.value = [];
  const lines = featureCollection.features.filter(
    (feature) => feature.geometry?.type === "LineString",
  );
  const points = featureCollection.features.filter(
    (feature) => feature.geometry?.type === "Point",
  );
  const polygons = featureCollection.features.filter(
    (feature) => feature.geometry?.type === "Polygon",
  );

  lines.forEach((lineFeature, index) => {
    const routeId = lineFeature.properties?.id ?? index;
    const routeLayerName = `${ROUTE_LAYER_PREFIX}${routeId}`;
    try {
      clearLayerWithDerivatives(routeLayerName);
    } catch {}
    loadedRouteLayerNames.value.push(routeLayerName);

    addLines(`${routeLayerName}-line`, [
      {
        coordinates: lineFeature.geometry.coordinates.map(
          ([longitude, latitude, altitude = 0]) => [
            longitude,
            latitude,
            altitude,
          ],
        ),
        lineStyle: {
          width: 6,
          material: { type: "Color", color: "rgba(33, 150, 243, 0.85)" },
        },
      },
    ]);

    const viewer = getMapManagerInstance()?.getViewer?.();
    if (!featureCollection.__noFlyTo) {
      zoomToTarget(viewer, `${routeLayerName}-line`, { cameraHeight: 2500 });
    }

    const routePoints = points.filter(
      (point) => point.properties?.id === routeId,
    );
    if (routePoints.length) {
      addPoints(
        `${routeLayerName}-point`,
        routePoints.map((pointFeature) => ({
          coordinates: [
            pointFeature.geometry.coordinates[0],
            pointFeature.geometry.coordinates[1],
            pointFeature.geometry.coordinates[2] || 0,
          ],
          pointStyle: {
            pixelSize: 5,
            color: "rgba(33, 150, 243, 0.85)",
            outlineColor: "rgba(100, 200, 247, 0.8)",
            outlineWidth: 2,
          },
        })),
      );

      addPoints(
        `${routeLayerName}-routeLabel`,
        routePoints.map((pointFeature) => ({
          coordinates: [
            pointFeature.geometry.coordinates[0],
            pointFeature.geometry.coordinates[1],
            pointFeature.geometry.coordinates[2] || 0,
          ],
          labelStyle: {
            text: `航点${pointFeature.properties.name}`,
            font: "16px sans-serif",
            fillColor: "BLACK",
            outlineColor: "WHITE",
            outlineWidth: 4,
            style: "FILL_AND_OUTLINE",
            pixelOffset: { x: 0, y: -20 },
          },
        })),
      );

      addLines(
        `${routeLayerName}-vline`,
        routePoints.map((pointFeature) => {
          const [longitude, latitude, altitude = 0] =
            pointFeature.geometry.coordinates;
          return {
            coordinates: [
              [longitude, latitude, altitude],
              [longitude, latitude, 0],
            ],
            lineStyle: {
              width: 2,
              material: {
                type: "Color",
                color: "rgba(144, 202, 249, 0.5)",
                dashLength: 12,
              },
            },
          };
        }),
      );
    }

    const routePolygons = polygons.filter(
      (polygonFeature) =>
        polygonFeature.properties?.id === routeId ||
        polygonFeature.properties?.routeId === routeId,
    );
    if (routePolygons.length) {
      addPolygons(
        `${routeLayerName}-polygon`,
        routePolygons.map((polygonFeature) => ({
          coordinates: polygonFeature.geometry.coordinates,
          polygonStyle: {
            fillOpacity: 0.25,
            material: "rgba(33, 150, 243, 0.35)",
          },
          outlineStyle: {
            material: "rgba(33, 150, 243, 0.9)",
            width: 2,
          },
          properties: polygonFeature.properties,
        })),
      );
    }
  });
}

export function showOnlyRouteById(routeId) {
  const targetLayerName = `${ROUTE_LAYER_PREFIX}${routeId}`;
  loadedRouteLayerNames.value.forEach((layerName) => {
    setLayerVisibility(layerName, layerName === targetLayerName);
  });
}

export function showAllRoutes() {
  loadedRouteLayerNames.value.forEach((layerName) => {
    setLayerVisibility(layerName, true);
  });
}

export function initWaypointService() {
  const mapManager = getMapManagerInstance();
  if (!mapManager?.isMapReady?.()) {
    console.warn("Map not ready");
    return;
  }

  if (leftClickListenerCleanup) leftClickListenerCleanup();
  leftClickListenerCleanup = addMapEventListener("leftClick", handleLeftClick);

  if (typeof rightClickListenerCleanup === "function")
    rightClickListenerCleanup();
  rightClickListenerCleanup = addMapEventListener(
    "rightClick",
    handleRightClick,
  );
}

function handleLeftClick(event) {
  const pickedEntity = event.pickedEntity;
  const pickedType = getEntityProperty(pickedEntity, "type");
  const pickedId = getEntityProperty(pickedEntity, "id");

  if (pickedType === "waypoint") {
    const waypoint = waypoints.value.find((item) => item.id === pickedId);
    if (waypoint) {
      selectedWaypoint.value = waypoint;
      selectedAreaPoint.value = null;
      selectedStripPoint.value = null;
      renderWaypointsToMap();
      renderAreaRouteToMap();
      renderStripToMap();
      enableWaypointDrag();
      return;
    }
  }

  if (pickedType === "area_point") {
    const areaPoint = areaPoints.value.find((item) => item.id === pickedId);
    if (areaPoint) {
      selectedAreaPoint.value = areaPoint;
      selectedWaypoint.value = null;
      selectedStripPoint.value = null;
      renderWaypointsToMap();
      renderAreaRouteToMap();
      renderStripToMap();
      enableAreaPointDrag();
      return;
    }
  }

  if (pickedType === "strip_point") {
    const stripPoint = stripPoints.value.find((item) => item.id === pickedId);
    if (stripPoint) {
      selectedStripPoint.value = stripPoint;
      selectedWaypoint.value = null;
      selectedAreaPoint.value = null;
      renderWaypointsToMap();
      renderAreaRouteToMap();
      renderStripToMap();
      enableStripPointDrag();
      return;
    }
  }

  if (typeof event.longitude !== "number" || typeof event.latitude !== "number")
    return;

  if (drawMode.value === "waypoint") {
    waypoints.value.push({
      id: generateId(),
      name: `航点 ${waypoints.value.length + 1}`,
      longitude: event.longitude,
      latitude: event.latitude,
      altitude: __waypointDefaultAltitude,
      description: "",
    });
    renderWaypointsToMap();
    clearWaypointDrawingPreview();
    notifyWaypointRoutePointsChanged();
    return;
  }

  if (drawMode.value === "area") {
    areaPoints.value.push({
      id: generateId(),
      name: `区域点 ${areaPoints.value.length + 1}`,
      longitude: event.longitude,
      latitude: event.latitude,
      altitude: __waypointDefaultAltitude,
      description: "",
    });
    renderAreaRouteToMap();
    return;
  }

  if (drawMode.value === "strip") {
    stripPoints.value.push({
      id: generateId(),
      name: `带状点 ${stripPoints.value.length + 1}`,
      longitude: event.longitude,
      latitude: event.latitude,
      altitude: 0,
      description: "",
    });
    renderStripToMap(false);
  }
}

function handleRightClick() {
  if (drawMode.value === "waypoint" && waypoints.value.length < 2) {
    ElMessage({ message: "请至少绘制2个航点", type: "warning" });
    return;
  }

  if (drawMode.value === "area" && areaPoints.value.length < 3) {
    ElMessage({ message: "请至少绘制3个区域点", type: "warning" });
    return;
  }

  if (drawMode.value === "area") {
    const closedPoints = getClosedAreaPoints();
    setDrawMode(null);
    emitter.emit("areaDrawingFinished", {
      success: true,
      points: [...areaPoints.value],
      closedPoints,
    });
    return;
  }

  if (drawMode.value === "strip") {
    const success = stripPoints.value.length >= 2;
    if (success) {
      isStripFinalized.value = true;
      renderStripToMap(true);
    } else {
      ElMessage({ message: "请至少绘制2个折线点", type: "warning" });
    }
    emitter.emit("stripDrawingFinished", {
      success,
      points: [...stripPoints.value],
    });
    setDrawMode(null);
    return;
  }

  setDrawMode(null);
}

export function getStripCenterlinePoints() {
  return stripPoints.value.map((point, index) => ({
    id: point.id ?? generateId(),
    name: point.name ?? `带状点 ${index + 1}`,
    longitude: point.longitude,
    latitude: point.latitude,
    altitude: point.altitude ?? 0,
    description: point.description ?? "",
  }));
}

function normalizePathVertices(
  vertices,
  minDistanceM = MIN_VERTEX_MERGE_DISTANCE_M,
) {
  if (!vertices?.length) return [];

  const normalized = [];
  vertices.forEach((vertex) => {
    const previous = normalized[normalized.length - 1];
    if (!previous || distanceMeters(previous, vertex) >= minDistanceM) {
      normalized.push(vertex);
    }
  });
  return normalized;
}

function computePathMidpointsWithEdges(vertices) {
  const midpoints = [];
  if (vertices.length < 2) return midpoints;

  for (let edgeIndex = 0; edgeIndex < vertices.length - 1; edgeIndex += 1) {
    const current = vertices[edgeIndex];
    const next = vertices[edgeIndex + 1];
    if (distanceMeters(current, next) >= MIN_VERTEX_MERGE_DISTANCE_M) {
      midpoints.push({
        mid: [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2],
        edgeIndex,
      });
    }
  }
  return midpoints;
}

function renderStripEditOverlay() {
  if (!stripEditState) return;

  const state = stripEditState;
  clearLayerWithDerivatives(STRIP_EDIT_LAYER);

  if (state.centerVertices.length >= 2) {
    addLines(STRIP_EDIT_LAYER, [
      {
        coordinates: state.centerVertices.map(([longitude, latitude]) => [
          longitude,
          latitude,
          0,
        ]),
        lineStyle: {
          width: 3,
          material: { type: "Color", color: "rgba(0,188,212,0.95)" },
        },
        properties: {
          type: "strip_edit_centerline",
          routeId: String(state.routeId ?? ""),
        },
      },
    ]);
  }

  const vertexStyle = {
    pixelSize: 9,
    color: "rgba(255,255,255,1)",
    outlineColor: "rgba(0,188,212,1)",
    outlineWidth: 3,
  };
  addPoints(
    STRIP_EDIT_LAYER,
    state.centerVertices.map(([longitude, latitude], index) => ({
      coordinates: [longitude, latitude, 0],
      pointStyle: vertexStyle,
      properties: {
        type: "strip_edit_vertex",
        index,
        routeId: String(state.routeId ?? ""),
      },
    })),
  );

  const midpointStyle = {
    pixelSize: 7,
    color: "rgba(0,188,212,1)",
    outlineColor: "rgba(255,255,255,0.9)",
    outlineWidth: 2,
  };
  const midpointConfigs = computePathMidpointsWithEdges(
    state.centerVertices,
  ).map(({ mid, edgeIndex }, index) => ({
    coordinates: [mid[0], mid[1], 0],
    pointStyle: midpointStyle,
    properties: {
      type: "strip_edit_midpoint",
      index,
      edgeIndex,
      routeId: String(state.routeId ?? ""),
    },
  }));
  if (midpointConfigs.length) addPoints(STRIP_EDIT_LAYER, midpointConfigs);

  if (state.centerVertices.length >= 2) {
    const ring = buildStripPolygonRing(
      state.centerVertices.map(([longitude, latitude]) => ({
        longitude,
        latitude,
      })),
      Math.max(0, state.leftOffsetM),
      Math.max(0, state.rightOffsetM),
    );
    renderStripPolygons(STRIP_EDIT_LAYER, ring, {
      type: "strip_polygon",
      routeId: String(state.routeId ?? ""),
    });
  }
}

function cleanupStripEditHandlers() {
  stripEditCleanupFns.forEach((cleanup) => cleanup());
  stripEditCleanupFns = [];
}

function enableStripEditDragHandlers() {
  cleanupStripEditHandlers();
  if (!stripEditState) return;

  let dragging = false;
  let dragIndex = null;

  stripEditCleanupFns.push(
    addMapEventListener("leftDown", (event) => {
      const state = stripEditState;
      if (!state) return;

      const type = getEntityProperty(event.pickedEntity, "type");
      const index = getEntityProperty(event.pickedEntity, "index");
      const edgeIndex = getEntityProperty(event.pickedEntity, "edgeIndex");

      if (type === "strip_edit_vertex") {
        dragging = true;
        dragIndex = Number(index);
        setMapInteractionEnabled(false);
        return;
      }

      if (type === "strip_edit_midpoint") {
        const midpoints = computePathMidpointsWithEdges(state.centerVertices);
        const selectedEdgeIndex = Number(edgeIndex ?? index);
        const midpoint =
          midpoints.find((item) => item.edgeIndex === selectedEdgeIndex) ||
          midpoints[Number(index)];
        if (!midpoint) return;

        dragIndex = selectedEdgeIndex + 1;
        state.centerVertices.splice(dragIndex, 0, [
          midpoint.mid[0],
          midpoint.mid[1],
        ]);
        dragging = true;
        setMapInteractionEnabled(false);
        renderStripEditOverlay();
      }
    }),
  );

  stripEditCleanupFns.push(
    addMapEventListener("mouseMove", (event) => {
      if (!stripEditState || !dragging || dragIndex === null) return;
      if (
        typeof event.longitude !== "number" ||
        typeof event.latitude !== "number"
      )
        return;

      stripEditState.centerVertices[dragIndex] = [
        event.longitude,
        event.latitude,
      ];
      renderStripEditOverlay();
    }),
  );

  stripEditCleanupFns.push(
    addMapEventListener("leftUp", () => {
      if (!dragging) return;

      dragging = false;
      dragIndex = null;
      setMapInteractionEnabled(true);
      if (stripEditState) {
        stripEditState.centerVertices = normalizePathVertices(
          stripEditState.centerVertices,
        );
      }
      renderStripEditOverlay();
    }),
  );
}

export function startEditingStripWith(
  centerline,
  leftOffset,
  rightOffset,
  routeId,
) {
  if (stripEditState) stopEditingStrip();

  try {
    setLayerVisibility(STRIP_LAYER, false);
    hiddenStripLayerNameDuringEdit = STRIP_LAYER;
  } catch {}

  const vertices = (centerline || []).map((point) => [
    Number(point[0]),
    Number(point[1]),
  ]);
  stripEditState = {
    routeId: routeId ?? null,
    centerVertices: normalizePathVertices(vertices),
    leftOffsetM: Math.max(0, Number(leftOffset) || 0),
    rightOffsetM: Math.max(0, Number(rightOffset) || 0),
  };

  renderStripEditOverlay();
  enableStripEditDragHandlers();
}

export function stopEditingStrip(restoreHiddenLayer = true) {
  cleanupStripEditHandlers();
  stripEditState = null;
  clearLayerWithDerivatives(STRIP_EDIT_LAYER);

  if (!hiddenStripLayerNameDuringEdit) return;

  if (restoreHiddenLayer) {
    try {
      setLayerVisibility(hiddenStripLayerNameDuringEdit, true);
    } catch {}
  } else {
    clearStripLayerSmart();
  }
  hiddenStripLayerNameDuringEdit = null;
}

export function updateEditingStripOffsets(leftOffset, rightOffset) {
  if (!stripEditState) return;

  stripEditState.leftOffsetM = Math.max(0, Number(leftOffset) || 0);
  stripEditState.rightOffsetM = Math.max(0, Number(rightOffset) || 0);
  renderStripEditOverlay();
}

export function isEditingStripActive() {
  return stripEditState !== null;
}

export function updateStripOffsetsSmart(leftOffset, rightOffset) {
  if (stripEditState) {
    updateEditingStripOffsets(leftOffset, rightOffset);
  } else {
    updateStripOffsets(leftOffset, rightOffset);
  }
}

export function updateEditingStripCenterline(centerline) {
  if (!stripEditState) return;

  const vertices = (centerline || []).map((point) => [
    Number(point[0]),
    Number(point[1]),
  ]);
  stripEditState.centerVertices = normalizePathVertices(vertices);
  renderStripEditOverlay();
}

export function getStripCenterlinePointsSmart() {
  if (stripEditState?.centerVertices?.length) {
    return stripEditState.centerVertices.map(
      ([longitude, latitude], index) => ({
        id: generateId(),
        name: `带状点 ${index + 1}`,
        longitude,
        latitude,
        altitude: 0,
        description: "",
      }),
    );
  }
  return getStripCenterlinePoints();
}

export function getEditedStripPolygonCoordinates() {
  if (!stripEditState || stripEditState.centerVertices.length < 2) return [];

  const ring = buildStripPolygonRing(
    stripEditState.centerVertices.map(([longitude, latitude]) => ({
      longitude,
      latitude,
    })),
    Math.max(0, stripEditState.leftOffsetM),
    Math.max(0, stripEditState.rightOffsetM),
  );
  if (!ring || ring.length < 4) return [];

  const polygons = mergeSelfIntersections(ring);
  if (!Array.isArray(polygons) || polygons.length === 0) return [ring];
  if (polygons.length === 1) return polygons[0];

  return polygons.reduce((largest, polygon) =>
    polygonArea(polygon) > polygonArea(largest) ? polygon : largest,
  );
}

export function getEditedStripPolygonPoints() {
  const coordinates = getEditedStripPolygonCoordinates();
  if (!coordinates?.length) return [];

  const ring = coordinates[0] || [];
  return ring.map(([longitude, latitude], index) => ({
    id: generateId(),
    name: `带状面点 ${index + 1}`,
    longitude,
    latitude,
    altitude: 0,
    description: "",
  }));
}
