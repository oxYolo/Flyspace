<template>
  <div class="task-library-panel" v-loading="loading" element-loading-text="加载中...">
    <!-- 将头部和航线列表包裹在新的容器中 -->
    <div class="main-content-area">
      <!-- 顶部标题和操作区 -->
      <div class="panel-header">
        <div class="header-title">任务库 ({{ pageOptions.total }})</div>
        <div class="header-actions">
          <!-- 创建新任务按钮 -->
          <el-icon v-if="showBtns" v-tooltip="'创建新任务'" :size="20" class="action-icon add-icon" @click="addPlan">
            <Plus />
          </el-icon>
          <el-icon v-else v-tooltip="'关闭'" :size="20" class="action-icon" @click="handleClose">
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 搜索条件区 -->
      <div class="search-conditions-wrapper">
        <div class="search-conditions-header">
          <el-input class="header-search-input" v-model="searchForm.taskName" placeholder="按任务名称搜索" clearable
            @keyup.enter="handleSearch" @clear="handleSearch" />
          <div class="expand-btn">
            <div class="toggle" @click="isSearchConditionsVisible = !isSearchConditionsVisible">
              <span>
                {{ !isSearchConditionsVisible ? "收起" : "展开" }}搜索
              </span>
              <el-icon class="toggle-icon" :class="{ rotated: !isSearchConditionsVisible }">
                <ArrowDown />
              </el-icon>
            </div>
          </div>
        </div>
        <div v-if="!isSearchConditionsVisible" class="advanced-search-fields">
          <el-date-picker v-model="searchForm.startTimeBegin" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="任务开始时间开始" clearable @change="handleSearch" />
          <el-date-picker v-model="searchForm.startTimeEnd" type="datetime" clearable value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="任务开始时间结束" @change="handleSearch" />
          <el-date-picker v-model="searchForm.endTimeBegin" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="实际结束时间开始" clearable @change="handleSearch" />
          <el-date-picker v-model="searchForm.endTimeEnd" type="datetime" clearable value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="实际结束时间结束" @change="handleSearch" />
          <el-select clearable popper-class="black-select" :teleported="false" class="black-select"
            v-model="searchForm.taskStatus" placeholder="选择任务状态" @change="handleSearch">
            <el-option v-for="el in statusOptions" :key="el.value" :label="el.label" :value="el.value" />
          </el-select>
        </div>
      </div>

      <!-- 航线列表区 -->
      <div class="task-list">
        <!-- 通过 v-for 渲染航线卡片 -->
        <div v-for="task in tasks" :key="task.id" class="task-card" :class="{ active: selectedRouteId === task.id }"
          ">
          <el-tooltip :content="task.taskName" placement="top">
            <div class="card-title">
              {{ task.taskName }}
            </div>
          </el-tooltip>
          <div class="card-meta">
            <img class="route-icon" src="@/assets/svg/点航线.svg" alt="" />
            <div>{{ task.routeName }}</div>
          </div>
          <!-- <div class="card-meta">更新时间 {{ task.updateTime }}</div> -->
          <div class="card-meta" style="position: relative;top: 10px;">
            <el-button-group>
              <el-button class="task-btn" type="primary" size="small" :icon="Odometer" plain v-if="task.taskStatus == 3" @click="showReplay(task)">仿真飞行</el-button>
              <el-button class="task-btn" type="primary" size="small" :icon="Promotion" plain @click="selectRoute(task)">架次详情</el-button>
            </el-button-group>
          </div>
          <div v-if="showBtns" class="card-actions-bar" @click.stop>
            <el-popconfirm v-if="task.taskStatus == 1" width="240" :title="`确定要下发任务「${task.taskName}」吗？`"
              confirm-button-text="确定下发" cancel-button-text="取消" :disabled="distributingTaskId === task.taskId"
              @confirm="() => distributeTask(task)">
              <template #reference>
                <img v-tooltip="'下发任务'" :src="distributeIcon" class="action-icon distribute-action-icon" alt="下发"
                  @click.stop />
              </template>
            </el-popconfirm>

            <el-popconfirm width="240" :title="`确定要删除任务「${task.taskName}」吗？此操作不可恢复。`" confirm-button-text="确定删除"
              cancel-button-text="取消" :disabled="deletingTaskId === task.id" @confirm="() => deleteTask(task)">
              <template #reference>
                <el-icon v-tooltip="'删除任务'" class="action-icon deleteIcon" @click.stop>
                  <Delete />
                </el-icon>
              </template>
            </el-popconfirm>
            <el-dropdown trigger="click" popper-class="route-card-dropdown-popper" :teleported="false">
              <el-icon class="action-icon" @click.stop>
                <MoreFilled />
              </el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="editTask(task)">
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item v-if="canCancelTask(task.taskStatus)" @click="cancelTask(task)">
                    取消
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="status-tag" :class="'status-tag-' + task.taskStatus"
            style="position: absolute; right: 8px; bottom: 8px">
            {{ statusMap[task.taskStatus] || "未知状态" }}
          </div>
        </div>
        <!-- 如果没有航线，可以显示一个提示 -->
        <div v-if="tasks.length === 0" class="no-tasks-message">
          暂无计划数据。
        </div>
      </div>
      <div class="actions">
        <el-pagination v-model:current-page="pageOptions.page" v-model:page-size="pageOptions.size" :background="false"
          :pager-count="4" size="small" layout="prev, pager, next,total" :total="pageOptions.total"
          class="white-el-pagination" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </div>
    <!-- 结束 main-content-area -->
    <CreateTask :title="taskTitle" v-if="showCreateTaskDialog" :editTaskInfo="editTaskInfo" @close="closeCreateTask" />
    <!-- 执行计划对话框 -->
    <ExecutionPlanModal v-if="showExecutionPlanDialog" :taskId="selectedTaskId" @close="closeExecutionPlan"
      :show-btns="showBtns" @choose-job="handleChoosePlan" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  Plus,
  Close,
  MoreFilled,
  ArrowDown,
  Delete,
  Promotion,
  Odometer,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import CreateTask from "@/views/modules/flyControl/Plan/components/CreateTask.vue"; // 导入需要的 Element Plus 图标
