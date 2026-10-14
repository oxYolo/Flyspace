<template>
  <div> 
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="移动"
      width="400px"
      :before-close="handleCancel"
      :custom-class="'move-route-dialog'"
      :append-to-body="false"
    >
      <div class="dialog-content">
        <div class="section">
          <el-input
            v-model="searchFolder"
            placeholder="搜索文件夹"
            :suffix-icon="Search"
          ></el-input>
        </div>

        <div class="section move-target-section">
          <p>将选中的{{ props.selectedRouteCount }}条航线移动至</p>
          <div class="folder-item">
            <el-icon><Folder /></el-icon>
            <span>默认文件夹</span>
          </div>
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
import { ElDialog, ElInput, ElButton, ElIcon } from 'element-plus';
import { Search, Folder } from '@element-plus/icons-vue'; // 导入搜索和文件夹图标

const props = defineProps<{
  visible: boolean;
  selectedRouteCount: number; // 要移动的航线数量
  routeId: number | string | null; // 当前要移动的航线ID (假设单选)
}>();

const emit = defineEmits(['update:visible', 'confirm', 'cancel']);

const searchFolder = ref('');

// 监听 visible 变化，在对话框打开时重置搜索框
watch(() => props.visible, (newVal) => {
  if (newVal) {
    searchFolder.value = '';
  }
});

const handleConfirm = () => {
  // 在实际应用中，这里会传递目标文件夹的ID或名称
  emit('confirm', { routeId: props.routeId, targetFolder: '默认文件夹' });
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
  width: 70%;
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

/* 特定于移动对话框的样式调整 */
:deep(.move-route-dialog.el-dialog){
  top: 30vh; /* 调整对话框垂直位置 */
  .el-dialog__header{
    background-color: transparent !important;
  }
  .el-dialog__footer{
    background-color: transparent !important;
  }
}

.move-target-section {
  p {
    color: white;
    margin-bottom: 10px;
  }
  .folder-item {
    display: flex;
    align-items: center;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
    padding: 8px 10px;
    border-radius: 4px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .el-icon {
      margin-right: 8px;
      font-size: 16px;
    }
  }
}
</style>