import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";
/**
 * 查询航线列表
 * @returns
 */
export function $getTaskList(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/task/page`,
    method: "post",
    data: params,
  });
}

export function $getTaskResult(taskId: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/statistics/fileTypes/${taskId}`,
    method: "get",
  });
}

export function $getOSDMission(jobId: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/influxdb/query/osd/mission/${jobId}`,
    method: "get",
  });
}

export function $getOSDMissionPage(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/influxdb/query/osd/page`,
    method: "post",
    data: params,
  });
}

export function $getJobInfoByTaskId(taskId: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/${taskId}/wayline-jobs`,
    method: "get",
  });
}
// 查询历史视频列表：/drone/flight/video/list/{jobId}
export function $getVideoList(jobId: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/flight/video/list/${jobId}`,
    method: "get",
  });
}
// 查询历史AI视频：/drone/video/ai-task/list  支持传missionId，status，targetFilePath
export function $getAIVideoList(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/list`,
    method: "get",
    params: params,
  });
}

// 分发任务
export function $distributeTask(taskId: string, params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/drone/task/distribute/${taskId}`,
    method: "post",
    data: params,
  });
}

export function $changeFlyTaskStatus(job_id: string, params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/wayline/api/v1/workspaces/drone/jobs/${job_id}`,
    method: "put",
    data: params,
  });
}

/**
 * 查询子计划列表（执行计划）
 * @param params 包含taskId和分页参数
 * @returns
 */
export function $getSubPlanList(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/${params.taskId}/wayline-jobs`,
    method: "get",
    params: {
      page: params.page,
      pageSize: params.pageSize,
    },
  });
}

/**
 * 取消任务
 * @param taskId 任务ID
 * @returns
 */
export function $cancelTask(taskId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/cancel/${taskId}`,
    method: "put",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

/**
 * 取消航线任务
 * @param jobId 任务ID集合
 * @returns
 */
export function $cancelWaylineJob(jobId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/wayline/api/v1/workspaces/drone/jobs`,
    method: "delete",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    params: {
      job_id: jobId,
    },
  });
}
