import {
  $createControlTask,
  $handlestickControlSend,
  $handlestickControl,
  $handleDRCStickControl,
  $getflightList,
  $getRouteDetail,
  $getRunTask
} from "@/api/flyControl/device";
import {
  $getPlanList,
  $addPlan,
  $deletePlan,
  $editPlan,
  $distributePlan,
  $getProblemCategoryList,
} from "@/api/flyControl/control";
import { $getAllflight } from '@/api/flyControl/flight.ts'
import { $changeFlyTaskStatus } from "@/api/flyControl/task.ts";
import { useRouterLibraryStore } from "@/stores/modules/routerLibrary";

interface ControlTaskParams {
  sn: string
  service_identifier: string
}

/**
 * 创建控制任务
 * @param params 控制任务参数
 * @returns 成功返回接口响应数据，失败返回错误信息
 */
export async function createControlTask(params: ControlTaskParams) {
  try {
    const { sn, service_identifier } = params;
    const res: any = await $createControlTask(sn, service_identifier, { action: 0 });
    if (res.code === 200 || res.code === 0) {
      return res.msg || '操作成功';
    } else {
      const errorMsg = res.msg || '控制失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
}


export const handleRTCFlyControl = async (params: any) => {
  try {
    const { sn } = params;
    const res: any = await $handleDRCStickControl(sn, params);
    if (res.code === 200 || res.code === 0) {
      return res.msg;
    } else {
      const errorMsg = res.msg || '控制失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
}

/**
 * 通用设备控制函数 - 只处理公共的API调用部分
 * @param deviceSn 设备序列号
 * @param baseParams 基础请求参数
 * @param sendParams 发送的命令参数
 * @param skipBaseControl 是否跳过基础控制调用
 * @returns
 */
export const handleDeviceCommand = async (
  deviceSn: string,
  baseParams: Record<string, any>,
  sendParams: {
    sn: string;
    cmd: string;
    data: Record<string, any>;
  },
  skipBaseControl: boolean = false
) => {
  // 统一的请求处理逻辑
  try {
    // 只有在不跳过基础控制时才调用
    let canContinue = true;
    if (!skipBaseControl) {
      const res: any = await $handlestickControl(deviceSn, baseParams);
      canContinue = (res.code === 200 || res.code === 0);
    }

    if (canContinue) {
      try {
        const sendRes: any = await $handlestickControlSend(deviceSn, sendParams);
        if (sendRes.code === 200 || sendRes.code === 0) {
          return sendRes.msg;
        } else {
          const errorMsg = sendRes.msg || '控制失败';
          return Promise.reject(errorMsg);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
        return Promise.reject(errorMsg);
      }
    } else {
      const errorMsg = '基础控制请求失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '控制时发生未知错误';
    return Promise.reject(errorMsg);
  }
};

/**
 * 一键水平、一键垂直
 * @param deviceSn 设备序列号
 * @param resetMode 复位模式
 * @param payloadIndex 负载索引
 * @returns
 */
export const handleControl = async (deviceSn: any, resetMode: any, payloadIndex: any) => {
  // 基础控制参数
  const baseParams = { payloadIndex };

  // 发送参数
  const sendParams = {
    sn: deviceSn,
    cmd: "gimbal_reset",
    data: {
      payloadIndex,
      resetMode
    }
  };

  return handleDeviceCommand(deviceSn, baseParams, sendParams);
};

/**
 * 控制摄像头焦距变化
 * @param deviceSn 设备序列号
 * @param payloadIndex 负载索引
 * @param cameraType
 * @param zoomFactor
 * @returns
 */
export const handleControlZoomFactor = async (deviceSn: string, payloadIndex: string, cameraType: string, zoomFactor: number) => {
  // 基础控制参数
  const baseParams = { payloadIndex };

  // 发送参数
  const sendParams = {
    sn: deviceSn,
    cmd: "camera_focal_length_set",
    data: {
      payloadIndex,
      // 只有变焦镜头能变焦
      cameraType: 'zoom',
      zoomFactor
    }
  };

  return handleDeviceCommand(deviceSn, baseParams, sendParams);
};

/**
 * 云台模式
 * @param deviceSn 设备序列号
 * @param mode 方向
 * @param payloadIndex 负载索引
 * @param cameraType
 * @returns
 */
export const handleControlVideo = async (deviceSn: any, mode: any, payloadIndex: any, cameraType: string) => {
  // 基础控制参数
  const baseParams = { payloadIndex };

  // 计算方向
  const center = 0.5;
  const step = 0.05;

  // 准备坐标参数
  let x = center;
  let y = center;

  switch (mode) {
    case 'arrowleft':
      x = center - step;
      y = center;
      break;
    case 'arrowright':
      x = center + step;
      y = center;
      break;
    case 'arrowup':
      y = center - step;
      x = center;
      break;
    case 'arrowdown':
      y = center + step;
      x = center;
      break;
  }

  // 发送参数
  const sendParams = {
    sn: deviceSn,
    cmd: "camera_aim",
    data: {
      payloadIndex,
      locked: false,
      cameraType,
      x,
      y
    }
  };

  return handleDeviceCommand(deviceSn, baseParams, sendParams);
};

/**
 * 拍照功能（内部先切换到拍照模式）
 * @param deviceSn 设备序列号
 * @param payloadIndex 负载索引
 * @param currentCameraMode
 * @returns
 */
export const handleTakePhoto = async (deviceSn: string, payloadIndex: string, currentCameraMode: number) => {
  try {
    if (currentCameraMode !== 0) {
      // 先切换到拍照模式
      await handleSwitchCameraMode(deviceSn, payloadIndex, '0');
    }

    // 基础控制参数
    const baseParams = { payloadIndex };

    // 拍照参数
    const photoParams = {
      sn: deviceSn,
      cmd: "camera_photo_take",
      data: {
        payloadIndex
      }
    };

    // 使用通用命令发送拍照请求
    return await handleDeviceCommand(deviceSn, baseParams, photoParams, true);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '拍照操作失败';
    return Promise.reject(errorMsg);
  }
};

/**
 * 录制视频（内部先切换到录制模式）
 * @param deviceSn 设备序列号
 * @param payloadIndex 负载索引
 * @param isStart 是否开始录制
 * @param currentCameraMode
 * @returns
 */
export const handleRecordVideo = async (deviceSn: string, payloadIndex: string, isStart: boolean, currentCameraMode: number) => {
  try {
    // 如果是开始录制，需要先切换模式
    if (isStart && currentCameraMode !== 1) {
      await handleSwitchCameraMode(deviceSn, payloadIndex, '1');
    }

    // 基础控制参数
    const baseParams = { payloadIndex };

    // 录制视频参数
    const recordParams = {
      sn: deviceSn,
      cmd: isStart ? "camera_recording_start" : "camera_recording_stop",
      data: {
        payloadIndex
      }
    };

    // 使用通用命令发送录制请求
    return await handleDeviceCommand(deviceSn, baseParams, recordParams, true);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '视频录制操作失败';
    return Promise.reject(errorMsg);
  }
};

/**
 * 全景拍照（内部先切换到全景模式）
 * @param deviceSn 设备序列号
 * @param payloadIndex 负载索引
 * @param currentCameraMode
 * @returns
 */
export const handlePanoramaPhoto = async (
  deviceSn: string,
  payloadIndex: string,
  currentCameraMode: number
) => {
  try {
    // 如果是开始全景拍照，需要先切换模式
    if (currentCameraMode !== 3) {
      await handleSwitchCameraMode(deviceSn, payloadIndex, '3');
    }

    // 基础控制参数
    const baseParams = { payloadIndex };

    // 全景拍照参数
    const panoramaParams = {
      sn: deviceSn,
      cmd: "camera_photo_take",
      data: {
        payloadIndex
      }
    };

    // 使用通用命令发送全景拍照请求
    return await handleDeviceCommand(deviceSn, baseParams, panoramaParams, true);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '全景拍照操作失败';
    return Promise.reject(errorMsg);
  }
};

/**
 * 切换相机模式
 * @param deviceSn 设备序列号
 * @param payloadIndex 负载索引
 * @param mode 相机模式：'0'-拍照、'1'-录制、'3'-全景
 * @returns
 */
export const handleSwitchCameraMode = async (
  deviceSn: string,
  payloadIndex: string,
  mode: '0' | '1' | '3' //拍照、录制、全景
) => {
  // 基础控制参数
  const baseParams = { payloadIndex };

  // 发送参数
  const sendParams = {
    sn: deviceSn,
    cmd: 'camera_mode_switch',
    data: {
      payloadIndex,
      cameraMode: mode
    }
  };

  return handleDeviceCommand(deviceSn, baseParams, sendParams);
};

/**
 * 查询计划库列表
 * @returns
 */
export async function getPlanList(data: any) {
  try {
    const res: any = await $getPlanList(data);
    if (res.code === 200) {
      return res;
    } else {
      const errorMsg = res.msg || '查询失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '查询时发生未知错误';
    return Promise.reject(errorMsg);
  }
}

/**
 * 新增/编辑计划
 * @param formModel 来自 CreateTask.vue 新建任务表单的 payload（{ ...formModel, aiTags 已 join 成逗号字符串 }），
 *                  字段默认值见 CreateTask.vue 中 formModel 初始化（taskStrategy:0、flightAltitude:100、flightStatus:1 等）
 * @returns { type, info } 校验未通过返回 warning，提交结果返回 success/error
 */
export async function addPlan(formModel: any) {
  // —— 基础必填校验：计划名称、执行设备 ——
  if (!formModel.taskName) return { type: 'warning', info: '请填写计划名称' };
  if (!formModel.deviceSn) return { type: 'warning', info: '请选择执行设备' };
  // 执行模式枚举，按 taskStrategy 索引取值：0=立即执行 1=单次定时 2=周期重复 3=持续任务
  const taskList = ["immediate", "scheduled", "recurring", "continuous"]
  let params: any = {
    taskId: formModel.taskId || "",          // 计划ID，仅编辑时由表单回填；为空表示新增
    id: formModel.id || "",                  // 记录ID，仅编辑时由表单回填
    taskName: formModel.taskName,            // 表单"计划名称"输入框
    routeId: formModel.routeId,              // 表单选择的航线ID
    routeName: formModel.routeName,          // 表单选择的航线名称
    waylineType: formModel.waylineType,      // 航线类型（随航线选择带出）
    deviceSn: formModel.deviceSn,            // 表单选择的执行设备SN
    flightConfig: {
      waylinePrecisionType: formModel.taskAccuracy,  // 表单"任务精度"单选（taskAccuracy，默认1，高精度RTK-1，GNSS-0）
      rthAltitude: Number(formModel.flightAltitude), // 表单"返航高度/飞行高度"数字输入（默认100，范围20~500）
      outOfControlAction: '0',                        // 失控动作，前端硬编码'0'
      exitWaylineWhenRcLost: String(formModel.flightStatus) // 表单"失联后是否退出航线"单选（flightStatus，默认1，继续执行-0，返航-1）
    },
    executionMode: taskList[formModel.taskStrategy], // 由表单"任务策略"索引映射为后端枚举字符串
    autoResumeFlight: formModel.isOffFlight,         // 表单"断点续飞"开关（默认false）
    zoneId: formModel.zoneId,                        // 关联网格/区域ID（选航线时带出）
    zoneName: formModel.zoneName,                    // 关联网格/区域名称
    inspectionSceneName: formModel.inspectionSceneName, // 表单"巡检场景"选择
    problemCategoryName: formModel.problemCategoryName, // 表单"问题大类"选择
    aiTags: formModel.aiTags,                        // 表单"识别问题小类"多选，调用方已 join 为逗号字符串
  }
  if (String(formModel.taskStrategy) === '1') { // 任务策略=1：单次定时执行，只需一个执行时间点
    if (!formModel.onceExecutionDate) return { type: 'warning', info: '请选择执行时间' };
    params.executionTime = formModel.onceExecutionDate // 表单"执行时间"日期时间选择器
  } else if (String(formModel.taskStrategy) === '2' || String(formModel.taskStrategy) === '3') { // 2=周期重复 3=持续任务，需日期范围+时间点+重复规则
    if (!formModel.executionDate || !formModel.executionDate.length) return { type: 'warning', info: '请选择执行日期' };
    if (!formModel.executionTimeData[0]?.time) return { type: 'warning', info: '请选择执行时间' };
    // 非 daily（每天）时必须选了具体重复规则（每周几/每月几号）
    if (!formModel.selectedDays.length && ['2', '3'].find((i) => i === String(formModel.taskStrategy)) &&
      formModel.frequencyScope !== 'daily') {
      return { type: 'warning', info: '请选择重复规则' }
    }
    params.startDate = formModel.executionDate[0]  // 表单"执行日期"范围选择器的开始日期
    params.endDate = formModel.executionDate[1]    // 范围选择器的结束日期
    // 周期配置：执行时间点列表 + 重复类型 + 频次 + 具体规则
    params.cycleConfig = { executeTimes: [], executeType: "", executeFrequency: 0, frequencyRules: [] }
    formModel.executionTimeData.forEach((item: any) => params.cycleConfig.executeTimes.push(item.time)) // 表单可增删的多个"执行时间点"
    params.cycleConfig.executeType = formModel.frequencyScope        // 表单"重复范围"单选：daily/week/month
    params.cycleConfig.executeFrequency = Number(formModel.frequency) // 表单"频次"数字输入
    formModel.selectedDays.forEach((item: any) => params.cycleConfig.frequencyRules.push(item)) // week 时选中的星期几 / month 时选中的日期号
    if (['2', '3'].includes(String(formModel.taskStrategy))) {
      if (!formModel.batteryStatus) return { type: 'warning', info: '请填写计划开始执行的电量' };
      params.flightConfig.minBatteryCapacity = Number(formModel.batteryStatus) // 表单"开始执行最低电量"输入
    }
  }
  try {
    const isEdit = Boolean(params.taskId);
    const actionType = isEdit ? '修改' : '新增';
    const apiMethod = isEdit ? $editPlan : $addPlan;
    const res: any = await apiMethod(params);
    if (res?.code === 200) {
      return { type: 'success', info: res.msg || `${actionType}成功` };
    }
    return { type: 'error', info: res?.msg || `${actionType}失败` };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : `${params.taskId ? '修改' : '新增'}时发生未知错误`;
    return { type: 'error', info: errorMsg };
  }
}

/**
 * 编辑参数对齐
 * @returns
 */
export async function getPlanInfo(planInfo: any, formModel: any) {
  const taskList = ["immediate", "scheduled", "recurring", "continuous"]
  formModel.taskName = planInfo.taskName
  formModel.taskId = planInfo.taskId
  formModel.id = planInfo.id
  formModel.taskAccuracy = planInfo.flightConfig.waylinePrecisionType
  formModel.flightAltitude = planInfo.flightConfig.rthAltitude
  formModel.flightStatus = planInfo.flightConfig.exitWaylineWhenRcLost
  formModel.taskStrategy = taskList.indexOf(planInfo.executionMode)
  formModel.isOffFlight = planInfo.autoResumeFlight
  formModel.deviceSn = planInfo.deviceSn
  formModel.routeId = planInfo.routeId
  formModel.routeName = planInfo.routeName
  formModel.waylineType = planInfo.waylineType
  formModel.inspectionSceneName = planInfo.inspectionSceneName || ""
  formModel.problemCategoryName = planInfo.problemCategoryName || ""
  if (typeof planInfo.aiTags === 'string') {
    const s = planInfo.aiTags.trim()
    formModel.aiTags = s ? s.split(',').map((x: string) => x.trim()).filter(Boolean) : []
  } else {
    formModel.aiTags = []
  }
  if (String(formModel.taskStrategy) === '1') {
    formModel.onceExecutionDate = planInfo.executionTime
  } else if (String(formModel.taskStrategy) === '2' || String(formModel.taskStrategy) === '3') {
    formModel.executionDate = [planInfo.startDate, planInfo.endDate]
    planInfo.cycleConfig.executeTimes.forEach((item: any, index: number) => {
      index ? formModel.executionTimeData.push({ id: Date.now(), time: item }) : formModel.executionTimeData[0].time = item
    })
    formModel.frequencyScope = planInfo.cycleConfig.executeType
    formModel.frequency = String(planInfo.cycleConfig.executeFrequency)
    planInfo.cycleConfig.frequencyRules.forEach((item: any) => formModel.selectedDays.push(item))
    if (['2', '3'].includes(String(formModel.taskStrategy))) {
      formModel.batteryStatus = planInfo.flightConfig.minBatteryCapacity
    }
  }
  let checkDeviceInfo = {}
  let currentRouteInfo = {}

  if (formModel.deviceSn) {
    const res: any = await $getflightList({ deviceSn: formModel.deviceSn })
    if (res.code === 200) {
      if (res.rows.length) {
        const element = res.rows[0]
        checkDeviceInfo = {
          ...element,
          id: element.deviceSn,
          deviceName: element.deviceName,
          type: element.deviceType == 2 ? "dock" : "drone",
          action: "",
          time: element.lastOnlineTime,
          status: element.onlineStatus == 1 ? "success" : "warning",
          source: "",
          longitude: element.longitude,
          latitude: element.latitude,
          modelName: element.modelName,
          unitName: element.unitName,
          contactUser: element.contactUser,
          brandName: element.brandName,
          city: element.city,
          district: element.district,
        }
      }
    } else {
      const errorMsg = res.msg || '设备查询失败';
      return Promise.reject(errorMsg);
    }
  }
  if (planInfo.routeId) {
    const res: any = await $getAllflight({ routeId: planInfo.routeId })
    if (res.code === 200) {
      if (res.rows.length) {
        const element = res.rows[0]
        const routerLibraryStore = useRouterLibraryStore();
        const deviceDictionary = await routerLibraryStore.getDeviceDictionary();
        const matchedDevice = deviceDictionary.find((device: any) => {
          return (
            device.deviceType === element.droneType &&
            device.subType === element.subDroneType
          );
        });
        const deviceName = matchedDevice?.deviceName || "";
        currentRouteInfo = {
          id: element.id,
          routeId: element.routeId,
          routeInfo: element,
          title: element.routeName,
          deviceName,
          routeLine: element.routeLine,
          updateTime: element.updateTime,
          type: element.routeType == 0 ? 'waypoint' : 'area',
          templateType: element.templateType
        }
      }
    } else {
      const errorMsg = res.msg || '航线查询失败';
      return Promise.reject(errorMsg);
    }
  }

  return { checkDeviceInfo, currentRouteInfo }
}

/**
 * 删除计划
 * @returns
 */
export async function deletePlan(id: any) {
  try {
    const ids = [id]
    const res: any = await $deletePlan(ids);
    if (res.code === 200) {
      return res.msg;
    } else {
      const errorMsg = res.msg || '删除失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '删除时发生未知错误';
    return Promise.reject(errorMsg);
  }
}

/**
 * 获取正在进行的任务数据
 * @param deviceSn 设备序列号
 * @returns
 */
export async function getRunTask(deviceSn: string) {
  try {
    const res: any = await $getRunTask(deviceSn)
    if (res.code === 200) {
      return res.data || {};
    } else {
      const errorMsg = res.msg || '获取任务失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '获取任务失败';
    return Promise.reject(errorMsg);
  }
}


/**
 * 获取航线详情
 * @param routeId 航线id
 * @returns
 */
export async function getRouteDetail(routeId: string) {
  try {
    const res: any = await $getRouteDetail(routeId)
    if (res.code === 200) {
      return res.data || {};
    } else {
      const errorMsg = res.msg || '获取航线详情失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '获取航线详情失败';
    return Promise.reject(errorMsg);
  }
}

/**
 * @description: 下发计划
 * @return {*}
 * @param taskId
 */
export async function distributePlan(taskId: string) {
  try {
    const res: any = await $distributePlan(taskId)
    if (res.code === 200) {
      return Promise.resolve('下发计划成功');
    } else {
      const errorMsg = res.msg || '下发计划失败';
      return Promise.resolve(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '下发计划失败';
    return Promise.resolve(errorMsg);
  }
}
// 获取巡检场景、识别问题大类、识别问题小类字典(id为空，则是默认获取巡检场景)
export async function getTaskDictList(parentId?: number | string | null) {
  try {
    const id = parentId === undefined || parentId === null ? undefined : parentId;
    const res: any = await $getProblemCategoryList(id);
    if (res?.code === 200) {
      return res?.data || [];
    }
    const errorMsg = res?.msg || "获取字典失败";
    return Promise.reject(errorMsg);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "获取字典时发生未知错误";
    return Promise.reject(errorMsg);
  }
}


/**
 * @description: 控制航线飞行
 * @return {*}
 * @param jobId
 * @param params
 */
export async function changeFlyTaskStatus(jobId: string, params: {
  status: '0' | '1'
}) {
  try {
    const res: any = await $changeFlyTaskStatus(jobId, params);
    if (res.code === 200 || res.code === 0) {
      return '操作成功';
    } else {
      const errorMsg = res.msg || '操作失败';
      return Promise.reject(errorMsg);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '操作失败';
    return Promise.reject(errorMsg);
  }
}
