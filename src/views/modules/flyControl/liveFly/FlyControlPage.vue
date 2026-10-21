<!-- 虚拟座舱 -->
<template>
  <div class="fly-control-page" :style="{ width: pageWidth }">
    <!-- 主要内容区域-虚拟座舱 -->
    <div class="page-content">
      <GeoBigDialog
        :width="chatbot.visible ? `calc(100vw - ${chatReserve})` : ''"
        @close="handleClose">
        <div ref="cockpitViewportRef" class="cockpit-viewport">
          <div class="cockpit-stage" :style="cockpitStageStyle">
            <div class="virtual-dock">
              <el-select
                v-if="isDock"
                v-model="selectedDockSn"
                class="dock-select"
                filterable
                size="large"
                remote
                reserve-keyword
                placeholder="请选择机巢"
                :remote-method="searchDockList"
                :loading="dockListLoading"
                @change="handleDockChange">
                <el-option
                  v-for="item in dockOptions"
                  :key="item.deviceSn || item.id"
                  :label="getDockSelectLabel(item)"
                  :value="item.deviceSn">
                  <div class="dock-option">
                    <span class="dock-option-name">{{
                      getDockOptionLabel(item)
                    }}</span>
                    <span
                      class="dock-status"
                      :class="getDockStatusClass(item)">
                      {{ getDockStatusText(item) }}
                    </span>
                  </div>
                </el-option>
              </el-select>
              <template v-else>
                <span class="dock-name">{{ device?.nickname || "无" }}</span>
                <span>({{ device?.deviceName || "无" }})</span>
              </template>
            </div>
            <div
              class="panel-content"
              :class="{ gimbalPanelFullscreen: isGimbalPanelFullscreen }">
              <div
                class="info-wrap"
                :class="{
                  twoModel: !isDock,
                  gimbalOnly: isGimbalPanelFullscreen,
                }">
                <div
                  v-if="!isGimbalPanelFullscreen"
                  :class="{ big: activeBig === '地图' }"
                  class="grid-item">
                  <LiveMap
                    :is-big="activeBig === '地图'"
                    :flyPositionArr="
                      routeDetail.routePointJson?.coordinates || []
                    "
                    :realTimePosition="flyPositionArr"
                    @change-big="changeBig('地图')" />
                </div>
                <div
                  v-if="isDock && !isGimbalPanelFullscreen"
                  :class="{ big: activeBig === '机场' }"
                  class="grid-item">
                  <DockVideo
                    :key="`dock-${device?.deviceSn || ''}`"
                    :is-big="activeBig === '机场'"
                    :device="device"
                    @change-big="changeBig('机场')" />
                </div>
                <div :class="{ big: activeBig === '云台' }" class="grid-item">
                  <GimbalVideo
                    :key="`gimbal-${device?.deviceSn || ''}-${device?.subDeviceSn || ''}`"
                    ref="gimbalComp"
                    :is-big="isGimbalPanelFullscreen || activeBig === '云台'"
                    :is-panel-fullscreen="isGimbalPanelFullscreen"
                    :device="device"
                    :runTaskData="runTaskData"
                    :droneStatus="droneStatus"
                    @change-big="changeBig('云台')"
                    @toggle-panel-fullscreen="toggleGimbalPanelFullscreen" />
                </div>
              </div>
              <div v-if="!isGimbalPanelFullscreen" class="control-wrap">
                <ControlPanel
                  :device="device"
                  :droneStatus="droneStatus"
                  :runTaskData="runTaskData"
                  @showShortCutKey="showShortCutKey"
                  @takePhoto="gimbalComp?.value?.handleTakePhoto()"
                  @togglePanorama="gimbalComp?.value?.togglePanorama()"
                  @toggleRecording="gimbalComp?.value?.toggleRecording()" />
              </div>
            </div>
          </div>
        </div>
      </GeoBigDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import DockVideo from "./components/DockVideo.vue";
import GimbalVideo from "./components/GimbalVideo.vue";
import ControlPanel from "./components/ControlPanel.vue";
import { useDroneStatus } from "@/composables/droneStatus";
import { getRouteDetail } from "@/transform/control";
import { ElMessage } from "element-plus";

