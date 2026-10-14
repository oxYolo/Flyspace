<template>
  <div class="execution-plan-modal">
    <div class="modal-content">
      <div class="modal-header">
        <span>执行架次</span>
        <el-icon @click="handleClose"><Close /></el-icon>
      </div>

      <div class="modal-body">
        <!-- 执行计划列表 -->
        <div class="execution-list">
          <div
            v-for="item in executionList"
            :key="item.jobId"
            class="execution-item"
            :class="{ active: selectedPlanId === item.jobId }"
            @click="handleChooseJob(item)">
            <div class="item-content">
              <div class="item-row">
                <span class="label">任务开始时间:</span>
                <span class="value">{{ formatTime(item.beginTime) }}</span>
              </div>
              <div class="item-row">
                <span class="label">执行时间:</span>
                <span class="value">{{ formatTime(item.executeTime) }}</span>
              </div>
              <div class="item-row">
                <span class="label">任务状态:</span>
                <span class="status-tag" :class="'status-tag-' + item.status">
                  {{ getStatusText(item.status) }}
                </span>
              </div>
              <!-- 失败原因显示 -->
              <div
                v-if="item.status === 5 && item.codeDescription"
                class="item-row">
                <span class="label">失败原因:</span>
                <span class="value error-text">{{ item.codeDescription }}</span>
              </div>
              <!-- 成功成果数量显示 -->
              <div
                v-if="item.status === 3 && item.mediaCount !== undefined"
                class="item-row">
                <span class="label">成果数量:</span>
                <span class="value success-text">{{ item.mediaCount }}</span>
              </div>
            </div>
            <div v-if="showBtns" class="card-actions-bar" @click.stop>
              <el-icon
                v-if="canReplay(item.status)"
                v-tooltip="'回放'"
                class="action-icon"
                @click.stop="showReplay(item)">
                <VideoPlay />
              </el-icon>
              <el-popconfirm
                v-if="canCancelJob(item.status)"
                width="240"
                title="确定取消该执行任务吗？"
                confirm-button-text="确定取消"
                cancel-button-text="返回"
                :disabled="cancelingJobId === item.jobId"
                @confirm="() => cancelJob(item)">
                <template #reference>
                  <el-icon v-tooltip="'取消'" class="action-icon" @click.stop>
                    <Remove />
                  </el-icon>
                </template>
              </el-popconfirm>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="executionList.length === 0 && !loading"
            class="empty-state">
            暂无执行任务数据
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>加载中...</span>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper" v-if="pageOptions.total > 0">
          <el-pagination
            v-model:current-page="pageOptions.page"
            v-model:page-size="pageOptions.pageSize"
            :background="false"
            :pager-count="4"
            size="small"
            layout="prev, pager, next, total"
            :total="pageOptions.total"
            class="white-el-pagination"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Close, Loading, Remove, VideoPlay } from "@element-plus/icons-vue";
import { $getSubPlanList, $cancelWaylineJob } from "@/api/flyControl/control";
import { ElMessage } from "element-plus";
import { useReplayStore } from "@/stores/modules/replay.ts";
const replayStore = useReplayStore();
const props = defineProps<{
  taskId: string;
  showBtns?: boolean;
}>();

// Emits
const emits = defineEmits(["close", "choose-job"]);

// 响应式数据
const executionList = ref<any[]>([]);
const loading = ref(false);
const pageOptions = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});

// 状态映射 - 根据图片3的状态对照
const statusMap: any = {
  1: "等待中", // PENDING
  2: "进行中", // IN_PROGRESS
  3: "成功", // SUCCESS
  4: "取消", // CANCEL
  5: "失败", // FAILED
  6: "暂停", // PAUSED
  [-1]: "未知", // UNKNOWN
  [-2]: "未知", // SEND_FAIL
};

const selectedPlanId = ref<number | null>(null);
const cancelingJobId = ref<string | number | null>(null);

// 获取状态文本
const getStatusText = (status: number) => {
  return statusMap[status] || "未知状态";
};

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return "--";

  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return timeStr;
  }
};

// 关闭弹窗
const handleClose = () => {
  emits("close");
};

// 获取执行计划列表
const fetchExecutionList = async () => {
  if (!props.taskId) {
    ElMessage.error("缺少任务ID");
    return;
  }

  loading.value = true;
  try {
    const params = {
      taskId: props.taskId,
      page: pageOptions.value.page,
      pageSize: pageOptions.value.pageSize,
    };

    const response: any = await $getSubPlanList(params);

    if (response.code === 200 && response.data) {
      executionList.value = response.data.records || [];
      pageOptions.value.total = response.data.total || 0;
    } else {
      ElMessage.error(response.msg || "获取执行任务失败");
    }
  } catch (error) {
    console.error("获取执行任务失败:", error);
    ElMessage.error("获取执行任务失败");
  } finally {
    loading.value = false;
  }
};

// 分页大小改变
const handleSizeChange = (size: number) => {
  pageOptions.value.pageSize = size;
  pageOptions.value.page = 1;
  fetchExecutionList();
};

