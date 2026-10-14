import { $getMediaList, $deleteMedia, $getAllMediaList, $getMediaSize, $getMediaByTask } from '@/api/flyControl/file'
import { $handleGetDeviceDictionaryPage } from '@/api/flyControl/device'
// @ts-ignore
import { renderMediaToMap, setupMediaInteraction, } from "@/services/mediaService_readable.js";
// @ts-ignore
import { getMapManager } from "@/services/mapService";

interface MediaListParams {
  page: number;
  pageSize: number;
  fileName: string;
  createTimeStart: string;
  updateTimeEnd: string;
  fileType: string;
  payloadSn: string;
}
/**
 * 获取媒体文件列表
 * @param params 媒体文件列表参数
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function getMediaList(params: MediaListParams) {
  try {
    const res: any = await $getMediaList(params);
    if (res.code === 200) {
      return { records: res.rows || [], total: res.total || 0 }
    } else {
      const errorMsg = res.msg || '获取媒体文件列表失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
}

/**
 * 获取设备相关字典
 * @param params 字典参数
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function getDeviceDictionary(params: any) {
  try {
    const res: any = await $handleGetDeviceDictionaryPage(params);
    // 获取设备字典数据
    if (res.code === 200) {
      return { records: res.rows || [], total: res.total || 0 }
    } else {
      const errorMsg = res.msg || '获取设备相关字典失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '获取设备相关字典失败';
    return Promise.reject(errorMsg);
  }
}

/**
 * 删除媒体文件
 * @param ids 媒体文件ID
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function deleteMedia(ids: string) {
  try {
    const res: any = await $deleteMedia(ids);
    if (res.code === 200) {
      return res.msg || '删除媒体文件成功';
    } else {
      const errorMsg = res.msg || '删除媒体文件失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '删除媒体文件失败';
    return Promise.reject(errorMsg);
  }
}

/**
 * 导出媒体文件
 * @param params 导出媒体文件参数
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function exportMedia(task: any) {
  try {
    // 验证参数
    if (!task.filePath || !task.name) {
      throw new Error('文件路径或文件名不能为空');
    }

    // 使用fetch强制下载所有文件
    const response = await fetch(task.filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // 创建下载链接
    const link = document.createElement('a');
    link.href = url;
    link.download = task.name;
    link.style.display = 'none';

    // 添加到DOM并触发点击
    document.body.appendChild(link);
    link.click();

    // 清理资源
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    return Promise.resolve('导出媒体文件成功');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '导出媒体文件失败';
    console.log(errorMsg);
    return Promise.reject(errorMsg);
  }
}

/**
 * 分页查询所有文件及文件夹列表
 * @param params 分页查询所有文件及文件夹列表参数
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function getAllMediaList(params: MediaListParams) {
  try {
    const res: any = await $getAllMediaList(params);
    if (res.code === 200) {
      return { records: res.rows || [], total: res.total || 0 }
    } else {
      const errorMsg = res.msg || '获取媒体文件列表失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
}

/**
 * 获取文件占用大小
 * @param params
 * @returns
 */
export async function getMediaSize(params: any) {
  try {
    const res: any = await $getMediaSize(params);
    if (res.code === 200) {
      return { data: res.data }
    } else {
      const errorMsg = res.msg || '获取媒体文件占用失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
}
const DATASOURCE_NAME = 'media';
/**
 * 获取媒体数据
 */
export async function fetchMediaList(params: any, renderAndZoom: boolean = false) {
  try {
    const defaultParams = {
      name: '',
      createTimeStart: '',
      updateTimeEnd: '',
      fileType: '',
      payloadSn: '',
      page: 1,
      pageSize: 10
    };
    const queryParams = { ...defaultParams, ...params };
    if (params.createTime && !params.createTimeStart) {
      queryParams.createTimeStart = params.createTime;
    }
    if (params.pageNum && !params.page) {
      queryParams.page = params.pageNum;
    }
    const data = await getAllMediaList(queryParams);

    const result = {
      records: data?.records || [],
      total: data?.total || 0,
      success: true
    };
    if (renderAndZoom && result.success) {
      await renderMediaToMap(result.records.filter((item: any) => item.fileType !== 'folder'));
      const mapManager = getMapManager();
      mapManager?.zoomToDataSource(DATASOURCE_NAME)
      setupMediaInteraction();
    }

    return result;
  } catch (error) {
    console.log(error);
    return { records: [], total: 0, success: false, error };
  }
}

/**
 * 根据任务ID分页查询媒体文件（照片/视频）
 * @param taskId 任务ID（allPage 返回的 folder 节点 taskId 字段）
 * @param params { fileType, pageNum, pageSize }
 * @param renderAndZoom 是否渲染到地图并缩放
 */
export async function fetchMediaByTask(taskId: string, params: any, renderAndZoom: boolean = false) {
  try {
    if (!taskId) {
      return { records: [], total: 0, success: false, error: 'taskId 为空' };
    }
    const defaultParams = {
      fileType: '',
      pageNum: 1,
      pageSize: 10,
    };
    const queryParams = { ...defaultParams, ...params };
    const res: any = await $getMediaByTask(taskId, queryParams);
    if (res.code !== 200) {
      return { records: [], total: 0, success: false, error: res.msg };
    }
    const result = {
      records: res.rows || [],
      total: res.total || 0,
      success: true,
    };
    if (renderAndZoom && result.success) {
      await renderMediaToMap(result.records.filter((item: any) => item.fileType !== 'folder'));
      const mapManager = getMapManager();
      mapManager?.zoomToDataSource(DATASOURCE_NAME);
      setupMediaInteraction();
    }
    return result;
  } catch (error) {
    console.log(error);
    return { records: [], total: 0, success: false, error };
  }
}

export async function getAllMediaSize() {
  const { data } = await getMediaSize({});
  for (let key in data) {
    let item = data[key]
    if (item.totalSize > 0) {
      item.totalSize = (item.totalSize / 1024).toFixed(2) + ' M';
    } else {
      item.totalSize = '0 M';
    }
  }
  return data;
}
