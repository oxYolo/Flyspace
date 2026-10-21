<template>
  <div class="detailPanel">
    <div class="panelHeader">
      <!-- 任务详情筛选组 -->
      <div class="headerFilters">
        <el-select
          v-model="issueTypeFilter"
          :teleported="false"
          popper-class="black-select"
          class="filterItem"
          placeholder="问题小类..."
          placement="bottom"
          clearable>
          <el-option
            v-for="opt in issueTypeOptions"
            :key="opt.id"
            :label="opt.name"
            :value="opt.dictCode" />
        </el-select>
        <el-date-picker
          v-model="issueTimeRange"
          type="datetimerange"
          value-format="YYYY-MM-DD HH:mm:ss"
          range-separator="至"
          start-placeholder="识别开始时间..."
          end-placeholder="识别结束时间..."
          clearable
          :teleported="false"
          class="filterItem filterItemDate" />
        <el-select
          v-model="reviewStatusFilter"
          :teleported="false"
          popper-class="black-select"
          class="filterItem"
          placeholder="审核状态..."
          placement="bottom"
          clearable>
          <el-option label="未审核" value="PENDING" />
          <el-option label="识别正确" value="CORRECT" />
          <el-option label="识别错误" value="INCORRECT" />
        </el-select>
      </div>
      <!-- 任务详情按钮组 -->
      <div v-if="task" class="headerButtons">
        <el-button
          type="primary"
          plain
          :icon="View"
          @click="handlePreviewClick">
          预览巡检报告
        </el-button>
        <el-button
          type="primary"
          plain
          :icon="Download"
          :loading="exportLoading"
          @click="handleExportClick">
          导出巡检报告
        </el-button>
      </div>
    </div>

    <div class="panelBody">
      <div v-if="task" class="contentWrap">
        <div v-if="loading" class="emptyWrap">
          <el-empty description="加载中..." />
        </div>
        <div v-else-if="results.length" class="resultGrid">
          <!-- 识别结果卡片 -->
          <RecognitionResultCard
            v-for="item in results"
            :key="item.id"
            :item="item"
            :issueTypeOptions="issueTypeOptions"
            @reviewed="handleReviewed"
            @locate="handleLocate" />
        </div>
        <div v-else-if="task.viewStatus === 'PROCESSING'" class="emptyWrap">
          <el-empty :image-size="160" description="识别中，请稍候..." />
        </div>
        <div v-else-if="task.viewStatus === 'FAILED'" class="emptyWrap failedWrap">
          <el-empty :image-size="160" description="暂无识别结果" />
          <el-button
            type="primary"
            :loading="resubmitLoading"
            @click="handleResubmit">
            再次识别
          </el-button>
        </div>
        <div v-else class="emptyWrap">
          <el-empty :image-size="160" description="暂无识别结果" />
        </div>
      </div>
      <div v-else class="emptyWrap">
        <el-empty :image-size="160" description="暂无任务详情" />
      </div>
    </div>

    <div class="panelFooter" v-if="task">
      <el-pagination
        v-model:current-page="currentPageProxy"
        v-model:page-size="pageSizeProxy"
        :total="total"
        :page-sizes="[6, 9, 12]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        class="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Download, View } from "@element-plus/icons-vue";
import RecognitionResultCard from "./RecognitionResultCard.vue";
import {
  $getInspectionTaskDetail,
  $getThirdLevelByFirstLevelDictCode,
  $exportInspectionTaskDetail,
  $reSubmitInspectionTask,
} from "@/api/flyControl/smart.ts";

interface InspectionTask {
  id: string;
  name: string;
  createdAt: string;
  // 与后端 viewStatus 对齐的三态视图状态；原始状态 status 仅保留在 raw 中备查
  viewStatus: "PROCESSING" | "SUCCESS" | "FAILED";
  videoName?: string;
  raw?: any;
}

