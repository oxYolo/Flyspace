<!-- 设备详情弹窗 -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { WebSocketClient } from "@/utils/community/websocket_client.ts";
import {
  droneDetailItem,
  dockDetailItem,
  GetHMSInfoFirst,
} from "@/transform/device.ts";
import AlertDetailDialog from "./AlertDetailDialog.vue";
import DeviceLive from "@/components/business/DeviceLive.vue";

import dockImageUrl from "@/assets/images/drone/机场.png";
import droneImageUrl from "@/assets/images/drone/飞行器.png";
// 新增图片静态导入
import windIcon from "@/assets/icons/风.svg";
import deviceTempIcon from "@/assets/icons/设备温度.svg";
import outdoorTempIcon from "@/assets/icons/室外温度.svg";
import airConditionIcon from "@/assets/icons/空调状态.svg";
import humidityIcon from "@/assets/icons/湿度.svg";
import storageIcon from "@/assets/icons/存储空间.svg";
import rtkIcon from "@/assets/icons/rtk.svg";
import batteryIcon from "@/assets/icons/电量.svg";
import altitudeIcon from "@/assets/icons/飞行高度.svg";
import speedIcon from "@/assets/icons/速度.svg";
import distanceIcon from "@/assets/icons/飞行距离.svg";
import rainfallIcon from "@/assets/icons/降雨量.svg";
import heightIcon from "@/assets/icons/高度.svg";
import { getToken } from "@/utils/auth";
import type { DeviceInfo } from "@/model/device.ts";
import urlConfig from "@/public-path.ts";
import ModuleTitle from "@/components/common/Title.vue";

const props = defineProps({
  device: {
    type: Object as () => any | null,
    default: () => null,
  },
  runTaskData: {
    type: Object as () => any | null,
    default: () => {},
  },
});

watch(
  () => props.device,
  () => {
    clearTime();
    getflightDetail();
    getHMSInfo();
  },
  { deep: true }, // 深度监听
);

const airConditionerStateOptions: any = {
  "0": "空闲模式",
  "1": "制冷",
  "2": "制热",
  "3": "除湿",
  "4": "制冷退出",
  "5": "制热退出",
  "6": "除湿退出",
  "7": "制冷准备",
  "8": "制热准备",
  "9": "除湿准备",
  "10": "风冷准备",
  "11": "风冷中",
  "12": "风冷退出",
  "13": "除雾准备",
  "14": "除雾中",
  "15": "除雾退出",
};

const basicButtons = computed(() => {
  return [
    { text: "画面直播", type: "primary", action: "connectDevice" },
    { text: "虚拟座舱", type: "secondary", action: "controlDevice" },
  ];
});

const emit = defineEmits(["connect", "control", "close"]);

// 连接设备
const connectDevice = () => {
  emit("connect", props.device);
};

// 控制设备
const controlDevice = () => {
  emit("control", props.device);
};

// 本地按钮点击处理
const handleButtonClick = (action: string) => {
  if (action === "connectDevice") {
    connectDevice();
  } else if (action === "controlDevice") {
    controlDevice();
  }
};

interface DeviceData {
  // 无人机场数据
  dock: {
    temperature: {
      internal: number;
      external: number;
    };
    speed: number;
    signal: string;
    altitude: number;
    signalStrength: number;
    droneInDock: boolean;
    height: number;
    rainfall: number;
  };
  // 无人机数据
  drone: {
    rtkNum: number;
    speed: number;
    storage: number;
    altitude: number;
    battery: number;
    horizontalSpeed: number;
    totalDistance: number;
  };
}
const deviceData = ref<any>({
  dock: {
    temperature: {
      internal: 0,
      external: 0,
    },
    speed: 0,
    signal: "",
    altitude: 0,
    signalStrength: 0,
    droneInDock: true,
    height: 0,
    rainfall: 0,
  },
  drone: {
    rtkNum: 0,
    speed: 0,
    storage: 0,
    altitude: 0,
    battery: 0,
    horizontalSpeed: 0,
    totalDistance: 0,
  },
});

