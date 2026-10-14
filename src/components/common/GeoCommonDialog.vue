<template>
  <div class="geo-common-dialog">
    <el-dialog
      :model-value="dialogVisible"
      @update:modelValue="emit('update:dialogVisible', $event)"
      :title="title"
      :width="width"
      :close-on-click-modal="closeOnClickModal"
      :style="dialogStyle"
      :class="dialogClass"
      :custom-class="dialogClass"
      @close="handleClose"
      :append-to-body="false"
      :show-close="showClose"
    >
      <div class="dialogContent">
        <slot></slot>
      </div>
      <template #footer>
        <div class="dialog-footer" v-show="showFooter">
          <el-button @click="handleCancel">{{ cancelText }}</el-button>
          <el-button type="primary" @click="handleConfirm">{{ confirmText }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: '提示'
  },
  width: {
    type: String,
    default: '30%'
  },
  height: {
    type: String,
    default: ''
  },
  maxHeight: {
    type: String,
    default: ''
  },
  minHeight: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: ''
  },
  minWidth: {
    type: String,
    default: ''
  },
  cancelText: {
    type: String,
    default: '取 消'
  },
  confirmText: {
    type: String,
    default: '确 定'
  },
  closeOnClickModal: {
    type: Boolean,
    default: false
  },
  dialogClass: {
    type: [String, Object, Array],
    default: ''
  },
  // 新增 v-model 绑定
  dialogVisible: {
    type: Boolean,
    default: false
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  showClose: {
    type: Boolean,
    default: true
  },
});

// 计算对话框样式，包括尺寸
const dialogStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.height) style.height = props.height;
  if (props.maxHeight) style.maxHeight = props.maxHeight;
  if (props.minHeight) style.minHeight = props.minHeight;
  if (props.maxWidth) style.maxWidth = props.maxWidth;
  if (props.minWidth) style.minWidth = props.minWidth;

  return style;
});

// emit 'update:dialogVisible' 来更新外部 v-model
const emit = defineEmits(['cancel', 'confirm', 'close', 'update:dialogVisible']);

const handleCancel = () => {
  emit('update:dialogVisible', false); // 关闭弹窗
  emit('cancel');
};

const handleConfirm = () => {
  emit('update:dialogVisible', false); // 关闭弹窗
  emit('confirm');
};

const handleClose = () => {
  emit('update:dialogVisible', false); // 关闭弹窗
  emit('close');
};
</script>

<style scoped lang="less">
.geo-common-dialog {
  :deep(.el-dialog) {
    // 允许对话框内容区域滚动
    .el-dialog__body {
      height: calc(100% - 100px) !important;
      overflow-y: auto;
    }
  }
}
.dialogContent {
  height: 100%;
}
</style>