interface RecognitionResultItem {
  id: string;
  issueType: string;
  longitude?: string | number;
  latitude?: string | number;
  issuePicture?: string;
  issueTime?: string;
  reviewStatus?: "PENDING" | "CORRECT" | "INCORRECT";
}

const props = defineProps<{
  task: InspectionTask | null;
  sceneCode: string;
  currentPage: number;
  pageSize: number;
  pdfUrl?: string;
}>();

const emits = defineEmits<{
  (e: "update:currentPage", value: number): void;
  (e: "update:pageSize", value: number): void;
  (
    e: "locate",
    payload: { longitude: number; latitude: number; imageUrl?: string; id?: string },
  ): void;
  // 再次识别提交成功后通知父组件刷新列表
  (e: "resubmitted"): void;
}>();

const resubmitLoading = ref(false);

/** 识别失败时重新提交 AI 识别；成功后由父组件刷新列表并保持选中 */
async function handleResubmit() {
  if (!props.task?.id) return;
  if (resubmitLoading.value) return;
  resubmitLoading.value = true;
  try {
    const res: any = await $reSubmitInspectionTask({
      taskId: props.task.id,
      // 后端未持久化该参数，前端保存过则回传
      videoStartTimestamp: props.task.raw?.videoStartTimestamp,
    });
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "再次识别提交失败");
      return;
    }
    ElMessage.success("已重新提交识别");
    emits("resubmitted");
  } catch (e: any) {
    ElMessage.error(e?.message || "再次识别提交失败");
  } finally {
    resubmitLoading.value = false;
  }
}

const headerTitle = computed(() =>
  props.task ? `任务详情：${props.task.name}` : "任务详情",
);

const loading = ref(false);
const exportLoading = ref(false);
const total = ref(0);
const results = ref<RecognitionResultItem[]>([]);
const issueTypeFilter = ref("");
const issueTypeOptions = ref<any[]>([]);
const issueTimeRange = ref<[string, string] | null>(null);
const reviewStatusFilter = ref<"" | "PENDING" | "CORRECT" | "INCORRECT">("");

/** 人工审核提交成功后，局部更新当前列表项状态，避免整页重新请求导致闪烁 */
const handleReviewed = (payload: {
  id: string;
  reviewStatus: "CORRECT" | "INCORRECT";
}) => {
  const target = results.value.find((x) => x.id === payload.id);
  if (!target) return;
  target.reviewStatus = payload.reviewStatus;
};

function handleLocate(payload: {
  longitude: number;
  latitude: number;
  imageUrl?: string;
  id?: string;
}) {
  emits("locate", payload);
}

const currentPageProxy = computed({
  get() {
    return props.currentPage;
  },
  set(value) {
    emits("update:currentPage", value);
  },
});

const pageSizeProxy = computed({
  get() {
    return props.pageSize;
  },
  set(value) {
    emits("update:pageSize", value);
    emits("update:currentPage", 1);
  },
});

/** 将“审核状态筛选项”转换为接口参数 */
const getReviewStatusParam = () => {
  if (reviewStatusFilter.value === "CORRECT") return "CORRECT";
  if (reviewStatusFilter.value === "INCORRECT") return "INCORRECT";
  if (reviewStatusFilter.value === "PENDING") return "PENDING";
  return undefined;
};

/** 根据巡检场景 dictCode 获取“问题小类”下拉选项 */
const loadIssueTypeOptions = async (sceneCode: string) => {
  const code = String(sceneCode || "").trim();
  if (!code) {
    issueTypeOptions.value = [];
    issueTypeFilter.value = "";
    return;
  }
  try {
    const res: any = await $getThirdLevelByFirstLevelDictCode(code);
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取问题小类失败");
      issueTypeOptions.value = [];
      issueTypeFilter.value = "";
      return;
    }
    issueTypeOptions.value = Array.isArray(res?.data) ? res.data : [];
    issueTypeFilter.value = "";
  } catch (e: any) {
    ElMessage.error(e?.message || "获取问题小类失败");
    issueTypeOptions.value = [];
    issueTypeFilter.value = "";
  }
};