// 当前页改变
const handleCurrentChange = (page: number) => {
  pageOptions.value.page = page;
  fetchExecutionList();
};

// 判断是否可以取消任务
// 根据状态图，只有end为false的状态才能取消：PENDING(1), IN_PROGRESS(2), PAUSED(6)
const canCancelJob = (status: number) => {
  return [1, 2, 6].includes(status);
};

const canReplay = (status: number) => {
  return [3].includes(status);
};

// 取消执行计划
const cancelJob = async (item: any) => {
  const jobId = item?.jobId;
  if (!jobId) return;
  if (cancelingJobId.value === jobId) return;
  cancelingJobId.value = jobId;
  try {
    await $cancelWaylineJob(jobId);
    ElMessage.success("执行任务取消成功");
    fetchExecutionList();
  } catch (error) {
    ElMessage.error("执行任务取消失败");
  } finally {
    cancelingJobId.value = null;
  }
};

const showReplay = (item: any) => {
  replayStore.navigateToReplay({
    executorId: item.taskId,
  });
};

const handleChooseJob = (item: any) => {
  emits("choose-job", item);
  selectedPlanId.value = item.jobId;
};

// 组件挂载时获取数据
onMounted(() => {
  fetchExecutionList();
});

// 监听taskId变化，自动刷新执行任务列表
watch(
  () => props.taskId,
  (newTaskId, oldTaskId) => {
    if (newTaskId && newTaskId !== oldTaskId) {
      // 重置分页到第一页
      pageOptions.value.page = 1;
      fetchExecutionList();
    }
  },
  { immediate: false },
);
</script>

<style scoped lang="less">
.execution-plan-modal {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  width: 350px;
  height: 100%;
  background-color: rgba(23, 44, 44, 0.9);
  pointer-events: auto;
  z-index: 1000;

  .modal-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    .modal-header {
      color: #fff;
      box-shadow: inset 0 -1px 0 0 #4f4f4f;
      padding: 10px 16px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;

      .el-icon {
        cursor: pointer;
        color: #ccc;
        transition: color 0.2s ease;

        &:hover {
          color: white;
        }
      }
    }

    .modal-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .execution-list {
        flex: 1;
        padding: 16px;
        overflow-y: auto;

        .execution-item {
          background-color: rgba(51, 51, 51, 0.6);
          border-radius: 4px;
          padding: 12px 40px 12px 12px;
          margin-bottom: 12px;
          transition: background-color 0.2s ease;
          position: relative;

          &:hover {
            background-color: #444;
          }

          .item-content {
            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;

              &:last-child {
                margin-bottom: 0;
              }

              .label {
                color: #aaa;
                font-size: 12px;
                flex-shrink: 0;
              }

              .value {
                color: #fff;
                font-size: 12px;
                text-align: right;
              }

              .status-tag {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                line-height: 16px;

                // 状态颜色 - 根据图片3的状态对照
                &.status-tag-1 {
                  background: #fdf6ec;
                  color: #e6a23c;
                } // 等待中-橙
                &.status-tag-2 {
                  background: #ecf5ff;
                  color: #409eff;
                } // 进行中-蓝
                &.status-tag-3 {
                  background: #f0f9eb;
                  color: #67c23a;
                } // 成功-绿
                &.status-tag-4 {
                  background: #aca7a7;
                  color: #242323;
                } // 取消-灰
                &.status-tag-5 {
                  background: #fef0f0;
                  color: #f56c6c;
                } // 失败-红
                &.status-tag-6 {
                  background: #fdf6ec;
                  color: #e6a23c;
                } // 暂停-橙
                &.status-tag--1,
                &.status-tag--2 {
                  background: #aca7a7;
                  color: #242323;
                } // 未知-灰
              }

              .error-text {
                color: #f56c6c;
                word-break: break-all;
                max-width: 150px;
              }

              .success-text {
                color: #67c23a;
                font-weight: 600;
              }
            }
          }

          .card-actions-bar {
            position: absolute;
            right: 12px;
            top: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
        }
        .active {
          background-color: #444;
          border: 1px solid #007bff; /* 选中状态边框变蓝 */
        }

        .empty-state {
          text-align: center;
          color: #aaa;
          padding: 40px 0;
          font-size: 14px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: #aaa;

          .el-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }
        }
      }

      /* 下拉菜单样式 - 参考外部计划列表 */
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

      :deep(
        .route-card-dropdown-popper
          .el-dropdown-menu__item:not(.is-disabled):hover
      ) {
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

      .action-icon {
        width: 18px;
        height: 18px;
        cursor: pointer;
        color: #ccc; /* 默认图标颜色 */
        transition: color 0.2s ease; /* 添加颜色过渡 */

        svg {
          width: 100%;
          height: 100%;
        }

        &:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
          color: white; /* 鼠标悬停时颜色变亮 */
        }
      }

      .pagination-wrapper {
        padding: 16px;
        border-top: 1px solid #4f4f4f;
        flex-shrink: 0;

        .white-el-pagination {
          justify-content: center;
        }
      }
    }
  }
}
</style>
