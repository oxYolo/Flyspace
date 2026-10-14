import { $getNoFlyZoneList, $getFlightAreaList } from "@/api/flyControl/airspaceApi.ts";

declare const Cesium: any;

type Ring = number[][];
type PolygonRings = Ring[];

type BoundaryBBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type AdminBoundaryOptions = {
  url: string;
  lineColor?: string;
  lineWidth?: number;
  fillColor?: string;
  fillOpacity?: number;
  flyToDuration?: number;
  cameraHeight?: number;
  pitch?: number;
};

type ParsedBoundary = {
  polygons: PolygonRings[];
  bbox?: BoundaryBBox;
};

type BoundaryRuntime = {
  fillPrimitive?: any;
  linePrimitive?: any;
  bbox?: BoundaryBBox;
};

const parsedCacheByUrl = new Map<string, ParsedBoundary>();
const runtimeByLayerId = new Map<string, BoundaryRuntime>();

const ensureColor = (color: string | undefined, alpha = 1) => {
  const c = Cesium.Color.fromCssColorString(color || "#00AAFF");
  return c.withAlpha(alpha);
};

const updateBbox = (bbox: BoundaryBBox | null, ring: Ring) => {
  let target = bbox;
  for (const p of ring) {
    const lon = Number(p?.[0]);
    const lat = Number(p?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (!target) {
      target = { west: lon, south: lat, east: lon, north: lat };
      continue;
    }
    if (lon < target.west) target.west = lon;
    if (lon > target.east) target.east = lon;
    if (lat < target.south) target.south = lat;
    if (lat > target.north) target.north = lat;
  }
  return target;
};

const isValidRing = (ring: any): ring is Ring => {
  return Array.isArray(ring) && ring.length >= 3;
};

const closeRingIfNeeded = (ring: Ring) => {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return ring;
  if (
    Number(first[0]) === Number(last[0]) &&
    Number(first[1]) === Number(last[1])
  ) {
    return ring;
  }
  return [...ring, [Number(first[0]), Number(first[1])]];
};

const ringToDegreesArray = (ring: Ring) => {
  const arr: number[] = [];
  for (const p of ring) {
    const lon = Number(p?.[0]);
    const lat = Number(p?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    arr.push(lon, lat);
  }
  return arr;
};

const toPolygonRingsList = (geojson: any): PolygonRings[] => {
  const polygons: PolygonRings[] = [];
  const pushFromGeometry = (geometry: any) => {
    if (!geometry) return;
    if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
      polygons.push(geometry.coordinates);
      return;
    }
    if (
      geometry.type === "MultiPolygon" &&
      Array.isArray(geometry.coordinates)
    ) {
      for (const p of geometry.coordinates) {
        if (Array.isArray(p)) polygons.push(p);
      }
    }
  };

  if (geojson?.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    for (const f of geojson.features) {
      pushFromGeometry(f?.geometry);
    }
    return polygons;
  }

  if (geojson?.type === "Feature") {
    pushFromGeometry(geojson.geometry);
    return polygons;
  }

  pushFromGeometry(geojson);
  return polygons;
};

const parseBoundaryByUrl = async (url: string): Promise<ParsedBoundary> => {
  const cached = parsedCacheByUrl.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`加载行政边界失败: ${response.status}`);
  }

  const geojson = await response.json();
  const polygons = toPolygonRingsList(geojson);
  if (!polygons.length) {
    throw new Error("行政边界数据为空");
  }

  let bbox: BoundaryBBox | null = null;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) continue;
    for (const ring of polygon) {
      if (!isValidRing(ring)) continue;
      bbox = updateBbox(bbox, ring);
    }
  }

  const parsed: ParsedBoundary = {
    polygons,
    bbox: bbox || undefined,
  };
  parsedCacheByUrl.set(url, parsed);
  return parsed;
};

