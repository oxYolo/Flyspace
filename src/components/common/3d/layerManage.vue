<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import SearchIcon from "@/assets/svg/search.svg";
import { getNodeByKeyValue, setNodeValueById } from "@/utils/tree-util";
import { cloneDeep } from "lodash";
import ToolPanel from "@/components/common/tool-panel/ToolPanel.vue";
import urlConfig from "@/public-path.ts";
import { useLayerManageStore } from "@/stores/layer-manage.ts";
import emitter from "@/stores/mitt.ts";
import { CesiumMapManager } from "@/map-system";
import {
  showAccurateAdminBoundary,
  hideAccurateAdminBoundary,
  flyToAccurateAdminBoundary,
  clearAdminBoundaryCache,
  showNoFlyZonesLayer,
  hideNoFlyZonesLayer,
  showLowAltitudeSuitableZoneLayer,
  hideLowAltitudeSuitableZoneLayer,
  clearNoFlyZoneCache,
  clearLowAltitudeSuitableZoneCache,
} from "./layerManage.service";
import { $getflightList } from "@/api/flyControl/device";
import { useRoute } from "vue-router";
import airportOnlineIcon from "@/assets/images/map/airport_online_new.png";
import airportOfflineIcon from "@/assets/images/map/airport_offline.png";
import { $getAllflight } from "@/api/flyControl/flight.ts";
import { $getLayerTree } from "@/api/layerCatalog.ts";
import { getImageUrl } from "@/utils/utils.ts";
import { getRouteDetail } from "@/transform/routeList.ts";
const layerManageStore = useLayerManageStore();

// const appBaseUrl = import.meta.env.BASE_URL;
// const layerUrl = `${appBaseUrl}cbgxq-dom-202605/{z}/{x}/{y}.png`;

declare const Cesium: any;
// 定义树节点类型····
interface LayerTreeNode {
  id: string;
  title: string;
  nodeType: "group" | "layer";
  isChecked?: boolean;
  children?: LayerTreeNode[];
  // 高度限制配置
  minHeight?: number; // 最小显示高度（米）
  maxHeight?: number; // 最大显示高度（米）
  [key: string]: any | "3dtiles" | "wmts" | "wms";
}

// 面板属性
const panelProps = ref({
  id: "layerManage",
  name: "图层管理",
  width: 324,
  isVisible: false,
  isRegisterSideTab: false,
});

// 图层树数据将从接口动态加载，本地配置已移除
const LayerTrees = ref<LayerTreeNode[]>([]);

// 监听右上角工具条激活ID集合变化
watch(
  () => layerManageStore.visible,
  () => {
    panelProps.value.isRegisterSideTab = layerManageStore.visible;
    panelProps.value.isVisible = layerManageStore.visible;
  },
  {
    deep: true, // 如果是对象或数组，需要开启深度监听
  },
);

// 原始图层树数据
const originalLayerTree = ref<LayerTreeNode[]>([]);

// 当前图层树数据
const layerTree = ref<LayerTreeNode[]>([]);

// 树形控件
const treeRef = ref<any>(null);

// 当前勾选的keys
const checkedKeys = ref<string[]>([]);
const baseCheckedLayerIds = ref<string[]>([]);
let appliedCheckedLayerIds = new Set<string>();
const isSyncingCheckedKeys = ref(false);
const pendingLocateOverrideByLayerId = new Map<string, boolean>();
// 默认展开的节点key
// 默认展开第一层节点
const defaultExpandedKeys = ref<string[]>([]);

type DefaultLayerAlias =
  | "airportDevices"
  | "airportCoverage"
  | "noFlyZone"
  | "tdtTerrain";

type RouteLayerRule = {
  match: (routePath: string) => boolean;
  include: DefaultLayerAlias[];
  exclude?: DefaultLayerAlias[];
  locateOnShow?: Partial<Record<DefaultLayerAlias, boolean>>;
};

const defaultLayerIdMap = ref<Record<DefaultLayerAlias, string>>({
  airportDevices: "",
  airportCoverage: "",
  noFlyZone: "",
  tdtTerrain: "",
});

const routeLayerRules: RouteLayerRule[] = [
  {
    match: (routePath) => routePath.startsWith("/defaultMapPage/home"),
    include: ["airportDevices", "airportCoverage"],
    exclude: ["noFlyZone", "tdtTerrain"],
  },
  {
    match: (routePath) =>
      routePath.startsWith("/defaultMapPage/flyControl/project"),
    include: ["airportDevices", "airportCoverage"],
    exclude: ["noFlyZone", "tdtTerrain"],
  },
  {
    match: (routePath) =>
      routePath.startsWith("/defaultMapPage/flyControl/route"),
    include: ["airportDevices", "noFlyZone"],
    exclude: ["airportCoverage"],
    locateOnShow: {
      noFlyZone: false,
    },
  },
  {
    match: (routePath) =>
      routePath.startsWith("/defaultMapPage/flyControl/task"),
    include: ["airportDevices", "airportCoverage"],
    exclude: ["noFlyZone", "tdtTerrain"],
  },
];