import ExecutionPlanModal from "@/views/modules/flyControl/Plan/components/ExecutionPlanModal.vue";
import { getPlanList, deletePlan, distributePlan } from "@/transform/control";
import { $cancelTask } from "@/api/flyControl/control.ts";
import type { PageOptions } from "@/model/commonModel.ts";
import distributeIcon from "@/assets/images/tool/wurenjiku-copy.png";
import emitter from "@/stores/mitt";
import { useReplayStore } from "@/stores/modules/replay.ts";
withDefaults(
  defineProps<{
    showBtns?: boolean;
  }>(),
  {
    showBtns: true,
  },
);

const emits = defineEmits(["close", "choosePlan"]);

// 示例航线数据数组
const tasks: any = ref([]);

// 当前选中的航线ID
const selectedRouteId = ref<number | null>(null);

// 控制创建航线对话框的显示状态
const showCreateTaskDialog = ref(false);

// 控制执行计划对话框的显示状态
const showExecutionPlanDialog = ref(false);
const selectedTaskId = ref<string>("");

// 编辑计划
let editTaskInfo = ref<any>(null);

const taskTitle = ref<string>("新建");
const pageOptions = ref<PageOptions>({
  page: 1,
  size: 10,
  total: 0,
});

const distributingTaskId = ref<string | number | null>(null);
const deletingTaskId = ref<string | number | null>(null);

// 加载状态
const loading = ref(false);

// 搜索表单
const searchForm = ref({
  taskName: "",
  startTimeBegin: "",
  startTimeEnd: "",
  endTimeBegin: "",
  endTimeEnd: "",
  taskStatus: "",
});

