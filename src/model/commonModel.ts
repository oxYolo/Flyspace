/**
 * 分页选项接口
 */
export interface PageOptions {
  page: number;
  size: number;
  total: number;
}

/**
 * 航线数据接口
 */
export interface Route {
  id: number | string;
  routeId: number | string;
  title: string;
  deviceName: string;
  updateTime: string;
  locked: boolean;
  type: string;
  longitude?: number;
  latitude?: number;
  routeInfo?: any;
  routeName?: string;
  // 可以根据需要添加更多属性
}