/** 根据当前任务与分页参数，拉取识别结果列表 */
const fetchTaskIssues = async () => {
  if (!props.task?.id) return;
  // 仅识别成功的任务存在识别结果；识别中/失败直接清空，不发详情请求
  if (props.task.viewStatus !== "SUCCESS") {
    results.value = [];
    total.value = 0;
    return;
  }
  if (loading.value) return;
  loading.value = true;
  try {
    const timeStart = issueTimeRange.value?.[0] || undefined;
    const timeEnd = issueTimeRange.value?.[1] || undefined;
    const res: any = await $getInspectionTaskDetail({
      pageNum: props.currentPage,
      pageSize: props.pageSize,
      taskId: props.task.id,
      issueType: issueTypeFilter.value || undefined,
      issueTimeStart: timeStart,
      issueTimeEnd: timeEnd,
      reviewStatus: getReviewStatusParam(),
    });
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取任务详情失败");
      results.value = [];
      total.value = 0;
      return;
    }
    const rows = Array.isArray(res?.rows) ? res.rows : [];
    total.value = Number(res?.total || 0) || 0;
    results.value = rows;
  } catch (e: any) {
    ElMessage.error(e?.message || "获取任务详情失败");
    results.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.task?.id,
  (taskId, prevId) => {
    if (!taskId) {
      results.value = [];
      total.value = 0;
      return;
    }
    if (taskId !== prevId) {
      emits("update:currentPage", 1);
    }
  },
);

watch(
  () =>
    [
      issueTypeFilter.value,
      issueTimeRange.value?.[0],
      issueTimeRange.value?.[1],
      reviewStatusFilter.value,
    ] as const,
  (curr, prev) => {
    if (!props.task?.id) return;
    if (
      curr[0] !== prev[0] ||
      curr[1] !== prev[1] ||
      curr[2] !== prev[2] ||
      curr[3] !== prev[3]
    ) {
      emits("update:currentPage", 1);
    }
  },
);

watch(
  () =>
    [
      props.task?.id,
      props.currentPage,
      props.pageSize,
      issueTypeFilter.value,
      issueTimeRange.value?.[0],
      issueTimeRange.value?.[1],
      reviewStatusFilter.value,
    ] as const,
  () => {
    fetchTaskIssues();
  },
  { immediate: true },
);

watch(
  () => props.sceneCode,
  (sceneCode, prev) => {
    if (sceneCode === prev) return;
    loadIssueTypeOptions(sceneCode);
  },
  { immediate: true },
);

// 预览巡检报告
const handlePreviewClick = () => {
  if (!props.task?.raw?.pdfUrl) {
    ElMessage.warning("暂无巡检报告");
    return;
  }
  window.open(props.task.raw.pdfUrl, "_blank");
};