// 控制搜索条件显示隐藏
const isSearchConditionsVisible = ref(true);

// 状态选项
const statusOptions = ref([
  { label: "全部", value: "" },
  { label: "待执行", value: 1 },
  { label: "执行中", value: 2 },
  { label: "已完成", value: 3 },
  { label: "已取消", value: 4 },
  { label: "执行失败", value: 5 },
]);

const statusMap: any = ref({
  1: "待执行",
  2: "执行中",
  3: "已完成",
  4: "已取消",
  5: "执行失败",
});

onMounted(() => {
  initPlanData();
});

onBeforeUnmount(() => {
  emitter.emit("toggle-left-panel", true);
});

const replayStore = useReplayStore();

// 仿真飞行
const showReplay = (task: any) => {
  replayStore.navigateToReplay({
    executorId: task.taskId,
  });
};



// 选择航线卡片 - 修改为打开执行计划弹窗
const selectRoute = (task: any) => {
  if (!task?.taskId) {
    ElMessage.warning("缺少任务ID");
    return;
  }

  // 关闭创建计划弹窗（互斥逻辑）
  if (showCreateTaskDialog.value) {
    showCreateTaskDialog.value = false;
  }

  selectedTaskId.value = task.taskId;
  showExecutionPlanDialog.value = true;
  selectedRouteId.value = task.id;
};

const closeCreateTask = async () => {
  showCreateTaskDialog.value = false;
  emitter.emit("toggle-left-panel", true);
  initPlanData();
};

const closeExecutionPlan = () => {
  showExecutionPlanDialog.value = false;
  selectedTaskId.value = "";
};

/**
 * 获取数据
 */
const initPlanData = async () => {
  loading.value = true;
  try {
    const params = {
      pageNum: pageOptions.value.page,
      pageSize: pageOptions.value.size,
      ...searchForm.value,
    };
    const data: any = await getPlanList(params);
    tasks.value = data.rows;
    pageOptions.value.total = data.total;
    loading.value = false;
  } catch (error) {
    console.log(error);
    loading.value = false;
  } finally {
    loading.value = false;
  }
};

/**
 * 搜索方法
 */
const handleSearch = () => {
  pageOptions.value.page = 1;
  initPlanData();
};

/**
 * 分页大小改变
 */
const handleSizeChange = (size: number) => {
  pageOptions.value.size = size;
  pageOptions.value.page = 1;
  initPlanData();
};

/**
 * 当前页改变
 */
const handleCurrentChange = (page: number) => {
  pageOptions.value.page = page;
  initPlanData();
};

const addPlan = () => {
  // 关闭执行计划弹窗（互斥逻辑）
  if (showExecutionPlanDialog.value) {
    showExecutionPlanDialog.value = false;
  }

  editTaskInfo.value = null;
  showCreateTaskDialog.value = true;
  taskTitle.value = "新建";
  emitter.emit("toggle-left-panel", false);
};

/**
 * 编辑计划
 */
const editTask = (task: any) => {
  if (!task?.id) return ElMessage.success("未查询到该计划ID，已刷新列表");

  // 关闭执行计划弹窗（互斥逻辑）
  if (showExecutionPlanDialog.value) {
    showExecutionPlanDialog.value = false;
  }

  editTaskInfo.value = task;
  showCreateTaskDialog.value = true;
  taskTitle.value = "编辑";
  emitter.emit("toggle-left-panel", false);
};

/**
 * 删除计划
 */
const deleteTask = async (task: any) => {
  if (!task?.id) return;
  if (deletingTaskId.value === task.id) return;
  deletingTaskId.value = task.id;
  try {
    const msg = await deletePlan(task.id);
    ElMessage.success(msg);
    initPlanData();
  } finally {
    deletingTaskId.value = null;
  }
};

/**
 * 判断是否可以取消任务
 */
