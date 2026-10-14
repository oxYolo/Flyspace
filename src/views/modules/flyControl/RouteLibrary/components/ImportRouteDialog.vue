<template>
  <div>
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="导入航线"
      width="60%"
      :before-close="handleClose"
      class="import-route-dialog"
      top="10vh"
      :append-to-body="false"
    >
      <!-- 对话框内容区域 -->
      <div class="dialog-content">
        <!-- 导入路径信息 -->
        <div class="import-path-info">
          导入路径: <span class="path-value">默认文件夹</span>
        </div>

        <!-- 导入文件区域 -->
        <div class="import-file-area">
          <!-- 导入按钮 -->
          <input type="file" ref="fileInput" @change="handleFileSelect" accept=".kmz" style="display: none;">
          <el-button type="primary" @click="triggerFileInput" class="import-button">
            <el-icon><Upload /></el-icon>
            导入 KMZ 文件
          </el-button>
          <span class="file-requirements">kmz 中需包含 wpmz/template.kml 及 wpmz/waylines.wpml 文件</span>
        </div>

        <!-- 文件列表/上传状态区域 -->
        <div class="file-list-area"> <!-- 添加一个容器 div -->
          <el-table
                :data="fileList"
                height="350px"
                style="width: 100%"
              >
                <el-table-column prop="name" label="文件名称" show-overflow-tooltip min-width="150"></el-table-column> <!-- 设置最小宽度 -->
                <el-table-column label="上传进度" width="200" align="center">
                  <template #default="scope">
                    <el-progress v-if="scope.row.status === 'uploading'" :percentage="scope.row.progress" :show-text="false" :stroke-width="8" color="#2d8cf0"></el-progress>
                    <span v-else>{{ scope.row.progress }}%</span>
                  </template>
                </el-table-column>
                <el-table-column label="上传状态" width="200" align="center">
                  <template #default="scope">
                    <span :class="{'status-success': scope.row.status === 'success', 'status-error': scope.row.status === 'error'}">
                      {{ scope.row.status === 'pending' ? '等待上传' : scope.row.status === 'uploading' ? '上传中' : scope.row.status === 'success' ? '成功' : '失败' }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="300" align="center"> <!-- 调整操作列宽度 -->
                  <template #default="scope">
                    <el-button v-if="scope.row.status !== 'success'" type="danger" link size="small" @click="removeFile(scope.$index)">删除</el-button>
                  </template>
                </el-table-column>
          <!-- 暂无数据状态 -->
          <template #empty>
            <div class="no-data">
              <div class="no-data-icon">
                  <!-- 示例图标，可以替换为实际的 SVG 或组件 -->
                  <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 18H38V40C38 41.1046 37.1046 42 36 42H12C10.8954 42 10 41.1046 10 40V18Z" fill="#333" stroke="#ccc" stroke-width="2" stroke-linejoin="round"/><path d="M14 18V10C14 8.89543 14.8954 8 16 8H32C33.1046 8 34 8.89543 34 10V18" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 4V8" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 18V10" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 18V10" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 18H38" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 29L24 23L30 29" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 23V35" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <span>暂无数据</span>
            </div>
          </template>
        </el-table>
        </div> <!-- 结束容器 div -->
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">关闭</el-button>
          <el-button v-show="fileList.find(e => e.status !== 'success')" type="primary" @click="handleUpload">上传</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElDialog, ElButton, ElIcon, ElProgress, ElTable, ElTableColumn } from 'element-plus'; // 引入 ElTable 和 ElTableColumn
import { Upload } from '@element-plus/icons-vue'; // 导入上传图标
import { $uploadflight } from "@/api/flyControl/flight";
import { ElMessage } from "element-plus";
import { v4 as uuidv4 } from "uuid";
// 定义组件接收的 props
const props = defineProps<{
  visible: boolean; // 控制对话框是否可见
}>();

// 定义组件可以触发的事件
const emit = defineEmits(['update:visible', 'close']);

// 文件列表状态
const fileList = ref<Array<{ name: string; progress: number; status: 'pending' | 'uploading' | 'success' | 'error'; file: File }>>([]);

