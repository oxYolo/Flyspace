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
import { getImageUrl } from "@/utils/utils.ts";
import { getRouteDetail } from "@/transform/routeList.ts";
const layerManageStore = useLayerManageStore();
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

const wdLayer = [
  {
    id: "chibi_tiles_47km2",
    title: "赤壁三维倾斜47km2",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-3d-47km2/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "chibi_tiles_65km2",
    title: "赤壁三维倾斜65km2",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-3d-65km2/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "chibi_pointcloud",
    title: "赤壁点云",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-pointcloud/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "chibi_dem",
    title: "赤壁DEM",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-dem/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "chibi_dom_2025",
    title: "赤壁DOM-2025",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-dom-2025/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "chibi_dom_2020",
    title: "赤壁DOM-2020",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/chibi-dom-2020/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "wh1-all",
    title: "武汉一号（融合）",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/wuhan1-all/{z}/{x}/{y}.png`,
    minHeight: 10,
    maxHeight: 2000000,
  },
  {
    id: "zsg_3dtiles_2024",
    title: "中试谷倾斜（2024）",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-3d-2024/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "zsg_3dtiles_2025",
    title: "中试谷倾斜（2025）",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-3d-2025/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "zsg_pointcloud",
    title: "中试谷点云",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-pointcloud/tileset.json`,
    minHeight: 10,
    maxHeight: 20000,
  },
  {
    id: "zsg_dem",
    title: "中试谷DEM",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-dem/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "zsg_dom",
    title: "中试谷DOM-2020",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-dom-2020/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "zsg_dom_2025",
    title: "中试谷DOM-2025",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.schoolUrl}/data/chibi/zsg-dom-2025/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
];
const cbLayer = [
  {
    id: "wh1-all",
    title: "武汉一号（融合）",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/wuhan1-all/{z}/{x}/{y}.png`,
    minHeight: 10,
    maxHeight: 2000000,
  },
  {
    id: "zsg_3dtiles_2024",
    title: "中试谷倾斜（2024）",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-3d-2024/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "zsg_3dtiles_2025",
    title: "中试谷倾斜（2025）",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-3d-2025/tileset.json`,
    minHeight: 10,
    maxHeight: 200000,
  },
  {
    id: "zsg_pointcloud",
    title: "中试谷点云",
    nodeType: "layer",
    isChecked: false,
    layerType: "3dtiles",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-pointcloud/tileset.json`,
    minHeight: 10,
    maxHeight: 20000,
  },
  {
    id: "zsg_dem",
    title: "中试谷DEM",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-dem/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "zsg_dom",
    title: "中试谷DOM-2020",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-dom-2020/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "zsg_dom_2025",
    title: "中试谷DOM-2025",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-dom-2025/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
  {
    id: "zsg_dom_2026",
    title: "中试谷DOM-2026",
    nodeType: "layer",
    isChecked: false,
    layerType: "wmts",
    layerUrl: `${urlConfig.baseUrl}/layer/chibi/zsg-dom-2026/{z}/{x}/{y}.png`,
    minHeight: 50,
    maxHeight: 500000,
  },
];

const hljLayer: LayerTreeNode[] = [
  {
    id: "hljSurvey",
    title: "哈尔滨低空试验区",
    nodeType: "group",
    isChecked: false,
    children: [
      {
        id: "hlj_songbei_boundary",
        title: "哈尔滨松北区",
        nodeType: "layer",
        isChecked: false,
        layerType: "admin_boundary",
        minHeight: 10000,
        maxHeight: 200000,
        boundaryOptions: {
          url: "./lib/Cesium/Json/哈尔滨松北区.json",
          lineColor: "#06FFF8",
          lineWidth: 4,
          fillColor: "#00AAFF",
          fillOpacity: 0.08,
          autoFlyTo: false,
          flyToDuration: 2.0,
          cameraHeight: 70000,
          pitch: -Math.PI / 6,
        },
      },
      {
        id: "hlj_survey_imagery",
        title: "影像",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.imagery,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 14075102.139876801,
          south: 5744515.123795064,
          east: 14089761.62010141,
          north: 5754288.11061147,
          duration: 1.5,
        },
      },
      {
        id: "hlj_survey_sd",
        title: "三调",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.sandiao,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 14075102.139876801,
          south: 5744515.123795064,
          east: 14084875.126693208,
          north: 5754288.11061147,
          duration: 1.5,
        },
      },
      {
        id: "hlj_survey_jcch",
        title: "基础测绘",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.baseSurvey,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 14075102.139876801,
          south: 5744515.123795064,
          east: 14084875.126693208,
          north: 5754288.11061147,
          duration: 1.5,
        },
      },
      {
        id: "hlj_survey_zhpc",
        title: "灾害普查",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.disasterSurvey,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 14075102.139876801,
          south: 5744515.123795064,
          east: 14084875.126693208,
          north: 5754288.11061147,
          duration: 1.5,
        },
      },
      {
        id: "hlj_survey_terrain",
        title: "地形",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.terrain,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 14050669.6728358,
          south: 5651671.749039199,
          east: 14207037.4618983,
          north: 5886223.432632949,
          duration: 1.5,
        },
      },
      {
        id: "hlj_wms_111",
        title: "DEM图层",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.dem,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
      },
      {
        id: "hlj_survey_qiqihar_yian",
        title: "齐齐哈尔-依安县",
        nodeType: "layer",
        isChecked: false,
        layerType: "wms",
        wmsBaseUrl: urlConfig.hljSurveyWms?.qiqiharYiAn,
        wmsLayers: "0",
        wmsSrs: "EPSG:3857",
        dpiMode: "7",
        minHeight: 10,
        maxHeight: 2000000,
        flyToMercatorRect: {
          west: 13737934.094710778,
          south: 5964407.327164207,
          east: 14207037.461898278,
          north: 6277142.905289207,
          duration: 1.5,
        },
      },
      {
        id: "hlj_city_building",
        title: "LOD1.3城市建筑三维模型",
        nodeType: "layer",
        isChecked: false,
        layerType: "3dtiles",
        layerUrl: `${urlConfig.baseUrl}/layer/chibi/hlj-city-building/tileset.json`,
        minHeight: 10,
        maxHeight: 200000,
        tilesetOffset: {
          x: 0,
          y: 0,
          z: 0,
        },
      },
      {
        id: "hlj_city_realtime",
        title: "城市实景三维模型",
        nodeType: "layer",
        isChecked: false,
        layerType: "3dtiles",
        layerUrl: `${urlConfig.baseUrl}/layer/chibi/hlj-city-realtime/tileset.json`,
        minHeight: 10,
        maxHeight: 200000,
        tilesetOffset: {
          x: 0,
          y: 0,
          z: 0,
        },
      },
    ],
  },
];

const isCbEnv = ["cb", "production", "test"].includes(import.meta.env.MODE);
const useLayer = (isCbEnv ? cbLayer : wdLayer) as LayerTreeNode[];

const LayerTrees = ref<LayerTreeNode[]>([
  {
    id: "floorMap",
    title: "基础服务",
    nodeType: "group",
    isChecked: false,
    children: [
      {
        id: "tdt_img_w",
        title: "天地图影像",
        nodeType: "layer",
        isChecked: true,
        layerType: "tdt",
        layer: "img",
        tileMatrixSetID: "w",
        layerUrl: `${urlConfig.tdtUrl}/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${urlConfig.getTdtToken()}`,
        minHeight: 10,
        maxHeight: 1000000,
      },
      {
        id: "tdt_terrain",
        title: "天地图地形",
        nodeType: "layer",
        isChecked: true,
        layerType: "terrain",
        terrainUrls: [
          `${urlConfig.tdtUrlHttps}/mapservice/swdx?T=ele_c&tk=${urlConfig.getTdtToken()}`,
        ],
      },
      {
        id: "tdt_cia_w",
        title: "天地图注记",
        nodeType: "layer",
        isChecked: true,
        layerType: "tdt",
        layer: "cia",
        tileMatrixSetID: "w",
        layerUrl: `${urlConfig.tdtUrl}/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={TileMatrix}&TILEROW={TileRow}&TILECOL={TileCol}&tk=${urlConfig.getTdtToken()}`,
        minHeight: 10,
        maxHeight: 1000000,
      },
      ...useLayer,
      {
        id: "beidou_grid",
        title: "北斗网格（中试谷）",
        nodeType: "layer",
        isChecked: false,
        layerType: "beidou_grid",
        minHeight: 1,
        maxHeight: 100000,
        gridOptions: {
          lineColor: "#FFFF00",
          lineAlpha: 0.6,
          lineWidth: 5,
          level: 4,
          zLayers: 4,
        },
      },
    ],
  },

  {
    id: "adminBoundary",
    title: "行政区划",
    nodeType: "group",
    isChecked: true,
    children: [
      {
        id: "chibi_boundary",
        title: "赤壁市",
        nodeType: "layer",
        isChecked: true,
        layerType: "admin_boundary",
        minHeight: 10000,
        maxHeight: 200000,
        boundaryOptions: {
          url: "./lib/Cesium/Json/赤壁市.json",
          lineColor: "#ffd500",
          lineWidth: 4,
          fillColor: "#00AAFF",
          fillOpacity: 0,
          autoFlyTo: true,
          flyToDuration: 2.0,
          cameraHeight: 70000,
          pitch: -Math.PI / 6,
        },
      },
    ],
  },
  {
    id: "deviceLayers",
    title: "设备图层",
    nodeType: "group",
    isChecked: false,
    children: [
      {
        id: "airport_devices",
        title: "机巢设备",
        nodeType: "layer",
        isChecked: false,
        layerType: "airport_devices",
        minHeight: 0,
        maxHeight: 500000,
        deviceOptions: {
          onlineIcon: airportOnlineIcon,
          offlineIcon: airportOfflineIcon,
          iconOptions: { scale: 0.4, allowOverlap: true },
          labelOptions: {
            field: "nickname",
            textStyle: {
              size: 14,
              color: "#FFFFFF",
              haloColor: "#AC561D",
              haloWidth: 20,
              offset: [0, 0.2],
              allowOverlap: true,
            },
          },
        },
      },
      {
        id: "airport_coverage",
        title: "机场覆盖范围",
        nodeType: "layer",
        isChecked: false,
        layerType: "airport_coverage",
        minHeight: 30000,
        maxHeight: 500000,
        coverageOptions: {
          baseRadius: 3000,
          maxRadius: 5000,
          baseColor: "rgba(0,170,255,0.18)",
          pulseColor: "rgba(0,170,255,0.35)",
        },
      },
    ],
  },
  {
    id: "airspaceRange",
    title: "空域范围",
    nodeType: "group",
    isChecked: false,
    children: [
      {
        id: "flight_airspace",
        title: "湖北一张网赤壁报批空域",
        nodeType: "layer",
        isChecked: false,
        layerType: "airspace_boxes",
        minHeight: 0,
        maxHeight: 200000,
        airspaceOptions: {
          areas: [
            {
              name: "赤壁市飞行空域",
              coordinates: [
                [113.8925, 29.8125, 0],
                [113.8789, 29.5958, 0],
                [114.1125, 29.6378, 0],
                [114.0761, 29.8617, 0],
              ],
              minHeight: 0,
              maxHeight: 1500,
            },
          ],
          fillColor: "#00AAFF",
          fillOpacity: 0.2,
          showOutline: true,
          outlineColor: "rgba(0,228,169,0.53)",
          outlineWidth: 5,
        },
      },
      {
        id: "no_fly_zones",
        title: "禁飞区",
        nodeType: "layer",
        isChecked: false,
        layerType: "no_fly_zones",
        minHeight: 0,
        maxHeight: 200000,
        noFlyZoneOptions: {
          fillColor: "#FF7A00",
          fillOpacity: 0.25,
          outlineColor: "#FF3B30",
          outlineWidth: 2,
          labelColor: "#FFFFFF",
          labelOutlineColor: "#000000",
          labelOutlineWidth: 2,
        },
      },
      {
        id: "low_altitude_suitable_zone",
        title: "低空适飞区",
        nodeType: "layer",
        isChecked: false,
        layerType: "low_altitude_suitable_zone",
        minHeight: 0,
        maxHeight: 200000,
      },
    ],
  },
  ...hljLayer,
  {
    id: "flightRoute",
    title: "飞行航线",
    nodeType: "group",
    isChecked: false,
    layerOption: {
      nodeType: "layer",
      isChecked: false,
      layerType: "router",
      minHeight: 200,
      maxHeight: 200000,
    },
    children: [],
  },
]);

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
// 默认展开的节点key
const defaultExpandedKeys = ref<string[]>([
  "floorMap",
  "adminBoundary",
  "deviceLayers",
  "airspaceRange",
]);
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
  if (data.nodeType !== "layer") return;
  if (checked) {
    handleShowLayer(data);
  } else {
    handleHideLayer(data);
  }
};

const droneImageUrl = getImageUrl("assets/images/map/dajiangfly.png");
const flyToRect = (rect: {
  west: number;
  south: number;
  east: number;
  north: number;
  duration?: number;
}) => {
  const viewer = mapManager.value?.viewer;
  if (!viewer || !Cesium) return;
  const destination = Cesium.Rectangle.fromDegrees(
    rect.west,
    rect.south,
    rect.east,
    rect.north,
  );
  viewer.camera.flyTo({ destination, duration: rect.duration ?? 1.5 });
};
const flyToMercatorRect = (rect: {
  west: number;
  south: number;
  east: number;
  north: number;
  duration?: number;
}) => {
  const viewer = mapManager.value?.viewer;
  if (!viewer || !Cesium) return;
  const projection = new Cesium.WebMercatorProjection();
  const sw = projection.unproject(
    new Cesium.Cartesian3(rect.west, rect.south, 0),
  );
  const ne = projection.unproject(
    new Cesium.Cartesian3(rect.east, rect.north, 0),
  );
  const destination = Cesium.Rectangle.fromRadians(
    sw.longitude,
    sw.latitude,
    ne.longitude,
    ne.latitude,
  );
  viewer.camera.flyTo({ destination, duration: rect.duration ?? 1.5 });
};
const buildWmsUrl = (baseUrl: string, layers: string) => {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    STYLES: "",
    LAYERS: layers,
    EXCEPTIONS: "application/vnd.ogc.se_inimage",
    SRS: "EPSG:4326",
    WIDTH: "256",
    HEIGHT: "256",
  });
  return `${baseUrl}?${params.toString()}`;
};
const wmsCapsCache = new Map<
  string,
  {
    layerName?: string;
    rect4326?: { west: number; south: number; east: number; north: number };
    rect3857?: { west: number; south: number; east: number; north: number };
  }
>();
const getWmsCaps = async (baseUrl: string) => {
  if (wmsCapsCache.has(baseUrl)) return wmsCapsCache.get(baseUrl)!;
  const result: {
    layerName?: string;
    rect4326?: { west: number; south: number; east: number; north: number };
    rect3857?: { west: number; south: number; east: number; north: number };
  } = {};
  try {
    const url = `${baseUrl}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.1.1`;
    const res = await fetch(url);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    const nameNodes = Array.from(xml.getElementsByTagName("Name"));
    const layerName = nameNodes
      .map((n) => (n.textContent || "").trim())
      .find((v) => v && v !== "WMS");
    if (layerName) {
      result.layerName = layerName;
    }

    const latLonBbox = xml.getElementsByTagName(
      "LatLonBoundingBox",
    )?.[0] as any;
    if (latLonBbox?.getAttribute) {
      const minx = Number(latLonBbox.getAttribute("minx"));
      const miny = Number(latLonBbox.getAttribute("miny"));
      const maxx = Number(latLonBbox.getAttribute("maxx"));
      const maxy = Number(latLonBbox.getAttribute("maxy"));
      if ([minx, miny, maxx, maxy].every((v) => Number.isFinite(v))) {
        result.rect4326 = { west: minx, south: miny, east: maxx, north: maxy };
      }
    }

    const bboxNodes = Array.from(xml.getElementsByTagName("BoundingBox"));
    const bbox3857 = bboxNodes.find((n: any) => {
      const srs = (
        n.getAttribute?.("SRS") ||
        n.getAttribute?.("CRS") ||
        ""
      ).toUpperCase();
      return srs.includes("EPSG:3857");
    }) as any;
    if (bbox3857?.getAttribute) {
      const minx = Number(bbox3857.getAttribute("minx"));
      const miny = Number(bbox3857.getAttribute("miny"));
      const maxx = Number(bbox3857.getAttribute("maxx"));
      const maxy = Number(bbox3857.getAttribute("maxy"));
      if ([minx, miny, maxx, maxy].every((v) => Number.isFinite(v))) {
        result.rect3857 = { west: minx, south: miny, east: maxx, north: maxy };
      }
    }
  } catch {}
  wmsCapsCache.set(baseUrl, result);
  return result;
};

const addWmsLayerMercator = async (layer: LayerTreeNode) => {
  const viewer = mapManager.value?.viewer;
  if (!viewer || !Cesium) return;

  const baseUrl = layer.wmsBaseUrl || layer.layerUrl;
  if (!baseUrl) return;
  const caps = await getWmsCaps(baseUrl);
  const layers = layer.wmsLayers || caps.layerName || "0";

  if (wmsImageryLayerMap.has(layer.id)) {
    const existing = wmsImageryLayerMap.get(layer.id);
    existing.show = true;
    existing.alpha = 1;
    return;
  }

  const provider = new Cesium.WebMapServiceImageryProvider({
    url: baseUrl,
    layers,
    parameters: {
      service: "WMS",
      version: "1.1.1",
      request: "GetMap",
      format: "image/png",
      transparent: "true",
      styles: "",
      srs: layer.wmsSrs || "EPSG:3857",
      crs: layer.wmsSrs || "EPSG:3857",
      dpiMode: layer.dpiMode || "7",
    },
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 20,
  });

  const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.alpha = 1;
  imageryLayer.show = true;
  wmsImageryLayerMap.set(layer.id, imageryLayer);
  wmsLoadedIds.add(layer.id);
};
// 层显示时定位
const locateLayerOnShow = (layer: LayerTreeNode) => {
  if (!mapManager.value) return;
  // 3D Tiles 重新显示时也需要重新定位
  if (layer.layerType === "3dtiles") {
    setTimeout(() => {
      // mapManager.value?.flyToObliquePhotography(layer.id);
    }, 120);
    return;
  }
  // 支持配置型定位
  if (layer.flyToMercatorRect) {
    flyToMercatorRect(layer.flyToMercatorRect);
    return;
  }
  if (layer.flyToRect) {
    flyToRect(layer.flyToRect);
  }
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

const handleShowLayer = async (layer: LayerTreeNode) => {
  const shouldLocate = !layerLocatedOnceIds.has(layer.id);
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
        layerLocatedOnceIds.add(layer.id);
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
        layerLocatedOnceIds.add(layer.id);
      }
      return;
    }
  }
  switch (layer.layerType) {
    case "terrain":
      addTerrain(layer.terrainUrls);
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
        layerLocatedOnceIds.add(layer.id);
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
          layerLocatedOnceIds.add(layer.id);
        }
      } catch (error) {
        console.error("加载倾斜摄影数据失败:", error);
      }
      break;

    case "wmts":
      mapManager.value?.addWMTSLayer(layer.layerUrl, {
        id: layer.id,
        show: true,
        maximumLevel: 22,
      });
      if (shouldLocate) {
        locateLayerOnShow(layer);
        layerLocatedOnceIds.add(layer.id);
      }
      break;
    case "wms": {
      const baseUrl = layer.wmsBaseUrl || layer.layerUrl;
      if ((layer.wmsSrs || "").toUpperCase().includes("3857")) {
        await addWmsLayerMercator(layer);
        if (shouldLocate && baseUrl) {
          if (layer.flyToMercatorRect) {
            flyToMercatorRect(layer.flyToMercatorRect);
          } else if (layer.flyToRect) {
            flyToRect(layer.flyToRect);
          } else {
            const caps = await getWmsCaps(baseUrl);
            if (caps.rect3857) {
              flyToMercatorRect({ ...caps.rect3857, duration: 1.5 });
            } else if (caps.rect4326) {
              flyToRect({ ...caps.rect4326, duration: 1.5 });
            }
          }
          layerLocatedOnceIds.add(layer.id);
        }
        break;
      }
      const layers = layer.wmsLayers || "0";
      if (!baseUrl) {
        break;
      }
      if (wmsLoadedIds.has(layer.id)) {
        mapManager.value?.showLayer(layer.id);
      } else {
        const wmsUrl = buildWmsUrl(baseUrl, layers);
        mapManager.value?.addWMSLayer(wmsUrl, layer.id, `${layer.id}-source`, {
          opacity: 1,
          visible: true,
        });
        wmsLoadedIds.add(layer.id);
      }
      if (shouldLocate) {
        const caps = await getWmsCaps(baseUrl);
        if (layer.flyToRect) {
          flyToRect(layer.flyToRect);
        } else if (caps.rect4326) {
          flyToRect({ ...caps.rect4326, duration: 1.5 });
        } else if (caps.rect3857) {
          flyToMercatorRect({ ...caps.rect3857, duration: 1.5 });
        }
        layerLocatedOnceIds.add(layer.id);
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
        if (shouldLocate) {
          layerLocatedOnceIds.add(layer.id);
        }
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
            iconOptions: layer.deviceOptions.iconOptions,
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
  if (layer.layerType === "wms") {
    const wmsLayer = wmsImageryLayerMap.get(layer.id);
    if (wmsLayer) {
      wmsLayer.show = false;
      return;
    }
    mapManager.value?.setLayerVisibility(layer.id, false);
    mapManager.value?.hideLayer(layer.id);
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

    // 移除通用图层的高度限制
    mapManager.value?.removeLayerHeightLimit(layer.id);
  }
};

const initTree = () => {
  try {
    treeRef.value.setCheckedKeys([]);
    const storeLayerTree = LayerTrees.value;
    if (storeLayerTree && storeLayerTree.length > 0) {
      originalLayerTree.value = cloneDeep(storeLayerTree);
      layerTree.value = cloneDeep(originalLayerTree.value);
      reloadTree();
      nextTick(() => {
        if (treeRef.value) {
          const nodeIds = getAllKeys(layerTree.value);
          treeRef.value.setCheckedKeys(nodeIds);
        }
      });
    } else {
    }
  } catch (error) {}
};

const mapManager = ref<CesiumMapManager | null>(null);
const wmsLoadedIds = new Set<string>();
const wmsImageryLayerMap = new Map<string, any>();
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
async function getRouterList() {
  if (routerList.value && routerList.value.length) {
    return;
  }
  const res: any = await $getAllflight({
    pageNum: 1,
    pageSize: 100,
    isDetail: false,
    // TODO，临时只展示这条航线
    // routeName: '水库巡查航线'
  });
  const routerMenu = getNodeByKeyValue(LayerTrees.value, "id", "flightRoute");
  routerList.value = res.rows.map((f: any) => {
    return {
      ...routerMenu.layerOption,
      id: f.routeId + "_router",
      title: f.routeName,
      routeId: f.routeId,
    };
  });
  routerMenu.children = routerList.value;
}

const route = useRoute();
// 在组件挂载时初始化
const initMapData = async (viewer: any) => {
  clearAdminBoundaryCache();
  clearNoFlyZoneCache();
  clearLowAltitudeSuitableZoneCache();
  layerLocatedOnceIds.clear();
  mapManager.value = new CesiumMapManager(viewer);
  await ensureDeviceData();
  await getRouterList();
  initTree();
  routerManage(route.fullPath);
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

const routerManage = (routePath: string) => {
  const inDeviceManagePage = routePath.startsWith(
    "/defaultMapPage/flyControl/project",
  );
  const inRouteManagePage = routePath.startsWith(
    "/defaultMapPage/flyControl/route",
  );
  if (treeRef.value) {
    setNodeValueById(
      ["airport_devices"],
      "isChecked",
      inDeviceManagePage,
      layerTree.value,
      false,
    );
    setNodeValueById(
      ["airport_devices"],
      "isChecked",
      inDeviceManagePage,
      originalLayerTree.value,
      false,
    );
    treeRef.value.setChecked("airport_devices", inDeviceManagePage);
  }

  setNodeValueById(
    ["no_fly_zones"],
    "isChecked",
    inRouteManagePage,
    layerTree.value,
    false,
  );
  setNodeValueById(
    ["no_fly_zones"],
    "isChecked",
    inRouteManagePage,
    originalLayerTree.value,
    false,
  );
  if (treeRef.value) {
    treeRef.value.setChecked("no_fly_zones", inRouteManagePage);
  }

  if (
    routePath.startsWith("/defaultMapPage/flyControl") &&
    routePath !== "/defaultMapPage/flyControl/project"
  ) {
    if (treeRef.value) {
      setNodeValueById(
        ["airport_coverage"],
        "isChecked",
        false,
        layerTree.value,
        false, // 不自动将未选中节点的isChecked设为false
      );
      treeRef.value.setChecked("airport_coverage", false);
    }
  } else {
    if (treeRef.value) {
      setNodeValueById(
        ["airport_coverage"],
        "isChecked",
        false,
        layerTree.value,
        false, // 不自动将未选中节点的isChecked设为false
      );
      treeRef.value.setChecked("airport_coverage", false);
    }
    const adminBoundaryLayer = getNodeByKeyValue(
      layerTree.value,
      "id",
      "chibi_boundary",
    );
    if (adminBoundaryLayer && mapManager.value?.viewer) {
      flyToAccurateAdminBoundary(
        mapManager.value.viewer,
        adminBoundaryLayer.id,
        {
          cameraHeight:
            adminBoundaryLayer.boundaryOptions.cameraHeight || 70000,
          pitch: adminBoundaryLayer.boundaryOptions.pitch || -Math.PI / 6,
          flyToDuration:
            adminBoundaryLayer.boundaryOptions.flyToDuration || 1.5,
        },
      );
    }
  }
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