import { useFlyControlStore } from "@/stores/modules/flyControl";
import { useChatbotStore } from "@/stores/chatbot";
import GeoBigDialog from "@/components/common/GeoBigDialog.vue";
import LiveMap from "@/views/modules/flyControl/liveFly/components/LiveMap.vue";
import { $getflightList } from "@/api/flyControl/device";
import { deviceFlightItem } from "@/transform/device";
import { getRunTask } from "@/transform/control";
import type { DeviceInfo } from "@/model/device";

const router = useRouter();
const route = useRoute();
const flyControlStore = useFlyControlStore();
// 智能问答面板联动：打开时本页根容器宽度收窄，让出右侧空间给 ChatbotPanel
const chatbot = useChatbotStore();
// 进入本页前面板的宽度，离开本页时恢复，避免影响其他页面默认布局
const previousPanelWidth = ref(chatbot.panelWidth);

// 助手占位宽度：与面板实际宽度保持同一表达式（面板有 350px 最小宽度）
const chatReserve = computed(() => `max(350px, ${chatbot.panelWidth}vw)`);
const pageWidth = computed(() =>
  chatbot.visible ? `calc(100vw - ${chatReserve.value})` : "100vw",
);

// 座舱等比缩放：可用宽度小于设计最小宽度时整体缩小，避免内部固定像素布局被挤压变形
const DESIGN_MIN_WIDTH = 1600;
const cockpitViewportRef = ref<HTMLElement | null>(null);
const cockpitStageStyle = ref<Record<string, string>>({
  width: "100%",
  height: "100%",
});
let cockpitResizeObserver: ResizeObserver | null = null;
let cockpitScaleRaf = 0;

const updateCockpitScale = () => {
  const viewport = cockpitViewportRef.value;
  if (!viewport) return;
  const availableWidth = viewport.clientWidth;
  const availableHeight = viewport.clientHeight;
  if (!availableWidth || !availableHeight) return;
  // 只缩不放：可用宽度足够时保持 1:1
  const scale = Math.min(1, availableWidth / DESIGN_MIN_WIDTH);
  cockpitStageStyle.value = {
    width: `${availableWidth / scale}px`,
    height: `${availableHeight / scale}px`,
    zoom: String(scale),
  };
};

const scheduleCockpitScale = () => {
  if (cockpitScaleRaf) return;
  cockpitScaleRaf = requestAnimationFrame(() => {
    cockpitScaleRaf = 0;
    updateCockpitScale();
  });
};

// 从 store 中获取设备信息和任务数据
const device = computed(() => flyControlStore.device);
const runTaskData = computed(() => flyControlStore.runTaskData);
const selectedDockSn = ref("");
const dockOptions = ref<DeviceInfo[]>([]);
const dockListLoading = ref(false);
const statusDevice = reactive<any>({});

// 使用无人机状态hook
const { droneStatus, connect, disconnect, flyPositionArr } =
  useDroneStatus(statusDevice);

// 判断是否为无人机场
const isDock = computed(() => {
  return flyControlStore.isDock;
});

const routeDetail = ref<any>({});

const gimbalComp = ref<any>(null);

const syncStatusDevice = (nextDevice: DeviceInfo | null) => {
  Object.keys(statusDevice).forEach((key) => delete statusDevice[key]);
  if (nextDevice) {
    Object.assign(statusDevice, nextDevice);
  }
};

const getDockOptionLabel = (item: DeviceInfo) => {
  const name =
    item.nickname || item.deviceName || item.deviceSn || "未命名机巢";
  return item.deviceName && item.nickname
    ? `${item.nickname}（${item.deviceName}）`
    : String(name);
};

const isDockOnline = (item: any) => {
  if (item?.onlineStatus !== undefined && item?.onlineStatus !== null) {
    return String(item.onlineStatus) === "1";
  }
  return item?.status === "success" || item?.status === "online";
};

const getDockStatusText = (item: DeviceInfo) => {
  return isDockOnline(item) ? "在线" : "离线";
};

const getDockStatusClass = (item: DeviceInfo) => {
  return isDockOnline(item) ? "online" : "offline";
};

const getDockSelectLabel = (item: DeviceInfo) => {
  return `${getDockOptionLabel(item)} · ${getDockStatusText(item)}`;
};

