/**
 * @fileDescription: 空域管理API接口
 * @author: Assistant
 * @date: 2024-09-17
 * @version: 1.0
 */

import axios from 'axios';
import type {
  AirspaceApplicationModel,
  AirspaceApplicationRequestModel,
  AirspaceListParams
} from '@/model/airspace-management';
import type { ResponseModel, PageModel } from '@/model/baseResponseModel';
import urlConfig from '@/public-path';
import { getToken } from '@/utils/auth';

// 创建本地API专用的axios实例
const localApiService = axios.create({
  baseURL: `${urlConfig.baseUrl}/kygl`,
  timeout: 10000,
});

// 为本地 API 客户端附加鉴权头（如后端需要）
localApiService.interceptors.request.use((config) => {
  const token = getToken?.();
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
const baseUrl = '/api/airspace';

// 是否使用模拟数据（开发阶段为false，使用真实API）
const USE_MOCK_DATA = false;

/**
 * 获取空域申请列表
 * @param params 查询参数
 * @returns Promise<ResponseModel<PageModel<AirspaceApplicationModel>>>
 */
export async function $getAirspaceList(params: AirspaceListParams): Promise<ResponseModel<PageModel<AirspaceApplicationModel>>> {
  if (USE_MOCK_DATA) {
    // 这里可以保留mock数据作为fallback
    return Promise.resolve({ code: 200, message: 'ok', data: { list: [], total: 0, pageNum: 1, pageSize: 20 } });
  }

  const response = await localApiService({
    url: `${baseUrl}/list`,
    method: 'get',
    params
  });

  // 解析日期时间函数
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: '', time: '' };

    try {
      const date = new Date(dateTimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
      };
    } catch (error) {
      return { date: '', time: '' };
    }
  };

  // 转换后端数据格式为前端期望的格式
  const items = response.data.data.list.map((item: any) => {
    const startDateTime = parseDateTime(item.start_time || '');
    const endDateTime = parseDateTime(item.end_time || '');

    return {
      id: item.id,
      applicantUnit: item.applicant_unit,
      contactPerson: item.contact_person,
      contactPhone: item.contact_phone,
      flightType: item.flight_type,
      subject: item.subject,
      name: item.name,
      flightMode: item.flight_mode,
      type: item.type,
      purpose: item.purpose,
      startDate: startDateTime.date || item.start_date || '',
      endDate: endDateTime.date || item.end_date || '',
      startTime: startDateTime.time || item.start_time || '',
      endTime: endDateTime.time || item.end_time || '',
      altitude: item.altitude_min || item.altitude_max ? {
        min: item.altitude_min || 0,
        max: item.altitude_max || 0
      } : undefined,
      coordinates: item.geometry_geojson?.coordinates?.[0] || [],
      adep: item.adep,
      ades: item.ades,
      alnap: item.alnap,
      memo: item.memo,
      proc: item.proc,
      files: item.files || [],
      remarks: item.remarks,
      status: item.status,
      createTime: item.create_time,
      updateTime: item.update_time,
      createBy: item.create_by,
      updateBy: item.update_by
    };
  });

  return {
    code: response.data.code,
    message: response.data.message,
    data: {
      list: items,
      total: response.data.data.total,
      pageNum: response.data.data.pageNum,
      pageSize: response.data.data.pageSize
    }
  };
}

/**
 * 获取空域申请详情
 * @param id 申请ID
 * @returns Promise<ResponseModel<AirspaceApplicationModel>>
 */
export async function $getAirspaceDetail(id: string): Promise<ResponseModel<AirspaceApplicationModel>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: {} as AirspaceApplicationModel });
  }

  const response = await localApiService({
    url: `${baseUrl}/detail/${id}`,
    method: 'get'
  });

  const item = response.data.data;

  // 解析日期时间函数
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: '', time: '' };

    try {
      const date = new Date(dateTimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
      };
    } catch (error) {
      return { date: '', time: '' };
    }
  };

  const startDateTime = parseDateTime(item.start_time || '');
  const endDateTime = parseDateTime(item.end_time || '');

  // 转换后端数据格式为前端期望的格式
  const transformedData = {
    id: item.id,
    applicantUnit: item.applicant_unit,
    contactPerson: item.contact_person,
    contactPhone: item.contact_phone,
    flightType: item.flight_type,
    subject: item.subject,
    name: item.name,
    flightMode: item.flight_mode,
    type: item.type,
    purpose: item.purpose,
    startDate: startDateTime.date || item.start_date || '',
    endDate: endDateTime.date || item.end_date || '',
    startTime: startDateTime.time || '',
    endTime: endDateTime.time || '',
    altitude: item.altitude_min || item.altitude_max ? {
      min: item.altitude_min || 0,
      max: item.altitude_max || 0
    } : undefined,
    coordinates: item.geometry_geojson?.coordinates?.[0] || [],
    adep: item.adep,
    ades: item.ades,
    alnap: item.alnap,
    memo: item.memo,
    proc: item.proc,
    files: item.files || [],
    remarks: item.remarks,
    status: item.status,
    createTime: item.create_time,
    updateTime: item.update_time,
    createBy: item.create_by,
    updateBy: item.update_by
  };

  return {
    code: response.data.code,
    message: response.data.message,
    data: transformedData
  };
}

/**
 * 创建空域申请
 * @param data 申请数据
 * @returns Promise<ResponseModel<AirspaceApplicationModel>>
 */
