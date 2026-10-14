import urlConfig from "@/public-path.ts";
import request from '@/utils/request'

/**
 * 查询任务列表
 * @returns
 */
export function $getPlanList(params?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/list`,
    method: "post",
    data: params,
  });
}

/**
 * 查询任务详情
 * @param taskId 任务ID
 * @returns
 */
export function $getPlanDetail(taskId?: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/${taskId}`,
    method: "get",
  });
}

/**
 * 新增任务
 * @returns
 */
export function $addPlan(params?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks`,
    method: "post",
    data: params,
  });
}

/**
 * 修改任务
 * @returns
 */
export function $editPlan(params?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks`,
    method: "put",
    data: params,
  });
}

/**
 * 删除任务
 * @returns
 */
export function $deletePlan(ids?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/${ids}`,
    method: "delete"
  });
}

/**
 * 下发任务
 * @returns
 */
export function $distributePlan(taskId?: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/publish/${taskId}`,
    method: "post",
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
      'Content-Type': 'application/x-www-form-urlencoded'
    }
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
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    params: {
      job_id: jobId
    }
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
      pageSize: params.pageSize
    }
  });
}

/**
 * 获取巡检场景、识别问题大类、识别问题小类字典(id为空，则是默认获取巡检场景)
 * @param id 字典ID
 * @returns
 */
export function $getProblemCategoryList(id?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/api/tasks/dict/getList`,
    method: "get",
    params: { id }
  });
}
