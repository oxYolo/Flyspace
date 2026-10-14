import {
  $editflight,
  $getAllflight,
  $getRouteDetailByRouteId,
  $planRouteByrouteId,
  $planStripLineByRouteId,
} from "@/api/flyControl/flight.ts";
import type {
  RouteInfo,
  RouteDataItem,
  GeoFeature,
  GeoCollection
} from "@/model/routeLibraryModel";

import type { PageOptions } from "@/model/commonModel.ts";
import { useRouterLibraryStore } from "@/stores/modules/routerLibrary";
import type { Ref } from 'vue';

export const GetAllFlight = async (flag: boolean, pageOptions: Ref<PageOptions>, routeName?: string) => {
  // 初始化GeoJSON数据结构
  const lineData: GeoCollection = {
    type: "FeatureCollection",
    features: []
  };

  try {
    // 准备API请求参数
    const params: any = {
      "pageNum": pageOptions.value.page,
      "pageSize": pageOptions.value.size,
      "isDetail": flag // 是否包含详细信息
    };
    if (routeName && routeName.trim()) {
      params.routeName = routeName.trim();
    }

    // 调用API获取航线数据
    const res: any = await $getAllflight(params);

    if (res?.code === 200) {
      let data: RouteDataItem[] = [];
      pageOptions.value.total = res.total;

      // 获取设备字典数据
      const routerLibraryStore = useRouterLibraryStore();
      const deviceDictionary = await routerLibraryStore.getDeviceDictionary();

      // 处理每条航线数据
      res.rows.forEach((element: any) => {
        // 创建航线数据项
        const routeItem: RouteDataItem = createRouteDataItem(element, deviceDictionary);
        data.push(routeItem);

        // 如果有航线点JSON数据，添加到GeoJSON特性集合
        if (element.routePointJson) {
          addRouteLineFeature(lineData, element);
        }
        // 同步生成面状要素（若存在）
        if (element?.mappingTypeReq?.coordinatesGeoJson?.coordinates?.length) {
          addRouteAreaFeature(lineData, element);
        }
      });

      // 如果有航线特性，为每个航点添加点特性
      if (lineData.features.length > 0) {
        addPointFeatures(lineData);
      }

      return Promise.resolve({ data, lineData });
    }

    return Promise.resolve({ data: [], lineData });
  } catch (error) {
    console.error("获取航线数据失败:", error);
    return Promise.resolve({ data: [], lineData });
  }
};

/**
 * 创建航线数据项
 * @param element 航线信息
 * @param deviceDictionary 设备字典
 * @returns 格式化后的航线数据项
 */
function createRouteDataItem(element: RouteInfo, deviceDictionary: any[]): any {
  // 根据droneType和subDroneType在设备字典中查找对应的设备名称
  const deviceName = findDeviceName(element.droneType, element.subDroneType, deviceDictionary);
  // 计算经纬度（如果航线点列表长度大于1，则取中间点的坐标）
  let longitude = null;
  let latitude = null;

  if (element.routePointList?.length > 1) {
    const midIndex = Math.floor(element.routePointList?.length / 2);
    longitude = element.routePointList[midIndex].longitude;
    latitude = element.routePointList[midIndex].latitude;
  }

  // 返回格式化的航线数据项
  return {
    id: element.id,
    routeId: element.routeId,
    routeInfo: element,
    title: element.routeName,
    deviceName: deviceName,
    routeLine: element.routeLine,
    longitude,
    latitude,
    updateTime: element.updateTime,
    type: element.templateType,
    templateType: String(element.templateType)
  };
}

/**
 * 在设备字典中查找匹配的设备名称
 * @param droneType 设备类型
 * @param subDroneType 设备子类型
 * @param deviceDictionary 设备字典
 * @returns 设备名称，如果未找到则返回空字符串
 */
function findDeviceName(droneType: string | number, subDroneType: string | number, deviceDictionary: any[]): string {
  // 查找匹配的设备
  const matchedDevice = deviceDictionary.find(device =>
    device.deviceType === droneType && device.subType === subDroneType
  );

  // 返回设备名称，如果未找到则返回空字符串
  return matchedDevice?.deviceName || '';
}

// 添加航线特性到GeoJSON集合
function addRouteLineFeature(lineData: GeoCollection, element: RouteInfo): void {
  const featureObj: GeoFeature = {
    type: "Feature",
    properties: element,
    geometry: element.routePointJson
  };
  lineData.features.push(featureObj);
}