export async function $createAirspace(data: AirspaceApplicationRequestModel): Promise<ResponseModel<AirspaceApplicationModel>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: {} as AirspaceApplicationModel });
  }

  // 转换前端数据格式为后端期望的格式
  const backendData = {
    applicant_unit: data.applicantUnit || '',
    contact_person: data.contactPerson || '',
    contact_phone: data.contactPhone || '',
    flight_type: data.flightType || 'UAV',
    subject: data.subject || data.applicantUnit || '',
    name: data.name || data.subject || '',
    flight_mode: data.flightMode || 'BVLOS',
    type: data.type || 'TEMPORARY',
    purpose: data.purpose || '',
    start_date: data.startDate || new Date().toISOString().split('T')[0],
    end_date: data.endDate || new Date().toISOString().split('T')[0],
    start_time: data.startTime || '08:00:00',
    end_time: data.endTime || '18:00:00',
    altitude_min: data.altitude?.min || null,
    altitude_max: data.altitude?.max || null,
    geometry_geojson: data.coordinates && data.coordinates.length > 0 ? {
      type: 'Polygon',
      coordinates: [data.coordinates]
    } : null,
    adep: data.adep || '',
    ades: data.ades || '',
    alnap: data.alnap || '',
    memo: data.memo || '',
    proc: data.proc || '',
    files: data.files || [],
    remarks: data.remarks || '',
    status: 'DRAFT',
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
    create_by: 'user',
    update_by: 'user'
  };

  const response = await localApiService({
    url: `${baseUrl}/create`,
    method: 'post',
    data: backendData
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data
  };
}

/**
 * 更新空域申请
 * @param id 申请ID
 * @param data 申请数据
 * @returns Promise<ResponseModel<AirspaceApplicationModel>>
 */
export async function $updateAirspace(id: string, data: AirspaceApplicationRequestModel): Promise<ResponseModel<AirspaceApplicationModel>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: {} as AirspaceApplicationModel });
  }

  // 转换前端数据格式为后端期望的格式
  const backendData = {
    applicant_unit: data.applicantUnit || '',
    contact_person: data.contactPerson || '',
    contact_phone: data.contactPhone || '',
    flight_type: data.flightType,
    subject: data.subject,
    name: data.name,
    flight_mode: data.flightMode,
    type: data.type,
    purpose: data.purpose || '',
    start_date: data.startDate,
    end_date: data.endDate,
    start_time: data.startTime,
    end_time: data.endTime,
    altitude_min: data.altitude?.min || null,
    altitude_max: data.altitude?.max || null,
    geometry_geojson: data.coordinates && data.coordinates.length > 0 ? {
      type: 'Polygon',
      coordinates: [data.coordinates]
    } : null,
    adep: data.adep || '',
    ades: data.ades || '',
    alnap: data.alnap || '',
    memo: data.memo || '',
    proc: data.proc || '',
    files: data.files || [],
    remarks: data.remarks || '',
    status: 'DRAFT',
    update_time: new Date().toISOString(),
    update_by: 'user'
  };

  const response = await localApiService({
    url: `${baseUrl}/update/${id}`,
    method: 'put',
    data: backendData
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data
  };
}

/**
 * 删除空域申请
 * @param id 申请ID
 * @returns Promise<ResponseModel<void>>
 */
export async function $deleteAirspace(id: string): Promise<ResponseModel<void>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: undefined as any });
  }

  const response = await localApiService({
    url: `${baseUrl}/delete/${id}`,
    method: 'delete'
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data || undefined as any
  };
}

/**
 * 提交空域申请
 * @param id 申请ID
 * @returns Promise<ResponseModel<void>>
 */
export async function $submitAirspace(id: string): Promise<ResponseModel<void>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: undefined as any });
  }

  const response = await localApiService({
    url: `${baseUrl}/submit/${id}`,
    method: 'post'
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data || undefined as any
  };
}

/**
 * 保存草稿
 * @param data 申请数据
 * @returns Promise<ResponseModel<AirspaceApplicationModel>>
 */
export async function $saveDraft(data: AirspaceApplicationRequestModel): Promise<ResponseModel<AirspaceApplicationModel>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: {} as AirspaceApplicationModel });
  }

  const response = await localApiService({
    url: `${baseUrl}/draft`,
    method: 'post',
    data
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data
  };
}

/**
 * 更新草稿
 * @param id 申请ID
 * @param data 申请数据
 * @returns Promise<ResponseModel<AirspaceApplicationModel>>
 */
export async function $updateDraft(id: string, data: AirspaceApplicationRequestModel): Promise<ResponseModel<AirspaceApplicationModel>> {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ code: 200, message: 'ok', data: {} as AirspaceApplicationModel });
  }

  const response = await localApiService({
    url: `${baseUrl}/draft/${id}`,
    method: 'put',
    data
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data
  };
}

/**
 * 文件上传
 * @param file 文件对象
 * @returns Promise<ResponseModel<{url: string}>>
 */
export async function $uploadFile(file: File): Promise<ResponseModel<{ url: string }>> {
  if (USE_MOCK_DATA) {
    // 模拟文件上传成功
    return Promise.resolve({
      code: 200,
      message: '上传成功',
      data: {
        url: `/uploads/${file.name}`
      }
    });
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await localApiService({
    url: `${baseUrl}/upload`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data
  };
}

/**
 * 批量删除空域申请
 * @param ids 申请ID数组
 * @returns Promise<ResponseModel<void>>
 */
export async function $batchDeleteAirspace(ids: string[]): Promise<ResponseModel<void>> {
  const response = await localApiService({
    url: `${baseUrl}/batch-delete`,
    method: 'post',
    data: { ids }
  });
  return {
    code: response.data.code,
    message: response.data.message,
    data: response.data.data || undefined as any
  };
}