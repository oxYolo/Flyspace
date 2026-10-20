<template>
  <div class="taskListPanel">
    <div class="panelHeader">
      <div class="headerLeft">
        <div class="headerTitle">巡检任务列表</div>
        <div v-if="props.sceneCode" class="totalBadge">
          共 <span class="totalNumber">{{ state.total }}</span> 条
        </div>
      </div>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>
    </div>

    <div class="panelBody">
      <div class="searchSection">
        <el-input
          v-model="searchQuery"
          placeholder="搜索任务名称..."
          clearable
          class="searchInput"
          @input="handleSearch">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="statusFilter"
          class="statusSelect"
          placeholder="识别状态..."
          clearable
          @change="handleStatusChange">
          <el-option label="识别中" value="PROCESSING" />
          <el-option label="识别成功" value="SUCCESS" />
          <el-option label="识别失败" value="FAILED" />
        </el-select>
      </div>
      <el-scrollbar
        ref="scrollbarRef"
        class="scrollArea"
        @scroll="handleScroll">
        <div v-if="filteredTasks.length" class="taskList">
          <TaskListItemCard
            v-for="item in filteredTasks"
            :key="item.id"
            :task="item"
            :active="item.id === activeTaskId"
            @select="handleSelect"
            @delete="handleDelete" />
        </div>
        <div v-else class="emptyWrap">
          <el-empty :image-size="100" :description="emptyText" />
        </div>

        <div v-if="showLoadMore" class="loadMoreArea">
          <div v-if="state.loading" class="loadMoreText">加载中...</div>
          <div v-else-if="state.hasMore" class="loadMoreText">
            向下滚动加载更多
          </div>
          <div v-else class="loadMoreText">没有更多了</div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import { Plus, Search } from "@element-plus/icons-vue";
import { $getInspectionTaskList, $deleteInspectionTask } from "@/api/flyControl/smart.ts";
import TaskListItemCard from "./TaskListItemCard.vue";

interface TaskListItem {
  id: string;
  name: string;
  createdAt: string;
  // 与后端 viewStatus 对齐的三态视图状态；原始状态 status 仅保留在 raw 中备查
  viewStatus: "PROCESSING" | "SUCCESS" | "FAILED";
  videoName?: string;
  videoUrl?: string;
  raw?: any;
}

const props = defineProps<{
  sceneCode: string;
  activeTaskId: string;
}>();

const emits = defineEmits<{
  (e: "create"): void;
  (e: "select", task: TaskListItem): void;
  (e: "empty"): void;
}>();

const searchQuery = ref("");
const statusFilter = ref<TaskListItem["viewStatus"] | "">("");
const scrollbarRef = ref<any>(null);

const state = ref({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  loading: false,
  hasMore: true,
});

const taskList = ref<TaskListItem[]>([]);

/** 过滤后的任务列表 */
const filteredTasks = computed(() => {
  const byStatus = statusFilter.value
    ? taskList.value.filter((task) => task.viewStatus === statusFilter.value)
    : taskList.value;
  if (!searchQuery.value.trim()) return byStatus;
  const query = searchQuery.value.toLowerCase().trim();
  return byStatus.filter((task) => {
    const name = String(task.name || "").toLowerCase();
    const id = String(task.id || "").toLowerCase();
    const missionId = String(task.raw?.missionId || "").toLowerCase();
    const sourceFilePath = String(task.raw?.sourceFilePath || "").toLowerCase();
    return (
      name.includes(query) ||
      id.includes(query) ||
      missionId.includes(query) ||
      sourceFilePath.includes(query)
    );
  });
});

const showLoadMore = computed(() => Boolean(taskList.value?.length));

const emptyText = computed(() => {
  if (state.value.loading) return "加载中...";
  if (!props.sceneCode) return "请选择巡检场景";
  if (searchQuery.value.trim()) return "未找到匹配任务";
  return "暂无任务";
});

/** 点击“新建识别任务”按钮时，通知父组件打开弹窗 */
function handleCreate() {
  emits("create");
}

/** 选择某个任务时，通知父组件更新当前任务 */
function handleSelect(taskId: string) {
  const selected = taskList.value.find((x) => x.id === taskId);
  if (!selected) return;
  emits("select", selected);
}

/** 搜索输入处理（目前由 computed 自动处理，此处预留接口） */
function handleSearch() {
  // 可以添加防抖等逻辑
}

/** 删除任务 */
async function handleDelete(taskId: string) {
  try {
    const res: any = await $deleteInspectionTask({ id: taskId });
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "删除失败");
      return;
    }
    ElMessage.success("删除成功");
    // 从列表移除该任务（按 raw.id 匹配）
    const idx = taskList.value.findIndex((x) => String(x.raw?.id) === String(taskId));
    if (idx !== -1) {
      const removed = taskList.value[idx];
      taskList.value.splice(idx, 1);
      state.value.total = Math.max(0, state.value.total - 1);
      // 如果删除的是当前选中的任务，选中列表第一个
      if (props.activeTaskId === removed.id && taskList.value.length > 0) {
        emits("select", taskList.value[0]);
      }
      if (taskList.value.length === 0) {
        emits("empty");
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  }
}

