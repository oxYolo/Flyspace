<!-- 禁飞区管理面板（练习功能）：航线库页面右侧静态面板 -->
<template>
  <div class="no-fly-zone-panel" v-loading="loading" element-loading-text="禁飞区加载中...">
    <!-- 顶部标题 -->
    <div class="panel-header">
      <div class="header-title">禁飞区管理 ({{ pageOptions.total }})</div>
      <el-icon v-tooltip="'清除地图禁飞区'" :size="18" class="action-icon" @click="clearZoneOnMap">
        <Delete />
      </el-icon>
    </div>

    <!-- 搜索与类型筛选 -->
    <div class="search-area">
      <el-input v-model="searchForm.keyword" placeholder="名称 / 类型 / 描述" clearable size="small"
        @clear="handleSearch" @keyup.enter="handleSearch" />
      <el-select v-model="searchForm.type" placeholder="全部类型" clearable size="small" @change="handleSearch">
        <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-button class="search-btn" size="small" type="primary" @click="handleSearch">查询</el-button>
    </div>

    <!-- 禁飞区列表 -->
    <div class="zone-list">
      <div v-for="zone in zoneList" :key="String(zone.id ?? zone.name)" class="zone-card"
        :class="{ active: activeZoneId === String(zone.id ?? zone.name) }" @click="handleZoneClick(zone)">
        <div class="card-top">
          <span v-tooltip="zone.name" class="zone-name">{{ zone.name || '未命名禁飞区' }}</span>
          <span class="zone-type-tag">{{ zone.type || '未知类型' }}</span>
        </div>
        <div v-tooltip="zone.description" class="zone-desc">
          {{ zone.description || '暂无描述' }}
        </div>
        <div class="zone-bbox" v-if="formatBbox(zone.bbox)">
          范围：{{ formatBbox(zone.bbox) }}
        </div>
      </div>
      <div v-if="!loading && zoneList.length === 0" class="empty-tip">暂无禁飞区数据</div>
    </div>

    <!-- 分页 -->
    <div class="panel-footer">
      <el-pagination v-model:current-page="pageOptions.page" v-model:page-size="pageOptions.pageSize"
        :pager-count="5" size="small" layout="prev, pager, next, total" :total="pageOptions.total"
        class="white-el-pagination" @current-change="handlePageChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import {
  $queryNoFlyZoneList,
  type NoFlyZoneRecord,
} from "@/api/noFlyZoneList";

declare const Cesium: any;

const loading = ref(false);
const zoneList = ref<NoFlyZoneRecord[]>([]);
const activeZoneId = ref<string>("");

const searchForm = ref({ keyword: "", type: "" });
const pageOptions = ref({ page: 1, pageSize: 10, total: 0 });

// 禁飞区类型筛选项（按需求文档示例）
const typeOptions = ["机场周边", "军事禁区", "党政机关", "临时禁飞区", "其他"];

const ZONE_ENTITY_ID = "nfz-practice-zone";

const getViewer = () => (window as any).__cesiumViewer;

/** 解析 bbox：支持数组 [w,s,e,n]、对象 {west,south,east,north}、逗号字符串 */
const parseBbox = (bbox: NoFlyZoneRecord["bbox"]) => {
  if (!bbox) return null;
  let west: number, south: number, east: number, north: number;
  if (Array.isArray(bbox)) {
    [west, south, east, north] = bbox.map(Number);
  } else if (typeof bbox === "string") {
    const parts = bbox.split(/[,\s]+/).map(Number);
    if (parts.length < 4) return null;
    [west, south, east, north] = parts;
  } else {
    west = Number(bbox.west);
    south = Number(bbox.south);
    east = Number(bbox.east);
    north = Number(bbox.north);
  }
  if (![west, south, east, north].every((v) => Number.isFinite(v))) return null;
  return { west, south, east, north };
};

const formatBbox = (bbox: NoFlyZoneRecord["bbox"]) => {
  const b = parseBbox(bbox);
  if (!b) return "";
  return `${b.west.toFixed(4)}, ${b.south.toFixed(4)} ~ ${b.east.toFixed(4)}, ${b.north.toFixed(4)}`;
};

