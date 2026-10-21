<template>
  <div class="requirement-page" :class="{ 'locate-mode': isLocateMode }">
    <div
      v-if="isLocateMode"
      class="requirementBackBtn"
      :class="{ locateMode: isLocateMode }">
      <el-button :icon="Back" @click="handleBackFromLocate">返 回</el-button>
    </div>

    <div v-show="!isLocateMode" class="page-panel">
      <div class="stats-grid" v-loading="summaryLoading">
        <div
          v-for="card in summaryCards"
          :key="card.key"
          class="stat-card"
          :class="`stat-card-${card.key}`">
          <div class="stat-title">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
        </div>
      </div>

      <div class="table-card">
        <div class="card-header">
          <div class="card-title">需求列表</div>
        </div>

        <div class="filter-bar">
          <el-button
            :icon="Download"
            class="download-btn"
            :loading="exportLoading"
            @click="handleDownload">
            导出
          </el-button>
          <el-input
            v-model="searchForm.name"
            clearable
            placeholder="请输入需求名称"
            class="filterItem"
            @keyup.enter="handleSearch"
            @clear="handleSearch" />

          <el-select
            v-model="searchForm.flightType"
            clearable
            :teleported="false"
            popper-class="black-select"
            class="filterItem"
            placeholder="请选择飞行类型">
            <el-option
              v-for="option in flightTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value" />
          </el-select>

          <el-select
            v-model="searchForm.status"
            clearable
            :teleported="false"
            popper-class="black-select"
            class="filterItem"
            placeholder="请选择状态类型">
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value" />
          </el-select>

          <el-date-picker
            v-model="searchForm.timeRange"
            type="datetimerange"
            class="filterItem filterItemDate"
            start-placeholder="创建开始时间"
            end-placeholder="创建结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            range-separator="至" />

          <div class="filter-actions">
            <el-button :icon="Search" type="primary" @click="handleSearch">
              查询
            </el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>

            <el-button
              class="create-btn"
              :icon="Plus"
              type="primary"
              @click="handleCreate">
              新增需求
            </el-button>
          </div>
        </div>

        <el-table
          v-loading="tableLoading"
          :data="tableData"
          height="calc(100% - 168px)"
          class="requirement-table">
          <el-table-column
            type="index"
            label="序号"
            width="72"
            align="center" />
          <el-table-column
            prop="name"
            label="需求名称"
            min-width="180"
            show-overflow-tooltip
            align="center" />
          <el-table-column
            prop="unitName"
            label="需求单位"
            min-width="150"
            show-overflow-tooltip
            align="center" />
          <el-table-column
            prop="divisionName"
            label="需求科室"
            min-width="150"
            show-overflow-tooltip
            align="center" />
          <el-table-column
            prop="flightTypeName"
            label="飞行类型"
            width="110"
            align="center">
            <template #default="{ row }">
              {{ getFlightTypeText(row.flightType, row.flightTypeName) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="status"
            label="状态"
            width="120"
            align="center">
            <template #default="{ row }">
              <el-tag
                :type="statusTagTypeMap[row.status] || 'info'"
                effect="plain">
                {{ getStatusText(row.status, row.statusName) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="createUserName"
            label="创建人"
            width="110"
            show-overflow-tooltip
            align="center" />
          <el-table-column
            prop="address"
            label="需求描述"
            min-width="220"
            show-overflow-tooltip
            align="center">
            <template #default="{ row }">
              {{ row.description || "--" }}
            </template>
          </el-table-column>
          <el-table-column
            prop="createTime"
            label="创建时间"
            width="180"
            align="center" />
          <el-table-column
            label="操作"
            width="250"
            fixed="right"
            align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-link
                  underline="never"
                  type="primary"
                  @click="handleDetail(row)">
                  查看
                </el-link>
                <el-link
                  underline="never"
                  type="primary"
                  @click="handleEdit(row)">
                  编辑
                </el-link>
                <el-link
                  underline="never"
                  v-if="Number(row.status) === 0"
                  link
                  type="success"
                  @click="handleOpenAudit(row)">
                  审核
                </el-link>
                <el-popconfirm
                  title="确认删除当前需求吗？"
                  confirm-button-text="确认"
                  cancel-button-text="取消"
                  @confirm="handleDelete(row)">
                  <template #reference>
                    <el-link underline="never" link type="danger">删除</el-link>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-footer">
          <el-pagination
            v-model:current-page="pageState.pageNum"
            v-model:page-size="pageState.pageSize"
            layout="total, prev, pager, next, sizes"
            :page-sizes="[10, 20, 50, 100]"
            :total="pageState.total"
            @current-change="handleCurrentChange"
            @size-change="handleSizeChange" />
        </div>
      </div>
    </div>

    <RequirementFormDrawer
      v-model="drawerVisible"
      :mode="drawerMode"
      :requirement-id="currentRequirementId"
      :picked-location="pickedLocation"
      @start-locate="handleStartLocate"
      @success="handleRefreshAfterSubmit" />

    <RequirementAuditDrawer
      v-model="auditDrawerVisible"
      :requirement-id="currentAuditRequirementId"
      @success="handleRefreshAfterSubmit" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { Back, Plus, Search, Refresh, Download } from "@element-plus/icons-vue";
import { ElMessage, dayjs } from "element-plus";
// @ts-ignore
import { getMapManager, getViewer } from "@/services/mapService";
import {
  $deleteRequirement,
  $exportRequirement,
  $getRequirementPage,
  $getRequirementStat,
  $reverseGeocodeByTdt,
  type RequirementPageParams,
  type RequirementStatData,
} from "@/api/flyControl/requirementApi.ts";
import {
  REQUIREMENT_FLIGHT_TYPE_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
} from "./constants";
import RequirementAuditDrawer from "./components/RequirementAuditDrawer.vue";
import RequirementFormDrawer from "./components/RequirementFormDrawer.vue";
import redPinImage from "@/assets/images/map/red.png";

type DrawerMode = "create" | "edit" | "detail";

interface RequirementRecord {
  id: number | string;
  name: string;
  unitName?: string;
  divisionName?: string;
  flightType?: number;
  flightTypeName?: string;
  status?: number;
  statusName?: string;
  createUserName?: string;
  description?: string;
  address?: string;
  createTime?: string;
}

interface SummaryCard {
  key: string;
  label: string;
  value: number;
}

const flightTypeOptions = [...REQUIREMENT_FLIGHT_TYPE_OPTIONS];
const statusOptions = [...REQUIREMENT_STATUS_OPTIONS];

const statusTagTypeMap: Record<number, "warning" | "success" | "danger"> = {
  0: "warning",
  1: "success",
  2: "danger",
};

const searchForm = reactive({
  name: "",
  flightType: undefined as number | undefined,
  status: undefined as number | undefined,
  timeRange: [] as string[],
});

const pageState = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
});

const tableLoading = ref(false);
const summaryLoading = ref(false);
const exportLoading = ref(false);
const tableData = ref<RequirementRecord[]>([]);

const summaryCards = ref<SummaryCard[]>([
  { key: "today", label: "今日新增需求", value: 0 },
  { key: "pending", label: "待处理需求", value: 0 },
  { key: "approved", label: "本月已通过需求", value: 0 },
  { key: "rejected", label: "本月驳回需求", value: 0 },
]);

const drawerVisible = ref(false);
const drawerMode = ref<DrawerMode>("create");
const currentRequirementId = ref<number | string | null>(null);
const auditDrawerVisible = ref(false);
const currentAuditRequirementId = ref<number | string | null>(null);
const isLocateMode = ref(false);
const pickedLocation = ref<{
  longitude: number;
  latitude: number;
  address?: string;
  token: number;
} | null>(null);

const REQUIREMENT_LOCATE_LAYER = "requirementLocate";
let locateHandler: any = null;
let geocodeRequestSerial = 0;

const clearLocateLayer = () => {
  const mapManager = getMapManager();
  mapManager?.clearLayer?.(REQUIREMENT_LOCATE_LAYER);
};

const parsePositionText = (positionText?: string) => {
  const parts = String(positionText || "")
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
};

const destroyLocateHandler = () => {
  if (locateHandler?.destroy) {
    locateHandler.destroy();
  }
  locateHandler = null;
};

const renderLocatePoint = (longitude: number, latitude: number) => {
  const mapManager = getMapManager();
  if (!mapManager) return;
  clearLocateLayer();
  mapManager.addBillboards?.(REQUIREMENT_LOCATE_LAYER, [
    {
      id: `requirement_locate_${Date.now()}`,
      coordinates: [longitude, latitude, 10],
      image: redPinImage,
      billboardStyle: {
        scale: 0.7,
        heightReference: "CLAMP_TO_GROUND",
        verticalOrigin: "BOTTOM",
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    },
  ]);
};

const pickMapCoordinate = (position: any) => {
  const viewer = getViewer?.();
  const Cesium = (globalThis as any).Cesium;
  if (!viewer || !Cesium) return null;

  const pickedObject = viewer.scene.pick(position);
  if (
    viewer.scene.pickPositionSupported &&
    Cesium.defined(pickedObject) &&
    pickedObject
  ) {
    const cartesian = viewer.scene.pickPosition(position);
    if (cartesian) return cartesian;
  }

  const rayCartesian = viewer.camera.pickEllipsoid(
    position,
    viewer.scene.globe.ellipsoid,
  );
  return rayCartesian || null;
};

const bindLocateHandler = () => {
  const viewer = getViewer?.();
  const Cesium = (globalThis as any).Cesium;
  if (!viewer || !Cesium) {
    ElMessage.warning("地图尚未初始化");
    isLocateMode.value = false;
    return;
  }

  destroyLocateHandler();
  locateHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  locateHandler.setInputAction(async (event: any) => {
    const cartesian = pickMapCoordinate(event.position);
    if (!cartesian) {
      ElMessage.warning("当前点位无法获取坐标");
      return;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Number(
      Cesium.Math.toDegrees(cartographic.longitude).toFixed(6),
    );
    const latitude = Number(
      Cesium.Math.toDegrees(cartographic.latitude).toFixed(6),
    );

    pickedLocation.value = {
      longitude,
      latitude,
      token: Date.now(),
    };
    renderLocatePoint(longitude, latitude);
    ElMessage.success("已获取地图点位");

    const currentSerial = ++geocodeRequestSerial;
    try {
      const geocodeResult = await $reverseGeocodeByTdt(longitude, latitude);
      if (currentSerial !== geocodeRequestSerial) return;
      if (!geocodeResult.address) return;
      pickedLocation.value = {
        longitude,
        latitude,
        address: geocodeResult.address,
        token: Date.now(),
      };
    } catch (error: any) {
      if (currentSerial !== geocodeRequestSerial) return;
      console.warn("天地图逆地理编码失败:", error);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};

const handleStartLocate = (payload: { positionText: string }) => {
  isLocateMode.value = true;
  bindLocateHandler();

  const currentPosition = parsePositionText(payload.positionText);
  if (currentPosition) {
    renderLocatePoint(currentPosition.longitude, currentPosition.latitude);
    getMapManager()?.flyToPosition?.(
      currentPosition.longitude,
      currentPosition.latitude,
      1600,
      1,
    );
  }

  ElMessage.info("请在地图上左键单击选择需求位置");
};

const handleBackFromLocate = () => {
  isLocateMode.value = false;
  geocodeRequestSerial += 1;
  destroyLocateHandler();
};

const getStatusText = (status?: number, statusName?: string) => {
  if (statusName) return statusName;
  return (
    statusOptions.find((item) => item.value === Number(status))?.label ||
    "未知状态"
  );
};

const getFlightTypeText = (flightType?: number, flightTypeName?: string) => {
  if (flightTypeName) return flightTypeName;
  return (
    flightTypeOptions.find((item) => item.value === Number(flightType))
      ?.label || "-"
  );
};

const getTimeRangePayload = (range?: string[]) => {
  if (!range || range.length !== 2) {
    return { beginTime: undefined, endTime: undefined };
  }

  return {
    beginTime: range[0],
    endTime: range[1],
  };
};

const buildSearchParams = (): RequirementPageParams => {
  const { beginTime, endTime } = getTimeRangePayload(searchForm.timeRange);
  return {
    name: searchForm.name.trim() || undefined,
    flightType: searchForm.flightType,
    status: searchForm.status,
    beginTime,
    endTime,
    pageNum: pageState.pageNum,
    pageSize: pageState.pageSize,
  };
};

// 导出需求列表参数 （不包含分页参数 pageNum 和 pageSize）
const buildExportParams = (): Omit<
  RequirementPageParams,
  "pageNum" | "pageSize"
> => {
  const { beginTime, endTime } = getTimeRangePayload(searchForm.timeRange);
  return {
    name: searchForm.name.trim() || undefined,
    flightType: searchForm.flightType,
    status: searchForm.status,
    beginTime,
    endTime,
  };
};

const loadTableData = async () => {
  tableLoading.value = true;
  try {
    const res: any = await $getRequirementPage(buildSearchParams());
    const data = res?.data || {};
    tableData.value = data.records || [];
    pageState.total = Number(data.total || 0);
  } catch (error: any) {
    ElMessage.error(error?.message || "获取需求列表失败");
  } finally {
    tableLoading.value = false;
  }
};

const loadSummaryCards = async () => {
  summaryLoading.value = true;
  try {
    const res: any = await $getRequirementStat();
    const data: RequirementStatData = res?.data || {};

    summaryCards.value = [
      {
        key: "today",
        label: "今日新增需求",
        value: Number(data.todayNewCount || 0),
      },
      {
        key: "pending",
        label: "待处理需求",
        value: Number(data.pendingCount || 0),
      },
      {
        key: "approved",
        label: "本月已通过需求",
        value: Number(data.monthApprovedCount || 0),
      },
      {
        key: "rejected",
        label: "本月驳回需求",
        value: Number(data.monthRejectedCount || 0),
      },
    ];
  } catch (error: any) {
    ElMessage.error(error?.message || "获取需求统计失败");
  } finally {
    summaryLoading.value = false;
  }
};

const handleSearch = async () => {
  pageState.pageNum = 1;
  await loadTableData();
};

const handleReset = async () => {
  searchForm.name = "";
  searchForm.flightType = undefined;
  searchForm.status = undefined;
  searchForm.timeRange = [];
  pageState.pageNum = 1;
  pageState.pageSize = 10;
  await loadTableData();
};

const handleCurrentChange = async (page: number) => {
  pageState.pageNum = page;
  await loadTableData();
};

const handleSizeChange = async (size: number) => {
  pageState.pageSize = size;
  pageState.pageNum = 1;
  await loadTableData();
};

const openDrawer = (mode: DrawerMode, requirementId?: number | string) => {
  drawerMode.value = mode;
  currentRequirementId.value = requirementId ?? null;
  drawerVisible.value = true;
};

const handleCreate = () => {
  openDrawer("create");
};

const handleEdit = (row: RequirementRecord) => {
  openDrawer("edit", row.id);
};

const handleDetail = (row: RequirementRecord) => {
  openDrawer("detail", row.id);
};

const handleOpenAudit = (row: RequirementRecord) => {
  currentAuditRequirementId.value = row.id;
  auditDrawerVisible.value = true;
};

const handleDelete = async (row: RequirementRecord) => {
  try {
    const res: any = await $deleteRequirement(String(row.id));
    if (res?.code === 200) {
      ElMessage.success("删除成功");
      if (tableData.value.length === 1 && pageState.pageNum > 1) {
        pageState.pageNum -= 1;
      }
      await handleRefreshAfterSubmit();
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "删除需求失败");
  }
};

const handleRefreshAfterSubmit = async () => {
  await Promise.all([loadTableData(), loadSummaryCards()]);
};

const handleDownload = async () => {
  if (exportLoading.value) return;
  exportLoading.value = true;
  try {
    const res = await $exportRequirement(buildExportParams());
    const url = URL.createObjectURL(res);
    const link = document.createElement("a");
    link.href = url;
    link.download = `需求列表_${dayjs().format("YYYY-MM-DD_HHmmss")}.xlsx`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    ElMessage.success("导出成功");
  } catch (error: any) {
    ElMessage.error(error?.message || "导出需求列表失败");
  } finally {
    exportLoading.value = false;
  }
};

watch(drawerVisible, (value) => {
  if (!value && isLocateMode.value) {
    handleBackFromLocate();
  }
});

onBeforeUnmount(() => {
  destroyLocateHandler();
  clearLocateLayer();
});

onMounted(async () => {
  await Promise.all([loadTableData(), loadSummaryCards()]);
});
</script>

<style scoped lang="less">
.requirement-page {
  height: 100%;
  padding: 6px;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: rgba(28, 99, 99, 0.6);
  backdrop-filter: blur(10px);
  pointer-events: none;
}

.requirement-page.locate-mode {
  background-color: transparent;
  backdrop-filter: none;
}

.requirementBackBtn {
  position: fixed;
  top: 80px;
  left: 10px;
  z-index: 600;
}

.requirementBackBtn.locateMode {
  z-index: 500;
  pointer-events: none;
}

.requirementBackBtn.locateMode .el-button {
  pointer-events: auto;
}

.page-panel {
  margin-top: 72px;
  height: calc(100% - 72px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
  background-color: rgba(28, 99, 99, 0.6);
  backdrop-filter: blur(10px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 18px 20px;
  min-height: 84px;
  background: linear-gradient(
    180deg,
    rgba(7, 31, 45, 0.9),
    rgba(10, 49, 63, 0.76)
  );
  border: 1px solid rgba(0, 197, 254, 0.24);
  box-shadow:
    inset 0 0 24px rgba(0, 197, 254, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.18);
}

.stat-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.stat-card-today::before {
  background: #1677ff;
}

.stat-card-pending::before {
  background: #fa8c16;
}

.stat-card-approved::before {
  background: #13c24a;
}

.stat-card-rejected::before {
  background: #ff4d4f;
}

.stat-title {
  color: rgba(226, 248, 255, 0.8);
  font-size: 14px;
}

.stat-value {
  margin-top: 10px;
  color: #ffffff;
  text-shadow: 0 0 12px rgba(0, 197, 254, 0.25);
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}

.table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: rgba(7, 31, 45, 0.72);
  border: 1px solid rgba(0, 197, 254, 0.18);
  box-shadow:
    inset 0 0 20px rgba(0, 197, 254, 0.05),
    0 8px 28px rgba(0, 0, 0, 0.22);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #e6fbff;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  margin: 18px 0 14px;
  .download-btn {
    margin-right: 10px;
  }
}

.filterItem {
  flex: 1;
  // min-width: 160px;
  max-width: 220px;
}
:deep(.filterItemDate) {
  flex: 1.5;
  // min-width: 320px;
  max-width: 400px;
  background-color: transparent !important;
  border: none !important;
  box-shadow: 0 0 0 1px rgba(24, 209, 250, 0.62) inset !important;
  .el-range-input {
    color: #e6fbff !important;
    background: transparent !important;
  }
  .el-range-separator {
    color: rgba(226, 248, 255, 0.8) !important;
  }
}

.filterItem :deep(.el-input__inner) {
  font-size: 14px;
}

.filterItem :deep(.el-range-separator) {
  color: rgba(226, 248, 255, 0.8) !important;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
  flex-shrink: 0;
  .create-btn {
    margin-left: 30px;
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-direction: row;
}

.table-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  flex-direction: row;
  justify-content: flex-end;
}

.total-text {
  color: rgba(226, 248, 255, 0.72);
  font-size: 14px;
}

.requirement-table {
  flex: 1;
  min-height: 0;
}

:deep(.el-pagination .el-input__wrapper),
:deep(.el-pagination .el-select__wrapper) {
  background: rgba(5, 30, 43, 0.9) !important;
  color: #e6fbff !important;
  box-shadow: inset 0 0 0 1px rgba(0, 197, 254, 0.22) !important;
}

:deep(.el-pagination .el-input__inner),
:deep(.el-pagination .el-select__placeholder),
:deep(.el-pagination .el-select__icon) {
  color: rgba(226, 248, 255, 0.8);
}

:deep(.el-button:not(.is-text):not(.is-link)) {
  border-color: rgba(0, 197, 254, 0.26);
  background: rgba(8, 46, 61, 0.88);
  color: #dff9ff;
}

:deep(.el-button--primary) {
  background: linear-gradient(90deg, #009ad6, #00c5fe) !important;
  border-color: transparent !important;
  color: #ffffff !important;
}

:deep(.el-button--primary:hover),
:deep(.el-button--primary:focus) {
  background: linear-gradient(90deg, #00a8e8, #2ed4ff) !important;
}

:deep(.requirement-table.el-table) {
  --el-table-border-color: rgba(0, 197, 254, 0.12);
  --el-table-header-bg-color: rgba(10, 53, 68, 0.92);
  --el-table-tr-bg-color: rgba(6, 28, 39, 0.78);
  --el-table-row-hover-bg-color: rgba(0, 197, 254, 0.08);
  --el-table-bg-color: rgba(6, 28, 39, 0.78);
  --el-table-text-color: #dff9ff;
  --el-table-header-text-color: #e6fbff;
  // 固定列默认阴影是黑色 15% 透明度，在深色背景下不可见，改为主题青色
  --el-table-fixed-left-column: inset 10px 0 10px -10px rgba(0, 197, 254, 0.55);
  --el-table-fixed-right-column: inset -10px 0 10px -10px rgba(0, 197, 254, 0.55);
  background: transparent;
  color: #dff9ff;
}

:deep(.requirement-table .el-table__inner-wrapper::before) {
  background-color: rgba(0, 197, 254, 0.16) !important;
}

:deep(.requirement-table .el-table__header-wrapper th.el-table__cell) {
  background: rgba(6, 28, 39) !important;
  color: #e6fbff !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  height: 48px !important;
}

:deep(.requirement-table .el-table__row td.el-table__cell) {
  background: rgba(10, 53, 68, 1) !important;
  color: #dff9ff !important;
}

:deep(.requirement-table .el-table__row:hover > td.el-table__cell) {
  background: rgba(64, 158, 255, 0.08) !important;
}

:deep(.el-tag.el-tag--warning.el-tag--plain) {
  background: rgba(250, 173, 20, 0.12) !important;
  border-color: rgba(250, 173, 20, 0.32) !important;
  color: #ffd666;
}

:deep(.el-tag.el-tag--success.el-tag--plain) {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.32);
  color: #86efac;
}

:deep(.el-tag.el-tag--danger.el-tag--plain) {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.32);
  color: #fca5a5;
}

:deep(.el-pagination) {
  --el-pagination-text-color: rgba(226, 248, 255, 0.78);
  --el-pagination-button-color: rgba(226, 248, 255, 0.78);
  --el-pagination-button-bg-color: rgba(5, 30, 43, 0.9);
  --el-pagination-hover-color: #00c5fe;
}

:deep(.el-pagination button),
:deep(.el-pager li) {
  background: rgba(5, 30, 43, 0.9);
  color: rgba(226, 248, 255, 0.78);
  border: 1px solid rgba(0, 197, 254, 0.14);
}

:deep(.el-pager li.is-active) {
  background: linear-gradient(90deg, #009ad6, #00c5fe);
  color: #fff;
}

:deep(.el-select-dropdown),
:deep(.el-picker-panel),
:deep(.el-popover.el-popper) {
  background: rgba(8, 35, 50, 0.96);
  border-color: rgba(0, 197, 254, 0.22);
  color: #dff9ff;
}

@media (max-width: 1440px) {
  .filter-bar {
    flex-wrap: wrap;
  }

  .filterItem {
    max-width: calc(33.33% - 8px);
  }

  :deep(.filterItemDate) {
    max-width: 100%;
    flex: 1 1 100%;
  }

  .filter-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