// 获取第一层节点的id
function getFirstLevelKeys(): string[] {
  return layerTree.value.map((node) => node.id);
}
// 监听过滤文本变化，触发树形控件节点过滤
const filterText = ref("");
watch(filterText, (val) => {
  if (!treeRef.value) return;
  treeRef.value.filter(val);
});

// 节点过滤
const onFilterNode = (value: string, data: LayerTreeNode) => {
  if (!value) return true;
  return data.title.includes(value);
};

// 获取所有节点key（递归版本）
const getAllKeys = (data: LayerTreeNode[]) => {
  const keys: string[] = [];

  // 递归函数处理所有层级节点
  const processNode = (node: LayerTreeNode) => {
    // 只有当isChecked明确为true时才添加节点ID
    if (node.isChecked === true && node.id) {
      keys.push(node.id);
    } else if (node.isChecked === true && !node.id) {
      // 如果节点没有id但有title，使用title作为id
      if (node.title) {
        keys.push(node.title);
      }
    }

    // 递归处理所有子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(processNode);
    }
  };

  // 处理每个根节点
  data.forEach(processNode);
  return keys;
};

// 根据当前模式加载图层树
const reloadTree = () => {
  if (!originalLayerTree.value || originalLayerTree.value.length === 0) return;

  const currentTree = layerTree.value;

  // 递归过滤节点
  function filterTree(tree: LayerTreeNode[]): LayerTreeNode[] {
    return tree
      .map((node) => {
        const clonedNode = { ...node };
        // 确保节点有ID
        if (!clonedNode.id && clonedNode.title) {
          clonedNode.id = clonedNode.title;
        }

        // 根据源数据与当前数据的isChecked状态判断是否勾选
        const currentNode = getNodeByKeyValue(currentTree, "id", clonedNode.id);

        if (currentNode) {
          clonedNode.isChecked = currentNode.isChecked; // 更新节点的isChecked状态

          setNodeValueById(
            [clonedNode.id],
            "isChecked",
            currentNode.isChecked,
            originalLayerTree.value,
          ); // 更新源数据的isChecked
        }

        // 直接过滤layer节点，只保留匹配当前地图类型的节点
        if (clonedNode.nodeType === "layer") {
          return clonedNode;
        }

        // 遇到group节点，递归处理children
        if (
          clonedNode.nodeType === "group" &&
          clonedNode.children &&
          clonedNode.children.length > 0
        ) {
          const filteredChildren = filterTree(clonedNode.children);
          if (filteredChildren.length > 0) {
            clonedNode.children = filteredChildren;
            return clonedNode;
          }
          return null;
        }

        // 其他情况保留原节点
        return clonedNode;
      })
      .filter((node): node is LayerTreeNode => node !== null); // 过滤掉 null 值
  }

  layerTree.value = filterTree(cloneDeep(originalLayerTree.value));
};

// 勾选变化时更新数据和控制图层
const handleNodeCheck = (data: LayerTreeNode, checkeData: any) => {
  void data;
  if (isSyncingCheckedKeys.value) return;
  // 1. 更新本地checkedKeys状态
  const currentCheckedKeys = checkeData.checkedKeys;
  checkedKeys.value = currentCheckedKeys;

  // 2. 全量同步节点isChecked，避免未选中节点残留true导致勾选状态串扰
  setNodeValueById(
    currentCheckedKeys,
    "isChecked",
    true,
    layerTree.value,
    true,
    false,
  );
  setNodeValueById(
    currentCheckedKeys,
    "isChecked",
    true,
    originalLayerTree.value,
    true,
    false,
  );
};

const handleCheckChange = (data: LayerTreeNode, checked: boolean) => {
  if (isSyncingCheckedKeys.value) return;
  if (data.nodeType !== "layer") return;
  const layerId = String(data.id);
  if (checked) {
    if (appliedCheckedLayerIds.has(layerId)) {
      pendingLocateOverrideByLayerId.delete(layerId);
      return;
    }
    appliedCheckedLayerIds.add(layerId);
    const locateOnShow = pendingLocateOverrideByLayerId.get(layerId);
    pendingLocateOverrideByLayerId.delete(layerId);
    handleShowLayer(
      data,
      locateOnShow === undefined ? undefined : { locateOnShow },
    );
  } else {
    pendingLocateOverrideByLayerId.delete(layerId);
    if (!appliedCheckedLayerIds.has(layerId)) return;
    appliedCheckedLayerIds.delete(layerId);
    handleHideLayer(data);
  }
};

const droneImageUrl = getImageUrl("assets/images/map/dajiangfly.png");
// const flyToRect = (rect: {
//   west: number;
//   south: number;
//   east: number;
//   north: number;
//   duration?: number;
// }) => {
//   const viewer = mapManager.value?.viewer;
//   if (!viewer || !Cesium) return;
//   const destination = Cesium.Rectangle.fromDegrees(
//     rect.west,
//     rect.south,
//     rect.east,
//     rect.north,
//   );
//   viewer.camera.flyTo({ destination, duration: rect.duration ?? 1.5 });
// };
// const flyToMercatorRect = (rect: {
//   west: number;
//   south: number;
//   east: number;
//   north: number;
//   duration?: number;
// }) => {
//   const viewer = mapManager.value?.viewer;
//   if (!viewer || !Cesium) return;
//   const projection = new Cesium.WebMercatorProjection();
//   const sw = projection.unproject(
//     new Cesium.Cartesian3(rect.west, rect.south, 0),
//   );
//   const ne = projection.unproject(
//     new Cesium.Cartesian3(rect.east, rect.north, 0),
//   );
//   const destination = Cesium.Rectangle.fromRadians(
//     sw.longitude,
//     sw.latitude,
//     ne.longitude,
//     ne.latitude,
//   );
//   viewer.camera.flyTo({ destination, duration: rect.duration ?? 1.5 });
// };