/** 在地图上绘制禁飞区矩形并飞过去 */
const drawZoneOnMap = (zone: NoFlyZoneRecord) => {
  const viewer = getViewer();
  const b = parseBbox(zone.bbox);
  if (!viewer || typeof Cesium === "undefined") return;
  if (!b) {
    ElMessage.warning("该禁飞区缺少 bbox 字段，无法在地图绘制");
    return;
  }
  clearZoneOnMap();
  viewer.entities.add({
    id: ZONE_ENTITY_ID,
    name: zone.name || "禁飞区",
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(b.west, b.south, b.east, b.north),
      material: Cesium.Color.RED.withAlpha(0.35),
      outline: true,
      outlineColor: Cesium.Color.RED,
      outlineWidth: 2,
    },
  });
  const rect = Cesium.Rectangle.fromDegrees(b.west, b.south, b.east, b.north);
  viewer.camera.flyToBoundingSphere(Cesium.BoundingSphere.fromRectangle3D(rect), {
    duration: 1.2,
  });
};

const clearZoneOnMap = () => {
  const viewer = getViewer();
  if (!viewer) return;
  const entity = viewer.entities.getById(ZONE_ENTITY_ID);
  if (entity) viewer.entities.remove(entity);
  activeZoneId.value = "";
};

const handleZoneClick = (zone: NoFlyZoneRecord) => {
  activeZoneId.value = String(zone.id ?? zone.name);
  drawZoneOnMap(zone);
};

/** 请求禁飞区列表 */
const fetchList = async () => {
  loading.value = true;
  try {
    const { list, total } = await $queryNoFlyZoneList({
      page: pageOptions.value.page,
      pageSize: pageOptions.value.pageSize,
      keyword: searchForm.value.keyword || undefined,
      type: searchForm.value.type || undefined,
    });
    zoneList.value = list;
    pageOptions.value.total = total;
  } catch (e: any) {
    ElMessage.error(e?.message || "禁飞区列表查询失败");
    zoneList.value = [];
    pageOptions.value.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageOptions.value.page = 1;
  fetchList();
};

const handlePageChange = (page: number) => {
  pageOptions.value.page = page;
  fetchList();
};

onMounted(fetchList);
onBeforeUnmount(clearZoneOnMap);
</script>

<style scoped lang="less">
.no-fly-zone-panel {
  position: fixed;
  /* 紧贴航线库左侧面板右侧（左侧面板宽 320px + 切换菜单 ~40px + 间隙） */
  left: calc(var(--fly-control-left-panel-width, 320px) + 52px);
  top: 90px;
  width: 320px;
  height: calc(100% - 160px);
  background-color: rgba(23, 44, 44, 0.9);
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 5;
  color: #fff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #444;

  .header-title {
    font-size: 15px;
    font-weight: bold;
  }

  .action-icon {
    cursor: pointer;
    color: #ccc;

    &:hover {
      color: #2d8cf0;
    }
  }
}

.search-area {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  flex-wrap: wrap;

  .el-input {
    width: 100%;
  }

  .el-select {
    flex: 1;
    min-width: 0;
  }

  .search-btn {
    flex-shrink: 0;
  }
}

.zone-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;

  .zone-card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    &.active {
      border-color: #2d8cf0;
      background: rgba(45, 140, 240, 0.15);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      .zone-name {
        font-size: 14px;
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .zone-type-tag {
        flex-shrink: 0;
        font-size: 12px;
        color: #ff4d4f;
        border: 1px solid #ff4d4f;
        border-radius: 3px;
        padding: 0 6px;
        line-height: 18px;
      }
    }

    .zone-desc {
      margin-top: 6px;
      font-size: 12px;
      color: #bbb;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .zone-bbox {
      margin-top: 6px;
      font-size: 12px;
      color: #888;
    }
  }

  .empty-tip {
    text-align: center;
    color: #888;
    padding: 30px 0;
    font-size: 13px;
  }
}

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid #444;
  display: flex;
  justify-content: center;
}
</style>
