<template>
  <div>
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="删除"
      width="400px"
      :before-close="handleCancel"
      :custom-class="'delete-route-dialog'"
      :append-to-body="false"
      v-loading="props.isDeleting"
      element-loading-text="删除中..."
    >
      <div class="dialog-content">
        <p>将删除选中的1条航线，删除后航线内容将不可恢复，您确定要删除该航线吗?</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="props.isDeleting" @click="handleCancel">取消</el-button>
          <el-button
            type="danger"
            :loading="props.isDeleting"
            :disabled="props.isDeleting"
            @click="handleConfirm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElDialog, ElButton } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  routeName: string; // 用于显示在确认信息中，尽管图片中是固定文本
  routeId: number | string | null; // 要删除的航线ID
  isDeleting: boolean;
}>();

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const handleConfirm = () => {
  if (props.isDeleting) return;
  emit('confirm', props.routeId);
};

const handleCancel = () => {
  if (props.isDeleting) return;
  emit('cancel');
  emit('update:visible', false);
};
</script>

<style lang="less" scoped>
/* 使用多层 :deep 确保样式完全穿透 */
:deep(.el-dialog) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  padding-top: 0;
  padding-bottom: 0;

  .el-dialog__body {
    background-color: transparent !important;
    color: #ccc !important;
    padding: 30px 20px !important;
    font-size: 14px;
  }

  .el-dialog__header {
    border-bottom: 1px solid #444 !important;
    padding: 15px 20px !important;
    margin-right: 0 !important;
  }

  .el-dialog__title {
    color: white !important;
    font-size: 16px !important;
    font-weight: bold !important;
  }

  .el-dialog__headerbtn {
    top: 6px !important;
    right: 13px !important;

    .el-dialog__close {
      color: #ccc !important;
    }
  }

  .el-dialog__footer {
    border-top: 1px solid #444 !important;
    padding: 15px 20px !important;
  }
}

/* 强制覆盖 Element Plus 按钮样式 */
:deep(.el-button) {
  background-color: #444 !important;
  color: #ccc !important;
  border-color: #444 !important;

  &:hover {
    background-color: #555 !important;
    border-color: #555 !important;
    color: white !important;
  }

  &--primary {
    background-color: #2d8cf0 !important;
    border-color: #2d8cf0 !important;
    color: white !important;

    &:hover {
      background-color: #0056b3 !important;
      border-color: #004085 !important;
    }
  }
  &--danger { /* 红色按钮样式 */
    background-color: #f56c6c !important;
    border-color: #f56c6c !important;
    color: white !important;

    &:hover {
      background-color: #ee7f7f !important; /* 悬停时颜色变深 */
      border-color: #ee7f7f !important;
    }
  }
}

/* 特定于删除对话框的样式调整 */
:deep(.delete-route-dialog.el-dialog){
  top: 30vh; /* 调整对话框垂直位置 */
  .el-dialog__header{
    background-color: transparent !important;
  }
  .el-dialog__footer{
    background-color: transparent !important;
  }
}
</style>