// 层显示时定位
const locateLayerOnShow = (layer: LayerTreeNode) => {
  if (!mapManager.value) return;

  // 3D Tiles 使用自身的定位方式（在 handleShowLayer 中处理）
  if (layer.layerType === "3dtiles") {
    return;
  }

  // 优先使用 locateCenter 定位
  if (layer.locateCenter && layer.locateCenter.length >= 2) {
    const [lon, lat, h = 50000] = layer.locateCenter;

    const target = Cesium.Cartesian3.fromDegrees(lon, lat);
    // 定位到目标点
    mapManager.value.viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(target, 1),
      {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(0), // 正北
          Cesium.Math.toRadians(-45), // 俯视45°
          h, // 这里是“相机距离目标点的距离”，不是高度
        ),
      },
    );

    return;
  }

  // 支持配置型定位
  // if (layer.flyToMercatorRect) {
  //   flyToMercatorRect(layer.flyToMercatorRect);
  //   return;
  // }
  // if (layer.flyToRect) {
  //   flyToRect(layer.flyToRect);
  // }
};
const tilesetOriginalModelMatrix = new Map<string, any>();
const getTilesetForLayerId = (layerId: string) => {
  const ds = mapManager.value?.getDataSource?.(layerId);
  if (!ds) return null;
  if (ds?.tileset) return ds.tileset;
  if (ds?.layer) return ds.layer;
  if (ds?.primitive) return ds.primitive;
  return ds;
};
const applyTilesetOffset = async (layer: LayerTreeNode) => {
  const offset = layer?.tilesetOffset;
  if (!offset || !Cesium) return;
  const tileset = getTilesetForLayerId(layer.id);
  if (!tileset) return;
  try {
    if (
      tileset.readyPromise &&
      typeof tileset.readyPromise.then === "function"
    ) {
      await tileset.readyPromise;
    }
  } catch {}
  try {
    const current = tileset.modelMatrix;
    if (!current) return;
    if (!tilesetOriginalModelMatrix.has(layer.id)) {
      tilesetOriginalModelMatrix.set(
        layer.id,
        Cesium.Matrix4.clone(current, new Cesium.Matrix4()),
      );
    }
    const base = tilesetOriginalModelMatrix.get(layer.id);
    const translation = new Cesium.Cartesian3(
      Number(offset.x) || 0,
      Number(offset.y) || 0,
      Number(offset.z) || 0,
    );
    tileset.modelMatrix = Cesium.Matrix4.multiplyByTranslation(
      base,
      translation,
      new Cesium.Matrix4(),
    );
  } catch {}
};

const addTerrain = (urls: string[]) => {
  const viewer = mapManager.value?.viewer;
  if (!viewer || !Cesium) return;
  if (!urls || urls.length === 0) return;
  if (typeof Cesium.GeoTerrainProvider !== "undefined") {
    viewer.terrainProvider = new Cesium.GeoTerrainProvider({
      dataType: Cesium.GeoTerrainProvider.INT,
      urls,
    });
  } else {
    viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
      url: urls[0],
    });
  }
  if (viewer.scene?.globe) {
    viewer.scene.globe.depthTestAgainstTerrain = false;
  }
};

const resetTerrain = () => {
  const viewer = mapManager.value?.viewer;
  if (!viewer || !Cesium) return;
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  if (viewer.scene?.globe) {
    viewer.scene.globe.depthTestAgainstTerrain = true;
  }
};

