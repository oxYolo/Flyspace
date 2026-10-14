import { getMapManager } from "./mapService";
import emitter from "@/stores/mitt";
import { CesiumMapManager } from "@/map-system";

const DATASOURCE_NAME = "replayMedia";
const HIGHLIGHT_LAYER = "replayMediaHighlight";
const CHARTLET_LAYER = "chartlet-overlays";

const LabelStyle = {
  FILL: "FILL",
  OUTLINE: "OUTLINE",
  FILL_AND_OUTLINE: "FILL_AND_OUTLINE",
};

const HeightReference = {
  NONE: "NONE",
  CLAMP_TO_GROUND: "CLAMP_TO_GROUND",
  RELATIVE_TO_GROUND: "RELATIVE_TO_GROUND",
};

const VerticalOrigin = {
  BASELINE: "BASELINE",
  BOTTOM: "BOTTOM",
  CENTER: "CENTER",
  TOP: "TOP",
};

const HorizontalOrigin = {
  CENTER: "CENTER",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

let isInteractionSetup = false;
let selectedReplayMediaEntityId = null;

function createFallbackMapUtils() {
  return {
    addBillboards: () => [],
    clearLayer: () => {},
    createColor: (value) => value,
    createCartesian2: (x, y) => ({ x, y }),
    addMapEventListener: () => () => {},
    getEntityById: () => null,
    setEntityProperty: () => {},
    flyToPoint: () => {},
    addPoints: () => [],
    zoomToDataSource: () => {},
    addChartlet: () => null,
    addPoint: () => null,
  };
}

function createMapUtils(viewer) {
  const mapManager = viewer ? new CesiumMapManager(viewer) : getMapManager();
  if (!mapManager) return createFallbackMapUtils();

  return {
    addBillboards: (layerName, billboards) =>
      mapManager.addBillboards?.(layerName, billboards) || [],
    clearLayer: (layerName) => mapManager.clearLayer?.(layerName),
    createColor: (value, alpha) =>
      mapManager.createColor?.(value, alpha) || value,
    createCartesian2: (x, y) => mapManager.createCartesian2?.(x, y) || { x, y },
    addMapEventListener: (eventType, handler) =>
      mapManager.addEventListener?.(eventType, handler) || (() => {}),
    getEntityById: (layerName, entityId) =>
      mapManager.getEntityById?.(layerName, entityId),
    setEntityProperty: (...args) => mapManager.setEntityProperty?.(...args),
    flyToPoint: (options) => {
      if (!options?.data?.center) return;
      const [longitude, latitude] = options.data.center;
      mapManager.flyToPosition?.(
        longitude,
        latitude,
        options.data.height || 1000,
      );
    },
    addPoints: (layerName, points) => mapManager.addPoints?.(layerName, points),
    zoomToDataSource: (layerName) =>
      mapManager.zoomToDataSource?.(layerName) ||
      mapManager.zoomToTarget?.(layerName),
    addChartlet: (layerName, chartlet) =>
      mapManager.addChartlet?.(layerName, chartlet),
    addPoint: (layerName, point) => mapManager.addPoint?.(layerName, point),
  };
}

function unwrapCesiumValue(value) {
  if (value && typeof value.getValue === "function") {
    try {
      return value.getValue();
    } catch {
      return undefined;
    }
  }
  return value;
}

function getEntityProperty(entity, path) {
  if (!entity) return undefined;

  let current = entity;
  for (const key of path.split(".")) {
    current = unwrapCesiumValue(current);
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return unwrapCesiumValue(current);
}

function getLocation(media) {
  const location = media?.locationInfo || {};
  const latitude = parseFloat(location.latitude);
  const longitude = parseFloat(location.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}

function getMediaAltitude(media) {
  const altitude =
    media?.absoluteAltitude ??
    media?.absolutealtitude ??
    media?.altitude ??
    media?.height;
  return parseFloat(altitude) || 150;
}

function getMediaImageUrl(media) {
  if (media?.scalePath?.startsWith("http")) return media.scalePath;
  if (media?.filePath?.startsWith("http")) return media.filePath;
  return getDefaultIconByFileType(media?.fileType);
}

function createReplayMediaEntityId(media) {
  const suffix =
    media?.id || `${Date.now()}${Math.random().toString(36).substring(2, 10)}`;
  return `replay_media_${suffix}`;
}

async function buildReplayMediaBillboard(media, mapUtils) {
  const location = getLocation(media);
  if (!location) return null;

  const altitude = getMediaAltitude(media);
  const imageUrl = getMediaImageUrl(media);
  const image = await createMediaThumbnail(imageUrl);
  const entityId = createReplayMediaEntityId(media);

  return {
    id: entityId,
    coordinates: [location.longitude, location.latitude, altitude],
    image,
    billboardStyle: {
      scale: 0.6,
      heightReference: HeightReference.RELATIVE_TO_GROUND,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: mapUtils.createCartesian2(0, 4),
    },
    labelStyle: {
      id: `${entityId}_label`,
      text: media?.fileName || media?.name || "未命名",
      font: "14px sans-serif",
      fillColor: "white",
      outlineColor: "black",
      outlineWidth: 2.5,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.CENTER,
      horizontalOrigin: HorizontalOrigin.LEFT,
      pixelOffset: [32, -16],
      show: false,
    },
    rawData: media,
    entityType: "replayMediaBillboard",
    entityId,
    imageUrl,
    properties: {
      rawData: media,
      entityType: "replayMediaBillboard",
      entityId,
      imageUrl,
    },
  };
}

/**
 * 将回放成果媒体渲染到地图。
 * @param {Array} mediaList 回放媒体列表
 * @param {object} viewer 可选 Cesium viewer 实例
 */
export async function renderReplayMediaToMap(mediaList, viewer) {
  const mapUtils = createMapUtils(viewer);
  const safeMediaList = Array.isArray(mediaList) ? mediaList : [];

  mapUtils.clearLayer(DATASOURCE_NAME);

  const billboards = (
    await Promise.all(
      safeMediaList
        .filter((media) => getLocation(media))
        .map((media) => buildReplayMediaBillboard(media, mapUtils)),
    )
  ).filter(Boolean);

  if (billboards.length > 0) {
    await mapUtils.addBillboards(DATASOURCE_NAME, billboards);
  }
}

export function clearReplayMediaFromMap(viewer, mode = "2d") {
  const mapUtils = createMapUtils(viewer);
  mapUtils.clearLayer(DATASOURCE_NAME);

  if (
    window.replayMediaMouseHandler &&
    typeof window.replayMediaMouseHandler.destroy === "function"
  ) {
    window.replayMediaMouseHandler.destroy();
    window.replayMediaMouseHandler = null;
  }

  selectedReplayMediaEntityId = null;
  isInteractionSetup = false;
}

export function zoomToReplayMediaLayer(viewer) {
  createMapUtils(viewer).zoomToDataSource(DATASOURCE_NAME);
}

export function setupReplayMediaInteraction(viewer) {
  const mapUtils = createMapUtils(viewer);
  if (isInteractionSetup) return;

  const removeClickListener = mapUtils.addMapEventListener(
    "leftClick",
    (event) => {
      const pickedEntity = event?.pickedEntity;
      const entityId =
        getEntityProperty(pickedEntity, "properties.entityId") ||
        getEntityProperty(pickedEntity, "entityId") ||
        pickedEntity?.id ||
        null;

      if (
        selectedReplayMediaEntityId &&
        selectedReplayMediaEntityId !== entityId
      ) {
        setLabelVisible(mapUtils, selectedReplayMediaEntityId, false);
        selectedReplayMediaEntityId = null;
      }

      if (!entityId) return;

      setLabelVisible(mapUtils, entityId, true);
      selectedReplayMediaEntityId = entityId;

      const rawData =
        getEntityProperty(pickedEntity, "properties.rawData") ||
        getEntityProperty(pickedEntity, "rawData");
      if (rawData) {
        emitter.emit("openReplayMediaDetail", rawData);
      }
    },
  );

  window.replayMediaMouseHandler = {
    destroy: () => {
      removeClickListener?.();
    },
  };

  isInteractionSetup = true;
}

function setLabelVisible(mapUtils, entityId, visible) {
  const labelEntityId = `${entityId}_label`;
  const labelEntity = mapUtils.getEntityById(DATASOURCE_NAME, labelEntityId);

  if (labelEntity) {
    mapUtils.setEntityProperty?.(labelEntity, "label.show", visible);
    mapUtils.setEntityProperty?.(
      DATASOURCE_NAME,
      labelEntityId,
      "label.show",
      visible,
    );
  }
}

export function locateToReplayMedia(media, viewer) {
  const location = getLocation(media);
  if (!location) return;

  const mapUtils = createMapUtils(viewer);
  mapUtils.flyToPoint({
    data: {
      center: [location.longitude, location.latitude],
      height: 1000,
    },
  });

  mapUtils.clearLayer(HIGHLIGHT_LAYER);
  mapUtils.addPoint(HIGHLIGHT_LAYER, {
    coordinates: [location.longitude, location.latitude],
    pointStyle: {
      color: mapUtils.createColor("#0000FF"),
      pixelSize: 12,
      outlineColor: mapUtils.createColor("#FFFFFF"),
      outlineWidth: 2,
      heightReference: HeightReference.CLAMP_TO_GROUND,
    },
    properties: {
      entityType: HIGHLIGHT_LAYER,
    },
  });

  setTimeout(() => mapUtils.clearLayer(HIGHLIGHT_LAYER), 10000);
}

function getDefaultIconByFileType(fileType) {
  switch (fileType) {
    case "PHOTO":
      return "/images/icons/photo-thumbnail.png";
    case "VIDEO":
      return "/images/icons/video-thumbnail.png";
    default:
      return "/images/icons/photo-thumbnail.png";
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function createMediaThumbnail(imageUrl, isSelected = false) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const drawCanvas = (loadedImage) => {
      const canvas = document.createElement("canvas");
      const size = 48;
      const tail = 8;
      const padding = 3;
      const radius = 6;

      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2 + tail;

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(canvas);

      ctx.fillStyle = "white";
      roundRect(ctx, 0, 0, size + padding * 2, size + padding * 2, radius);
      ctx.fill();

      if (loadedImage) {
        ctx.save();
        roundRect(ctx, padding, padding, size, size, radius - padding / 2);
        ctx.clip();
        ctx.drawImage(
          loadedImage,
          0,
          0,
          loadedImage.width,
          loadedImage.height,
          padding,
          padding,
          size,
          size,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        roundRect(ctx, padding, padding, size, size, radius - padding / 2);
        ctx.fill();
      }

      ctx.shadowColor = "#3388ff";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = "white";
      ctx.beginPath();

      const tipX = size + padding * 2;
      const leftY = (size + padding * 2) / 2 - tail;
      const rightY = (size + padding * 2) / 2 + tail;

      ctx.moveTo(leftY, tipX);
      ctx.lineTo((leftY + rightY) / 2, tipX + tail);
      ctx.lineTo(rightY, tipX);
      ctx.closePath();
      ctx.fill();

      resolve(canvas);
    };

    image.onload = () => drawCanvas(image);
    image.onerror = () => drawCanvas(null);
    image.src = imageUrl;
  });
}

export function pasteImageToMap(media, viewer, mode = "2d") {
  const mapUtils = createMapUtils(viewer);
  const chartletInfo = media?.chartletInfo || {};
  const rotationDeg =
    Number(media?.rotationAngle ?? chartletInfo.rotationAngle ?? 0) || 0;

  if (!media?.filePath) return;

  mapUtils.addChartlet(CHARTLET_LAYER, {
    imageUrl: String(media.filePath),
    corners: Array.isArray(chartletInfo.cornerCoordinates)
      ? chartletInfo.cornerCoordinates
      : undefined,
    bounds: chartletInfo.bounds || undefined,
    rotationDeg,
    layerId: CHARTLET_LAYER,
  });
}