/** 切换识别状态筛选时，重置并重新拉取列表数据 */
async function handleStatusChange() {
  await loadTaskList(true);
}

/** 列表滚动到底部时触发加载下一页 */
function handleScroll() {
  if (state.value.loading) return;
  if (!state.value.hasMore) return;
  const wrap = scrollbarRef.value?.wrapRef as HTMLElement | undefined;
  if (!wrap) return;
  const threshold = 20;
  const reachedBottom =
    wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - threshold;
  if (!reachedBottom) return;
  loadTaskList(false);
}

/** 将接口返回的任务行映射为页面展示结构 */
function normalizeInspectionTask(row: any): TaskListItem {
  const id = String(row?.taskId || row?.id || "");
  const name = String(row?.taskName || row?.taskId || id || "识别任务");
  const createdAt = String(
    row?.submitTime || row?.createTime || row?.updateTime || "",
  );
  // 后端直接给出三态视图状态，这里只做白名单校验，非法值按识别中处理
  const viewStatus = String(row?.viewStatus || "").toUpperCase();
  const normalizedViewStatus: TaskListItem["viewStatus"] =
    viewStatus === "SUCCESS" || viewStatus === "FAILED"
      ? (viewStatus as TaskListItem["viewStatus"])
      : "PROCESSING";

  const sourceFilePath = String(row?.sourceFilePath || "");
  const cleaned = sourceFilePath.replace(/`/g, "").trim();
  const videoName = cleaned ? cleaned.split("/").pop() : "";
  const videoUrl = cleaned || "";

  return {
    id: id || String(Math.random()),
    name,
    createdAt,
    viewStatus: normalizedViewStatus,
    videoName: videoName || undefined,
    videoUrl: videoUrl || undefined,
    raw: row,
  };
}

/** 重置并加载当前巡检场景的任务列表 */
async function loadTaskList(reset = false) {
  if (!props.sceneCode) return;
  if (state.value.loading) return;
  if (!reset && !state.value.hasMore) return;

  if (reset) {
    state.value.pageNum = 1;
    state.value.total = 0;
    state.value.hasMore = true;
    taskList.value = [];
  }

  state.value.loading = true;
  try {
    const res: any = await $getInspectionTaskList({
      pageNum: state.value.pageNum,
      pageSize: state.value.pageSize,
      inspectionSceneName: props.sceneCode,
      status: statusFilter.value || undefined,
    });
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取巡检任务列表失败");
      state.value.hasMore = false;
      return;
    }
    const rows = Array.isArray(res?.rows) ? res.rows : [];
    const total = Number(res?.total || 0) || 0;
    const next = rows
      .map(normalizeInspectionTask)
      .filter((x: TaskListItem) => Boolean(x.id));
    taskList.value = reset ? next : [...taskList.value, ...next];
    state.value.total = total;
    state.value.hasMore = taskList.value.length < total;
    state.value.pageNum = reset ? 2 : state.value.pageNum + 1;

    if (reset) {
      if (taskList.value.length === 0) {
        emits("empty");
      } else {
        const preferred = props.activeTaskId
          ? taskList.value.find((x) => x.id === props.activeTaskId)
          : undefined;
        emits("select", preferred || taskList.value[0]);
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取巡检任务列表失败");
    state.value.hasMore = false;
  } finally {
    state.value.loading = false;
  }
}

watch(
  () => props.sceneCode,
  async (sceneCode, prevCode) => {
    if (!sceneCode) {
      taskList.value = [];
      state.value.total = 0;
      state.value.hasMore = false;
      emits("empty");
      return;
    }
    if (sceneCode === prevCode) return;
    searchQuery.value = "";
    await loadTaskList(true);
  },
  { immediate: true },
);
</script>

<style scoped lang="less">
.taskListPanel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(23, 44, 44, 0.9);
}

.panelHeader {
  flex-shrink: 0;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.headerTitle {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.totalBadge {
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.totalNumber {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.panelBody {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.searchSection {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  :deep(.el-input__wrapper) {
    background-color: rgba(23, 44, 44, 0.9) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
    border-radius: 4px;
  }
}

.searchInput {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.statusSelect {
  width: 128px;
  flex-shrink: 0;
  :deep(.el-select__wrapper) {
    background-color: rgba(23, 44, 44, 0.9) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset !important;
    border-radius: 4px;
  }
}

.scrollArea {
  flex: 1;
  min-height: 0;

  :deep(.el-scrollbar__wrap) {
    height: 100%;
    .el-scrollbar__view {
      height: 100%;
    }
  }
}

.taskList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.emptyWrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loadMoreArea {
  padding: 10px 0 4px 0;
  display: flex;
  justify-content: center;
}

.loadMoreText {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.52);
}

:deep(.el-button--primary) {
  background-color: rgba(45, 140, 240, 0.85);
  border-color: rgba(45, 140, 240, 0.85);
}
</style>