const createBoundaryPrimitives = (
  polygons: PolygonRings[],
  lineColor: any,
  lineWidth: number,
  fillColor: any,
) => {
  const fillInstances: any[] = [];
  const lineInstances: any[] = [];

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) continue;

    const outerRingRaw = polygon[0];
    if (!isValidRing(outerRingRaw)) continue;

    const outerRing = closeRingIfNeeded(outerRingRaw);
    const outerDeg = ringToDegreesArray(outerRing);
    if (outerDeg.length < 6) continue;
    const outerPositions = Cesium.Cartesian3.fromDegreesArray(outerDeg);

    const holes: any[] = [];

    lineInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.GroundPolylineGeometry({
          positions: outerPositions,
          width: lineWidth,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(lineColor),
        },
      }),
    );

    for (let i = 1; i < polygon.length; i += 1) {
      const holeRingRaw = polygon[i];
      if (!isValidRing(holeRingRaw)) continue;
      const holeRing = closeRingIfNeeded(holeRingRaw);
      const holeDeg = ringToDegreesArray(holeRing);
      if (holeDeg.length < 6) continue;
      const holePositions = Cesium.Cartesian3.fromDegreesArray(holeDeg);

      holes.push(new Cesium.PolygonHierarchy(holePositions));

      lineInstances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.GroundPolylineGeometry({
            positions: holePositions,
            width: lineWidth,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(lineColor),
          },
        }),
      );
    }

    fillInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(outerPositions, holes),
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(fillColor),
        },
      }),
    );
  }

  let fillPrimitive: any;
  let linePrimitive: any;

  if (fillInstances.length) {
    fillPrimitive = new Cesium.GroundPrimitive({
      geometryInstances: fillInstances,
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: true,
      }),
      asynchronous: true,
      classificationType: Cesium.ClassificationType.BOTH,
    });
  }

  if (lineInstances.length) {
    linePrimitive = new Cesium.GroundPolylinePrimitive({
      geometryInstances: lineInstances,
      appearance: new Cesium.PolylineColorAppearance(),
      asynchronous: true,
      classificationType: Cesium.ClassificationType.BOTH,
    });
  }

  return { fillPrimitive, linePrimitive };
};

export const hideAccurateAdminBoundary = (viewer: any, layerId: string) => {
  if (!viewer || !layerId) return;
  const runtime = runtimeByLayerId.get(layerId);
  if (!runtime) return;

  if (runtime.fillPrimitive) {
    runtime.fillPrimitive.show = false;
  }
  if (runtime.linePrimitive) {
    runtime.linePrimitive.show = false;
  }
  if (viewer.scene?.requestRender) {
    viewer.scene.requestRender();
  }
};

export const showAccurateAdminBoundary = async (
  viewer: any,
  layerId: string,
  options: AdminBoundaryOptions,
) => {
  if (!viewer || !layerId || !options?.url || !Cesium) return;

  const runtime = runtimeByLayerId.get(layerId);
  if (runtime?.fillPrimitive || runtime?.linePrimitive) {
    if (runtime.fillPrimitive) {
      runtime.fillPrimitive.show = true;
    }
    if (runtime.linePrimitive) {
      runtime.linePrimitive.show = true;
    }
    if (viewer.scene?.requestRender) {
      viewer.scene.requestRender();
    }
    return;
  }

  const parsed = await parseBoundaryByUrl(options.url);
  const lineColor = ensureColor(options.lineColor || "#FFD500", 1);
  const fillColor = ensureColor(
    options.fillColor || "#00AAFF",
    options.fillOpacity ?? 0.08,
  );
  const lineWidth = Number(options.lineWidth) || 4;

  const { fillPrimitive, linePrimitive } = createBoundaryPrimitives(
    parsed.polygons,
    lineColor,
    lineWidth,
    fillColor,
  );

  if (!fillPrimitive && !linePrimitive) {
    throw new Error("行政边界有效几何为空");
  }

  if (fillPrimitive) {
    viewer.scene.primitives.add(fillPrimitive);
  }
  if (linePrimitive) {
    viewer.scene.primitives.add(linePrimitive);
  }

  runtimeByLayerId.set(layerId, {
    fillPrimitive,
    linePrimitive,
    bbox: parsed.bbox,
  });

  if (viewer.scene?.requestRender) {
    viewer.scene.requestRender();
  }
};

