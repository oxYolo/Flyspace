<template>
  <div>
    <el-dialog
      v-model="dialogVisible"
      title="生成航线"
      width="750px"
      :before-close="() => handleClose(false)"
      class="create-route-dialog"
      :custom-class="'create-route-dialog'"
      :append-to-body="false"
      :style="{
        backgroundColor: 'rgba(23, 44, 44, 0.9)',
        '--el-dialog-bg-color': 'rgba(23, 44, 44, 0.9)',
        '--el-dialog-text-color': '#fff',
      }"
    >
      <div class="dialog-content">

        <div class="section">
          <div class="section-title">北斗网格码</div>
          <div class="section-item">
            <div class="label">起点：</div>
            <el-input
              v-model="startCode"
              placeholder="请输入起点"
            ></el-input>
          </div>
          <div class="section-item">
            <div class="label">终点：</div>
            <el-input
              v-model="endCode"
              placeholder="请输入终点"
            ></el-input>
          </div>
        </div>

      </div>

      <!-- 对话框底部按钮区域 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose(false)">取消</el-button>
          <el-button :loading="loading" type="primary" @click="handleConfirm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElDialog, ElButton, ElInput, ElMessage } from 'element-plus';
import { $createBeiDouRoutePath } from "@/api/flyControl/flight.ts";
import emitter from "@/stores/mitt.ts";


// 统一的航线类型选择状态
// 定义组件可以触发的事件
const emit = defineEmits(['close']);

const dialogVisible = ref(true);

const startCode = ref("N19H0B03030806050D13120700");
const endCode = ref("N19H0B03030807060103740200");



// 处理对话框关闭前的事件
const handleClose = (flag: boolean) => {
  emit('close', flag); // 也可以触发一个 close 事件
};

const loading = ref(false);
// 处理确定按钮点击事件
const handleConfirm = async () => {
  loading.value = true;
  try {
    const res = await $createBeiDouRoutePath({
      start: startCode.value,
      goal: endCode.value,
    });
    const path = res.data.smooth_geo_centers.map(e => {
      return {
        longitude: e[0],
        latitude: e[1],
        altitude: e[2],
      }
    })
    emitter.emit('beidou-route-path', path)
    ElMessage.success('计算成功')
    // 关闭对话框
    handleClose(true);
  } catch (e) {
    ElMessage.warning('生成失败')
  } finally {
    loading.value = true;
  }
};
</script>

<style scoped lang="less">
/* 使用多层 :deep 确保样式完全穿透 */
:deep(.el-dialog) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  margin: 0 auto !important;

  .el-dialog__body {
    background-color: transparent !important;
    color: #ccc !important;
    padding: 10px 20px 20px 20px !important;
  }

  .el-dialog__header {
    background-color: rgba(23, 44, 44, 0.95) !important;
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
    top: 18px !important;
    right: 13px !important;

    .el-dialog__close {
      color: #ccc !important;
    }
  }

  .el-dialog__footer {
    background-color: rgba(23, 44, 44, 0.95) !important;
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
.section-item {
  display: flex;
  margin-top: 10px;
  .label {
    width: 100px;
    font-weight: 500;
    color: #fff;
  }
}
</style>


