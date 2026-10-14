<template>
  <div class="taskCard" :class="{ isActive: active }" @click="handleClick">
    <div class="cardTop">
      <div class="taskTitle">{{ task.name }}</div>
      <el-popconfirm width="240" :title="`确定要删除任务「${task.name}」吗？此操作不可恢复。`" confirm-button-text="确定删除"
        cancel-button-text="取消" @confirm="handleDeleteConfirm">
        <template #reference>
          <el-icon class="deleteIcon" title="删除" @click.stop>
            <Delete />
          </el-icon>
        </template>
      </el-popconfirm>
    </div>
    <div class="taskMeta">
      <span class="metaItem">
        识别视频：
        <span class="videoName" v-tooltip="task.videoName || '--'">
          {{ task.videoName || "--" }}
        </span>
        <el-button v-if="task.videoUrl" size="small" type="primary" link class="playButton"
          @click.stop="handleOpenVideo">
          <el-icon>
            <VideoPlay />
          </el-icon>
          播放
        </el-button>
      </span>
      <span class="metaItem">识别时间：{{ task.createdAt }}</span>
      <span class="metaItem">
        识别状态：
        <el-tag :type="statusTagType" effect="light" size="small" class="statusTag">
          {{ statusText }}
        </el-tag>
        <el-button size="small" type="primary" link :icon="Download" class="downloadButton"
          @click.stop="handleDownloadTrainingSet">
          下载训练集
        </el-button>
      </span>
    </div>
  </div>

  <el-dialog v-model="videoDialogVisible" title="识别视频预览" width="760px" top="10vh" class="videoDialog" destroy-on-close
    @closed="handleVideoClosed">
    <div class="videoWrap">
      <video v-if="videoDialogVisible && videoSrc" ref="videoRef" class="videoPlayer" :src="videoSrc" controls autoplay
        muted playsinline />
      <el-empty v-else description="暂无可播放视频" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { VideoPlay, Delete, Download } from "@element-plus/icons-vue";
import { $downloadTrainingSet } from "@/api/flyControl/smart";
import { ElMessage } from "element-plus";

interface TaskListItem {
  id: string;
  name: string;
  createdAt: string;
  status: "INIT" | "SUBMITTING" | "SUBMITTED" | "SUCCESS" | "FAILED";
  videoName?: string;
  videoUrl?: string;
  raw?: any;
}

const props = defineProps<{
  task: TaskListItem;
  active?: boolean;
}>();

const emits = defineEmits<{
  (e: "select", taskId: string): void;
  (e: "delete", taskId: string): void;
}>();

const statusText = computed(() => {
  const s = props.task.status;
  if (s === "INIT") return "待提交";
  if (s === "SUBMITTING") return "提交中";
  if (s === "SUBMITTED") return "已提交";
  if (s === "SUCCESS") return "识别成功";
  return "识别失败";
});

const statusTagType = computed(() => {
  const s = props.task.status;
  if (s === "INIT") return "info";
  if (s === "SUBMITTING") return "warning";
  if (s === "SUBMITTED") return "primary";
  if (s === "SUCCESS") return "success";
  return "danger";
});

const videoDialogVisible = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const videoSrc = ref("");

/** 点击任务卡片时，向父组件派发选中事件 */
function handleClick() {
  emits("select", props.task.id);
}

function handleDeleteConfirm() {
  emits("delete", props.task.raw?.id ?? props.task.id);
}

/** 点击播放按钮时，打开视频预览弹框 */
function handleOpenVideo() {
  if (!props.task.videoUrl) return;
  videoSrc.value = props.task.videoUrl;
  videoDialogVisible.value = true;
}

/** 关闭视频弹框时，停止播放并重置进度 */
function handleVideoClosed() {
  const el = videoRef.value;
  if (el) {
    el.pause();
    el.removeAttribute("src");
    el.load();
    videoRef.value = null;
  }
  videoSrc.value = "";
}

/** 点击下载训练集按钮时，调用下载训练集接口 */
async function handleDownloadTrainingSet() {
  if (!props.task.id) return;
  const res: any = await $downloadTrainingSet({ taskId: props.task.id });
  if (res) {
    if (res.msg) {
      ElMessage.warning(res.msg || "下载训练集失败");
      return;
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([res], { type: "application/octet-stream" }));
    a.download = `${props.task.name}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}



watch(
  () => videoDialogVisible.value,
  async (visible) => {
    if (!visible) return;
    await nextTick();
    const el = videoRef.value;
    if (!el) return;
    try {
      await el.play();
    } catch {
      // Autoplay 可能被浏览器策略拦截，此处保持静默，用户可手动点击播放
    }
  },
);
</script>

<style scoped lang="less">
.taskCard {
  padding: 12px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background-color: rgba(23, 44, 44, 0.9);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.cardTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

.deleteIcon {
  flex-shrink: 0;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.38);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: #f56c6c;
    background-color: rgba(245, 108, 108, 0.12);
  }
}

.taskCard:hover {
  border-color: rgba(45, 140, 240, 0.8);
}

.taskCard.isActive {
  border-color: rgba(45, 140, 240, 1);
  background: rgba(45, 140, 240, 0.12);
}

.taskTitle {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  word-break: break-all;
}

.taskMeta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.metaItem {
  line-height: 16px;
  display: flex;
  align-items: center;

  .videoName {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.statusTag {
  margin-left: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.playButton {
  margin-left: 6px;
  height: 18px;
  font-size: 12px;
}

.downloadButton {
  margin-left: auto;
}

.videoWrap {
  width: 100%;
  height: 410px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  overflow: hidden;
}

.videoPlayer {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.45);
}
</style>

<style lang="less">
.videoDialog.el-dialog {
  background-color: rgba(23, 44, 44, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.86) !important;
}

.videoDialog .el-dialog__header {
  margin-right: 0 !important;

  .el-dialog__close {
    font-size: 24px;
  }
}

.videoDialog .el-dialog__title {
  color: rgba(255, 255, 255, 0.92) !important;
}

.videoDialog .el-dialog__body {
  background-color: rgba(23, 44, 44, 0.9) !important;
}
</style>

<style>
.el-popover.el-popper {
  background: #172c2ce6;
  border: 1px solid #444;
  color: #fff;
}

.el-popper.is-light>.el-popper__arrow:before {
  background: #172c2ce6;
  border: 1px solid #444;
}
</style>