const handleShowLayer = async (
  layer: LayerTreeNode,
  options?: { locateOnShow?: boolean },
) => {
  // 判断是否需要定位：3dtiles始终定位；其他图层需配置locateCenter
  const shouldLocate =
    (options?.locateOnShow ?? true) &&
    (layer.layerType === "3dtiles" || !!layer.locateCenter);

  if (layer.layerType === "3dtiles") {
    const existing = mapManager.value?.getDataSource(layer.id);
    if (existing) {
      mapManager.value?.setObliquePhotographyVisibility(layer.id, true);
      if (layer.minHeight !== undefined || layer.maxHeight !== undefined) {
        mapManager.value?.addLayerHeightLimit(
          layer.id,
          layer.minHeight,
          layer.maxHeight,
        );
      }
      await applyTilesetOffset(layer);
      if (shouldLocate) {
        setTimeout(() => {
          mapManager.value?.flyToObliquePhotography(layer.id);
        }, 200);
      }
      return;
    }
  } else {
    const dataSource = mapManager.value?.getDataSource(layer.id);
    if (dataSource) {
      mapManager.value?.setLayerVisibility(layer.id, true);
      mapManager.value?.showLayer(layer.id);
      mapManager.value?.setObliquePhotographyVisibility(layer.id, true);
      mapManager.value?.setWMTSLayerVisibility(layer.id, true);
      mapManager.value?.setBeidouGridVisibility(layer.id, true);
      mapManager.value?.toggleRouteLayerVisibility(layer.id, true);

      if (layer.minHeight !== undefined || layer.maxHeight !== undefined) {
        mapManager.value?.addLayerHeightLimit(
          layer.id,
          layer.minHeight,
          layer.maxHeight,
        );
      }
      await applyTilesetOffset(layer);
      if (shouldLocate) {
        locateLayerOnShow(layer);
      }
      dataSource.layer.show = true;
      return;
    }
  }
  switch (layer.layerType) {
    case "terrain":
      addTerrain([layer.layerUrl]);
      break;
    case "tdt":
      if (String(layer.layerUrl || "").includes("/mapservice/")) {
        mapManager.value?.addWMTSLayer(layer.layerUrl, {
          id: layer.id,
          show: true,
          maximumLevel: 22,
        });
      } else {
        mapManager.value?.addTdtLayer(layer.id, {
          url: layer.layerUrl,
          layer: layer.layer,
          tileMatrixSetID: layer.tileMatrixSetID,
        });
      }
      if (shouldLocate) {
        locateLayerOnShow(layer);
      }
      break;
    case "3dtiles":
      try {
        await mapManager.value?.addObliquePhotography(layer.layerUrl, {
          id: layer.id,
          show: true,
        });
        await applyTilesetOffset(layer);
        // 等待一小段时间确保tileset完全加载
        if (shouldLocate) {
          setTimeout(() => {
            mapManager.value?.flyToObliquePhotography(layer.id);
          }, 500);
        }
      } catch (error) {
        console.error("加载倾斜摄影数据失败:", error);
      }
      break;

    case "xyz":
      mapManager.value?.addWMTSLayer(layer.layerUrl, {
        id: layer.id,
        show: true,
        maximumLevel: 22,
      });
      if (shouldLocate) {
        locateLayerOnShow(layer);
      }
      break;
    case "wmts":
      const wmtsProvider = new Cesium.WebMapTileServiceImageryProvider({
        url: layer.layerUrl,
        layer: layer.layer,
        style: layer.style,
        format: layer.format,
        tileMatrixSetID: layer.tileMatrixSetID,
      });
      const imageryLayer = mapManager.value
        ?.getViewer()
        .imageryLayers.addImageryProvider(wmtsProvider);
      imageryLayer.alpha = 1.0;
      // 存储图层引用
      mapManager.value?.getDataSources().set(layer.id, {
        type: "imagery",
        layer: imageryLayer,
        provider: wmtsProvider,
      });
      if (shouldLocate) {
        locateLayerOnShow(layer);
      }
      break;
    case "wms": {
      const wmsProvider = new Cesium.WebMapServiceImageryProvider({
        url: layer.layerUrl,
        layers: layer.layers,
        parameters: layer.parameters,
        // 增大瓦片大小，减少请求次数，尽量避免429错误，若展示效果还是不行，让GWC 支持cql_filter ，但是缓存空间大、更新复杂
        tileWidth: layer.tileWidth || 256,
        tileHeight: layer.tileHeight || 256,
      });
      const imageryLayer = mapManager.value
        ?.getViewer()
        .imageryLayers.addImageryProvider(wmsProvider);
      imageryLayer.alpha = 1.0;
      // 存储图层引用
      mapManager.value?.getDataSources().set(layer.id, {
        type: "imagery",
        layer: imageryLayer,
        provider: wmsProvider,
      });
      if (shouldLocate) {
        locateLayerOnShow(layer);
      }
      break;
    }
    case "admin_boundary":
      if (layer.boundaryOptions && mapManager.value?.viewer) {
        await showAccurateAdminBoundary(
          mapManager.value.viewer,
          layer.id,
          layer.boundaryOptions,
        );
        // 如果设置了自动定位，则定位到区划
        if (shouldLocate && layer.boundaryOptions.autoFlyTo) {
          flyToAccurateAdminBoundary(mapManager.value.viewer, layer.id, {
            flyToDuration: layer.boundaryOptions.flyToDuration,
            cameraHeight: layer.boundaryOptions.cameraHeight,
            pitch: layer.boundaryOptions.pitch,
          });
        }
      }
      break;
    case "beidou_grid":
      mapManager.value?.addBeidouGrid({
        id: layer.id,
        show: true,
        ...layer.gridOptions,
      });
      break;
    case "airport_devices":
      // 同时加载在线和离线设备
      if (airportOnlineData && mapManager.value) {
        mapManager.value.addAirportSymbolLayer(
          `${layer.id}_online`,
          airportOnlineData,
          airportOnlineIcon,
          {
            iconOptions: {
              ...layer.deviceOptions.iconOptions,
              pixelOffset: [0, 32],
            },
            labelOptions: layer.deviceOptions.labelOptions,
          },
        );
      }
      if (airportOfflineData && mapManager.value) {
        mapManager.value.addAirportSymbolLayer(
          `${layer.id}_offline`,
          airportOfflineData,
          airportOfflineIcon,
          {
            iconOptions: layer.deviceOptions.iconOptions,
            labelOptions: layer.deviceOptions.labelOptions,
          },
        );
      }
      break;
    case "airport_coverage":
      if (pulseItems.length > 0 && mapManager.value) {
        mapManager.value.addAirportPulseCoverage(
          layer.id,
          pulseItems,
          layer.coverageOptions,
        );
      }
      break;
    case "airspace_boxes":
      if (layer.airspaceOptions && mapManager.value) {
        mapManager.value.addAirspaceBoxes(
          layer.id,
          layer.airspaceOptions,
          layer.airspaceOptions,
        );
      }
      break;
    case "no_fly_zones":
      if (mapManager.value?.viewer) {
        await showNoFlyZonesLayer(
          mapManager.value.viewer,
          layer.id,
          layer.noFlyZoneOptions,
        );
      }
      break;
    case "low_altitude_suitable_zone":
      if (mapManager.value?.viewer) {
        await showLowAltitudeSuitableZoneLayer(
          mapManager.value.viewer,
          layer.id,
          {
            alpha: 0.4,
            params: layer.lowAltitudeSuitableZoneParams,
          },
        );
      }
      break;
    case "router":
      if (layer.routeId && mapManager.value) {
        const { routeData } = await getRouteDetail(layer.routeId);
        const routePointJson = routeData.routeInfo.routePointJson;
        mapManager.value.loadRouteLayer(layer.id, routePointJson, {
          droneImageUrl: droneImageUrl,
          beidouGridLevel: 5,
          heightLimit: {
            minHeight: layer.minHeight,
            maxHeight: layer.maxHeight,
          },
        });
        mapManager.value.playRouteAnimation(layer.id);
      }
      break;
  }

  // 为新创建的图层添加高度限制
  if (layer.minHeight !== undefined || layer.maxHeight !== undefined) {
    if (layer.layerType === "airport_devices") {
      // 为设备图层的子图层添加高度限制
      mapManager.value?.addLayerHeightLimit(
        `${layer.id}_online`,
        layer.minHeight,
        layer.maxHeight,
      );
      mapManager.value?.addLayerHeightLimit(
        `${layer.id}_offline`,
        layer.minHeight,
        layer.maxHeight,
      );
    } else {
      // 为普通图层添加高度限制
      mapManager.value?.addLayerHeightLimit(
        layer.id,
        layer.minHeight,
        layer.maxHeight,
      );
    }
  }
};

