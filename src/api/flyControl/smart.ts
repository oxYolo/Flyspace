import urlConfig from "@/public-path.ts";
import request from '@/utils/request'

/**
 * 获取巡检任务列表 
 * /drone/drone/video/ai-task/list
 * @param params 查询参数
 * @param params.pageNum 页码，从 1 开始
 * @param params.pageSize 每页条数
 * @param params.inspectionSceneName 巡检场景名称（模糊查询）
 * @param params.taskId AI任务ID（精确查询）
 * @param params.missionId 飞行任务/航线执行任务ID（精确查询）
 * @param params.workspaceId 工作空间ID（精确查询）
 * @param params.status AI任务状态（精确查询）
 * @param params.targetFilePath 结果文件路径（模糊查询）
 * @returns 
 */
export function $getInspectionTaskList(params: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/list`,
        method: "get",
        params: params,
    });
}

/**
 * 上传巡检任务视频
 * /drone/drone/video/ai-task/video-upload
 * @param file 视频文件
 * @param options 请求选项
 * @returns
 */
export function $uploadInspectionTaskVideo(file: File, options: any = {}) {
    const formData = new FormData();
    formData.append("file", file);
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/video-upload`,
        method: "post",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
        ...options,
    });
}

/**
 * 新建识别任务 /drone/drone/video/ai-task/manual-submit
 * @param data 请求体
 * @param data.taskName 识别任务名称
 * @param data.inspectionSceneName 巡检场景名称
 * @param data.problemCategoryName 问题大类名称
 * @param data.aiTags 问题小类名称（多个用逗号隔隔）
 * @param data.videoUrl  待识别视频
 * @param data.videoStartTimestamp  视频开始时间
 * @returns
 */
export function $createInspectionTask(data: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/manual-submit`,
        method: "post",
        data,
    });
}

/**
 * 再次识别（识别失败的任务重新提交 AI 识别）
 * /drone/drone/video/ai-task/re-submit
 * @param data 请求体
 * @param data.taskId AI任务ID
 * @param data.videoStartTimestamp 视频开始时间戳（毫秒，可选；后端未持久化，前端有保存则回传）
 * @returns 成功时 data 为重置后的任务信息（status=SUBMITTING）
 */
export function $reSubmitInspectionTask(data: {
    taskId: string;
    videoStartTimestamp?: number;
}) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/re-submit`,
        method: "post",
        data,
    });
}



/**删除巡检任务列表 
 * /drone/drone/video/ai-task/delete
 * @param params 查询参数
 * @param params.id 
 * @returns
 */
export function $deleteInspectionTask(params: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/${params.id}`,
        method: "delete",
    });
}

/**
 * 获取巡检任务详情
 * /drone/drone/video/ai-task/issue/list
 * @param params 查询参数
 * @param params.pageNum 页码，从 1 开始
 * @param params.pageSize 每页条数
 * @param params.taskId AI任务ID（精确查询）
 * @param params.issueType 问题小类（精确查询）
 * @param params.reviewStatus 审核状态（精确查询）
 * @param params.issueTimeStart 问题时间起始
 * @param params.issueTimeEnd 问题时间结束
 * @returns
 */
export function $getInspectionTaskDetail(params: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/issue/list`,
        method: "get",
        params: params,
    });
}

/**
 * 审核巡检问题
 * /drone/drone/video/ai-task/issue/approve
 * @param data 请求体
 * @param data.id flight_ai_task_issue 问题记录 ID
 * @param data.reviewStatus 审核状态
 * - CORRECT: 识别正确
 * - INCORRECT: 识别错误
 * @returns
 */
export function $approveInspectionIssue(data: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/issue/approve`,
        method: "put",
        data,
    });
}

/**
 * 导出巡检任务详情
 * /drone/drone/video/ai-task/:taskId/inspection-report/pdf post
 * @param params 查询参数
 * @param params.taskId AI任务ID（精确查询）
 * @returns
 */
export function $exportInspectionTaskDetail(taskId: string) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/${taskId}/inspection-report/pdf`,
        method: "get",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseType: "blob",
    });
}



/**
 * 获取巡检场景、识别问题大类、识别问题小类字典(id为空，则是默认获取巡检场景)
 * /drone/api/tasks/dict/getList
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

/**
 * 获取当前巡检场景下的识别问题小类字典
 * /drone/api/tasks/dict/getThirdLevelByFirstLevelDictCode/:dictCode
 * @param dictCode 巡检场景字典ID
 * @returns
 */
export function $getThirdLevelByFirstLevelDictCode(dictCode?: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/api/tasks/dict/getThirdLevelByFirstLevelDictCode/${dictCode}`,
        method: "get",
    });
}

/**
 * 下载训练集
 *  /drone/video/ai-task/issue/export-yolo?taskId={taskId}
 * @param params 查询参数
 * @param params.taskId AI任务ID（精确查询）
 * @returns
 */
export function $downloadTrainingSet(params: any) {
    return request({
        url: `${urlConfig.baseUrl}/drone/drone/video/ai-task/issue/export-yolo?taskId=${params.taskId}`,
        method: "get",
        // responseType: "blob",
    });
}


