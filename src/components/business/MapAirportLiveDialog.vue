<template>
  <!-- 机场监控弹框：仅当地图上点中机场 label 时挂载；关闭即卸载，DeviceLiveDialog 内部 onBeforeUnmount 自动停流 -->
  <DeviceLiveDialog
    v-if="dialogVisible && liveDevice"
    :device="liveDevice"
    @close="closeDialog" />
</template>

<script setup lang="ts">
/**
 * 地图机场监控弹框（胶水组件）
 *
 * 背景：两个现成模块互不感知，需要一层适配代码把它们接起来——
 *  - 机场 label：layerManage.vue 拉取设备列表后构造 GeoJSON（properties 内含
 *    设备完整原始数据，domain==3 为机场），经 CesiumMapManager
 *    的 addAirportSymbolLayer 渲染成 Cesium Entity；
 *  - 直播弹框：DeviceLiveDialog 只认 device prop（name/type/status/deviceSn 等），
 *    内部 type==="dock" 时走机场分支（默认"监控"标签 + 舱内/舱外切换）。
 *
 * 本组件只做三件事：
 *  1. 等地图 viewer 就绪后向地图注册左键点击监听；
 *  2. 判断点击对象是否为机场设备（properties.domain == 3），并把 Entity 的
 *     properties（后端设备原始数据）翻译成 DeviceLiveDialog 需要的 device 结构；
 *  3. 控制弹框显隐（离线机场同样弹框，由 DeviceLive 内部显示未连接态）。
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import DeviceLiveDialog from "./DeviceLiveDialog.vue";
import { getMapManager } from "@/services/mapService";

/** 弹框显隐 */
const dialogVisible = ref(false);
/** 翻译后的设备信息，传给 DeviceLiveDialog */
const liveDevice = ref<any>(null);

/** addEventListener 返回的取消监听函数，卸载时调用 */
let disposeClick: (() => void) | null = null;
/** 地图就绪轮询定时器 */
let readyTimer: number | null = null;

/**
 * 把 Entity.properties（layerManage 构造 GeoJSON 时的设备原始数据，
 * 其中 id 已被改写为 deviceSn）翻译成 DeviceLiveDialog 需要的 device 结构。
 * 关键映射：
 *  - type 固定 "dock"：强制走机场分支（domain==3 的必然是机场）；
 *  - status：onlineStatus==1 → "success"，否则 "offline"。
 *    DeviceLive 内部 status != "success" 时不主动拉流，展示未连接态；
 *  - id 必须有值：DeviceLiveDialog.startLiveStream 开头按 device.id 判空直接 return。
 */
const adaptDevice = (p: any) => ({
  ...p,
  id: p.deviceSn,
  name: p.nickname,
  type: "dock",
  status: p.onlineStatus == 1 ? "success" : "offline",
});

/** 地图左键点击回调：命中机场 Entity 时弹出监控弹框，其余点击一律忽略 */
const handleMapClick = (e: any) => {
  const entity = e?.pickedEntity;
  const bag = entity?.properties;
  if (!bag) return;

  // Cesium 会把构造 Entity 时传入的普通对象包装成 PropertyBag，
  // getValue() 一次性取回普通对象（属性均为常量，可不传时间参数）
  let p: any = null;
  try {
    p = typeof bag.getValue === "function" ? bag.getValue() : bag;
  } catch {
    p = null;
  }
  // 非机场设备（domain != 3 或缺 deviceSn）不响应
  if (!p || Number(p.domain) !== 3 || !p.deviceSn) return;

  liveDevice.value = adaptDevice(p);
  dialogVisible.value = true;
};

const closeDialog = () => {
  dialogVisible.value = false;
  liveDevice.value = null;
};

onMounted(() => {
  // 地图 viewer 在路由页面挂载后才异步初始化完成，这里轮询等待就绪后注册监听
  readyTimer = window.setInterval(() => {
    const mapManager: any = getMapManager();
    if (!mapManager?.viewer) return;

    window.clearInterval(readyTimer!);
    readyTimer = null;
    // 注意：addEventListener 内部通过 setInputAction 注册，属覆盖式注册，
    // 当前全局仅本组件消费 leftClick；若未来多处监听需改造为多播
    disposeClick = mapManager.addEventListener("leftClick", handleMapClick);
  }, 500);
});

onBeforeUnmount(() => {
  disposeClick?.();
  disposeClick = null;
  if (readyTimer) {
    window.clearInterval(readyTimer);
    readyTimer = null;
  }
  closeDialog();
});
</script>
