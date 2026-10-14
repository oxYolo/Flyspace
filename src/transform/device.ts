import { $getDockDetail, $getDroneDetail, $getHMSInfo } from "@/api/flyControl/device";
import dayjs from "dayjs";

/**
 * 设备状态概览字段映射配置
 * 结构：
 *   - key: 设备类型（与后端返回的deviceType严格一致）
 *   - value: 该设备类型对应的字段映射关系
 */
export const DEVICE_STATUS_INFO = {
  无人机: {
    total: 'totalDrones',
    online: 'onlineDrones',
    offline: 'offlineDrones',
    rate: 'droneOnlineRate'
  },
  机场: {
    total: 'totalDocks',
    online: 'onlineDocks',
    offline: 'offlineDocks',
    rate: 'dockOnlineRate'
  }
}

/**
 * 设备活动监控字段处理
 * @param element 设备信息
 * @returns
 */
export const deviceFlightItem = (element: any) => {
  if (!element) return;
  element.type = element.domain == 3 ? 'dock' : 'drone';
  element.time = element.lastOnlineTime;
  element.status = element.onlineStatus == 1 ? 'success' : 'warning';
  return element;
}
// 机场详情字段映射
export const dockDetailItem = async (deviceSn: any, element: any) => {
  try {
    if (!element) {
      const res = await $getDockDetail(deviceSn);
      element = res.data
    }
    if (!element || !Object.keys(element)?.length) return;
    return {
      droneInDock: element.deviceInfo.droneInDock,
      temperature: {
        internal: element.environmentInfo.temperature,
        external: element.environmentInfo.environmentTemperature,
      },
      speed: element.environmentInfo.windSpeed, // 单位：m/s
      signal: element.statusInfo.airConditioner?.airConditionerState,
      altitude: (!isNaN(element.deviceInfo?.storage?.used)) && element.deviceInfo?.storage?.total
        ? ((element.deviceInfo.storage.used / element.deviceInfo.storage.total) * 100).toFixed(1)
        : '--',
      signalStrength: element.environmentInfo.humidity,
      height: (!isNaN(element.positionInfo?.height)) ? element.positionInfo.height.toFixed(2) : '-',
      rainfall: element.environmentInfo.rainfall,
    };
  } catch (e) {
    return null
  }
}
// 无人机详情字段映射
export const droneDetailItem = async (deviceSn: any, element: any) => {
  try {
    if (!element) {
      const res = await $getDroneDetail(deviceSn);
      element = res.data
    }
    if (!element || !Object.keys(element)?.length) return;

    return {
      rtkNum: element.positionInfo?.positionState?.rtkNumber,
      speed: element.environmentInfo.windSpeed, // 单位：m/s
      storage: element.deviceInfo?.storage?.used && element.deviceInfo?.storage?.total
        ? ((element.deviceInfo.storage.used / element.deviceInfo.storage.total) * 100).toFixed(2)
        : '--',
      altitude: element.positionInfo.elevation,
      battery: element.flightStatusInfo.battery.capacityPercent,
      horizontalSpeed: element.flightStatusInfo.horizontalSpeed?.toFixed(2),
      totalDistance: (
        element.flightStatusInfo.totalFlightDistance / 1000
      ).toFixed(2),
    };
  } catch (e) {
    return
  }
}


export const GetHMSInfoFirst = async (deviceSn?: string) => {
  const params = {
    language: 'zh-CN',
    page: 1,
    page_size: 1,
    device_sn: [deviceSn],
    begin_time: dayjs().startOf('date').valueOf(),
    end_time: dayjs().valueOf(),
  }
  try {
    const res: any = await $getHMSInfo(params)
    return Promise.resolve(res.rows[0])
  } catch (e) {
    return Promise.resolve([{}, {}])
  }
}
