<script lang="ts" setup>
import { watch, ref } from "vue";
import { ScaleToOriginal } from "@element-plus/icons-vue";
import { getImageUrl } from "@/utils/utils.ts";
import GeoBorderBox from "@/components/common/GeoBorderBox.vue";
import CommonMap from "@/components/common/3d/commonMap.vue";

// Cesium 全局
declare const Cesium: any;

const props = defineProps({
  flyPositionArr: {
    type: Array as () => any[],
    default: () => [],
  },
  realTimePosition: {
    type: Array as () => any[],
    default: () => [],
  },
  isBig: {
    type: Boolean,
    default: false,
  },
});
const droneImageUrl = getImageUrl(`assets/images/drone/飞行器.png`);

const emit = defineEmits(["changeBig"]);

// Cesium viewer & data sources
const viewerRef = ref<any | null>(null);
let routeDs: any | null = null; // "routeLayer-source"
let realRouteDs: any | null = null; // "realRouteLayer-source"
let markerDs: any | null = null; // "animatePointLayer-source"
let routeEntity: any | null = null;
let realRouteEntity: any | null = null;
let markerEntity: any | null = null;

function onMapLoad(v: any) {
  viewerRef.value = v;
  ensureDataSources();
  if (Array.isArray(props.flyPositionArr) && props.flyPositionArr.length) {
    updateRoute();
    flyToRoute(1.0);
  }
  if (Array.isArray(props.realTimePosition) && props.realTimePosition.length) {
    updateRealtimeTrack();
    updateDroneMarker();
    flyToLastPoint(0.8);
  }
}

function ensureDataSources() {
  const v = viewerRef.value;
  if (!v) return;
  routeDs =
    v.dataSources.getByName("routeLayer-source")[0] ||
    new Cesium.CustomDataSource("routeLayer-source");
  if (!v.dataSources.getByName("routeLayer-source")[0])
    v.dataSources.add(routeDs);
  realRouteDs =
    v.dataSources.getByName("realRouteLayer-source")[0] ||
    new Cesium.CustomDataSource("realRouteLayer-source");
  if (!v.dataSources.getByName("realRouteLayer-source")[0])
    v.dataSources.add(realRouteDs);
  markerDs =
    v.dataSources.getByName("animatePointLayer-source")[0] ||
    new Cesium.CustomDataSource("animatePointLayer-source");
  if (!v.dataSources.getByName("animatePointLayer-source")[0])
    v.dataSources.add(markerDs);
}

function updateRoute() {
  const v = viewerRef.value;
  if (!v || !routeDs) return;
  const coords = (props.flyPositionArr || [])
    .map((p: any) => [Number(p[0]), Number(p[1])])
    .filter((a) => Number.isFinite(a[0]) && Number.isFinite(a[1]));
  if (!coords.length) return;
  const flat = coords.flat();
  if (!routeEntity) {
    routeEntity = routeDs.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(flat),
        width: 4,
        clampToGround: true,
        material: Cesium.Color.fromCssColorString("#0FCCC4").withAlpha(0.7),
      },
    });
  } else {
    routeEntity.polyline.positions = Cesium.Cartesian3.fromDegreesArray(flat);
  }
}

function updateRealtimeTrack() {
  const v = viewerRef.value;
  if (!v || !realRouteDs) return;
  const coords = (props.realTimePosition || [])
    .map((p: any) => [Number(p[0]), Number(p[1])])
    .filter((a) => Number.isFinite(a[0]) && Number.isFinite(a[1]));
  if (!coords.length) return;
  const flat = coords.flat();
  if (!realRouteEntity) {
    realRouteEntity = realRouteDs.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(flat),
        width: 5,
        clampToGround: true,
        material: Cesium.Color.fromCssColorString("#FF9900"),
      },
    });
  } else {
    realRouteEntity.polyline.positions =
      Cesium.Cartesian3.fromDegreesArray(flat);
  }
}

function computeBearing(p1: number[], p2: number[]) {
  const [lon1, lat1] = p1.map(Number);
  const [lon2, lat2] = p2.map(Number);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1)) +
    Math.sin(toRad(lat1)) * Math.sin(toRad(lat2));
  const brng = Math.atan2(y, x);
  return brng;
}

function updateDroneMarker() {
  const v = viewerRef.value;
  if (!v || !markerDs) return;
  const pts = props.realTimePosition || [];
  if (!Array.isArray(pts) || pts.length === 0) return;
  const last = pts[pts.length - 1];
  const prev = pts.length > 1 ? pts[pts.length - 2] : last;
  const rot = computeBearing(prev, last) || 0;
  if (!markerEntity) {
    markerEntity = markerDs.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        Number(last[0]),
        Number(last[1]),
        0,
      ),
      billboard: {
        image: droneImageUrl,
        scale: 0.09,
        rotation: rot,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  } else {
    markerEntity.position = Cesium.Cartesian3.fromDegrees(
      Number(last[0]),
      Number(last[1]),
      0,
    );
    markerEntity.billboard.rotation = rot;
  }
}

function flyToRoute(duration = 1.0) {
  const v = viewerRef.value;
  if (!v || !routeDs) return;
  v.flyTo(routeDs, { duration });
}

function flyToLastPoint(duration = 0.6) {
  const v = viewerRef.value;
  if (!v) return;
  const pts = props.realTimePosition || [];
  if (!pts.length) return;
  const [lon, lat] = pts[pts.length - 1].map(Number);
  v.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1500),
    duration,
  });
}

watch(
  () => props.flyPositionArr,
  (nv) => {
    if (!viewerRef.value) return;
    updateRoute();
    if (nv && nv.length) flyToRoute(0.6);
  },
  { immediate: true, deep: true },
);

watch(
  () => props.realTimePosition,
  (nv) => {
    if (!viewerRef.value) return;
    updateRealtimeTrack();
    updateDroneMarker();
    if (nv && nv.length) flyToLastPoint(0.4);
  },
  { immediate: true, deep: true },
);
</script>
<template>
  <div class="live-map-wrap">
    <GeoBorderBox title="实时地图" width="100%" type="small" bgColor="#0a6a98">
      <template #right>
        <div class="header-right">
          <el-icon
            v-tooltip="'展开'"
            :size="20"
            color="#FFF"
            @click="emit('changeBig')">
            <ScaleToOriginal />
          </el-icon>
        </div>
      </template>
      <div class="map-wrap">
        <CommonMap @mapLoad="onMapLoad" />
      </div>
    </GeoBorderBox>
  </div>
</template>
<style scoped lang="less">
.live-map-wrap {
  width: 100%;
  height: 100%;
  .header-right {
    margin-right: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    .el-icon {
      background: #409eff;
      border-radius: 2px;
      cursor: pointer;
      padding: 2px;
    }
  }
  .map-wrap {
    width: 100%;
    height: 100%;
  }
}
</style>
