import { ref } from 'vue';
import { getToken } from '@/utils/auth';
// @ts-ignore Existing JavaScript map service.
import { getViewer } from './mapService';
import onlineIcon from '@/assets/images/map/airport_online.png';
import offlineIcon from '@/assets/images/map/airport_offline.png';

export interface FocusAirport {
  deviceSn: string;
  name: string;
  longitude: number;
  latitude: number;
  onlineStatus: 0 | 1 | null;
}
export const airportFocusState = ref<{ airports: FocusAirport[]; unlocated: Array<{ name: string }> }>({ airports: [], unlocated: [] });
const layerName = 'chatbot-airport-focus';
let generation = 0;
let renderGeneration = 0;
let controller: AbortController | null = null;

export function airportReferences(payload: any) {
  const references: Array<{ deviceName?: string; deviceSn?: string }> = [];
  const add = (data: any) => {
    if (!data || typeof data !== 'object') return;
    const deviceName = typeof data.deviceName === 'string' ? data.deviceName : undefined;
    const deviceSn = typeof data.deviceSn === 'string' ? data.deviceSn : undefined;
    if (deviceName || deviceSn) references.push({ deviceName, deviceSn });
  };
  const clarification = payload?.clarification;
  add(clarification?.lowAltitude?.args);
  if (clarification?.missing_fields?.some((f: string) => f === 'deviceName' || f === 'deviceSn')) {
    for (const row of clarification?.lowAltitude?.candidates || []) add({ deviceName: row.name, deviceSn: row.id });
  }
  for (const item of Array.isArray(payload?.content) ? payload.content : []) {
    for (const result of item?.metadata?.facts?.skillResults || []) {
      add(result.data);
      add(result.data?.args);
      add(result.data?.device);
    }
  }
  return [...new Map(references.map(r => [JSON.stringify(r), r])).values()].slice(0, 50);
}

export function renderAirportFocus(viewer: any, cesium: any, airports: FocusAirport[]) {
  const renderVersion = ++renderGeneration;
  airports = airports.filter(a => Number.isFinite(a.longitude) && Number.isFinite(a.latitude)
    && Math.abs(a.longitude) <= 180 && Math.abs(a.latitude) <= 90 && (a.longitude !== 0 || a.latitude !== 0));
  const existing = viewer.dataSources.getByName(layerName)[0];
  if (existing) viewer.dataSources.remove(existing, true);
  if (!airports.length) return;
  const source = new cesium.CustomDataSource(layerName);
  const groups = new Map<string, FocusAirport[]>();
  for (const airport of airports) {
    const key = `${airport.longitude},${airport.latitude}`;
    groups.set(key, [...(groups.get(key) || []), airport]);
  }
  for (const airport of airports) {
    const group = groups.get(`${airport.longitude},${airport.latitude}`)!;
    const x = (group.indexOf(airport) - (group.length - 1) / 2) * 64;
    const status = airport.onlineStatus === 1 ? '在线' : airport.onlineStatus === 0 ? '离线' : '状态未知';
    source.entities.add({
      id: `chat-airport:${airport.deviceSn}`, name: airport.name,
      position: cesium.Cartesian3.fromDegrees(airport.longitude, airport.latitude),
      billboard: {
        image: airport.onlineStatus === 1 ? onlineIcon : offlineIcon,
        width: 44, height: 44, pixelOffset: new cesium.Cartesian2(x, 0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: `${airport.name} · ${status}\n${airport.deviceSn.slice(-4)}`,
        font: '15px sans-serif', fillColor: cesium.Color.WHITE,
        showBackground: true, backgroundColor: cesium.Color.BLACK.withAlpha(0.75),
        pixelOffset: new cesium.Cartesian2(x, 45 + group.indexOf(airport) * 38),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
  void Promise.resolve(viewer.dataSources.add(source)).then(() => {
    if (renderVersion !== renderGeneration || viewer.isDestroyed?.() || viewer.dataSources.getByName(layerName)[0] !== source) return;
    viewer.camera.cancelFlight();
    if (airports.length === 1) {
      const airport = airports[0]!;
      const terrainHeight = viewer.scene?.globe?.getHeight?.(cesium.Cartographic.fromDegrees(airport.longitude, airport.latitude));
      const center = cesium.Cartesian3.fromDegrees(airport.longitude, airport.latitude, Number.isFinite(terrainHeight) ? terrainHeight : 0);
      viewer.camera.flyToBoundingSphere(new cesium.BoundingSphere(center, 0), {
        duration: 1.2, offset: new cesium.HeadingPitchRange(0, -Math.PI / 3, 5000),
      });
    } else {
      const points = airports.map(a => cesium.Cartesian3.fromDegrees(a.longitude, a.latitude));
      const radius = cesium.BoundingSphere.fromPoints(points).radius;
      void viewer.flyTo(source, { duration: 1.2, offset: new cesium.HeadingPitchRange(0, -Math.PI / 3, Math.max(5000, radius * 4)) });
    }
  });
}

export function restoreAirportFocus() {
  const viewer = getViewer();
  const cesium = (globalThis as any).Cesium;
  if (viewer && !viewer.isDestroyed?.() && cesium) renderAirportFocus(viewer, cesium, airportFocusState.value.airports);
}

export function cancelAirportResolution() {
  generation += 1;
  controller?.abort();
}

export function clearAirportFocus() {
  cancelAirportResolution();
  airportFocusState.value = { airports: [], unlocated: [] };
  restoreAirportFocus();
}

export async function focusConversationAirports(text: string, payload: any, navigateToMap: () => Promise<unknown>) {
  const version = ++generation;
  controller?.abort();
  controller = new AbortController();
  let data = (Array.isArray(payload?.content) ? payload.content : [])
    .find((item: any) => Array.isArray(item?.metadata?.airportFocus?.airports))?.metadata.airportFocus;
  if (!data) {
    const response = await fetch('/ai/v1/agent/airports/resolve', {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() || ''}` },
      body: JSON.stringify({ text: text.slice(0, 16000), references: airportReferences(payload) }),
    });
    if (!response.ok) throw new Error('机场地图定位暂不可用，请检查后端是否已更新。');
    data = await response.json();
  }
  if (version !== generation) return;
  airportFocusState.value = { airports: data.airports || [], unlocated: data.unlocated || [] };
  if (!airportFocusState.value.airports.length) { restoreAirportFocus(); return; }
  const viewer = getViewer();
  if (!viewer || viewer.isDestroyed?.()) await navigateToMap();
  if (version === generation) restoreAirportFocus();
}
