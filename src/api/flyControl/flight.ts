import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";
/**
 * 查询航线列表
 * @returns
 */
export function $getAllflight(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/list`,
    method: "post",
    data: params
  });
}

/**
 * 新增航线
 * @returns
 */
export function $addflight(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route`,
    method: "post",
    data: params
  });
}

/**
 * 删除航线
 * @param routeId: 航线ID
 * @returns
 */
export function $removeflight(ids: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/${ids}`,
    method: "delete",
  });
}

/**
 * 批量删除航线（接口占位）
 * TODO: 后端批量删除接口确定后，替换下面的请求地址和请求参数。
 * @param ids 航线ID列表
 * @returns
 */
export function $batchRemoveflight(ids: Array<string | number>) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/batch-delete`,
    method: "delete",
    data: { ids },
  });
}

/**
 * 修改航线
 * @param params
 * @returns
 */
export function $editflight(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route`,
    method: "put",
    data: params
  });
}

/**
 * 导出航线文件
 * @param routeId
 * @returns
 */
export function $exportflight(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/download/${routeId}`,
    method: "get",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    responseType: "blob",
  });
}

/**
 * 修改面状航线
 * @returns
 */
export function $editAreaFlight(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/mapping`,
    method: "put",
    data: params
  });
}

/**
 * 新增面状航线
 * @returns
 */
export function $saveAreaFlight(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/mapping`,
    method: "post",
    data: params
  });
}

/**
 * 批量保存航线航点
 * @returns
 */
export function $saveFlightPoints(params: any, routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/point/batch/${routeId}`,
    method: "post",
    data: params
  });
}

/**
 * 面状航线规划生成航点
 * @param routeId: 航线ID
 * @returns
 */
export function $planRouteByrouteId(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/planRouteByrouteId/${routeId}`,
    method: "get",
  });
}

/**
 * 带状航线规划生成航点
 * @param routeId: 航线ID
 * @returns
 */
export function $planStripLineByRouteId(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/planStripLineByRouteId/${routeId}`,
    method: "get",
  });
}

/**
 * 根据routeId获取航线详情
 * @param routeId: 航线ID
 * @returns
 */
export function $getRouteDetailByRouteId(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/detail/${routeId}`,
    method: "get",
  });
}

/**  
 * 创建航线模拟器
 * @param params 
 * @returns
 */
export function $createFlightSimulator(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/engine/flightsimulator/create`,
    method: "post",
    data: params,
  });
}



/**
 * 导入航线文件
 * @param params
 * @returns
 */
export function $uploadflight(params: any, routeId: string, config: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/import/${routeId}`,
    method: "post",
    data: params,
    headers: {
      "Content-Type": "multipart/form-data"
    },
    ...config
  });
}

/**
 * 获取航线航点列表
 * @param routeId: 航线ID
 * @returns
 */
export function $getFlightPoint(routeId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/route/points/${routeId}`,
    method: "get",
  });
}

/**
 * 根据北斗网格码生成航线路径
 */
export function $createBeiDouRoutePath(data: any) {
  return request({
    url: `${urlConfig.schoolUrl}/auto-plan/api/path-planning`,
    method: "post",
    data
  });
}


/**
 * 获取路径规划（避障后的航线路径）/beidou/path-planning
 * @param {any} params 
 * @returns
 */
export function $getObstacleAvoidanceRoutePath(params: any, timeoutMs: number = 10 * 60 * 1000,) {
  return request({
    url: `${urlConfig.baseUrl}/beidou/path-planning`,
    method: "post",
    data: params,
    timeout: timeoutMs,
  });
}

/**
 * 面状区域覆盖规划（避障） /beidou/area-path-planning
 * @param params 区域覆盖规划参数
 * @returns 
 */
export function $areaPathPlanning(params: any, timeoutMs: number = 10 * 60 * 1000) {
  return request({
    url: `${urlConfig.baseUrl}/beidou/area-path-planning`,
    method: "post",
    data: params,
    timeout: timeoutMs,
  });
}

/**
 * 带状区域航线规划（避障） /beidou/strip-path-planning
 * @param params 带状航线规划参数
 * @returns
 */
export function $stripPathPlanning(params: any, timeoutMs: number = 10 * 60 * 1000,) {
  return request({
    url: `${urlConfig.baseUrl}/beidou/strip-path-planning`,
    method: "post",
    data: params,
    timeout: timeoutMs,
  });
}

/**
 * 保存航线网格
 * /engine/routegrid/saveRouteGrids
 * 保存航线网格
 * @param params routeId: 航线ID
 * @param params gridCode: 航线网格码
 * @returns 
 */
export function $saveRouteGrids(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/engine/routegrid/saveRouteGrids`,
    method: "post",
    data: params,
  });
}

/**
 * 获取航线置信度
 * /engine/confidenceScore/getList
 * @param params routeId: 航线ID
 * @returns 
 */
export function $getRouteConfidenceScore(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/engine/confidenceScore/getList`,
    method: "post",
    data: params,
  });
}


/**
 * 获取路径规划的北斗网格码 /engine/gridata/getFlyLine
 * @param {any} params 
 * @returns
 */
export function $getFlyLineGridCodes(params: any, timeoutMs: number = 10 * 60 * 1000,) {
  return request({
    url: `${urlConfig.baseUrl}/engine/gridata/getFlyLine`,
    method: "post",
    data: params,
    timeout: timeoutMs,
  });
}

/**
 * 获取工作区列表
 * @returns
 * 所有工作区 /gis/airspace/getByType/1
 */
export function $getWorkAreaList(type: number = 1) {
  return request({
    url: `${urlConfig.baseUrl}/gis/airspace/getByType/${type}`,
    method: "get",
  });
}

/**
 * 获取工作区详情 
 * @param id 工作区ID
 * @returns 
 */
export function $getWorkAreaDetail(id: string) {
  return request({
    url: `${urlConfig.baseUrl}/gis/airspace/getInfo/${id}`,
    method: "get",
  });
}