const searchDockList = async (keyword = "") => {
  dockListLoading.value = true;
  try {
    const res: any = await $getflightList({
      onlineStatus: 1, // 1: 在线、0: 离线
      nickname: keyword,
      domain: 3,
      pageNum: 1,
      pageSize: 100,
    });
    if (res?.code === 200 && Array.isArray(res.rows)) {
      dockOptions.value = res.rows
        .map((item: any) => deviceFlightItem(item))
        .filter(Boolean);
    }
  } finally {
    dockListLoading.value = false;
  }
};

const ensureCurrentDockOption = () => {
  if (!device.value?.deviceSn) return;
  const exists = dockOptions.value.some(
    (item) => item.deviceSn === device.value?.deviceSn,
  );
  if (!exists) {
    dockOptions.value.unshift({ ...device.value });
  }
};

const handleDockChange = async (dockSn: string) => {
  const nextDevice = dockOptions.value.find((item) => item.deviceSn === dockSn);
  if (!nextDevice) return;
  try {
    const taskData = await getRunTask(nextDevice.deviceSn as string);
    flyControlStore.setFlyControlData(nextDevice, taskData);
    ElMessage.success("机巢切换成功");
  } catch (error: any) {
    flyControlStore.setFlyControlData(nextDevice, null);
    ElMessage.warning(error?.message || "已切换机巢，当前机巢暂无任务信息");
  }
};

//获取航线详情数据
const getRouteDetailData = async (routeId: string) => {
  if (!routeId) return;
  try {
    const data = await getRouteDetail(routeId);
    routeDetail.value = data || {};
  } catch (error: any) {
    ElMessage.error(error?.message || "获取航线详情失败");
  }
};

// 监听设备变化重新连接WebSocket
watch(
  () => device.value,
  (newVal) => {
    syncStatusDevice(newVal);
    selectedDockSn.value = newVal?.deviceSn || "";
    ensureCurrentDockOption();
    if (newVal?.deviceSn) {
      connect();
    }
  },
  { immediate: true },
);

//监听航线id变化
watch(
  () => runTaskData.value,
  (newVal) => {
    if (newVal?.fileId) {
      getRouteDetailData(newVal.fileId);
    } else {
      routeDetail.value = {};
    }
  },
  { immediate: true, deep: true },
);

onMounted(async () => {
  // 监听座舱可用区域尺寸变化（助手开关、面板拖拽都会触发），同步刷新缩放比例
  if (cockpitViewportRef.value) {
    cockpitResizeObserver = new ResizeObserver(scheduleCockpitScale);
    cockpitResizeObserver.observe(cockpitViewportRef.value);
    updateCockpitScale();
  }
  // 进入飞控页：智能问答面板宽度调整为 20vw（更窄），让飞控内容有更大可视区
  previousPanelWidth.value = chatbot.panelWidth;
  chatbot.setWidth(20);
  // 检查 store 中是否有设备信息
  if (!flyControlStore.hasDevice) {
    // 刷新场景：store 内存丢失，尝试从 URL 的 deviceSn 回捞设备档案与任务
    const deviceSn = route.query.deviceSn as string;
    if (!deviceSn) {
      // 既无内存又无 URL 主键，确属非法入口
      ElMessage.error("缺少设备信息，请从正确的入口访问");
      router.back();
      return;
    }
    try {
      // 按主键精确查询设备档案（与 DeviceActivity 入口同源）
      const res: any = await $getflightList({ deviceSn });
      const row = res?.rows?.[0];
      if (res?.code !== 200 || !row) {
        ElMessage.error("设备信息获取失败，请从正确的入口访问");
        router.back();
        return;
      }
      // 复用入口同一映射，补齐 type/status，保证与点击入口数据严格同源
      const dev = deviceFlightItem(row);
      // 重拉当前任务（与入口 getRunTaskData 一致），失败不阻塞进入
      const task = await getRunTask(deviceSn).catch(() => null);
      flyControlStore.setFlyControlData(dev as DeviceInfo, task);
    } catch (e: any) {
      ElMessage.error("设备信息获取失败，请从正确的入口访问");
      router.back();
      return;
    }
  }
  selectedDockSn.value = device.value?.deviceSn || "";
  syncStatusDevice(device.value);
  ensureCurrentDockOption();
  if (isDock.value) {
    await searchDockList();
    ensureCurrentDockOption();
  }
});

