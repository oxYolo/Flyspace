import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";
import axios from "axios";
/**
 * 统计在线的无人机架次
 * @returns
 */
export function $getflightOnline() {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/statistics/online/drones`,
    method: "get",
  });
}
/**
 * 按照类型统计无人机和机场的在线状态
 * @returns
 */
export function $getflightStatisticsByStatus() {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/statistics/status/type`,
    method: "get",
  });
}


/**
 * 查询机场设备详细信息
 * @param deviceSn
 * @returns
 */
export function $getDockDetail(deviceSn: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/dock/osd/latest/${deviceSn}`,
    method: "get",
  });
}

/**
 * 查询无人机设备详细信息
 * @param deviceSn
 * @returns
 */
export function $getDroneDetail(deviceSn: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/influxdb/query/osd/latest/${deviceSn}`,
    method: "get",
  });
}

/**
 * 根据设备名称、设备类型和在线状态查询设备列表
 * @param params
 * @returns
 */
export function $getflightList(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/statistics/devices`,
    method: "post",
    data: params,
  });
}

/**
 * 设备直播与服务交换信令
 * @param params
 * @returns
 */
export function $changeIceCandidate(params: any, data: any) {
  return request({
    url: `${urlConfig.videoUrl}/index/api/webrtc?app=live&stream=${params.id}&type=play`,
    method: "post",
    data: data,
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      isToken: false
    }
  });
}

/**
 * 目标识别模型直播与服务交换信令
 * @param params
 * @returns
 */
export function $changeIceCandidateModel(params: any, data: any) {
  return request({
    url: `${urlConfig.videoUrl}/index/api/webrtc?app=live&stream=${params.id}&type=play`,
    method: "post",
    data: data,
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      isToken: false
    }
  });
}


/**
 * 开始机场设备的直播，只需要传入机场设备序列号，系统将自动选择默认相机和视频类型
 * @param deviceSn
 * @returns
 */
export function startAirportLive(deviceSn: string | number) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/airport/start/${deviceSn}`,
    method: "post",
  });
}

/**
 * 开始无人机设备的直播，需要传入无人机设备序列号，系统将自动选择默认相机和视频类型
 * @param deviceSn
 * @returns
 */
export function startDroneLive(deviceSn: string | number) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/drone/start/${deviceSn}`,
    method: "post",
  });
}
/**
 * 开始无人机设备的AI直播；
 * @param params 参数：deviceSn，originUrl（原始视频流地址），aiTags（AI标签）
 * @returns
 */
export function startDroneAILive(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/drone/ai/start`,
    method: "post",
    data: params,
  });
}

/**
 * 停止正在进行的直播，需要提供视频ID
 * @param videoId
 * @returns
 */
export function stopLive(videoId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/stop/${videoId}`,
    method: "post",
  });
}

/**
 * 获取设备直播能力
 * @param deviceSn
 * @returns
 */
export function deviceLiveCapacity(deviceSn: string | number) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/capacity/${deviceSn}`,
    method: "get",
  });
}

/**
 * 机场切换相机镜头
 * @param params 视频ID和相机位置
 * @returns
 */
export function deviceLiveSwitchDock(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/switchDock/${params.deviceSn}/${params.cameraPosition}`,
    method: "post",
  });
}

/**
 * 无人机切换相机镜头
 * @param params 视频ID和相机类型
 * @returns
 */
export function deviceLiveSwitchDrone(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/device/live/switchDrone/${params.subDeviceSn}/${params.videoType}`,
    method: "post",
  });
}

/**
 * 退出DRC模式
 * @param params
 * @returns
 */
export function $exitDRCMode(workspace_id: string, data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/workspaces/${workspace_id}/drc/exit`,
    method: "post",
    data: data,
  });
}

/**
 * 一键起飞
 * @param params
 * @returns
 */
export function $oneKeyTakeOff(sn: string, data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/devices/${sn}/jobs/takeoff-to-point`,
    method: "post",
    data: data,
  });
}

/**
 * 获取飞行控制权
 * @param params
 * @returns
 */
export function $getFlightControl(sn: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/devices/${sn}/authority/flight`,
    method: "post",
  });
}

/**
 * 创建控制任务
 * @param params
 * @returns
 */
export function $createControlTask(sn: string, service_identifier: string, data?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/devices/${sn}/jobs/${service_identifier}`,
    method: "post",
    data: data,
  });
}

/**
 * 创建DRC连接
 * @param workspace_id
 * @param params
 * @returns
 */
export function $createDRCConnection(workspace_id: string, params?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/workspaces/${workspace_id}/drc/connect`,
    method: "post",
    data: params,
  });
}

/**
 * 进入DRC模式
 * @param params
 * @returns
 */
export function $enterDRCMode(workspace_id: string, data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/workspaces/${workspace_id}/drc/enter`,
    method: "post",
    data,
  });
}

/**
 * DRC-杆量控制
 * @param params
 * @returns
 */
export function $handleDRCStickControl(sn: string, data?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/${sn}/drc/stick-control`,
    method: "post",
    data,
    headers: {
      repeatSubmit: false
    }
  });
}

/**
 * DRC-心跳
 * @returns
 * @param sn
 * @param data
 */
export function $handleDRCHeartBeat(sn: string, data?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/${sn}/drc/heart_beat`,
    method: "post",
    data,
    headers: {
      repeatSubmit: false
    }
  });
}


/**
 * 查询航线详情
 * @param deviceSn
 * @returns
 */
export function $getRouteDetail(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/detail/${routeId}`,
    method: "get",
  });
}

/**
 * 获取负载控制权
 * @param params
 * @returns
 */
export function $handlestickControl(sn: string, data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/devices/${sn}/authority/payload`,
    method: "post",
    data,
  });
}

/**
 * 发送负载命令
 * @param params
 * @returns
 */
export function $handlestickControlSend(sn: string, data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/control/api/v1/devices/${sn}/payload/commands`,
    method: "post",
    data
  });
}

/**
 * 分页查询设备相关字典
 * @param params
 * @returns
 */
export function $handleGetDeviceDictionaryPage(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/device-dictionary/page`,
    method: "post",
    data: params
  });
}

/**
 * 获取正在进行的任务数据
 * @param deviceSn
 * @returns
 */
export function $getRunTask(deviceSn: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/task/runTask/${deviceSn}`,
    method: "get",
  });
}

/**
 * 获取设备HMS健康信息
 * @returns
 * @param params
 */
export function $getHMSInfo(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/devices/hms/devices/hms`,
    method: "post",
    data: params,
  });
}

