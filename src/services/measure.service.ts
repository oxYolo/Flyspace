import { getImageUrl } from "@/utils/utils";

declare const Cesium: any;
export type MeasureMode = "distance" | "area" | "height" | "coordinate" | null;

let viewer: any = null;
const pinIconUrl = getImageUrl("assets/images/map/red.png");

// ==================== 公共辅助 ====================

function pickTerrain(position: any): any {
  if (viewer.scene.pickPositionSupported) {
    const picked = viewer.scene.pick(position);
    if (Cesium.defined(picked)) {
      const cartesian = viewer.scene.pickPosition(position);
      if (
        Cesium.defined(cartesian) &&
        Number.isFinite(cartesian.x) &&
        Number.isFinite(cartesian.y) &&
        Number.isFinite(cartesian.z)
      ) {
        return cartesian;
      }
    }
  }

  const ray = viewer.camera.getPickRay(position);
  const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
  if (cartesian) return cartesian;
  return viewer.scene.camera.pickEllipsoid(position);
}

function getMeasureOverlayContainer(): HTMLElement {
  const host =
    viewer.container.querySelector(".cesium-widget") || viewer.container;
  let overlay = host.querySelector(".measure-overlay") as HTMLElement;
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "measure-overlay";
    overlay.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:99998;overflow:hidden;";
    host.appendChild(overlay);
  }
  return overlay;
}

function getMeasureLabelOverlayContainer(): HTMLElement {
  const host =
    viewer.container.querySelector(".cesium-widget") || viewer.container;
  let overlay = host.querySelector(".measure-label-overlay") as HTMLElement;
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "measure-label-overlay";
    overlay.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:2147483647;overflow:hidden;";
    host.appendChild(overlay);
  }
  return overlay;
}

function createSvgElement(tagName: string, attrs: Record<string, string>) {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tagName,
  );
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

function projectMeasurePosition(position: any): any {
  return Cesium.SceneTransforms.wgs84ToWindowCoordinates(
    viewer.scene,
    position,
  );
}

function ensureMeasureOverlay(state: any) {
  if (state.overlay && state.svg && state.labelElement) return;

  const overlay = getMeasureOverlayContainer();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.cssText = "position:absolute;inset:0;overflow:visible;";

  const label = document.createElement("div");
  label.style.cssText =
    "position:absolute;display:none;transform:translate(-50%,-100%);padding:4px 8px;background:rgba(0,0,0,0.72);color:#fff;font:14px sans-serif;white-space:nowrap;z-index:1;";

  overlay.appendChild(svg);
  overlay.appendChild(label);

  state.overlay = overlay;
  state.svg = svg;
  state.labelElement = label;

  if (!state.postRenderListener) {
    state.postRenderListener = viewer.scene.postRender.addEventListener(() => {
      state.refreshOverlay?.();
    });
  }
}

function removeMeasureOverlay(state: any) {
  if (state.postRenderListener) {
    state.postRenderListener();
    state.postRenderListener = null;
  }
  if (state.svg?.parentNode) state.svg.parentNode.removeChild(state.svg);
  if (state.labelElement?.parentNode)
    state.labelElement.parentNode.removeChild(state.labelElement);
  state.svg = null;
  state.labelElement = null;
  state.overlay = null;
}

// ==================== 初始化 ====================

export function initMeasureService(viewerInstance: any) {
  viewer = viewerInstance;
}

// ==================== 模式切换 ====================

export function setMeasureMode(mode: MeasureMode) {
  clearMeasure();
  if (!mode || !viewer) return;
  if (viewer.scene.canvas) viewer.scene.canvas.style.cursor = "crosshair";

  switch (mode) {
    case "distance":
      startDistanceMeasure();
      break;
    case "area":
      startAreaMeasure();
      break;
    case "height":
      startHeightMeasure();
      break;
    case "coordinate":
      startCoordinatePick();
      break;
  }
}

// ==================== 距离测量（不贴地）====================

let distanceState: any = null;