const handleHideLayer = (layer: LayerTreeNode) => {
  // 移除图层的高度限制
  if (layer.layerType === "airport_devices") {
    // 移除设备图层的子图层高度限制
    mapManager.value?.removeLayerHeightLimit(`${layer.id}_online`);
    mapManager.value?.removeLayerHeightLimit(`${layer.id}_offline`);
  } else {
    // 移除普通图层的高度限制
    mapManager.value?.removeLayerHeightLimit(layer.id);
  }

  // 优先处理特殊图层类型
  if (layer.layerType === "terrain") {
    resetTerrain();
    return;
  }
  if (layer.layerType === "3dtiles") {
    mapManager.value?.setObliquePhotographyVisibility(layer.id, false);
    return;
  }
  if (layer.layerType === "admin_boundary" && mapManager.value?.viewer) {
    hideAccurateAdminBoundary(mapManager.value.viewer, layer.id);
    return;
  }

  // 处理设备图层的隐藏
  if (layer.layerType === "airport_devices") {
    // 移除在线和离线设备图层
    mapManager.value?.removeAirportSymbolLayer(`${layer.id}_online`);
    mapManager.value?.removeAirportSymbolLayer(`${layer.id}_offline`);
    return;
  }

  if (layer.layerType === "airport_coverage") {
    mapManager.value?.removeAirportPulseCoverage(layer.id);
    return;
  }
  if (layer.layerType === "router") {
    mapManager.value?.toggleRouteLayerVisibility(layer.id, false);
    return;
  }
  if (layer.layerType === "no_fly_zones" && mapManager.value?.viewer) {
    hideNoFlyZonesLayer(mapManager.value.viewer, layer.id);
    return;
  }
  if (
    layer.layerType === "low_altitude_suitable_zone" &&
    mapManager.value?.viewer
  ) {
    hideLowAltitudeSuitableZoneLayer(
      mapManager.value.viewer,
      layer.id,
      route.path,
    );
    return;
  }
  // 处理其他通用图层
  const dataSource = mapManager.value?.getDataSource(layer.id);
  if (dataSource) {
    mapManager.value?.setLayerVisibility(layer.id, false);
    mapManager.value?.hideLayer(layer.id);
    mapManager.value?.setObliquePhotographyVisibility(layer.id, false);
    mapManager.value?.setWMTSLayerVisibility(layer.id, false);
    mapManager.value?.setBeidouGridVisibility(layer.id, false);
    mapManager.value?.removeLayerHeightLimit(layer.id);
    // 针对wmts图层的隐藏
    dataSource.layer.show = false;
  }
};

/**
 * 将接口返回的图层目录数据转换为内部图层树格式
 */