const token = getToken();
const droneWsClient = new WebSocketClient(
  `${urlConfig.webSocketUrl}/api/v1/ws?x-auth-token=${token}`,
  {
    maxReconnectAttempts: 10,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    heartbeatTimeout: 5000,
    heartbeatMessage: { type: "ping", timestamp: Date.now() },
    autoReconnect: true,
  },
);

let getFlightDetailTimer: any = null;
async function getflightDetail() {
  initDeviceInfo();
  const getLastDetail = async () => {
    if (props.device?.type && isDock()) {
      deviceData.value.dock = await dockDetailItem(props.device.deviceSn, null);
      deviceData.value.drone = await droneDetailItem(
        props.device.subDeviceSn,
        null,
      );
    } else {
      deviceData.value.drone = await droneDetailItem(
        props.device.deviceSn,
        null,
      );
    }
  };
  await getLastDetail();
  if (urlConfig.websocketAble) {
    connectInfo();
  } else {
    getFlightDetailTimer = setInterval(async () => {
      await getLastDetail();
    }, 1000);
  }
}
const clearTime = () => {
  if (getFlightDetailTimer) {
    clearInterval(getFlightDetailTimer);
    getFlightDetailTimer = null;
  }
  if (getHMSInfoTimer) {
    clearInterval(getHMSInfoTimer);
    getHMSInfoTimer = null;
  }
};
function connectInfo() {
  droneWsClient.connect();
  droneWsClient.onMessage(async (event: any) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg?.data?.host) {
        const element = msg.data.host;
        if (isDock()) {
          if (
            props.device.deviceSn === msg.data.host.deviceSn &&
            msg.biz_code === "dock_osd"
          ) {
            if (element.environmentInfo.windSpeed) {
              deviceData.value.dock = await dockDetailItem(
                props.device.deviceSn,
                element,
              );
            }
          }
          if (
            props.device.subDeviceSn === msg.data.host.deviceSn &&
            msg.biz_code === "device_osd"
          ) {
            if (element.environmentInfo.windSpeed) {
              deviceData.value.drone = await droneDetailItem(
                props.device.subDeviceSn,
                element,
              );
            }
          }
        } else {
          if (props.device.deviceSn === msg.data.host.deviceSn) {
            if (element.environmentInfo.windSpeed) {
              deviceData.value.drone = await droneDetailItem(
                props.device.deviceSn,
                element,
              );
            }
          }
        }
      }
    } catch (e) {
      console.log("收到无人机原始消息:", event.data);
      console.error("解析 WebSocket 消息失败:", e);
    }
  });
}

onMounted(() => {
  getflightDetail();
  getHMSInfo();
});

// 在组件即将卸载时关闭 WebSocket 连接
onBeforeUnmount(() => {
  if (droneWsClient.isConnected()) {
    droneWsClient.close();
  }
  clearTime();
});

// 判断是否为无人机场
const isDock = () => {
  return props.device?.type === "dock" || props.device?.name?.includes("Dock");
};

const initDeviceInfo = () => {
  deviceData.value.dock = {
    temperature: {
      internal: 0,
      external: 0,
    },
    speed: 0,
    signal: "",
    altitude: 0,
    signalStrength: 0,
    rainfall: 0,
  };
  deviceData.value.drone = {
    rtkNum: 0,
    speed: 0,
    storage: 0,
    altitude: 0,
    battery: 0,
    horizontalSpeed: 0,
    totalDistance: 0,
  };
};

const deviceHmsInfo: any = ref({
  dock: {},
  drone: {},
});