// 导出巡检报告
const handleExportClick = async () => {
  if (!props.task?.id) return;
  if (exportLoading.value) return;
  exportLoading.value = true;
  try {
    const res: any = await $exportInspectionTaskDetail(props.task.id);
    const url = URL.createObjectURL(res);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.task.name || props.task.id}_巡检报告.pdf`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    ElMessage.success("导出巡检报告成功");
    exportLoading.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || "导出巡检报告失败");
    exportLoading.value = false;
  }
};
</script>

<style scoped lang="less">
.detailPanel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(23, 44, 44, 0.9);
}

.panelHeader {
  flex-shrink: 0;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  // 助手打开后详情面板变窄：整行不换行，筛选项与按钮按可用宽度等比收缩
  // container-type 使下方 @container 能感知本面板自身宽度（而非视口宽度）
  container-type: inline-size;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  gap: 12px;
}

.headerTitle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.titleText {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.titleSub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.headerFilters {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
}

.filterItem {
  flex: 0 1 200px;
  width: 200px;
  min-width: 110px;
}
:deep(.filterItemDate) {
  flex: 1 1 370px;
  width: auto;
  min-width: 180px;
  max-width: 370px;
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
  border: 1px solid rgba(28, 155, 183, 1) !important;
  .el-range-input {
    color: #fff !important;
  }
  .el-range-separator {
    color: rgba(255, 255, 255, 0.62) !important;
  }
}

.filterItem :deep(.el-input__wrapper) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
}

.filterItem :deep(.el-input__inner) {
  color: rgba(255, 255, 255, 0.82) !important;
}

.filterItem :deep(.el-range-separator) {
  color: rgba(255, 255, 255, 0.62) !important;
}

// 按钮组不换行；面板过窄时通过 @container 缩小按钮内边距与字号来保持一行
.headerButtons {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  :deep(.el-button) {
    margin-left: 0;
    white-space: nowrap;
  }
}

// 面板宽度不足（助手打开）时逐级收缩控件尺寸
@container (max-width: 1050px) {
  .filterItem {
    width: 150px;
  }

  .headerButtons :deep(.el-button) {
    padding: 8px 8px;
    font-size: 13px;
  }
}

@container (max-width: 880px) {
  .filterItem {
    width: 120px;
  }

  .headerButtons :deep(.el-button) {
    padding: 8px 6px;
    font-size: 12px;
  }
}

.panelBody {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.contentWrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.resultGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.emptyWrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.failedWrap {
  flex-direction: column;
  gap: 12px;
}

.panelFooter {
  flex-shrink: 0;
  padding: 10px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  justify-content: center;
}

:deep(.el-pagination) {
  --el-pagination-bg-color: rgba(23, 44, 44, 0.9);
  --el-pagination-text-color: rgba(255, 255, 255, 0.78);
  --el-pagination-hover-color: #2d8cf0;
}

:deep(.pagination) {
  --el-pagination-button-bg-color: rgba(23, 44, 44, 0.9);
  --el-pagination-button-color: rgba(255, 255, 255, 0.78);
  --el-pagination-button-disabled-bg-color: rgba(23, 44, 44, 0.55);
  --el-pagination-button-disabled-color: rgba(255, 255, 255, 0.28);
  --el-pagination-hover-color: #2d8cf0;
  --el-pagination-border-radius: 8px;
}

:deep(.pagination .btn-prev),
:deep(.pagination .btn-next),
:deep(.pagination .el-pager li) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  color: rgba(255, 255, 255, 0.78) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

:deep(.pagination .el-pager li:hover) {
  color: #2d8cf0 !important;
  border-color: rgba(45, 140, 240, 0.85) !important;
}

:deep(.pagination .el-pager li.is-active) {
  background-color: rgba(45, 140, 240, 0.25) !important;
  color: rgba(255, 255, 255, 0.92) !important;
  border-color: rgba(45, 140, 240, 0.85) !important;
}

:deep(.pagination .btn-prev:disabled),
:deep(.pagination .btn-next:disabled),
:deep(.pagination .el-pager li:disabled) {
  background-color: rgba(23, 44, 44, 0.55) !important;
  color: rgba(255, 255, 255, 0.28) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

:deep(.pagination .el-pagination__total),
:deep(.pagination .el-pagination__sizes),
:deep(.pagination .el-pagination__jump) {
  color: rgba(255, 255, 255, 0.72) !important;
}

:deep(.pagination .el-select__wrapper) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
}

:deep(.pagination .el-select__selected-item) {
  color: rgba(255, 255, 255, 0.82) !important;
}

:deep(.pagination .el-input__wrapper) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
}

:deep(.pagination .el-input__inner) {
  color: rgba(255, 255, 255, 0.82) !important;
}

@media (max-width: 1400px) {
  .resultGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .resultGrid {
    grid-template-columns: 1fr;
  }
}
</style>
