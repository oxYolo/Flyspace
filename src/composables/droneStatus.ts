import { WebSocketClient } from '@/utils/community/websocket_client';
import { ref, computed, onUnmounted } from 'vue';
import { getToken } from '@/utils/auth';
import type { DroneStatus } from '@/model/device.ts'
import { $getDroneDetail, $handleDRCHeartBeat } from "@/api/flyControl/device.ts";
import urlConfig from "@/public-path.ts";
import emitter from "@/stores/mitt.ts";

export function useDroneStatus(device: any) {
  const droneStatus = ref<DroneStatus>({});
  const flyPositionArr = ref<[number, number][]>([])
  const wsClient = ref<WebSocketClient | null>(null);
  const error = ref<string | null>(null);
  const pollingTimer = ref<NodeJS.Timeout | number | null>(null);

  // 判断当前设备是否是机场
  const isDock = computed(() => {
    return !!device.subDeviceSn;
  });

  // 目标设备序列号（如果是机场则使用子设备号）
  const targetSn = computed(() => {
    return isDock.value ? device.subDeviceSn : device.deviceSn;
  });

  // 连接WebSocket
  const connect = async () => {
    disconnect();
    flyPositionArr.value = [
      [device.longitude,
        device.latitude]
    ];
    const token = getToken();
    if (!token) {
      error.value = '未获取到WebSocket认证token';
      return;
    }

    if (urlConfig.websocketAble) {
      const wsUrl = `${urlConfig.webSocketUrl}/api/v1/ws?x-auth-token=${token}`;

      wsClient.value = new WebSocketClient(wsUrl, {
        maxReconnectAttempts: 10,
        reconnectInterval: 5000,
        heartbeatInterval: 30000,
        heartbeatTimeout: 5000,
        heartbeatMessage: { type: 'ping', timestamp: Date.now() },
        autoReconnect: true
      });

      // 事件监听
      wsClient.value.onOpen(() => {
        error.value = null;
      });

      wsClient.value.onMessage((event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.data?.host?.deviceSn === targetSn.value && msg.biz_code === 'device_osd') {
            emitter.emit("getDroneInfoByWebsocket", msg.data.host);
            droneStatus.value = msg.data.host;
            // 更新位置信息
            if (msg.data.host.positionInfo) {
              const { longitude, latitude } = msg.data.host.positionInfo;
              // 直接添加新位置，不做数量限制
              if (Number(longitude) && Number(latitude)) {
                flyPositionArr.value.push([longitude, latitude]);
              }
            }
          }
        } catch (e) {
          console.error('解析WebSocket消息失败:', e);
        }
      });

      wsClient.value.connect();
    } else {
      error.value = null;
      pollingTimer.value = setInterval(async () => {
        try {
          const res = await $getDroneDetail(targetSn.value)
          droneStatus.value = res.data;
          if (res.data.positionInfo) {
            const { longitude, latitude } = res.data.positionInfo;
            // 直接添加新位置，不做数量限制
            if (Number(longitude) && Number(latitude)) {
              flyPositionArr.value.push([longitude, latitude]);
            }
          }
        } catch (e) {
        }
      }, 1000)
    }
  };

  // 断开连接
  const disconnect = () => {
    if (wsClient.value) {
      wsClient.value.close();
      wsClient.value = null;
    }
    if (pollingTimer.value) {
      clearInterval(pollingTimer.value)
      pollingTimer.value = null;
    }
  };

  // 组件卸载时自动断开
  onUnmounted(() => {
    disconnect();
  });

  return {
    droneStatus,
    flyPositionArr,
    error,
    connect,
    disconnect
  };
}

export class DockDrcHeartConnect {
  dockSn: string | undefined;
  timer: ReturnType<typeof setInterval> | null = null;
  gapTime: number = 2000;

  constructor(dockSn: string | undefined) {
    this.dockSn = dockSn;
  }

  startHeart() {
    if (!this.dockSn) return
    this.timer = setInterval(() => {
      this.sentHeartInfo();
    }, this.gapTime);
  }

  closeHeart() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private sentHeartInfo() {
    if (!this.dockSn) return
    const now = new Date().getTime();
    $handleDRCHeartBeat(this.dockSn, {
      seq: now,
      timestamp: now,
    }).then();
  }
}