export const flyToAccurateAdminBoundary = (
  viewer: any,
  layerId: string,
  options?: Pick<AdminBoundaryOptions, "flyToDuration" | "pitch" | "cameraHeight">,
) => {
  if (!viewer || !Cesium || !layerId) return;
  const runtime = runtimeByLayerId.get(layerId);
  const bbox = runtime?.bbox;
  if (!bbox) return;

  const rectangle = Cesium.Rectangle.fromDegrees(
    bbox.west,
    bbox.south,
    bbox.east,
    bbox.north,
  );
  const duration = options?.flyToDuration ?? 1.5;
  const pitch = options?.pitch ?? -Math.PI / 6;
  const range = options?.cameraHeight ?? 70000;

  const sphere = Cesium.BoundingSphere.fromRectangle3D(
    rectangle,
    Cesium.Ellipsoid.WGS84,
    0,
  );

  viewer.camera.flyToBoundingSphere(sphere, {
    duration,
    offset: new Cesium.HeadingPitchRange(0, pitch, range),
  });
}

export const clearAdminBoundaryCache = () => {
  runtimeByLayerId.clear();
};

type NoFlyZoneRecord = {
  id?: number | string;
  zoneName?: string;
  zoneStatus?: number;
  bbox?: string;
  [k: string]: any;
};

export type NoFlyZoneLayerOptions = {
  fillColor?: string;
  fillOpacity?: number;
  outlineColor?: string;
  outlineWidth?: number;
  labelColor?: string;
  labelOutlineColor?: string;
  labelOutlineWidth?: number;
};

type NoFlyZoneRuntime = {
  fillPrimitive?: any;
  linePrimitive?: any;
  labelEntities: any[];
};

const noFlyZoneRuntimeByLayerId = new Map<string, NoFlyZoneRuntime>();
let noFlyZoneRecordsCache: NoFlyZoneRecord[] | null = null;