function convertLayerTree(apiData: any[]): LayerTreeNode[] {
  return apiData.map((node: any) => {
    const children: LayerTreeNode[] = [];

    // 转换子目录
    if (node.children && node.children.length > 0) {
      children.push(...convertLayerTree(node.children));
    }

    // 转换图层列表
    if (node.layerList && node.layerList.length > 0) {
      node.layerList.forEach((layer: any) => {
        let layerUrl = layer.serviceUrl;
        // http://t{s}.tianditu.com/img_w/wmts
        // http://t{s}.tianditu.com/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${urlConfig.getTdtToken()}
        if (layer.serviceType === "tdt") {
          layerUrl = `${layerUrl}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer.extension.layer}&STYLE=default&TILEMATRIXSET=${layer.extension.tileMatrixSetID}&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${urlConfig.getTdtToken()}`;
        }

        if (
          layer.serviceType === "terrain" &&
          layer.serviceName.indexOf("天地图") > -1
        ) {
          layerUrl = `${layerUrl}&tk=${urlConfig.getTdtToken()}`;
        }

        const layerNode: LayerTreeNode = {
          id: layer.id,
          title: layer.serviceName,
          nodeType: "layer",
          isChecked: layer.isShow || false,
          layerType: layer.serviceType,
          layerUrl: layerUrl,
          minHeight: 10,
          maxHeight: 1000000,
        };

        // 将 extension 的属性直接赋值给 layerNode
        if (layer.extension) {
          Object.assign(layerNode, layer.extension);
        }

        children.push(layerNode);
      });
    }

    return {
      id: node.id,
      title: node.name,
      nodeType: "group",
      isChecked: false,
      children: children.length > 0 ? children : undefined,
    };
  });
}

/**
 * 从接口加载图层树
 */
async function loadLayerTreeFromApi(): Promise<void> {
  try {
    const res = await $getLayerTree();
    if ((res as any).code === 200 && res.data) {
      // 转换接口数据格式
      const convertedTree = convertLayerTree(res.data);
      // 保存到 LayerTrees 供后续使用
      LayerTrees.value = convertedTree;
    }
  } catch (error) {
    console.error("加载图层树失败:", error);
  }
}

const initTree = () => {
  try {
    treeRef.value.setCheckedKeys([]);

    const storeLayerTree = LayerTrees.value;
    if (storeLayerTree && storeLayerTree.length > 0) {
      originalLayerTree.value = cloneDeep(storeLayerTree);
      layerTree.value = cloneDeep(originalLayerTree.value);
      defaultExpandedKeys.value = getFirstLevelKeys();
      reloadTree();
      nextTick(() => {
        if (treeRef.value) {
          const nodeIds = getAllKeys(layerTree.value);
          baseCheckedLayerIds.value = nodeIds;
          routerManage(route.fullPath);
        }
      });
    } else {
    }
  } catch (error) {}
};

const mapManager = ref<CesiumMapManager | null>(null);
const layerLocatedOnceIds = new Set<string>();

// --- 设备数据缓存 ---
type FeatureCollection = { type: "FeatureCollection"; features: any[] };
let airportOnlineData: FeatureCollection | null = null;
let airportOfflineData: FeatureCollection | null = null;
let pulseItems: Array<{ id: string; lon: number; lat: number }> = [];

/**
 * 确保设备数据已加载
 */
async function ensureDeviceData() {
  if (airportOnlineData && airportOfflineData && pulseItems.length) {
    return;
  }

  try {
    const params = {
      pageNum: 1,
      pageSize: 100,
    } as any;

    const res: any = await $getflightList(params);
    if (!(res?.code == 200)) {
      console.warn("获取设备数据失败:", res);
      return;
    }

    const airportPoint_online: any[] = [];
    const airportPoint_offline: any[] = [];

    (res.rows || []).forEach((element: any) => {
      const feature = {
        type: "Feature",
        properties: { ...element, id: element.deviceSn },
        geometry: {
          coordinates: [element.longitude, element.latitude],
          type: "Point",
        },
      };

      if (element.domain == 3 && element.onlineStatus == 1) {
        airportPoint_online.push(feature);
      } else if (element.domain == 3 && element.onlineStatus == 0) {
        airportPoint_offline.push(feature);
      }
    });

    airportOnlineData = {
      type: "FeatureCollection",
      features: airportPoint_online,
    };

    airportOfflineData = {
      type: "FeatureCollection",
      features: airportPoint_offline,
    };

    const all = [...airportPoint_online, ...airportPoint_offline];
    pulseItems = all.map((f: any, idx: number) => ({
      id: String(f.properties?.id + `_${idx}`),
      lon: Number(f.geometry.coordinates[0]),
      lat: Number(f.geometry.coordinates[1]),
    }));
  } catch (error) {
    console.error("获取设备数据失败:", error);
  }
}

const routerList = ref([]);

const route = useRoute();
// 在组件挂载时初始化
const initMapData = async (viewer: any) => {
  clearAdminBoundaryCache();
  clearNoFlyZoneCache();
  clearLowAltitudeSuitableZoneCache();
  layerLocatedOnceIds.clear();
  mapManager.value = new CesiumMapManager(viewer);

  await ensureDeviceData();
  // 飞行管理下的航线数据，暂不要
  // await getRouterList();
  // 从接口加载图层树
  await loadLayerTreeFromApi();

  initTree();
};

