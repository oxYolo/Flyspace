export interface DeviceInfo {
  id?: number;
  name?: string;
  deviceName?: string;
  type?: string;
  status?: string;
  onlineStatus?: number;
  workStatus?: number;
  deviceSn?: string;
  subDeviceSn?: string,
  workspaceId?: string;
  longitude?: number;
  latitude?: number;
  nickname?: string;
}
// 无人机状态类型定义
export interface DroneStatus {
  deviceSn?: string;
  positionInfo?: {
    longitude: number;
    latitude: number;
    altitude: number;
    height: number;
    elevation: number;
    homeDistance: number;
    positionState?: {
      gpsNumber: number;
    }
  };
  attitudeInfo?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  batteryInfo?: {
    capacityPercent: number;
    remainingTime: number;
  };
  flightStatus?: string;
  flightStatusInfo?: {
    battery?: {
      remainFlightTime: number;
      capacityPercent: number;
    };
    horizontalSpeed?: number;
    verticalSpeed?: number;
  };
  environmentInfo?: {
    windSpeed: number;
  };
  deviceInfo?: {
    storage?: {
      used: number;
    }
  }
}