// 文件输入元素的引用
const fileInput = ref<HTMLInputElement | null>(null);

// 触发文件选择器
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    // 将选中的文件添加到列表，初始状态为 pending
    for (let i = 0; i < files.length; i++) {
        fileList.value.push({
            name: files[i].name,
            progress: 0,
            status: 'pending',
            file: files[i]
        });
    }
  }
};

const handleUpload = () => {
  // 遍历文件列表，上传未上传的文件
  fileList.value.forEach((fileItem, index) => {
    // 只处理未上传或上传失败的文件
    if (fileItem.status === 'pending' || fileItem.status === 'error') {
      // 更新状态为上传中
      fileItem.status = 'uploading';
      fileItem.progress = 0;

      const formData = new FormData();
      const routeId = uuidv4();
      formData.append("file", fileItem.file);
      formData.append("routeId", routeId);

      // 调用上传接口，并监听进度
      const config = {
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          fileItem.progress = percentCompleted;
        }
      };

      // 调用上传接口
      $uploadflight(formData, routeId, config)
        .then((res) => {
          if (res.code == 200) {
            // 上传成功
            fileItem.status = 'success';
            fileItem.progress = 100;
            ElMessage({ message: `文件 ${fileItem.name} 上传成功`, type: 'success' });
          } else {
            // 上传失败
            fileItem.status = 'error';
            ElMessage({ message: `文件 ${fileItem.name} 上传失败: ${res.msg || '未知错误'}`, type: 'error' });
          }
        })
        .catch((error) => {
          // 上传异常
          fileItem.status = 'error';
          ElMessage({ message: `文件 ${fileItem.name} 上传异常: ${error.message || '未知错误'}`, type: 'error' });
        });
    }
  });
}

// 移除文件
const removeFile = (index: number) => {
    fileList.value.splice(index, 1);
};

// 处理对话框关闭
const handleClose = () => {
  emit('update:visible', false); // <-- 添加或取消注释这一行，通知父组件隐藏对话框
};
</script>


<style lang="less" scoped>
.dialog-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.import-path-info {
    font-size: 14px;
    color: #ccc;
}

.path-value {
    color: white;
    font-weight: bold;
}

.import-file-area {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border-radius: 8px;
}

.import-button {
    display: flex;
    align-items: center;
    gap: 5px;
}

.file-requirements {
    font-size: 12px;
    color: #aaa;
    flex-grow: 1; /* 占据剩余空间 */
}

.file-list-area {
    background-color: rgba(51, 51, 51, 0.6);
    border-radius: 8px;
    overflow: hidden; /* 确保圆角生效 */
    flex-grow: 1; /* 让文件列表区域占据 dialog-content 的剩余空间 */
    display: flex; /* 使其内部 flex 布局 */
    flex-direction: column; /* 使 el-table 垂直排列 */
    min-height: 0; /* 允许 flex item 缩小 */
}

.no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%; /* 占据父容器高度 */
    color: #ccc;
    font-size: 14px;
    gap: 10px;
}

.no-data-icon svg {
    fill: none; /* 确保 SVG 内部填充是 none */
}

.status-success {
    color: #67c23a; /* 绿色 */
}

.status-error {
    color: #f56c6c; /* 红色 */
}

/* 覆盖 Element Plus Progress 默认样式 */
.file-item .el-progress {
    width: 80%; /* 进度条宽度 */
    margin: 0 auto; /* 居中 */
}

/* Element Plus Table 深色主题样式 */
:deep(.el-table) {
  background-color: transparent !important; /* 整体背景色 - 深黑 */
  color: #ccc !important; /* 默认文字颜色 */
}

:deep(.el-table th.el-table__cell) {
  background-color: #444 !important; /* 表头背景色 */
  color: white !important; /* 表头文字颜色 */
  border-bottom: 1px solid #555 !important; /* 表头底部边框 */
}

:deep(.el-table tr) {
  background-color: transparent !important; /* 行背景透明 */
}

:deep(.el-table tr:hover) {
  background-color: rgba(68, 68, 68, 0.5) !important; /* 行悬停背景色 */
}

