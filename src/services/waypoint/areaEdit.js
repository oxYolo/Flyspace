import { getMapManager } from "@/services/mapService";

const AREA_EDIT_LAYER = "area_edit_overlay";
const ROUTE_LAYER_PREFIX = "route-";
const EARTH_RADIUS_METERS = 6371000;
const MIN_VERTEX_MERGE_DISTANCE_M = 0.5;

let polygonEditState = null;
let polygonEditCleanupFns = [];
let hiddenRouteLayerNameDuringEdit = null;

function getMapManagerInstance() {
  const mapManager = getMapManager();
  if (!mapManager) {
    console.error("Map manager not initialized");
    return null;
  }
  return mapManager;
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

function clearLayerWithDerivatives(layerName) {
  getMapManagerInstance()?.clearLayerWithDerivatives(layerName);
}

function addPoints(layerName, pointConfigs) {
  return getMapManagerInstance()?.addPoints(layerName, pointConfigs) || [];
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

function setMapInteractionEnabled(enabled) {
  getMapManagerInstance()?.setMapInteractionEnabled(enabled);
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

function normalizeRingVertices(
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

  if (
    normalized.length >= 2 &&
    distanceMeters(normalized[0], normalized[normalized.length - 1]) <
      minDistanceM
  ) {
    normalized.pop();
  }

  return normalized;
}

function computeMidpointsWithEdges(vertices) {
  const midpoints = [];
  if (vertices.length < 2) return midpoints;

  for (let edgeIndex = 0; edgeIndex < vertices.length; edgeIndex += 1) {
    const current = vertices[edgeIndex];
    const next = vertices[(edgeIndex + 1) % vertices.length];
    if (distanceMeters(current, next) >= MIN_VERTEX_MERGE_DISTANCE_M) {
      midpoints.push({
        mid: [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2],
        edgeIndex,
      });
    }
  }

  return midpoints;
}

function parseRoutePolygonCoordinates(route) {
  let coordinates =
    route?.routeInfo?.mappingTypeReq?.coordinatesJson?.coordinates;

  if (
    !coordinates &&
    typeof route?.routeInfo?.mappingTypeReq?.coordinatesJson === "string"
  ) {
    try {
      coordinates = JSON.parse(
        route.routeInfo.mappingTypeReq.coordinatesJson,
      )?.coordinates;
    } catch {
      coordinates = null;
    }
  }

  if (
    !coordinates &&
    Array.isArray(route?.routeInfo?.mappingTypeReq?.coordinatesJson)
  ) {
    coordinates = route.routeInfo.mappingTypeReq.coordinatesJson;
  }

  if (!Array.isArray(coordinates) || !coordinates.length) return [];
  const ring = Array.isArray(coordinates[0]?.[0])
    ? coordinates[0]
    : coordinates;
  return ring
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map((point) => [Number(point[0]), Number(point[1])])
    .filter(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) && Number.isFinite(latitude),
    );
}

function renderAreaEditOverlay() {
  if (!polygonEditState) return;

  const state = polygonEditState;
  clearLayerWithDerivatives(AREA_EDIT_LAYER);

  if (state.vertices.length >= 3) {
    const closedRing = [...state.vertices, state.vertices[0]];
    addPolygons(AREA_EDIT_LAYER, [
      {
        coordinates: [closedRing],
        polygonStyle: {
          material: "rgba(33, 150, 243, 0.08)",
          fillOpacity: 0.1,
          outline: false,
        },
        outlineStyle: {
          material: "rgba(33, 150, 243, 0.95)",
          width: 2,
        },
        properties: {
          type: "polygon_edit_area",
          routeId: String(state.routeId ?? ""),
        },
      },
    ]);
  }

  const vertexStyle = {
    pixelSize: 9,
    color: "rgba(255,255,255,1)",
    outlineColor: "rgba(33,150,243,1)",
    outlineWidth: 3,
  };
  addPoints(
    AREA_EDIT_LAYER,
    state.vertices.map(([longitude, latitude], index) => ({
      coordinates: [longitude, latitude, 0],
      pointStyle: vertexStyle,
      properties: {
        type: "polygon_edit_vertex",
        index,
        routeId: String(state.routeId ?? ""),
      },
    })),
  );

  const midpointStyle = {
    pixelSize: 7,
    color: "rgba(33,150,243,1)",
    outlineColor: "rgba(255,255,255,0.9)",
    outlineWidth: 2,
  };
  const midpointConfigs = computeMidpointsWithEdges(state.vertices).map(
    ({ mid, edgeIndex }, index) => ({
      coordinates: [mid[0], mid[1], 0],
      pointStyle: midpointStyle,
      properties: {
        type: "polygon_edit_midpoint",
        index,
        edgeIndex,
        routeId: String(state.routeId ?? ""),
      },
    }),
  );
  if (midpointConfigs.length) addPoints(AREA_EDIT_LAYER, midpointConfigs);
}

function cleanupPolygonEditHandlers() {
  polygonEditCleanupFns.forEach((cleanup) => cleanup());
  polygonEditCleanupFns = [];
}

function enablePolygonEditDragHandlers() {
  cleanupPolygonEditHandlers();
  if (!polygonEditState) return;

  let dragging = false;
  let dragIndex = null;

  polygonEditCleanupFns.push(
    addMapEventListener("leftDown", (event) => {
      const state = polygonEditState;
      if (!state) return;

      const type = getEntityProperty(event.pickedEntity, "type");
      const index = getEntityProperty(event.pickedEntity, "index");
      const edgeIndex = getEntityProperty(event.pickedEntity, "edgeIndex");

      if (type === "polygon_edit_vertex") {
        dragging = true;
        dragIndex = Number(index);
        setMapInteractionEnabled(false);
        return;
      }

      if (type === "polygon_edit_midpoint") {
        const midpoints = computeMidpointsWithEdges(state.vertices);
        const selectedEdgeIndex = Number(edgeIndex ?? index);
        const midpoint =
          midpoints.find((item) => item.edgeIndex === selectedEdgeIndex) ||
          midpoints[Number(index)];
        if (!midpoint) return;

        dragIndex = (selectedEdgeIndex + 1) % state.vertices.length;
        state.vertices.splice(dragIndex, 0, [midpoint.mid[0], midpoint.mid[1]]);
        dragging = true;
        setMapInteractionEnabled(false);
        renderAreaEditOverlay();
      }
    }),
  );

  polygonEditCleanupFns.push(
    addMapEventListener("mouseMove", (event) => {
      if (!polygonEditState || !dragging || dragIndex === null) return;
      if (
        typeof event.longitude !== "number" ||
        typeof event.latitude !== "number"
      ) {
        return;
      }

      polygonEditState.vertices[dragIndex] = [event.longitude, event.latitude];
      renderAreaEditOverlay();
    }),
  );

  polygonEditCleanupFns.push(
    addMapEventListener("leftUp", () => {
      if (!dragging) return;

      dragging = false;
      dragIndex = null;
      setMapInteractionEnabled(true);
      if (polygonEditState) {
        polygonEditState.vertices = normalizeRingVertices(
          polygonEditState.vertices,
        );
      }
      renderAreaEditOverlay();
    }),
  );
}

export function startEditingAreaPolygonByRoute(route) {
  if (polygonEditState) stopEditingAreaPolygon();

  const mapManager = getMapManagerInstance();
  if (!mapManager) return;

  const routeId = route?.id ?? route?.routeId;
  const vertices = parseRoutePolygonCoordinates(route);
  if (vertices.length < 3) return;

  const routeLayerName = `${ROUTE_LAYER_PREFIX}${routeId}`;
  mapManager.setLayerVisibility(routeLayerName, false);
  hiddenRouteLayerNameDuringEdit = routeLayerName;

  polygonEditState = {
    routeId: String(routeId ?? ""),
    vertices: normalizeRingVertices(vertices),
  };
  renderAreaEditOverlay();
  enablePolygonEditDragHandlers();
}

export function stopEditingAreaPolygon(restoreHiddenLayer = true) {
  const mapManager = getMapManagerInstance();
  if (!mapManager) return;

  cleanupPolygonEditHandlers();
  polygonEditState = null;
  mapManager.clearLayerWithDerivatives(AREA_EDIT_LAYER);

  if (!hiddenRouteLayerNameDuringEdit) return;

  if (restoreHiddenLayer) {
    mapManager.setLayerVisibility(hiddenRouteLayerNameDuringEdit, true);
  } else {
    mapManager.clearLayer(hiddenRouteLayerNameDuringEdit);
  }
  hiddenRouteLayerNameDuringEdit = null;
}

export function getEditedAreaPolygonCoordinates() {
  if (!polygonEditState) return [];

  const vertices = polygonEditState.vertices;
  if (!vertices.length) return [];

  return [...vertices, vertices[0]].map(([longitude, latitude]) => [
    longitude,
    latitude,
  ]);
}
