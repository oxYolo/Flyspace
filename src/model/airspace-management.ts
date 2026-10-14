/**
 * @fileDescription: 空域管理数据模型定义
 * @author: Assistant
 * @date: 2024-09-17
 * @version: 1.0
 */

// 飞行类型枚举
export enum FlightType {
  UAV = 'UAV',  // 无人飞行
  MAV = 'MAV'   // 有人飞行
}

// 飞行模式枚举
export enum FlightMode {
  BVLOS = 'BVLOS',  // 超视距飞行
  VLOS = 'VLOS'     // 视距内飞行
}

// 空域类型枚举
export enum AirspaceType {
  ANNUAL_PRIVATE = 'ANNUAL_PRIVATE',  // 年度私有空域
  TEMPORARY = 'TEMPORARY'             // 临时空域
}

// 申请状态枚举
export enum ApplicationStatus {
  DRAFT = 'DRAFT',         // 草稿
  SUBMITTED = 'SUBMITTED', // 已提交
  APPROVED = 'APPROVED',   // 已批准
  REJECTED = 'REJECTED'    // 已拒绝
}

// 空域申请基本模型
export interface AirspaceApplicationModel {
  id: string;
  // 申请单位信息
  applicantUnit?: string;
  contactPerson?: string;
  contactPhone?: string;

  // 基本信息
  flightType: FlightType;
  subject: string;
  name: string;
  flightMode: FlightMode;

  // 空域与时间
  type: AirspaceType;
  purpose?: string;  // 申请用途
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  altitude?: { min: number; max: number };  // 高度范围
  coordinates?: number[][];  // 坐标点数组

  // 航点信息
  adep: string;
  ades: string;
  alnap?: string;

  // 补充说明与附件
  memo?: string;
  proc: string;
  files: string[];
  remarks?: string;

  // 系统字段
  status: ApplicationStatus;
  createTime: string;
  updateTime: string;
  createBy?: string;
  updateBy?: string;
}

// 空域申请创建/更新请求模型
export interface AirspaceApplicationRequestModel {
  // 申请单位信息
  applicantUnit?: string;
  contactPerson?: string;
  contactPhone?: string;

  // 基本信息
  flightType: FlightType;
  subject: string;
  name: string;
  flightMode: FlightMode;

  // 空域与时间
  type: AirspaceType;
  purpose?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  altitude?: { min: number; max: number };
  coordinates?: number[][];

  // 航点信息
  adep: string;
  ades: string;
  alnap?: string;

  // 补充说明与附件
  memo?: string;
  proc: string;
  files: string[];
  remarks?: string;
}

// 空域申请列表查询参数
export interface AirspaceListParams {
  keyword?: string;
  flightType?: string;
  type?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}

// 空域申请表单验证规则
export interface AirspaceFormRules {
  flightType: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  subject: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  name: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  flightMode: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  type: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  startDate: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  endDate: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  startTime: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  endTime: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  adep: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  ades: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  proc: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
  files: Array<{
    required: boolean;
    message: string;
    trigger: string;
  }>;
}

// 文件上传模型
export interface FileUploadModel {
  uid: string;
  name: string;
  status: string;
  url?: string;
  response?: any;
}

// 飞行类型选项
export const FLIGHT_TYPE_OPTIONS = [
  { value: FlightType.UAV, label: '无人飞行' },
  { value: FlightType.MAV, label: '有人飞行' }
];

// 飞行模式选项
export const FLIGHT_MODE_OPTIONS = [
  { value: FlightMode.BVLOS, label: '超视距飞行' },
  { value: FlightMode.VLOS, label: '视距内飞行' }
];

// 空域类型选项
export const AIRSPACE_TYPE_OPTIONS = [
  { value: AirspaceType.ANNUAL_PRIVATE, label: '年度私有空域' },
  { value: AirspaceType.TEMPORARY, label: '临时空域' }
];

// 申请状态选项
export const APPLICATION_STATUS_OPTIONS = [
  { value: ApplicationStatus.DRAFT, label: '草稿' },
  { value: ApplicationStatus.SUBMITTED, label: '已提交' },
  { value: ApplicationStatus.APPROVED, label: '已批准' },
  { value: ApplicationStatus.REJECTED, label: '已拒绝' }
];