const tryParseCssColor = (css: string | undefined, fallback: string) => {
  try {
    return Cesium.Color.fromCssColorString(String(css || fallback));
  } catch {
    return Cesium.Color.fromCssColorString(fallback);
  }
};

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const parseWktPolygonOrMultiPolygon = (wkt: string): PolygonRings[] => {
  const text = String(wkt || "").trim();
  if (!text) return [];

  const upper = text.toUpperCase();
  const parseRing = (ringText: string): Ring => {
    const cleaned = ringText.trim().replace(/^\(+/, "").replace(/\)+$/, "");
    if (!cleaned) return [];
    return cleaned
      .split(",")
      .map((pair) => {
        const parts = pair.trim().split(/\s+/).filter(Boolean);
        const lon = Number(parts[0]);
        const lat = Number(parts[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
        return [lon, lat] as number[];
      })
      .filter((p): p is number[] => Array.isArray(p) && p.length === 2);
  };

  const parsePolygonRings = (polygonText: string): PolygonRings => {
    const polyBody = polygonText
      .trim()
      .replace(/^\s*\(\s*\(/, "")
      .replace(/\)\s*\)\s*$/, "");
    if (!polyBody) return [];

    if (!polyBody.includes("(")) {
      const ring = parseRing(polyBody);
      return ring.length >= 3 ? [ring] : [];
    }

    const ringParts = polyBody.split(/\)\s*,\s*\(/);
    const rings: Ring[] = [];
    for (let i = 0; i < ringParts.length; i += 1) {
      let r = ringParts[i] || "";
      if (i === 0) r = r.replace(/^\s*\(/, "");
      if (i === ringParts.length - 1) r = r.replace(/\)\s*$/, "");
      const ring = parseRing(r);
      if (ring.length >= 3) rings.push(ring);
    }
    return rings;
  };

  if (upper.startsWith("POLYGON")) {
    const body = text.replace(/^POLYGON\s*/i, "").trim();
    const rings = parsePolygonRings(body);
    return rings.length ? [rings] : [];
  }

  if (upper.startsWith("MULTIPOLYGON")) {
    const body = text.replace(/^MULTIPOLYGON\s*/i, "").trim();
    const inner = body.replace(/^\s*\(/, "").replace(/\)\s*$/, "");
    const polygonParts = inner.split(/\)\s*\)\s*,\s*\(\s*\(/);
    const polygons: PolygonRings[] = [];
    for (let i = 0; i < polygonParts.length; i += 1) {
      let p = polygonParts[i] || "";
      if (i === 0) p = p.replace(/^\s*\(/, "");
      if (i === polygonParts.length - 1) p = p.replace(/\)\s*$/, "");
      const rings = parsePolygonRings(`((${p}))`);
      if (rings.length) polygons.push(rings);
    }
    return polygons;
  }

  return [];
};

const createGroundPolygonPrimitives = (
  polygons: PolygonRings[],
  lineColor: any,
  lineWidth: number,
  fillColor: any,
) => {
  const fillInstances: any[] = [];
  const lineInstances: any[] = [];

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) continue;
    const outerRaw = polygon[0];
    if (!isValidRing(outerRaw)) continue;

    const outerRing = closeRingIfNeeded(outerRaw);
    const outerDeg = ringToDegreesArray(outerRing);
    if (outerDeg.length < 6) continue;
    const outerPositions = Cesium.Cartesian3.fromDegreesArray(outerDeg);

    const holes: any[] = [];

    lineInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.GroundPolylineGeometry({
          positions: outerPositions,
          width: lineWidth,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(lineColor),
        },
      }),
    );

    for (let i = 1; i < polygon.length; i += 1) {
      const holeRaw = polygon[i];
      if (!isValidRing(holeRaw)) continue;
      const holeRing = closeRingIfNeeded(holeRaw);
      const holeDeg = ringToDegreesArray(holeRing);
      if (holeDeg.length < 6) continue;
      const holePositions = Cesium.Cartesian3.fromDegreesArray(holeDeg);
      holes.push(new Cesium.PolygonHierarchy(holePositions));

      lineInstances.push(
        new Cesium.GeometryInstance({
          geometry: new Cesium.GroundPolylineGeometry({
            positions: holePositions,
            width: lineWidth,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(lineColor),
          },
        }),
      );
    }

    fillInstances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(outerPositions, holes),
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(fillColor),
        },
      }),
    );
  }

  let fillPrimitive: any;
  let linePrimitive: any;

  if (fillInstances.length) {
    fillPrimitive = new Cesium.GroundPrimitive({
      geometryInstances: fillInstances,
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: true,
      }),
      asynchronous: true,
      classificationType: Cesium.ClassificationType.BOTH,
    });
  }

  if (lineInstances.length) {
    linePrimitive = new Cesium.GroundPolylinePrimitive({
      geometryInstances: lineInstances,
      appearance: new Cesium.PolylineColorAppearance(),
      asynchronous: true,
      classificationType: Cesium.ClassificationType.BOTH,
    });
  }

  return { fillPrimitive, linePrimitive };
};

