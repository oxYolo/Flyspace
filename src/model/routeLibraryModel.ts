
/**
 * 航点坐标接口
 */
export interface RoutePoint {
  longitude: number;
  latitude: number;
  height?: number;
  [key: string]: any;
}

/**
 * 航线信息接口
 */
export interface RouteInfo {
  id: string | number;
  routeId: string | number;
  routeName: string;
  routePointList: RoutePoint[];
  routePointJson?: any;
  routeLine?: any;
  updateTime: string;
  templateType: number;
  [key: string]: any;
}

/**
 * 航线数据项接口
 */
export interface RouteDataItem {
  id: string | number;
  routeId: string | number;
  routeInfo: RouteInfo;
  title: string;
  deviceName: string;
  routeLine?: any;
  longitude: number | null;
  latitude: number | null;
  updateTime: string;
  type: number;
  templateType: string
  locked: boolean;
}

/**
 * GeoJSON特性接口
 */
export interface GeoFeature {
  type: string;
  properties: any;
  geometry: {
    type: string;
    coordinates: any[];
  };
}

/**
 * GeoJSON集合接口
 */
export interface GeoCollection {
  type: string;
  features: GeoFeature[];
}
