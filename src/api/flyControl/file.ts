import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";

/**
 * 分页查询媒体文件列表
 * @param data
 * @returns
 */
export function $getMediaList(data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/page`,
    method: "post",
    data
  })
}

/**
 * 删除媒体文件
 * @param ids
 * @returns
 */
export function $deleteMedia(ids?: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/${ids}`,
    method: "delete"
  })
}


/**
 * 分页查询所有文件及文件夹列表
 * @param data
 * @returns
 */
export function $getAllMediaList(data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/folder/allPage`,
    method: "post",
    data
  })
}

/**
 * 根据任务ID分页查询媒体文件（按 fileType 区分照片/视频）
 * GET /drone/media/task/{taskId}/page?fileType=&pageNum=&pageSize=
 * @param taskId 任务ID（取自 allPage 返回的 folder 节点 taskId 字段）
 * @param params { fileType?: 'PHOTO'|'VIDEO', pageNum?, pageSize? }
 * @returns
 */
export function $getMediaByTask(taskId: string, params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/task/${taskId}/page`,
    method: "get",
    params,
  });
}

/**
 * 获取文件占用大小
 * @param data
 * @returns
 */
export function $getMediaSize(data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/statistics/fileSize`,
    method: "post",
    data
  })
}

/**
 * 创建媒体文件打包
 * @param params 打包参数
 * @returns
 */
export function $createMediaPackage(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/package/create`,
    method: "post",
    data: params,
  });
}

/**
 * 获取打包列表
 * @param params 查询参数
 * @returns
 */
export function $getPackageList(params?: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/media/package/page`,
    method: "post",
    data: params,
  });
}

/**
 * 新增图片标注信息
 * /inspection/image/label/save
 * @param data 标注信息
 * @returns
 */
export function $saveAnnotation(data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/image/label/save`,
    method: "post",
    data
  })
}

/**
 * 获取标注信息图片
 * @param fileId 文件ID
 * @returns
 */
export function $getAnnotation(params: any, options: any = {}) {
  return request({
    url: `${urlConfig.baseUrl}/drone/image/label/preview`,
    method: "get",
    params,
    ...options
  })
}

/**
 * 预览图片标注信息
 * /inspection/image/label/preview?identifyDictId=&labelEn=&imageId=
 * @param params
 * @param params.imageId 必传
 * @param params.identifyDictId 非必传
 * @param params.labelEn 非必传
 * @returns
 */
export function $previewInspectionAnnotation(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/image/label/preview`,
    method: "get",
    params,
  });
}

/**
 * 下载标注信息文件
 * /drone/inspection/image/label/download?imageId=${imageId}
 * @param imageId 图片ID
 * @returns
 */
export function $downloadInspectionAnnotation(params: any, options: any = {}) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/image/label/download`,
    method: "get",
    params,
    ...options
  })
}

/**
 * 分页查询样本列表
 * /inspection/sample/byPage
 * @param data
 * @returns
 */
export function $getInspectionSampleByPage(data: any) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/sample/byPage`,
    method: "post",
    data,
  });
}

/**
 * 根据样本集ID查找识别问题关联信息
 * /inspection/sample/labelInfos/{sampleInfoId}
 * @param sampleInfoId
 * @returns
 */
export function $getInspectionSampleLabelInfos(sampleInfoId: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/sample/labelInfos/${sampleInfoId}`,
    method: "get",
  });
}

/**
 * 根据场景查找样本集
 * /inspection/sample/byScene
 * @param scene 场景名称
 * @returns
 */
export function $getInspectionSampleByScene(scene: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/sample/byScene`,
    method: "get",
    params: { scene },
  });
}

export function $getInspectionImageLabelSceneProblems(imageId: string | number) {
  return request({
    url: `${urlConfig.baseUrl}/drone/inspection/image/label/sceneProblems`,
    method: "get",
    params: { imageId },
  });
}