const centroidOfRing = (ring: Ring) => {
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  for (const p of ring) {
    const lon = Number(p?.[0]);
    const lat = Number(p?.[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    lonSum += lon;
    latSum += lat;
    count += 1;
  }
  if (!count) return null;
  return { lon: lonSum / count, lat: latSum / count };
};

async function ensureNoFlyZoneRecordsLoaded(): Promise<NoFlyZoneRecord[]> {
  if (noFlyZoneRecordsCache) return noFlyZoneRecordsCache;
  try {
    const res: any = await $getNoFlyZoneList({
      pageNum: 1,
      pageSize: 1000
    });
    const records = res?.data?.records || [];
    noFlyZoneRecordsCache = Array.isArray(records) ? records : [];
    return noFlyZoneRecordsCache;
  } catch {
    noFlyZoneRecordsCache = [];
    return noFlyZoneRecordsCache;
  }
}

export const showNoFlyZonesLayer = async (
  viewer: any,
  layerId: string,
  options?: NoFlyZoneLayerOptions,
) => {
  if (!viewer || !Cesium || !layerId) return;

  const runtime = noFlyZoneRuntimeByLayerId.get(layerId);
  if (runtime?.fillPrimitive || runtime?.linePrimitive || runtime?.labelEntities) {
    if (runtime.fillPrimitive) runtime.fillPrimitive.show = true;
    if (runtime.linePrimitive) runtime.linePrimitive.show = true;
    if (runtime.labelEntities?.length) {
      runtime.labelEntities.forEach((e: any) => {
        if (e) e.show = true;
      });
    }
    if (viewer.scene?.requestRender) viewer.scene.requestRender();
    return;
  }

  const records = await ensureNoFlyZoneRecordsLoaded();

  const fillColor = tryParseCssColor(options?.fillColor, "#FF7A00").withAlpha(
    Number(options?.fillOpacity) || 0.25,
  );
  const lineColor = tryParseCssColor(options?.outlineColor, "#FF3B30").withAlpha(
    1,
  );
  const lineWidth = Number(options?.outlineWidth) || 4;

  const polygons: PolygonRings[] = [];
  const labelEntities: any[] = [];

  for (let i = 0; i < records.length; i += 1) {
    const r = records[i];
    if (r?.zoneStatus !== undefined && Number(r.zoneStatus) !== 1) continue;
    const wkt = String(r?.bbox || "").trim();
    if (!wkt) continue;
    const parsed = parseWktPolygonOrMultiPolygon(wkt);
    if (!parsed.length) continue;

    parsed.forEach((p) => polygons.push(p));

    const firstPoly = parsed[0];
    const outer = firstPoly?.[0];
    if (isValidRing(outer)) {
      const center = centroidOfRing(outer);
      if (center) {
        const labelText = String(r?.zoneName || `禁飞区${i + 1}`);
        const labelEntity = viewer.entities.add({
          id: `${layerId}_label_${r?.id ?? i}`,
          position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0),
          label: {
            text: labelText,
            font: "14px sans-serif",
            fillColor: tryParseCssColor(options?.labelColor, "#FFFFFF").withAlpha(1),
            outlineColor: tryParseCssColor(options?.labelOutlineColor, "#000000").withAlpha(
              1,
            ),
            outlineWidth: Number(options?.labelOutlineWidth) || 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        labelEntities.push(labelEntity);
      }
    }
  }

  const { fillPrimitive, linePrimitive } = createGroundPolygonPrimitives(
    polygons,
    lineColor,
    lineWidth,
    fillColor,
  );

  if (fillPrimitive) viewer.scene.primitives.add(fillPrimitive);
  if (linePrimitive) viewer.scene.primitives.add(linePrimitive);

  noFlyZoneRuntimeByLayerId.set(layerId, {
    fillPrimitive,
    linePrimitive,
    labelEntities,
  });
  if (viewer.scene?.requestRender) viewer.scene.requestRender();
};

export const hideNoFlyZonesLayer = (viewer: any, layerId: string) => {
  if (!viewer || !Cesium || !layerId) return;
  const runtime = noFlyZoneRuntimeByLayerId.get(layerId);
  if (!runtime) return;
  if (runtime.fillPrimitive) runtime.fillPrimitive.show = false;
  if (runtime.linePrimitive) runtime.linePrimitive.show = false;
  if (runtime.labelEntities?.length) {
    runtime.labelEntities.forEach((e: any) => {
      if (e) e.show = false;
    });
  }
  if (viewer.scene?.requestRender) viewer.scene.requestRender();
};

type LowAltitudeSuitableZoneRuntime = {
  collection?: any;
};

let lowAltitudeSuitableZoneGeoJsonCache: any | null = null;
const lowAltitudeSuitableZoneRuntimeByLayerId = new Map<
  string,
  LowAltitudeSuitableZoneRuntime
>();
const lowAltitudeSuitableZoneDesiredVisible = new Map<string, boolean>();
let lowAltitudeSuitableZoneBuildSeq = 0;
let lowAltitudeSuitableZoneClearTimer: any = null;

export type LowAltitudeSuitableZoneOptions = {
  params?: any;
  alpha?: number;
  yieldEveryFeatures?: number;
  batchInstanceSize?: number;
};

const ensureLowAltitudeSuitableZoneGeoJson = async (
  options: LowAltitudeSuitableZoneOptions,
) => {
  if (lowAltitudeSuitableZoneGeoJsonCache) return lowAltitudeSuitableZoneGeoJsonCache;
  const res: any = await $getFlightAreaList(options?.params);
  const geojson = res?.data?.geojson || null;
  if (geojson?.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    lowAltitudeSuitableZoneGeoJsonCache = geojson;
    return geojson;
  }
  throw new Error("适飞区数据为空");
};

export const buildLowAltitudeSuitableZoneLayer = async (
  viewer: any,
  layerId: string,
  buildSeq: number,
  options: LowAltitudeSuitableZoneOptions,
) => {
  if (!viewer || !viewer.scene || !viewer.scene.primitives || !Cesium?.GroundPrimitive) {
    return;
  }

  if (lowAltitudeSuitableZoneDesiredVisible.get(layerId) !== true) {
    return;
  }
  if (buildSeq !== lowAltitudeSuitableZoneBuildSeq) {
    return;
  }

  const runtime = lowAltitudeSuitableZoneRuntimeByLayerId.get(layerId);
  if (runtime?.collection) {
    if (
      lowAltitudeSuitableZoneDesiredVisible.get(layerId) === true &&
      buildSeq === lowAltitudeSuitableZoneBuildSeq
    ) {
      runtime.collection.show = true;
      if (viewer.scene?.requestRender) viewer.scene.requestRender();
    }
    return;
  }

  const geoJsonData = (await ensureLowAltitudeSuitableZoneGeoJson(options)) as any;
  if (!geoJsonData || !Array.isArray(geoJsonData.features)) {
    return;
  }

  const collection = new Cesium.PrimitiveCollection();
  collection.id = layerId;
  collection.show = false;
  viewer.scene.primitives.add(collection);
  lowAltitudeSuitableZoneRuntimeByLayerId.set(layerId, { collection });

  const instances: any[] = [];
  const BATCH_INSTANCE_SIZE = Number(options.batchInstanceSize) || 600;
  const YIELD_EVERY_FEATURES = Number(options.yieldEveryFeatures) || 600;
  const alpha = Number(options.alpha) || 0.4;

  for (let idx = 0; idx < geoJsonData.features.length; idx += 1) {
    const feature = geoJsonData.features[idx];
    if (lowAltitudeSuitableZoneDesiredVisible.get(layerId) !== true) {
      collection.show = false;
      if (viewer.scene?.requestRender) viewer.scene.requestRender();
      return;
    }
    if (buildSeq !== lowAltitudeSuitableZoneBuildSeq) {
      collection.show = false;
      if (viewer.scene?.requestRender) viewer.scene.requestRender();
      return;
    }
    if (idx > 0 && idx % YIELD_EVERY_FEATURES === 0) {
      await yieldToMain();
    }

    const geometry = feature?.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      continue;
    }

    const coordinates = geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      continue;
    }

    const rings: Array<Array<[number, number]>> = [];
    if (geometry.type === "MultiPolygon") {
      for (const polygon of coordinates) {
        if (Array.isArray(polygon) && polygon.length > 0) {
          const ring = polygon[0];
          if (Array.isArray(ring) && ring.length >= 3) {
            const convertedRing = ring.map((p: any) => [Number(p[0]), Number(p[1])]) as Array<
              [number, number]
            >;
            rings.push(convertedRing);
          }
        }
      }
    } else {
      const ring = coordinates[0];
      if (Array.isArray(ring) && ring.length >= 3) {
        const convertedRing = ring.map((p: any) => [Number(p[0]), Number(p[1])]) as Array<
          [number, number]
        >;
        rings.push(convertedRing);
      }
    }

    if (rings.length > 0) {
      const css = feature?.properties?.color_code || "#32CD32";
      const color = tryParseCssColor(css, "#32CD32").withAlpha(alpha);

      for (const ring of rings) {
        if (!Array.isArray(ring) || ring.length < 3) continue;

        const degrees: number[] = new Array(ring.length * 2);
        for (let i = 0; i < ring.length; i += 1) {
          const p = ring[i];
          degrees[i * 2] = Number(p[0]);
          degrees[i * 2 + 1] = Number(p[1]);
        }

        const polygonHierarchy = new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(degrees),
        );
        const poly = new Cesium.PolygonGeometry({
          polygonHierarchy,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        });

        instances.push(
          new Cesium.GeometryInstance({
            geometry: poly,
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
            },
          }),
        );
      }
    }

    if (instances.length >= BATCH_INSTANCE_SIZE) {
      const primitive = new Cesium.GroundPrimitive({
        geometryInstances: instances.splice(0, instances.length),
        appearance: new Cesium.PerInstanceColorAppearance({
          translucent: true,
          closed: true,
        }),
        asynchronous: true,
      });
      collection.add(primitive);

      if (
        lowAltitudeSuitableZoneDesiredVisible.get(layerId) !== true ||
        buildSeq !== lowAltitudeSuitableZoneBuildSeq
      ) {
        collection.show = false;
        if (viewer.scene?.requestRender) viewer.scene.requestRender();
        return;
      }
    }
  }

  if (instances.length) {
    const primitive = new Cesium.GroundPrimitive({
      geometryInstances: instances,
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: true,
      }),
      asynchronous: true,
    });
    collection.add(primitive);
  }

  if (
    lowAltitudeSuitableZoneDesiredVisible.get(layerId) === true &&
    buildSeq === lowAltitudeSuitableZoneBuildSeq
  ) {
    collection.show = true;
  } else {
    collection.show = false;
  }
  if (viewer.scene?.requestRender) viewer.scene.requestRender();
};

