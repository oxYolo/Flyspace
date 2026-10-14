import urlConfig from "@/public-path.ts";
import request from "@/utils/request.ts";

export interface RequirementPageParams {
  name?: string;
  flightType?: number;
  resultType?: number;
  status?: number;
  beginTime?: string;
  endTime?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface RequirementAuditParams {
  id: number | string;
  status: number;
  remark?: string;
}

export interface RequirementStatData {
  todayNewCount?: number;
  pendingCount?: number;
  monthApprovedCount?: number;
  monthRejectedCount?: number;
}

export interface TdtReverseGeocodeResult {
  address: string;
  raw?: Record<string, any> | null;
}

/**
 * 查询飞行需求统计
 */
export function $getRequirementStat() {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/stat`,
    method: "get",
  });
}

/**
 * 上传需求附件
 */
export function $uploadRequirementFile(file: File, options: any = {}) {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: `${urlConfig.baseUrl}/file/upload`,
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
      isToken: false,
    },
    ...options,
  });
}

/**
 * 初始化需求附件分片上传任务
 */
export function $initRequirementChunkUploadTask(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/file/chunk/task`,
    method: "post",
    data: params,
    headers: { repeatSubmit: false },
  });
}

/**
 * 获取需求附件分片上传预签名地址
 */
export function $getRequirementChunkUploadUrl(
  identifier: string,
  partNumber: number,
) {
  return request({
    url: `${urlConfig.baseUrl}/file/chunk/task/${identifier}/${partNumber}`,
    method: "post",
    headers: { repeatSubmit: false },
  });
}

/**
 * 提交需求附件分片合并任务
 */
export function $mergeRequirementChunkUploadTask(identifier: string) {
  return request({
    url: `${urlConfig.baseUrl}/file/chunk/task/merge/${identifier}`,
    method: "post",
    headers: { repeatSubmit: false },
  });
}

/**
 * 查询需求附件分片上传任务状态
 */
export function $getRequirementChunkUploadTask(identifier: string) {
  return request({
    url: `${urlConfig.baseUrl}/file/chunk/task/${identifier}`,
    method: "get",
  });
}

/**
 * 更新需求附件分片上传进度
 */
export function $updateRequirementChunkUploadTaskState(params: any) {
  return request({
    url: `${urlConfig.baseUrl}/file/chunk/task/updateState`,
    method: "post",
    data: params,
    headers: { repeatSubmit: false },
  });
}

/**
 * 天地图逆地理编码
 */
export async function $reverseGeocodeByTdt(
  longitude: number,
  latitude: number,
): Promise<TdtReverseGeocodeResult> {
  const token = urlConfig.getTdtToken?.();
  if (!token) {
    throw new Error("未获取到天地图密钥");
  }

  const postStr = encodeURIComponent(
    JSON.stringify({
      lon: longitude,
      lat: latitude,
      ver: 1,
    }),
  );
  const requestUrl = `https://api.tianditu.gov.cn/geocoder?postStr=${postStr}&type=geocode&tk=${token}`;
  const response = await fetch(requestUrl, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`天地图逆地理编码请求失败: ${response.status}`);
  }

  const data = await response.json();
  const addressComponent = data?.result?.addressComponent || {};
  const formattedAddress =
    data?.result?.formatted_address ||
    [
      addressComponent.province,
      addressComponent.city,
      addressComponent.county,
      addressComponent.town,
      addressComponent.road,
      addressComponent.poi,
    ]
      .filter(Boolean)
      .join("");

  if (String(data?.status) !== "0" && !formattedAddress) {
    throw new Error(data?.msg || "天地图逆地理编码失败");
  }

  return {
    address: String(formattedAddress || "").trim(),
    raw: data || null,
  };
}

/**
 * 分页查询飞行需求
 */
export function $getRequirementPage(data: RequirementPageParams) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/byPage`,
    method: "post",
    data,
  });
}

/**
 * 按查询条件导出飞行需求 （不包含分页参数 pageNum 和 pageSize）
 */
export function $exportRequirement(
  data: Omit<RequirementPageParams, "pageNum" | "pageSize">,
): Promise<Blob> {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/export`,
    method: "post",
    data,
    responseType: "blob",
  }) as Promise<Blob>;
}

/**
 * 查询飞行需求详情
 */
export function $getRequirementDetail(id: number | string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/${id}`,
    method: "get",
  });
}

/**
 * 新增飞行需求
 */
export function $createRequirement(data: Record<string, any>) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/save`,
    method: "post",
    data,
  });
}

/**
 * 修改飞行需求
 */
export function $updateRequirement(data: Record<string, any>) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/update`,
    method: "post",
    data,
  });
}

/**
 * 删除飞行需求
 */
export function $deleteRequirement(ids: string) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/delete/${ids}`,
    method: "get",
  });
}

/**
 * 审核飞行需求
 */
export function $auditRequirement(params: RequirementAuditParams) {
  return request({
    url: `${urlConfig.baseUrl}/drone/requirement/manage/audit`,
    method: "post",
    params,
  });
}