const canCancelTask = (taskStatus: number) => {
  return [1, 2, 6].includes(taskStatus);
};

/**
 * 取消任务
 * @param task
 */
const cancelTask = (task: any) => {
  ElMessageBox.confirm("确认取消该条计划?", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    showClose: false,
    closeOnClickModal: false,
    closeOnPressEscape: false,
    customClass: "plan-el-message-content",
  }).then(async () => {
    try {
      await $cancelTask(task.taskId);
      ElMessage.success("计划取消成功");
      initPlanData();
    } catch (error) {
      ElMessage.error("计划取消失败");
    }
  });
};

/**
 * 下发计划
 * @param task
 */
const distributeTask = async (task: any) => {
  if (!task.routeId) {
    ElMessage.warning("请先选择执行航线");
    editTask(task);
    return;
  }
  if (!task.deviceSn) {
    ElMessage.warning("请先选择执行设备");
    editTask(task);
    return;
  }
  if (distributingTaskId.value === task.taskId) return;
  distributingTaskId.value = task.taskId;
  try {
    const msg = await distributePlan(task.taskId);
    ElMessage.success(msg);
    initPlanData();
  } finally {
    distributingTaskId.value = null;
  }
};

const handleChoosePlan = (job: any) => {
  emits("choosePlan", {
    flyInfo: job,
    planInfo: tasks.value.find((e: any) => e.taskId === job.taskId),
  });
};

const handleClose = () => {
  emits("close");
};
</script>

<style scoped lang="less">
.task-library-panel {
  color: #ccc;
  /* 文字颜色适应深色背景 */
  height: 100%;
  /* 确保占据父容器 panel-content 的高度 */
  display: flex;
  /* 应用 Flexbox 布局 */
  flex-direction: row;
  /* 子元素水平排列 */
  /* position: relative; /* 添加相对定位，用于定位 RouteSettingsPanel */
  /* 移除相对定位，因为 RouteSettingsPanel 不再绝对定位 */
}

.main-content-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  /* 占据剩余空间 */
  .actions {
    width: 100%;
    padding: 20px 10px;
    height: 65px;
    border-top: 1px solid #4f4f4f;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  /* 左右对齐 */
  align-items: center;
  padding: 10px 20px;
  /* 调整内边距 */
  border-bottom: 1px solid #444;
  /* 底部灰色边框 */
  flex-shrink: 0;
  /* 防止被压缩 */
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: white;
  /* 标题颜色 */
}

.header-actions {
  display: flex;
  gap: 15px;
  /* 图标之间的间距 */
}

.action-icon {
  width: 16px;
  height: 16px;
  cursor: pointer;
  color: #ccc;
  /* 默认图标颜色 */
  transition: color 0.2s ease;
  /* 添加颜色过渡 */

  svg {
    width: 100%;
    height: 100%;
  }

  &:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
    color: white;
    /* 鼠标悬停时颜色变亮 */
  }
}

.deleteIcon :hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.12);
}

.add-icon {
  width: 20px;
  height: 20px;
}

.distribute-action-icon {
  width: 25px;
  height: 18px;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }
}

.task-list {
  flex-grow: 1;
  /* 占据剩余空间 */
  padding: 0 10px 10px;
  /* 列表内边距 */
  overflow-y: auto;
  /* 内容超出时允许垂直滚动 */
  min-height: 0;
  /* 允许 Flex 项目缩小到小于其内容的最小高度 */
  /* height: calc(100% - 45px); /* 设置高度为父容器高度减去头部高度 */
  /* 移除 calc 高度 */
}

.task-card {
  background-color: rgba(68, 68, 68, 0.6);
  /* 卡片默认背景色 */
  padding: 10px 10px 15px;
  margin-bottom: 10px;
  /* 卡片之间的间距 */
  border-radius: 4px;
  /* 圆角 */
  position: relative;
  /* 用于定位卡片内的操作按钮 */
  cursor: pointer;
  /* 鼠标悬停时显示手型 */
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  /* 添加过渡效果 */
}