export const showLowAltitudeSuitableZoneLayer = async (
  viewer: any,
  layerId: string,
  options: LowAltitudeSuitableZoneOptions,
) => {
  if (!viewer || !layerId) return;
  lowAltitudeSuitableZoneDesiredVisible.set(layerId, true);
  lowAltitudeSuitableZoneBuildSeq += 1;
  const seq = lowAltitudeSuitableZoneBuildSeq;
  await buildLowAltitudeSuitableZoneLayer(viewer, layerId, seq, options);
};

export const hideLowAltitudeSuitableZoneLayer = (
  viewer: any,
  layerId: string,
  routePath?: string,
) => {
  if (!viewer || !layerId) return;
  lowAltitudeSuitableZoneDesiredVisible.set(layerId, false);
  lowAltitudeSuitableZoneBuildSeq += 1;
  const runtime = lowAltitudeSuitableZoneRuntimeByLayerId.get(layerId);
  if (runtime?.collection) {
    runtime.collection.show = false;
  }
  if (viewer.scene?.requestRender) viewer.scene.requestRender();

  if (lowAltitudeSuitableZoneClearTimer) {
    clearTimeout(lowAltitudeSuitableZoneClearTimer);
    lowAltitudeSuitableZoneClearTimer = null;
  }
  lowAltitudeSuitableZoneClearTimer = setTimeout(() => {
    if (routePath !== "/defaultMapPage/airspaceFlow") return;
    if (lowAltitudeSuitableZoneDesiredVisible.get(layerId) === true) return;
    const rt = lowAltitudeSuitableZoneRuntimeByLayerId.get(layerId);
    if (rt?.collection && viewer?.scene?.primitives) {
      try {
        viewer.scene.primitives.remove(rt.collection);
      } catch { }
    }
    lowAltitudeSuitableZoneRuntimeByLayerId.delete(layerId);
    if (viewer.scene?.requestRender) viewer.scene.requestRender();
  }, 2000);
};

export const clearNoFlyZoneCache = () => {
  noFlyZoneRuntimeByLayerId.clear();
  noFlyZoneRecordsCache = null;
};

export const clearLowAltitudeSuitableZoneCache = () => {
  lowAltitudeSuitableZoneDesiredVisible.clear();
  lowAltitudeSuitableZoneRuntimeByLayerId.clear();
  lowAltitudeSuitableZoneBuildSeq += 1;
  if (lowAltitudeSuitableZoneClearTimer) {
    clearTimeout(lowAltitudeSuitableZoneClearTimer);
    lowAltitudeSuitableZoneClearTimer = null;
  }
  lowAltitudeSuitableZoneGeoJsonCache = null;
};
