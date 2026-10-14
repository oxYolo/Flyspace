/**
 * 全部接口返回数据共有的ts类型
 */
export interface IBaseResponseModel {
  code: number
  msg?: string
  ok?: boolean
}



/**
 * 航线API响应接口
 */
export interface CommonApiResponse extends IBaseResponseModel {
  total: number;
  rows: never[];
  [key: string]: any;
}

/**
 * 飞行区API响应接口
 */
export interface FlyZoneApiResponse extends IBaseResponseModel {
  data: {
    records: any[];
    total: number;
  }
}

/**
 * 通用响应模型
 */
export interface ResponseModel<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页数据模型
 */
export interface PageModel<T = any> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}