onUnmounted(() => {
  disconnect();
  cockpitResizeObserver?.disconnect();
  cockpitResizeObserver = null;
  if (cockpitScaleRaf) cancelAnimationFrame(cockpitScaleRaf);
  cockpitScaleRaf = 0;
  // 离开飞控页：恢复智能问答面板进入前的默认宽度
  chatbot.setWidth(previousPanelWidth.value);
});

const handleClose = () => {
  flyControlStore.backToPage();
};

const activeBig = ref("云台");
const isGimbalPanelFullscreen = ref(false);
const changeBig = (type: string) => {
  if (isGimbalPanelFullscreen.value) return;
  activeBig.value = type;
};

const toggleGimbalPanelFullscreen = () => {
  isGimbalPanelFullscreen.value = !isGimbalPanelFullscreen.value;
  if (isGimbalPanelFullscreen.value) {
    activeBig.value = "云台";
  }
};

const showShortCutKey = () => {
  gimbalComp?.value?.handelShowShortCutKeyDialog();
};
</script>

<style scoped lang="less">
.fly-control-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0c374b;

  .page-content {
    flex: 1;
    width: 100%;
    height: calc(100vh - 60px); // 减去header高度
    overflow: hidden;

    // 座舱可用区域：尺寸由助手占位宽度决定，内部按缩放比例绘制
    .cockpit-viewport {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    // 座舱画布：宽高与 zoom 由脚本按可用宽度 / 设计最小宽度计算
    .cockpit-stage {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .virtual-dock {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      min-width: 280px;
      height: 40px;
      padding: 0 20px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;

      .dock-name {
        font-size: 16px;
        font-weight: 900 !important;
      }

      .dock-select {
        width: 330px;
      }

      :deep(.dock-select .el-select__wrapper) {
        height: 42px;
        font-size: 16px;
        font-weight: 900 !important;
        min-height: 32px;
        background: rgba(0, 28, 43, 0.7);
        border: 1px solid rgba(0, 204, 255, 0.7);
        box-shadow:
          inset 0 0 10px rgba(0, 204, 255, 0.18),
          0 0 8px rgba(0, 204, 255, 0.18);

        .el-select__input {
          color: #fff;
        }
      }

      :deep(.dock-select .el-select__placeholder),
      :deep(.dock-select .el-select__selected-item) {
        color: #fff;
        font-weight: 700;
        text-align: center;
      }

      .dock-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;

        .dock-option-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dock-status {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.78);

          &::before {
            content: "";
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }

          &.online::before {
            background: #35d071;
            box-shadow: 0 0 8px rgba(53, 208, 113, 0.75);
          }

          &.offline::before {
            background: #9aa4ad;
            box-shadow: 0 0 6px rgba(154, 164, 173, 0.45);
          }
        }
      }
    }

    .panel-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .info-wrap {
        flex: 1;
        width: 100%;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: 4fr 7fr;
        grid-template-rows: repeat(2, 1fr);
        gap: 10px;
        min-height: 0; /* 修复Grid在Flex容器中的问题 */

        .grid-item {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .big {
          grid-row: 1 / 3;
          grid-column: 2 / 2;
        }

        &.gimbalOnly {
          margin-bottom: 0;
          display: block;

          .grid-item {
            height: 100%;
          }
        }
      }

      .twoModel {
        grid-template-rows: repeat(1, 1fr);
        .big {
          grid-row: 1 / 1;
        }
      }

      .control-wrap {
        flex-shrink: 0;
      }

      &.gimbalPanelFullscreen {
        .info-wrap {
          height: 100%;
        }
      }
    }
  }
}

.dock-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;

  .dock-option-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dock-status {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    /* color: rgba(255, 255, 255, 0.78); */

    &::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    &.online::before {
      background: #35d071;
      box-shadow: 0 0 8px rgba(53, 208, 113, 0.75);
    }

    &.offline::before {
      background: #9aa4ad;
      box-shadow: 0 0 6px rgba(154, 164, 173, 0.45);
    }
  }
}
</style>