.task-card:hover {
  background-color: #444;
  /* 鼠标悬停时背景变浅 */
}

.task-card.active {
  background-color: #444;
  border: 1px solid #007bff;
  /* 选中状态边框变蓝 */
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  /* 预留右侧按钮的空间 */
}

.card-meta {
  font-size: 12px;
  color: #aaa;
  /* 元信息文字颜色 */
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  .task-btn:hover {
transform: none;
  }

  .route-icon {
    width: 16px;
    height: 16px;
    margin-right: 2px;
  }

  div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.card-meta .el-icon {
  margin-right: 5px;
  font-size: 14px;
  /* 元信息图标大小 */
  color: #aaa;
  /* 元信息图标颜色 */
}

.card-actions-bar {
  position: absolute;
  right: 10px;
  top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.card-actions .action-icon {
  font-size: 16px;
  /* 卡片内操作图标大小 */
}

.no-tasks-message {
  text-align: center;
  color: #aaa;
  padding-top: 20px;
}

.status-tag {
  display: inline-block;
  padding: 0 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: #fdf6ec;
  position: absolute;
  right: 8px;
  bottom: 8px;
  line-height: 20px;
  height: 20px;
  opacity: 0.9;
}

/* 不同状态可自定义主色和底色 */
.status-tag-1 {
  background: #fdf6ec;
  color: #e6a23c;
}

/* 待执行-橙 */
.status-tag-2 {
  background: #ecf5ff;
  color: #409eff;
}

/* 执行中-蓝 */
.status-tag-3 {
  background: #f0f9eb;
  color: #67c23a;
}

/* 已完成-绿 */
.status-tag-4 {
  background: #aca7a7;
  color: #242323;
}

/* 已取消-灰 */
.status-tag-5 {
  background: #fef0f0;
  color: #f56c6c;
}

/* 执行失败-红 */

/* 强制覆盖 Element Plus 输入框样式 */
:deep(.el-input) {
  .el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;

    .el-input__inner {
      background-color: #333 !important;
      color: #ccc !important;
    }
  }

  &.is-focused .el-input__wrapper {
    box-shadow: 0 0 0 1px #2d8cf0 inset !important;
  }
}

::v-deep {
  .el-date-editor {

    .el-range-input,
    .el-range-separator,
    .el-range__icon {
      color: #fff;
    }
  }

  .el-select,
  .el-select__wrapper,
  .el-date-editor.el-input,
  .el-date-editor.el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;
    width: 100%;
  }
}

.search-conditions-wrapper {
  width: 100%;
  padding: 10px;

  .search-conditions-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    // margin-bottom: 10px;
  }

  .advanced-search-fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .expand-btn {
    .toggle {
      cursor: pointer;
      display: flex;
      align-items: center;
      white-space: nowrap;
      color: #ccc;

      .toggle-icon {
        transition: transform 0.3s ease;
        margin-left: 10px;

        &.rotated {
          transform: rotate(180deg);
        }
      }
    }
  }
}

/* 下拉菜单样式 - 参考MediaPanel */
:deep(.el-dropdown .el-dropdown__popper) {
  border: none !important;
}

:deep(.route-card-dropdown-popper) {
  background-color: #444 !important;
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu) {
  padding: 5px 0 !important;
  background-color: #444 !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item) {
  color: #ccc !important;
  padding: 0 20px !important;
  line-height: 36px !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-disabled) {
  color: #aaa !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item:not(.is-disabled):hover) {
  background-color: #555 !important;
  color: white !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-divided) {
  border-top: 1px solid #555 !important;
  margin-top: 5px !important;
  padding-top: 5px !important;
}

:deep(.route-card-dropdown-popper .el-popper__arrow:before) {
  background-color: #444 !important;
  border: 1px solid #444 !important;
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item--divided) {
  border-top: 1px solid #ccc !important;
}
</style>