// 告警详情对话框显示状态
const showAlertDetail = ref(false);
let getHMSInfoTimer: any = null;
const getHMSInfo = async () => {
  getHMSInfoTimer = setInterval(async () => {
    if (props.device?.type && isDock()) {
      deviceHmsInfo.value.dock = await GetHMSInfoFirst(props.device.deviceSn);
      deviceHmsInfo.value.drone = await GetHMSInfoFirst(
        props.device.subDeviceSn,
      );
    } else {
      deviceHmsInfo.value.drone = await GetHMSInfoFirst(props.device?.deviceSn);
    }
  }, 1000 * 10);
};

// 获取告警级别文本
const getAlertLevelText = (level: number) => {
  const levelMap: any = {
    0: "通知",
    1: "提醒",
    2: "警告",
  };
  return levelMap[level] || "未知";
};

// 获取告警样式类名
const getAlertClass = (level: number) => {
  const classMap: any = {
    0: "alert-notice",
    1: "alert-remind",
    2: "alert-warning",
  };
  return classMap[level] || "alert-unknown";
};

// 格式化告警时间
const formatAlertTime = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error("时间格式化失败:", error);
    return timeStr;
  }
};

// 点击告警信息
const handleAlertClick = () => {
  showAlertDetail.value = true;
};

// 关闭告警详情对话框
const closeAlertDetail = () => {
  showAlertDetail.value = false;
};

const formatNumberValue = (value: unknown, digits?: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return typeof digits === "number" ? num.toFixed(digits) : String(num);
};

const formatScaledNumberValue = (
  value: unknown,
  scale: number,
  digits: number,
) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return (num / scale).toFixed(digits);
};
</script>