onMounted(async () => {
  // 如果 viewer 已经存在（比如该组件比 cesiumMap 挂载晚），直接初始化
  if ((window as any).__cesiumViewer) {
    initMapData((window as any).__cesiumViewer);
  }

  // 监听地图加载完成事件（应对组件比 cesiumMap 挂载早，或者重新登录等情况）
  emitter.on("base-map-load", handleBaseMapLoad);
});

const handleBaseMapLoad = async (viewer: any) => {
  // 避免重复初始化同一 viewer
  if (mapManager.value?.viewer === viewer) return;
  initMapData(viewer);
};

onUnmounted(() => {
  emitter.off("base-map-load", handleBaseMapLoad);
});
const collectLayerNodes = (nodes: LayerTreeNode[] = []) => {
  const list: LayerTreeNode[] = [];
  const walk = (arr: LayerTreeNode[]) => {
    arr.forEach((n) => {
      if (n.nodeType === "layer") {
        list.push(n);
        return;
      }
      if (n.children && n.children.length > 0) {
        walk(n.children);
      }
    });
  };
  walk(nodes);
  return list;
};

const findFirstLayerId = (matcher: (n: LayerTreeNode) => boolean) => {
  const layers = collectLayerNodes(layerTree.value || []);
  const found = layers.find(matcher);
  return found?.id ? String(found.id) : "";
};

const refreshDefaultLayerIdMap = () => {
  defaultLayerIdMap.value = {
    airportDevices: findFirstLayerId((n) => n.layerType === "airport_devices"),
    airportCoverage: findFirstLayerId(
      (n) => n.layerType === "airport_coverage",
    ),
    noFlyZone: findFirstLayerId((n) => n.title === "禁飞区"),
    tdtTerrain: findFirstLayerId(
      (n) => n.layerType === "terrain" && n.title === "天地图地形",
    ),
  };
};

const isSameCheckedSet = (a: Set<string>, b: Set<string>) => {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
};

const getRouteLayerRule = (routePath: string) => {
  return routeLayerRules.find((rule) => rule.match(routePath));
};

const applyRouteDefaultLayers = (routePath: string) => {
  if (!treeRef.value) return;
  if (!layerTree.value || layerTree.value.length === 0) return;

  const matchedRule = getRouteLayerRule(routePath);
  const desired = new Set<string>(baseCheckedLayerIds.value || []);
  const locateOnShowOverrides = new Map<string, boolean>();
  const layerIdMap = defaultLayerIdMap.value;

  matchedRule?.include.forEach((alias) => {
    const layerId = layerIdMap[alias];
    if (layerId) desired.add(layerId);
  });

  matchedRule?.exclude?.forEach((alias) => {
    const layerId = layerIdMap[alias];
    if (layerId) desired.delete(layerId);
  });

  Object.entries(matchedRule?.locateOnShow || {}).forEach(
    ([alias, locateOnShow]) => {
      const layerId = layerIdMap[alias as DefaultLayerAlias];
      if (
        layerId &&
        desired.has(layerId) &&
        typeof locateOnShow === "boolean"
      ) {
        locateOnShowOverrides.set(layerId, locateOnShow);
      }
    },
  );

  const nextSet = new Set(Array.from(desired));
  if (isSameCheckedSet(appliedCheckedLayerIds, nextSet)) {
    return;
  }

  const desiredIds = Array.from(nextSet);
  checkedKeys.value = desiredIds;

  setNodeValueById(desiredIds, "isChecked", true, layerTree.value, true, false);
  setNodeValueById(
    desiredIds,
    "isChecked",
    true,
    originalLayerTree.value,
    true,
    false,
  );

  isSyncingCheckedKeys.value = true;
  try {
    treeRef.value.setCheckedKeys(desiredIds);
  } finally {
    isSyncingCheckedKeys.value = false;
  }

  const nodeMap = new Map<string, LayerTreeNode>();
  collectLayerNodes(layerTree.value).forEach((n) => {
    nodeMap.set(String(n.id), n);
  });

  const toHide = Array.from(appliedCheckedLayerIds).filter(
    (id) => !nextSet.has(id),
  );
  const toShow = desiredIds.filter((id) => !appliedCheckedLayerIds.has(id));

  pendingLocateOverrideByLayerId.clear();
  toShow.forEach((id) => {
    const locateOnShow = locateOnShowOverrides.get(String(id));
    if (typeof locateOnShow === "boolean") {
      pendingLocateOverrideByLayerId.set(String(id), locateOnShow);
    }
  });

  toHide.forEach((id) => {
    const node = nodeMap.get(String(id));
    if (!node) return;
    handleHideLayer(node);
  });
  toShow.forEach((id) => {
    const node = nodeMap.get(String(id));
    if (!node) return;
    const locateOnShow = locateOnShowOverrides.get(String(id));
    handleShowLayer(node, {
      locateOnShow,
    });
  });

  appliedCheckedLayerIds = nextSet;
};