:deep(.el-table td.el-table__cell, .el-table th.el-table__cell) {
  border-bottom: 1px dashed #555 !important; /* 单元格底部边框 */
}

:deep(.el-table--border .el-table__cell) {
    border-right: 1px solid #555 !important; /* 带边框表格的右边框 */
}

:deep(.el-table::before) {
  background-color: #555 !important; /* 表格最底部边框 */
}

:deep(.el-table__empty-block) {
    background-color: transparent !important; /* 空数据块背景透明 */
    color: #ccc !important; /* 空数据文字颜色 */
}

:deep(.el-table__empty-text) {
    line-height: normal; /* 恢复默认行高 */
}

/* 调整空数据块的 flex 布局，使其内容居中 */
:deep(.el-table__empty-block) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%; /* 占据父容器高度 */
}

:deep(.el-table .el-table__inner-wrapper:before) {
  background-color: transparent !important; /* 表格内部背景透明 */
}


/* 使用 :deep() 穿透到 el-dialog 内部的 Element Plus 默认结构 */
:deep(.import-route-dialog.el-dialog) {
    /* 覆盖 Element Plus 默认样式 */
    background-color: rgba(23, 44, 44, 0.9) !important; /* 整体背景色 - 深黑 */
    color: #fff; /* 默认文字颜色 */
    box-shadow: 0 0 10px rgba(0,0,0,0.5); /* 调整阴影 */
    border-radius: 8px; /* 圆角 */
    display: flex; /* 使内部 flex 布局 */
    flex-direction: column; /* 使 header, body, footer 垂直排列 */
    height: 650px; /* 对话框固定高度 */
}

:deep(.import-route-dialog.el-dialog .el-dialog__header) {
    padding: 15px 20px; /* 调整头部内边距 */
    border-bottom: 1px solid #444; /* 添加底部边框 */
    margin-right: 0; /* 移除默认的 margin-right */
}

:deep(.import-route-dialog.el-dialog .el-dialog__title) {
    color: white; /* 标题颜色 */
    font-size: 16px;
    font-weight: bold;
}

:deep(.import-route-dialog.el-dialog .el-dialog__headerbtn) {
    top: 15px; /* 调整关闭按钮位置 */
    right: 20px;
}

:deep(.import-route-dialog.el-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: #fff; /* 关闭按钮颜色 */
}

:deep(.import-route-dialog.el-dialog .el-dialog__body) {
    padding: 20px; /* 调整 body 内边距 */
    flex-grow: 1; /* 使 body 占据剩余空间 */
    /* overflow-y: auto; */ /* 移除 body 的滚动条 */
    display: flex; /* 使 body 内部内容 flex 布局 */
    flex-direction: column; /* 使内部元素垂直排列 */
    gap: 15px; /* 内部元素间距 */
    min-height: 0; /* 允许 flex item 缩小 */
}

:deep(.import-route-dialog.el-dialog .el-dialog__footer) {
    padding: 15px 20px; /* 调整底部内边距 */
    border-top: 1px solid #444; /* 添加顶部边框 */
}

/* 覆盖 Element Plus Button 默认样式 */
:deep(.import-route-dialog .el-button) {
    background-color: #444;
    color: #fff;
    border: none;
}
:deep(.import-route-dialog .el-button:hover) {
    background-color: #555;
    border: none;
    color: #fff;
}
:deep(.import-route-dialog .el-button:active) {
     background-color: #333;
     border-color: #444;
     color: #fff;
}

:deep(.import-route-dialog .el-button--primary) {
    background-color: #2d8cf0;
    border-color: #2d8cf0;
    color: white;
}
:deep(.import-route-dialog .el-button--primary:hover) {
    background-color: #1a7cdb;
    border-color: #1a7cdb;
    color: white;
}
:deep(.import-route-dialog .el-button--primary:active) {
    background-color: #1668b3;
    border-color: #1668b3;
    color: white;
}

:deep(.import-route-dialog .el-button--danger.is-link) {
    color: #f56c6c; /* 危险链接颜色 */
}
:deep(.import-route-dialog .el-button--danger.is-link:hover) {
    color: #f89898;
}
</style>