function startDistanceMeasure() {
  const state: any = {
    points: [],
    handler: null,
    entities: [],
    refreshOverlay: null,
  };
  state.refreshOverlay = () => refreshDistance(state);
  ensureMeasureOverlay(state);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  state.handler = handler;

  // 左键添加顶点
  handler.setInputAction(
    (event: any) => {
      const c = pickTerrain(event.position);
      if (!c) return;
      state.points.push(c.clone());

      refreshDistance(state);
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  // 右键完成
  handler.setInputAction(
    () => finishDistance(state),
    Cesium.ScreenSpaceEventType.RIGHT_CLICK,
  );

  distanceState = state;
}

function refreshDistance(state: any) {
  ensureMeasureOverlay(state);
  state.svg.innerHTML = "";

  const pts = state.points;
  if (!pts.length) {
    state.labelElement.style.display = "none";
    return;
  }

  const screenPoints = pts.map(projectMeasurePosition).filter(Boolean);
  if (screenPoints.length >= 2) {
    state.svg.appendChild(
      createSvgElement("polyline", {
        points: screenPoints
          .map((point: any) => `${point.x},${point.y}`)
          .join(" "),
        fill: "none",
        stroke: "#ffff00",
        "stroke-width": "2",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }),
    );
  }

  screenPoints.forEach((point: any) => {
    state.svg.appendChild(
      createSvgElement("circle", {
        cx: String(point.x),
        cy: String(point.y),
        r: "5",
        fill: "#ff0000ff",
        stroke: "#ffffff",
        "stroke-width": "2",
      }),
    );
  });

  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Cesium.Cartesian3.distance(pts[i - 1], pts[i]);
  }

  const lastPoint = screenPoints[screenPoints.length - 1];
  if (pts.length >= 2 && lastPoint) {
    state.labelElement.textContent = `总距离: ${total.toFixed(2)}m`;
    state.labelElement.style.left = lastPoint.x + "px";
    state.labelElement.style.top = lastPoint.y - 16 + "px";
    state.labelElement.style.display = "block";
  } else {
    state.labelElement.style.display = "none";
  }
}

function finishDistance(state: any) {
  if (state.points.length < 2) {
    cleanupDistance(state);
    return;
  }
  refreshDistance(state);
  if (state.handler) {
    state.handler.destroy();
    state.handler = null;
  }
  if (viewer.scene.canvas) viewer.scene.canvas.style.cursor = "default";
}

function cleanupDistance(state: any) {
  if (!state) return;
  if (state.entities.length) {
    state.entities.forEach((id: string) => viewer.entities.removeById(id));
    state.entities = [];
  }
  if (state.handler) {
    state.handler.destroy();
    state.handler = null;
  }
  removeMeasureOverlay(state);
}

// ==================== 面积测量（贴地）====================

let areaState: any = null;

function makeAreaPoint(cartesian: any): any {
  const carto = Cesium.Cartographic.fromCartesian(cartesian);
  return {
    lon: carto.longitude,
    lat: carto.latitude,
    height: carto.height,
    position: cartesian.clone(),
  };
}

function getAreaPointPosition(point: any): any {
  if (point.position) return point.position;
  return Cesium.Cartesian3.fromRadians(point.lon, point.lat, point.height || 0);
}

function buildAreaVertexPositions(points: any[], close = false): any[] {
  const positions = points.map(getAreaPointPosition);
  if (close && positions.length) positions.push(positions[0]);
  return positions;
}

function ensureAreaOverlay(state: any) {
  state.refreshOverlay = () => refreshAreaDisplay(state);
  ensureMeasureOverlay(state);
  state.labelElement.style.font = "16px sans-serif";
  state.labelElement.style.transform = "translate(-50%,-50%)";
}

function removeAreaOverlay(state: any) {
  removeMeasureOverlay(state);
}

function getAreaScreenCenter(points: any[]): any {
  const projected = points
    .map((point) => projectMeasurePosition(getAreaPointPosition(point)))
    .filter(Boolean);
  if (!projected.length) return null;

  const sum = projected.reduce(
    (acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    },
    { x: 0, y: 0 },
  );

  return {
    x: sum.x / projected.length,
    y: sum.y / projected.length,
  };
}

function updateFinalAreaLabel(state: any) {
  if (!state.finalLabelElement || !state.finalLabelPosition) return;
  const screenPoint = projectMeasurePosition(state.finalLabelPosition);
  if (!screenPoint) {
    state.finalLabelElement.style.display = "none";
    return;
  }
  state.finalLabelElement.style.left = screenPoint.x + "px";
  state.finalLabelElement.style.top = screenPoint.y + "px";
  state.finalLabelElement.style.display = "block";
}

function createFinalAreaLabel(state: any, text: string, position: any) {
  const label = document.createElement("div");
  label.textContent = text;
  label.style.cssText =
    "position:absolute;display:none;transform:translate(-50%,-50%);padding:4px 8px;background:rgba(0,0,0,0.82);color:#fff;font:16px sans-serif;white-space:nowrap;z-index:1;pointer-events:none;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.35);";

  getMeasureLabelOverlayContainer().appendChild(label);
  state.finalLabelElement = label;
  state.finalLabelPosition = position;
  updateFinalAreaLabel(state);

  state.finalLabelPostRenderListener = viewer.scene.postRender.addEventListener(
    () => {
      updateFinalAreaLabel(state);
    },
  );
}

function removeFinalAreaLabel(state: any) {
  if (state.finalLabelPostRenderListener) {
    state.finalLabelPostRenderListener();
    state.finalLabelPostRenderListener = null;
  }
  if (state.finalLabelElement?.parentNode) {
    state.finalLabelElement.parentNode.removeChild(state.finalLabelElement);
  }
  state.finalLabelElement = null;
  state.finalLabelPosition = null;
}

function startAreaMeasure() {
  const state: any = {
    points: [], // 存储 { lon, lat, height, position }，点和线端点共用 position
    handler: null,
    entities: [],
    primitives: [],
    mouseCartographic: null, // 鼠标当前位置的 { lon, lat, height }
    isFinished: false,
  };

  ensureAreaOverlay(state);

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  state.handler = handler;

  // 左键添加顶点
  handler.setInputAction(
    (event: any) => {
      if (state.isFinished) return;
      const cartesian = pickTerrain(event.position);
      if (!cartesian) return;

      const point = makeAreaPoint(cartesian);
      state.points.push(point);

      refreshAreaDisplay(state);
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  // 鼠标移动动态预览
  handler.setInputAction(
    (event: any) => {
      if (state.isFinished || state.points.length === 0) return;
      const cartesian = pickTerrain(event.endPosition);
      if (cartesian) {
        state.mouseCartographic = makeAreaPoint(cartesian);
        refreshAreaDisplay(state);
      }
    },
    Cesium.ScreenSpaceEventType.MOUSE_MOVE,
  );

  // 右键完成
  handler.setInputAction(
    () => {
      void finishAreaMeasure(state);
    },
    Cesium.ScreenSpaceEventType.RIGHT_CLICK,
  );

  areaState = state;
}

function refreshAreaDisplay(state: any) {
  ensureAreaOverlay(state);
  state.svg.innerHTML = "";

  if (state.points.length === 0) return;

  const previewPoints = [...state.points];

  if (!state.isFinished && state.mouseCartographic) {
    previewPoints.push(state.mouseCartographic);
  }

  const linePositions =
    previewPoints.length >= 2
      ? buildAreaVertexPositions(previewPoints, previewPoints.length >= 3)
      : [];
  const screenLinePoints = linePositions
    .map(projectMeasurePosition)
    .filter(Boolean);

  if (screenLinePoints.length >= 3) {
    state.svg.appendChild(
      createSvgElement("polygon", {
        points: screenLinePoints
          .slice(0, -1)
          .map((point: any) => `${point.x},${point.y}`)
          .join(" "),
        fill: "rgba(255,255,0,0.32)",
        stroke: "none",
      }),
    );
  }

  if (screenLinePoints.length >= 2) {
    state.svg.appendChild(
      createSvgElement("polyline", {
        points: screenLinePoints
          .map((point: any) => `${point.x},${point.y}`)
          .join(" "),
        fill: "none",
        stroke: "#ffff00",
        "stroke-width": "2",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }),
    );
  }

  state.points.forEach((point: any) => {
    const screenPoint = projectMeasurePosition(getAreaPointPosition(point));
    if (!screenPoint) return;
    state.svg.appendChild(
      createSvgElement("circle", {
        cx: String(screenPoint.x),
        cy: String(screenPoint.y),
        r: "6",
        fill: "#ff0000ff",
        stroke: "#ffffff",
        "stroke-width": "2",
      }),
    );
  });

  if (state.areaText) {
    const center = getAreaScreenCenter(state.points);
    if (center) {
      state.labelElement.textContent = state.areaText;
      state.labelElement.style.left = center.x + "px";
      state.labelElement.style.top = center.y + "px";
      state.labelElement.style.display = "block";
    } else {
      state.labelElement.style.display = "none";
    }
  } else {
    state.labelElement.style.display = "none";
  }
}

function createFinalAreaEntities(state: any) {
  const polygonPositions = buildAreaVertexPositions(state.points);
  const linePositions = buildAreaVertexPositions(state.points, true);
  if (polygonPositions.length < 3) return;

  const polygonPrimitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(polygonPositions),
          perPositionHeight: true,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.YELLOW.withAlpha(0.32),
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: false,
        renderState: {
          depthTest: {
            enabled: false,
          },
          depthMask: false,
        },
      }),
      asynchronous: false,
    }),
  );
  state.primitives.push(polygonPrimitive);

  const outlinePrimitive = viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: linePositions,
          width: 2,
          vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT,
        }),
      }),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: Cesium.Material.fromType("Color", {
          color: Cesium.Color.YELLOW,
        }),
        renderState: {
          depthTest: {
            enabled: false,
          },
          depthMask: false,
        },
      }),
      asynchronous: false,
    }),
  );
  state.primitives.push(outlinePrimitive);

  state.points.forEach((point: any) => {
    const pointEntity = viewer.entities.add({
      position: getAreaPointPosition(point),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 8,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    state.entities.push(pointEntity.id);
  });
}

async function finishAreaMeasure(state: any) {
  if (state.isFinished) return;
  state.mouseCartographic = null;
  state.isFinished = true;

  if (state.points.length < 3) {
    cleanupAreaState(state);
    return;
  }

  refreshAreaDisplay(state);

  if (state.handler) {
    state.handler.destroy();
    state.handler = null;
  }
  if (viewer.scene.canvas) viewer.scene.canvas.style.cursor = "default";

  // 计算面积
  const area = await computeArea(state.points);
  if (areaState !== state) return;

  removeAreaOverlay(state);
  createFinalAreaEntities(state);

  const center = getAreaPointPosition({
    lon:
      state.points.reduce((total: number, point: any) => total + point.lon, 0) /
      state.points.length,
    lat:
      state.points.reduce((total: number, point: any) => total + point.lat, 0) /
      state.points.length,
    height:
      state.points.reduce(
        (total: number, point: any) => total + (point.height || 0),
        0,
      ) / state.points.length,
  });
  createFinalAreaLabel(state, `面积: ${area.toFixed(2)}m²`, center);

  console.log("贴地面积测量结果:", area.toFixed(2), "平方米");
}

async function sampleGroundCartographics(pts: any[]): Promise<any[]> {
  const cartographics = pts.map(
    (p) =>
      new Cesium.Cartographic(
        p.lon,
        p.lat,
        Number.isFinite(p.height) ? p.height : 0,
      ),
  );
  const terrainProvider = viewer?.terrainProvider;
  if (!terrainProvider) return cartographics;

  try {
    if (terrainProvider.constructor?.name === "EllipsoidTerrainProvider") {
      return cartographics.map((p) => {
        p.height = 0;
        return p;
      });
    }
    if (Cesium.sampleTerrainMostDetailed && terrainProvider.availability) {
      return await Cesium.sampleTerrainMostDetailed(
        terrainProvider,
        cartographics,
      );
    }
    if (Cesium.sampleTerrain) {
      return await Cesium.sampleTerrain(terrainProvider, 15, cartographics);
    }
  } catch (error) {
    console.warn("贴地面积采样地形失败，使用拾取高度计算:", error);
  }

  return cartographics;
}

async function computeArea(pts: any[]): Promise<number> {
  if (pts.length < 3) return 0;
  // 使用地形采样高度构造 Cartesian3，避免面积计算回落到 0 高度椭球面。
  const cartographics = await sampleGroundCartographics(pts);
  const positions = cartographics.map((p) =>
    Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height || 0),
  );
  const ref = positions[0];
  let area = 0;
  for (let i = 1; i < positions.length - 1; i++) {
    const v1 = Cesium.Cartesian3.subtract(
      positions[i],
      ref,
      new Cesium.Cartesian3(),
    );
    const v2 = Cesium.Cartesian3.subtract(
      positions[i + 1],
      ref,
      new Cesium.Cartesian3(),
    );
    const cross = Cesium.Cartesian3.cross(v1, v2, new Cesium.Cartesian3());
    area += Cesium.Cartesian3.magnitude(cross);
  }
  return area / 2;
}