const routerManage = (routePath: string) => {
  if (!treeRef.value) return;
  if (!layerTree.value || layerTree.value.length === 0) return;

  refreshDefaultLayerIdMap();
  applyRouteDefaultLayers(routePath);
};

watch(
  () => route.fullPath,
  async (p) => {
    if (!p) return;
    routerManage(p);
  },
  { immediate: true },
);
</script>

<template>
  <!-- 图层管理 -->
  <ToolPanel v-bind="panelProps">
    <template #body>
      <div class="tree-layer-panel">
        <el-input
          v-model="filterText"
          class="search-input"
          placeholder="请输入关键词">
          <template #prefix>
            <img class="search-icon" :src="SearchIcon" alt="搜索" />
          </template>
        </el-input>
        <el-tree
          ref="treeRef"
          show-checkbox
          node-key="id"
          empty-text="暂无图层"
          :data="layerTree"
          :filter-node-method="onFilterNode"
          :default-checked-keys="checkedKeys"
          :default-expanded-keys="defaultExpandedKeys"
          :expand-on-click-node="false"
          :check-on-click-leaf="false"
          :indent="20"
          class="custom-tree"
          @check="handleNodeCheck"
          @check-change="handleCheckChange">
          <template #default="{ data }">
            <div class="custom-tree-node">
              <div class="node-title" :title="data.title">{{ data.title }}</div>
            </div>
          </template>
        </el-tree>
      </div>
    </template>
  </ToolPanel>
</template>

<style scoped lang="less">
.search-input {
  margin-bottom: 0.04rem;
  padding: 0 0.16rem;
  :deep(.el-input__inner) {
    font-size: 0.14rem;
  }
  .search-icon {
    width: 0.16rem;
    color: var(--app-white-color);
  }
}
#layerManage.panel-container {
  padding: 0.16rem 0 0.16rem 0;
  // max-height: calc(100% - 1.32rem - 0.16rem - 0.72rem) !important;
  :deep(.panel-header) {
    padding: 0 0.16rem;
    background-size: calc(100% - 0.32rem) 30%;
    background-position: 0.16rem calc(100%);
    z-index: 50;
  }
  :deep(.panel-body) {
    padding-top: 0.12rem;
  }
}

.custom-tree {
  max-width: 6rem;
  max-height: calc(
    100vh - 1.32rem - 0.72rem - 0.04rem - 0.4rem - 0.12rem - 0.16rem - 0.36rem -
      0.32rem - 0.12rem - 0.16rem
  );
  overflow-y: auto;
  overflow-x: hidden;
  margin-right: 0.04rem;
  > :deep(.el-tree-node) {
    padding: 0 0.12rem 0 0.16rem;
  }
  :deep(.el-tree-node) {
    .el-tree-node__content {
      min-width: 2.6rem;
      height: 0.32rem; /* 固定高度 */
      align-items: center; /* 垂直居中 */
      &:hover {
        background-color: var(--app-tree-hover-color);
        border-radius: 0.04rem;
        .btn-group {
          display: block;
        }
      }
      .el-tree-node__expand-icon {
        color: var(--app-white-color);
        // padding: 0.06rem 0.12rem 0.06rem 0;
        transition: none;
        padding: 0.04rem;
      }
      // .el-tree-node__expand-icon.expanded {
      //   padding: 0.12rem 0.06rem 0 0.06rem; // 旋转后调整 padding，使 padding-top 为 0
      // }
      .el-checkbox {
        border-radius: 0.02rem;
        width: 0.16rem;
        height: 0.16rem;
        margin: 0 0.06rem 0 0; /* 修复右侧间距 */
        padding: 0;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        box-sizing: content-box;
        transform: scale(0.9); /* 稍微缩小以适应UI */
        .el-checkbox__input {
          width: 0.16rem;
          height: 0.16rem;
          display: flex;
          justify-content: center;
          align-items: center;
          .el-checkbox__inner {
            width: 0.16rem;
            height: 0.16rem;
            border-radius: 0.02rem;
            &::after {
              height: 0.09rem;
              border-width: 2px;
            }
          }
        }
        .el-checkbox__input.is-checked .el-checkbox__inner,
        .el-checkbox__input.is-indeterminate .el-checkbox__inner {
          background-color: var(--app-primary-color);
          border-color: var(--app-primary-color);
        }
        .is-indeterminate {
          border: 1px solid var(--app-border-color);
          border-radius: 0.02rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--app-input-bg);

          .el-checkbox__inner {
            text-align: center;
            width: 0.08rem !important;
            height: 0.08rem !important;
            border-radius: 0 !important;
          }

          ::before {
            display: none;
          }
        }
      }
    }
  }
  //设置滚动条圆角
  &::-webkit-scrollbar-thumb {
    border-radius: 0.04rem; /* 滑块圆角 */
  }
}
.custom-tree-node {
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-left: 0.04rem;
  .node-title {
    max-width: 80%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--app-tree-title-color);
    font-size: 0.14rem;
    line-height: 0.32rem;
  }
  .btn-group {
    position: absolute;
    right: 0.1rem;
    display: none;
    .locate-icon {
      color: var(--app-white-color);
      img {
        width: 0.16rem;
        height: 0.16rem;
      }
    }
  }
}
</style>