function addRouteAreaFeature(lineData: GeoCollection, element: RouteInfo): void {
  const featureObj: GeoFeature = {
    type: "Feature",
    properties: element,
    geometry: {
      type: 'Polygon',
      // GeoJSON Polygon -> coordinates: [ [ [lon, lat], ... ] ]
      coordinates: element?.mappingTypeReq.coordinatesGeoJson.coordinates
    }
  };
  lineData.features.push(featureObj);
}

// 为每个航点添加点特性
function addPointFeatures(lineData: GeoCollection): void {
  // 创建一个副本以避免在迭代过程中修改数组
  const routeFeatures = [...lineData.features];

  routeFeatures.forEach((item) => {
    if (item.geometry && item.geometry.type === 'LineString' && item.geometry.coordinates) {
      item.geometry.coordinates.forEach((element: any, index: number) => {
        const pointFeatureObj: GeoFeature = {
          type: "Feature",
          properties: {
            ...item.properties,
            name: index + 1,
            status: 1,
          },
          geometry: {
            type: 'Point',
            coordinates: element
          }
        };
        lineData.features.push(pointFeatureObj);
      });
    }
  });
}

/**
 * 编辑航线
 */
export async function editFlight(params: any) {
  try {
    const res: any = await $editflight(params);
    return Promise.resolve(res)
  } catch (e) {
    return Promise.resolve([])
  }
}

/**
 * 面状航线规划生成航点
 */
export async function planRouteByrouteId(routeId: string) {
  try {
    const res: any = await $planRouteByrouteId(routeId);
    return Promise.resolve(res)
  } catch (e) {
    return Promise.resolve([])
  }
}

/**
 * 带状航线规划生成航点
 */
export async function planStripLineByRouteId(routeId: string) {
  try {
    const res: any = await $planStripLineByRouteId(routeId);
    return Promise.resolve(res)
  } catch (e) {
    return Promise.resolve([])
  }
}

/**
 * 获取航线详情
 */
export async function getRouteDetail(routeId: string) {
  // 初始化GeoJSON数据结构
  const lineData: GeoCollection = {
    type: "FeatureCollection",
    features: []
  };
  try {
    // const res = await $getRouteDetail(id) as CommonApiResponse
    const res: any = await $getRouteDetailByRouteId(routeId);
    const element = res.data

    if (res?.code === 200) {
      let routeData: RouteDataItem = {} as RouteDataItem;

      // 获取设备字典数据
      const routerLibraryStore = useRouterLibraryStore();
      const deviceDictionary = await routerLibraryStore.getDeviceDictionary();

      // 创建航线数据项
      const routeItem: RouteDataItem = createRouteDataItem(element, deviceDictionary);
      routeData = routeItem;

      // 如果有航线点JSON数据，添加到GeoJSON特性集合
      if (element.routePointJson) {
        addRouteLineFeature(lineData, element);
      }
      // 同步生成面状要素（若存在）
      if (element?.mappingTypeReq?.coordinatesGeoJson?.coordinates?.length) {
        addRouteAreaFeature(lineData, element);
      }

      // 如果有航线特性，为每个航点添加点特性
      if (lineData.features.length > 0) {
        addPointFeatures(lineData);
      }

      return Promise.resolve({ routeData, lineData });
    }

    return Promise.resolve({ routeData: {} as RouteDataItem, lineData });
  } catch (e) {
    return Promise.resolve({ routeData: {} as RouteDataItem, lineData });
  }
}

export const GetAircraftSeries = async () => {
  try {
    const routerLibraryStore = useRouterLibraryStore();
    // 使用store中的getDeviceDictionary方法获取数据
    const deviceDictionaryList = await routerLibraryStore.getDeviceDictionary();

    // 将一维数组转换为二层树状结构
    // 1. 按 deviceType 分组
    const groupByType: Record<string, any[]> = {};
    const typeNameMap: Record<string, string> = {};

    deviceDictionaryList.forEach(item => {
      const type = item.deviceType || 'unknown';
      if (!groupByType[type]) {
        groupByType[type] = [];
        // 保存每个类型的名称，用于显示
        typeNameMap[type] = item.categoryName || type;
      }
      groupByType[type].push({
        ...item,
        label: item.deviceName
      });
    });

    // 2. 构建树状结构
    const treeData: any[] = Object.keys(groupByType).map(type => ({
      id: type,
      label: typeNameMap[type],
      children: groupByType[type]
    }));
    return Promise.resolve(treeData);
  } catch (e) {
    return Promise.resolve([]);
  }
}