function cleanupAreaState(state: any) {
  if (!state) return;
  removeFinalAreaLabel(state);
  if (state.entities && state.entities.length) {
    state.entities.forEach((id: string) => viewer.entities.removeById(id));
    state.entities = [];
  }
  if (state.primitives && state.primitives.length) {
    state.primitives.forEach((primitive: any) =>
      viewer.scene.primitives.remove(primitive),
    );
    state.primitives = [];
  }
  if (state.handler) {
    state.handler.destroy();
    state.handler = null;
  }
  removeAreaOverlay(state);
}

// ==================== 高度测量（两点高差）====================

let heightState: any = null;

function startHeightMeasure() {
  const state: any = {
    firstPoint: null,
    firstCartographic: null,
    phase: "first", // "first" | "done"
    handler: null,
    entities: [],
  };

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  state.handler = handler;

  // 左键点击
  handler.setInputAction(
    (event: any) => {
      const c = pickTerrain(event.position);
      if (!c) return;

      if (state.phase === "first") {
        // 第一个点
        state.firstPoint = c.clone();
        state.firstCartographic = Cesium.Cartographic.fromCartesian(c);

        const marker = viewer.entities.add({
          position: c,
          point: {
            color: Cesium.Color.RED,
            pixelSize: 10,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        state._markerId = marker.id;
        state.entities.push(marker.id);
        state.phase = "second";
      } else {
        // 第二个点 — 结束
        const cart2 = Cesium.Cartographic.fromCartesian(c);
        const dh = cart2.height - state.firstCartographic.height;

        // 移除预览线/标注
        if (state._lineId) {
          viewer.entities.removeById(state._lineId);
          state._lineId = null;
        }
        if (state._labelId) {
          viewer.entities.removeById(state._labelId);
          state._labelId = null;
        }

        // 最终连线
        const line = viewer.entities.add({
          polyline: {
            positions: [state.firstPoint, c],
            width: 2,
            material: Cesium.Color.YELLOW,
          },
        });
        state._lineId = line.id;
        state.entities.push(line.id);

        // 第二个点标记
        const marker2 = viewer.entities.add({
          position: c,
          point: {
            color: Cesium.Color.RED,
            pixelSize: 10,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        state.entities.push(marker2.id);

        // 中点标注 ΔH
        const mid = Cesium.Cartesian3.midpoint(
          state.firstPoint,
          c,
          new Cesium.Cartesian3(),
        );
        const sign = dh >= 0 ? "+" : "";
        const label = viewer.entities.add({
          position: mid,
          label: {
            text: `ΔH: ${sign}${dh.toFixed(2)}m`,
            font: "16px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            showBackground: true,
            backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        state._labelId = label.id;
        state.entities.push(label.id);

        // 清理
        state.phase = "done";
        if (state.handler) {
          state.handler.destroy();
          state.handler = null;
        }
        if (viewer.scene.canvas) viewer.scene.canvas.style.cursor = "default";
      }
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  // 鼠标移动 — 动态预览
  handler.setInputAction(
    (event: any) => {
      if (state.phase !== "second" || !state.firstPoint) return;
      const c = pickTerrain(event.endPosition);
      if (!c) return;

      // 移除旧预览
      if (state._lineId) {
        viewer.entities.removeById(state._lineId);
        state._lineId = null;
      }
      if (state._labelId) {
        viewer.entities.removeById(state._labelId);
        state._labelId = null;
      }

      // 预览线
      const line = viewer.entities.add({
        polyline: {
          positions: [state.firstPoint, c],
          width: 2,
          material: Cesium.Color.YELLOW.withAlpha(0.6),
        },
      });
      state._lineId = line.id;
      state.entities.push(line.id);

      // 动态 ΔH
      const cart2 = Cesium.Cartographic.fromCartesian(c);
      const dh = cart2.height - state.firstCartographic.height;
      const sign = dh >= 0 ? "+" : "";
      const mid = Cesium.Cartesian3.midpoint(
        state.firstPoint,
        c,
        new Cesium.Cartesian3(),
      );

      const label = viewer.entities.add({
        position: mid,
        label: {
          text: `ΔH: ${sign}${dh.toFixed(2)}m`,
          font: "16px sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      state._labelId = label.id;
      state.entities.push(label.id);
    },
    Cesium.ScreenSpaceEventType.MOUSE_MOVE,
  );

  heightState = state;
}

function cleanupHeight(state: any) {
  if (!state) return;
  if (state.entities && state.entities.length) {
    state.entities.forEach((id: string) => viewer.entities.removeById(id));
    state.entities = [];
  }
  if (state.handler) {
    state.handler.destroy();
    state.handler = null;
  }
  state._lineId = null;
  state._labelId = null;
  state._markerId = null;
}

// ==================== 坐标拾取（图标 + 独立面板）====================

let coordinateState: any = null;

function startCoordinatePick() {
  // 创建或获取 label 容器
  let labelContainer = document.querySelector(
    ".cesium-viewer-coordinate-label",
  ) as HTMLElement;
  if (!labelContainer) {
    labelContainer = document.createElement("div");
    labelContainer.className = "cesium-viewer-coordinate-label";
    labelContainer.style.cssText =
      "position: absolute; top: 0; left: 0; pointer-events: none; z-index: 100;";
    const cesiumWidget = viewer.container.querySelector(".cesium-widget");
    if (cesiumWidget) cesiumWidget.appendChild(labelContainer);
    else viewer.container.appendChild(labelContainer);
  }

  const state: any = {
    items: [],
    handler: null,
    postRenderListener: null,
    labelContainer,
    counter: 0,
    suppressCoordinatePickUntil: 0,
  };

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  state.handler = handler;

  // 左键点击添加定位点
  handler.setInputAction(
    (event: any) => {
      if (Date.now() < state.suppressCoordinatePickUntil) return;
      const c = pickTerrain(event.position);
      if (!c) return;

      const cartographic = Cesium.Cartographic.fromCartesian(c);
      const lng = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const h = cartographic.height;
      state.counter++;

      // 添加 billboard 图标（red.png）
      const entity = viewer.entities.add({
        position: c,
        billboard: {
          image: pinIconUrl,
          scale: 0.5,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // 创建 DOM 信息面板
      const panel = document.createElement("div");
      panel.style.cssText =
        "position: absolute; pointer-events: auto; z-index: 101; transform: translate(-50%, -100%); padding-bottom: 10px;";
      panel.innerHTML = `
        <div style="background: rgba(0,0,0,0.85); color: white; border-radius: 6px; min-width: 180px; box-shadow: 0 2px 12px rgba(0,0,0,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.15); font-size: 13px;">
            <span>定位点 ${state.counter}</span>
            <span class="coordinate-close-btn" style="cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; color: #999;" data-id="${entity.id}">✕</span>
          </div>
          <div style="padding: 8px 10px; font-size: 13px; line-height: 1.6;">
            <div>经度: ${lng.toFixed(6)}°</div>
            <div>纬度: ${lat.toFixed(6)}°</div>
            <div>高度: ${h.toFixed(2)}m</div>
          </div>
        </div>
      `;

      const stopPanelPointerEvent = (e: Event) => {
        state.suppressCoordinatePickUntil = Date.now() + 300;
        const target = e.target as HTMLElement | null;
        if (target?.closest(".coordinate-close-btn")) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof (e as any).stopImmediatePropagation === "function") {
          (e as any).stopImmediatePropagation();
        }
      };
      ["pointerdown", "mousedown", "mouseup", "click"].forEach((eventName) => {
        panel.addEventListener(eventName, stopPanelPointerEvent, true);
      });

      // X 按钮关闭单个面板
      const closeBtn = panel.querySelector(
        ".coordinate-close-btn",
      ) as HTMLElement | null;
      if (closeBtn) {
        closeBtn.onclick = (e: MouseEvent) => {
          state.suppressCoordinatePickUntil = Date.now() + 300;
          e.preventDefault();
          e.stopPropagation();
          removeCoordinateItem(entity.id);
        };
      }

      labelContainer.appendChild(panel);

      const item = {
        entityId: entity.id,
        domElement: panel,
        cartesian: c.clone(),
        index: state.counter,
      };
      state.items.push(item);

      // 启动 postRender 监听（每帧更新面板位置）
      if (!state.postRenderListener) {
        state.postRenderListener = viewer.scene.postRender.addEventListener(
          () => {
            updateCoordinatePanels(state);
          },
        );
      }

      console.log("坐标拾取:", {
        longitude: lng.toFixed(6),
        latitude: lat.toFixed(6),
        height: h.toFixed(2),
      });
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK,
  );

  // 右键停止拾取（保留已有面板）
  handler.setInputAction(
    () => {
      if (viewer.scene.canvas) viewer.scene.canvas.style.cursor = "default";
      if (state.handler) {
        state.handler.destroy();
        state.handler = null;
      }
    },
    Cesium.ScreenSpaceEventType.RIGHT_CLICK,
  );

  coordinateState = state;
}

function removeCoordinateItem(entityId: string) {
  if (!coordinateState) return;
  const idx = coordinateState.items.findIndex(
    (item: any) => item.entityId === entityId,
  );
  if (idx === -1) return;

  const item = coordinateState.items[idx];
  viewer.entities.removeById(entityId);
  if (item.domElement.parentNode)
    item.domElement.parentNode.removeChild(item.domElement);
  coordinateState.items.splice(idx, 1);
}

function updateCoordinatePanels(state: any) {
  state.items.forEach((item: any) => {
    const pos = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      viewer.scene,
      item.cartesian,
    );
    if (pos) {
      item.domElement.style.left = pos.x + "px";
      item.domElement.style.top = pos.y - 10 + "px";
    }
  });
}

// ==================== 清除所有测量 ====================

export function clearMeasure() {
  // 清除距离测量
  if (distanceState) {
    cleanupDistance(distanceState);
    distanceState = null;
  }

  // 清除面积测量
  if (areaState) {
    cleanupAreaState(areaState);
    areaState = null;
  }

  // 清除高度测量
  if (heightState) {
    cleanupHeight(heightState);
    heightState = null;
  }

  // 清除坐标拾取
  if (coordinateState) {
    if (coordinateState.postRenderListener) {
      coordinateState.postRenderListener();
      coordinateState.postRenderListener = null;
    }
    if (coordinateState.handler) {
      coordinateState.handler.destroy();
      coordinateState.handler = null;
    }
    if (coordinateState.items && coordinateState.items.length) {
      coordinateState.items.forEach((item: any) => {
        if (item.domElement.parentNode)
          item.domElement.parentNode.removeChild(item.domElement);
        viewer.entities.removeById(item.entityId);
      });
      coordinateState.items = [];
    }
    if (coordinateState.labelContainer)
      coordinateState.labelContainer.innerHTML = "";
    coordinateState = null;
  }

  // 恢复鼠标指针
  if (viewer && viewer.scene.canvas) {
    viewer.scene.canvas.style.cursor = "default";
  }
}
