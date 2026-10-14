<template>
  <div>
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="复制航线"
      width="400px"
      :before-close="handleCancel"
      :custom-class="'copy-route-dialog'"
      :append-to-body="false"
    >
      <div class="dialog-content">
        <div class="section">
          <div class="section-title">新航线名称</div>
          <el-input
            v-model="newRouteNameInternal"
            placeholder="请输入新航线名称"
          ></el-input>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleConfirm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElDialog, ElInput, ElButton } from 'element-plus';

const props = defineProps<{
  visible: boolean;
  initialRouteName: string; // 默认的新航线名称 (例如：原名称(1))
  routeId: number | string | null; // 要复制的原航线ID
}>();

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const newRouteNameInternal = ref(props.initialRouteName);

// 监听 initialRouteName 变化，同步到内部状态
watch(() => props.initialRouteName, (newVal) => {
  newRouteNameInternal.value = newVal;
});

const handleConfirm = () => {
  if (newRouteNameInternal.value.trim() !== '') {
    emit('confirm', { originalId: props.routeId, newName: newRouteNameInternal.value.trim() });
  }
  emit('update:visible', false);
};

const handleCancel = () => {
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
    padding: 10px 20px 20px 20px !important;
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

/* 强制覆盖 Element Plus 按钮样式 */
:deep(.el-button) {
  background-color: #444 !important;
  color: #ccc !important;
  border-color: #555 !important;

  &:hover {
    background-color: #555 !important;
    border-color: #666 !important;
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
}

/* 组件内部样式 */
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 10px;
}

.dialog-footer button:first-child {
  margin-right: 10px;
}

/* 特定于复制对话框的样式调整 */
:deep(.copy-route-dialog.el-dialog){
  top: 30vh; /* 调整对话框垂直位置 */
  .el-dialog__header{
    background-color: transparent !important;
  }
  .el-dialog__footer{
    background-color: transparent !important;
  }
}
</style>