<template>
  <div class="device-detail-dialog common-background">
    <ModuleTitle :text="'设备详情'" icon="icon-设备详情" />
    <div class="close-btn" @click="emit('close')">×</div>
    <!-- 内容区域 -->
    <div class="dialog-content">
      <div class="main-content">
        <DeviceLive :device="props.device" :runTaskData="props.runTaskData" />
        <div class="item-content" v-if="isDock()">
          <div class="title-row">
            <div class="small-title">机场</div>
            <div
              v-if="deviceHmsInfo.dock?.hmsId"
              class="alert-scroll"
              :class="getAlertClass(deviceHmsInfo.dock?.level)"
              @click="handleAlertClick">
              <span class="alert-level">{{
                getAlertLevelText(deviceHmsInfo.dock?.level)
              }}</span>
              <span class="alert-time">{{
                formatAlertTime(deviceHmsInfo.dock?.createTime)
              }}</span>
              <span class="alert-message">
                <span class="message-content">{{
                  deviceHmsInfo.dock?.messageZh ||
                  deviceHmsInfo.dock?.messageEn ||
                  "未知告警信息"
                }}</span>
              </span>
            </div>
          </div>
          <!-- 设备图片 -->
          <div class="device-image-container">
            <img :src="dockImageUrl" alt="设备图片" />
          </div>
          <!-- 无人机场数据 -->
          <div class="device-data-grid">
            <div class="data-item" v-tooltip="'风速'">
              <div class="data-icon">
                <img :src="windIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.speed) }} m/s
              </div>
            </div>
            <div class="data-item" v-tooltip="'设备温度'">
              <div class="data-icon">
                <img :src="deviceTempIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.temperature?.internal) }} °C
              </div>
            </div>
            <div class="data-item" v-tooltip="'室外温度'">
              <div class="data-icon">
                <img :src="outdoorTempIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.temperature?.external) }} °C
              </div>
            </div>
            <div class="data-item" v-tooltip="'空调状态'">
              <div class="data-icon">
                <img :src="airConditionIcon" />
              </div>
              <div class="data-value">
                {{ airConditionerStateOptions[deviceData.dock?.signal] || "-" }}
              </div>
            </div>
            <div class="data-item" v-tooltip="'湿度'">
              <div class="data-icon">
                <img :src="humidityIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.signalStrength) }} %
              </div>
            </div>
            <div class="data-item" v-tooltip="'存储空间'">
              <div class="data-icon">
                <img :src="storageIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.altitude) }} %
              </div>
            </div>
            <div class="data-item" v-tooltip="'机场高度'">
              <div class="data-icon">
                <img :src="heightIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.height) }} m
              </div>
            </div>
            <div class="data-item" v-tooltip="'降雨量'">
              <div class="data-icon">
                <img :src="rainfallIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.dock?.rainfall) }} mm
              </div>
            </div>
          </div>
        </div>
        <div class="item-content">
          <div class="title-row">
            <div class="small-title">
              飞行器
              <span
                v-if="isDock() && deviceData.dock?.droneInDock !== undefined"
                class="drone_in_dock"
                :class="{ green: deviceData.dock?.droneInDock }">
                ({{ deviceData.dock?.droneInDock ? "舱内" : "舱外" }})
              </span>
            </div>
            <div
              v-if="deviceHmsInfo.drone?.hmsId"
              class="alert-scroll"
              :class="getAlertClass(deviceHmsInfo.drone?.level)"
              @click="handleAlertClick">
              <span class="alert-level">
                {{ getAlertLevelText(deviceHmsInfo.drone?.level) }}
              </span>
              <span class="alert-time">
                {{ formatAlertTime(deviceHmsInfo.drone?.createTime) }}
              </span>
              <span class="alert-message">
                <span class="message-content">
                  {{
                    deviceHmsInfo.drone?.messageZh ||
                    deviceHmsInfo.drone?.messageEn ||
                    "未知告警信息"
                  }}
                </span>
              </span>
            </div>
          </div>
          <!-- 设备图片 -->
          <div class="device-image-container">
            <img :src="droneImageUrl" alt="设备图片" />
          </div>
          <!-- 无人机数据 -->
          <div class="device-data-grid">
            <div class="data-item" v-tooltip="'风速'">
              <div class="data-icon">
                <img :src="windIcon" />
              </div>
              <div class="data-value">
                {{ formatScaledNumberValue(deviceData.drone?.speed, 10, 1) }} m/s
              </div>
            </div>
            <div class="data-item" v-tooltip="'RTK'">
              <div class="data-icon">
                <img :src="rtkIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.rtkNum) }} 个
              </div>
            </div>
            <div class="data-item" v-tooltip="'存储空间'">
              <div class="data-icon">
                <img :src="storageIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.storage) }} %
              </div>
            </div>
            <div class="data-item" v-tooltip="'电量'">
              <div class="data-icon">
                <img :src="batteryIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.battery) }} %
              </div>
            </div>
            <div class="data-item" v-tooltip="'飞行高度'">
              <div class="data-icon">
                <img :src="altitudeIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.altitude) }} m
              </div>
            </div>
            <div class="data-item" v-tooltip="'速度'">
              <div class="data-icon">
                <img :src="speedIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.horizontalSpeed) }} m/s
              </div>
            </div>
            <div class="data-item" v-tooltip="'飞行距离'">
              <div class="data-icon">
                <img :src="distanceIcon" />
              </div>
              <div class="data-value">
                {{ formatNumberValue(deviceData.drone?.totalDistance) }} km
              </div>
            </div>
          </div>
        </div>

        <!-- 设备信息 -->
        <!-- <div v-if="isDock()" class="device-info">
          <div class="info-row">
            <span class="info-label">设备状态:</span>
            <span class="info-value">{{
              device.status === "success" ? "在线" : "离线"
            }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">部署地址:</span>
            <span class="info-value">{{ device.address }}</span>
          </div>
        </div> -->
      </div>
      <div class="button-group">
        <el-button
          v-for="btn in basicButtons"
          :key="btn.action"
          :class="btn.type"
          @click="handleButtonClick(btn.action)">
          {{ btn.text }}
        </el-button>
      </div>
    </div>

    <!-- 告警详情对话框 -->
    <AlertDetailDialog
      v-if="showAlertDetail"
      :device="device"
      :visible="showAlertDetail"
      @close="closeAlertDetail" />
  </div>
</template>

<style scoped lang="less">
.device-detail-dialog {
  position: fixed;
  top: 70px;
  left: 395px;
  width: 316px;
  height: calc(100% - 110px);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow-y: auto;
  z-index: 1000;

  .close-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 24px;
    color: #fff;
    cursor: pointer;
    z-index: 1001;

    &:hover {
      color: #ff6b6b;
    }
  }

  .dialog-content {
    height: calc(100% - 50px);
    .main-content {
      overflow: auto;
      height: calc(100% - 50px);
      display: flex;
      flex-direction: column;
      gap: 5px;
      .item-content {
        flex: 1;
        max-height: 60%;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        gap: 5px;
        min-height: 0;
      }
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;

      .small-title {
        font-size: 14px;
        color: #fff;
        font-weight: 700;
        padding: 0 0 0 10px;
        .drone_in_dock {
          font-size: 12px;
          color: orange;
        }
        .green {
          color: green;
        }
      }
    }
    .device-image-container {
      height: 100%;
      border-radius: 8px;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 60%;
        // height: 100%;
      }

      .device-placeholder {
        color: #fff;
        font-size: 16px;
        font-weight: bold;
      }
    }

    .device-data-grid {
      height: 100%;
      max-height: 200px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 13px 16px;
      border-radius: 8px;

      .data-item {
        display: flex;
        align-items: center;

        .data-icon {
          width: 20px;
          height: 20px;
          margin-right: 8px;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          filter: brightness(0) invert(1);
          display: flex;
          align-items: center;
          justify-content: center;

          img {
            width: 100%;
            height: 100%;
          }

          .icon-text {
            font-size: 12px;
            font-weight: bold;
            color: #409eff;
          }
        }

        .data-value {
          font-size: 14px;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    .device-info {
      height: 80px;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 10px;

      .info-row {
        display: flex;
        margin-bottom: 5px;

        &:last-child {
          margin-bottom: 0;
        }

        .info-label {
          width: 80px;
          font-size: 14px;
          color: #ccc;
        }

        .info-value {
          flex: 1;
          font-size: 14px;
          color: #fff;
        }
      }
    }

    .button-group {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .alert-scroll {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      overflow: hidden;
      white-space: nowrap;
      position: relative;
      min-width: 0;
      cursor: pointer;
      transition: all 0.3s ease;
      .alert-level {
        flex-shrink: 0;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 3px;
        color: white;
        z-index: 2;
      }

      .alert-time {
        flex-shrink: 0;
        font-size: 10px;
        color: #ddd;
        z-index: 2;
      }

      .alert-message {
        flex: 1;
        font-size: 12px;
        overflow: hidden;
        white-space: nowrap;
        position: relative;
        min-width: 0;

        .message-content {
          display: inline-block;
          animation: scroll-text 15s linear infinite;

          &:hover {
            animation-play-state: paused;
          }
        }
      }

      &.alert-notice {
        background-color: rgba(33, 150, 243, 0.1);
        border: 1px solid rgba(33, 150, 243, 0.3);

        .alert-level {
          background-color: #2196f3;
        }
      }

      &.alert-remind {
        background-color: rgba(255, 152, 0, 0.1);
        border: 1px solid rgba(255, 152, 0, 0.3);

        .alert-level {
          background-color: #ff9800;
        }
      }

      &.alert-warning {
        background-color: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);

        .alert-level {
          background-color: #f44336;
        }
      }

      &.alert-unknown {
        background-color: rgba(158, 158, 158, 0.1);
        border: 1px solid rgba(158, 158, 158, 0.3);

        .alert-level {
          background-color: #9e9e9e;
        }
      }
    }

    @keyframes scroll-text {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-100%);
      }
    }
  }
}
</style>
