<template>
  <div>
    <el-dialog
      :model-value="props.visible"
      @update:model-value="emit('update:visible', $event)"
      title="打包下载"
      width="60%"
      :before-close="handleClose"
      class="package-download-dialog"
      top="10vh"
      :append-to-body="false">
      <!-- 对话框内容区域 -->
      <div class="dialog-content">
        <!-- Tab页切换 -->
        <el-tabs v-model="activeTab" class="package-tabs">
          <!-- 成果列表选择Tab -->
          <el-tab-pane label="选择文件" name="select">
            <div class="tab-content">
              <!-- 面包屑导航 -->
              <div v-if="breadcrumbPath.length > 0" class="breadcrumb-wrapper">
                <div class="breadcrumb-scroll">
                  <el-breadcrumb separator="/">
                    <el-breadcrumb-item @click="navigateToFolder(null)">
                      <a href="javascript:void(0)">根目录</a>
                    </el-breadcrumb-item>
                    <el-breadcrumb-item
                      v-for="(folder, index) in breadcrumbPath"
                      :key="folder.id"
                      @click="navigateToFolder(folder.id, index)">
                      <a href="javascript:void(0)">{{ folder.name }}</a>
                    </el-breadcrumb-item>
                  </el-breadcrumb>
                </div>
              </div>

              <!-- 搜索条件 -->
              <div class="search-conditions-wrapper">
                <el-input
                  v-model="searchForm.name"
                  placeholder="按文件名称搜索"
                  clearable
                  @keyup.enter="handleSearch"
                  class="search-input">
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-date-picker
                  v-model="searchForm.createTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="开始时间"
                  clearable
                  class="search-date-picker" />
                <el-date-picker
                  v-model="searchForm.updateTimeEnd"
                  type="datetime"
                  clearable
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="结束时间"
                  class="search-date-picker" />
                <el-select
                  clearable
                  popper-class="black-select"
                  :teleported="false"
                  class="black-select"
                  v-model="searchForm.fileType"
                  placeholder="选择文件类型"
                  placement="bottom"
                  :popper-options="{ strategy: 'fixed' }">
                  <el-option
                    v-for="el in fileTypeList"
                    :key="el.value"
                    :label="el.label"
                    :value="el.value" />
                </el-select>
                <el-select
                  clearable
                  filterable
                  :remote-method="initPayloadSnList"
                  :loading="loading"
                  reserve-keyword
                  popper-class="black-select"
                  class="black-select"
                  :teleported="false"
                  v-model="searchForm.payloadSn"
                  placeholder="负载类型"
                  placement="bottom"
                  :popper-options="{ strategy: 'fixed' }">
                  <el-option
                    v-for="el in payloadSnList"
                    :key="el.deviceType"
                    :label="el.deviceName"
                    :value="el.id" />
                </el-select>
                <el-button type="primary" @click="handleSearch">
                  搜索
                </el-button>
                <el-button @click="handleReset">
                  重置
                </el-button>
              </div>

              <!-- 文件列表表格 -->
              <div class="table-container">
                <el-table
                  :data="filteredMediaList"
                  height="100%"
                  v-loading="mediaLoading"
                  :row-class-name="tableRowClassName"
                  :header-row-class-name="tableHeaderRowClassName"
                  @selection-change="handleSelectionChange">
                  <el-table-column type="selection" width="55" />
                  <el-table-column
                    prop="name"
                    label="文件名称"
                    show-overflow-tooltip
                    min-width="200">
                    <template #default="scope">
                      <div
                        class="file-name-cell"
                        @click="handleFileClick(scope.row)"
                        :class="{ 'folder-item': scope.row.fileType === 'folder' }">
                        <el-icon v-if="scope.row.fileType === 'folder'" class="folder-icon">
                          <Folder />
                        </el-icon>
                        {{ scope.row.name }}
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column prop="fileType" label="文件类型" width="120">
                    <template #default="scope">
                      <el-tag :type="getFileTypeTag(scope.row.fileType)">
                        {{ getFileTypeLabel(scope.row.fileType) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="drone"
                    label="拍摄负载"
                    width="150" />
                  <el-table-column
                    prop="createTime"
                    label="创建时间"
                    width="180" />
                  <el-table-column prop="fileSize" label="文件大小" width="120">
                    <template #default="scope">
                      {{ formatFileSize(scope.row.fileSize) }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 选择统计和分页 -->
              <div class="selection-info">
                <span>已选择 {{ selectedFiles.length }} 个文件</span>
                <el-pagination
                  v-model:current-page="mediaPageOptions.page"
                  v-model:page-size="mediaPageOptions.size"
                  :background="false"
                  :pager-count="4"
                  size="small"
                  layout="total, sizes, prev, pager, next"
                  :total="mediaPageOptions.total"
                  :page-sizes="[10, 20, 50, 100]"
                  class="white-el-pagination"
                  @size-change="handleMediaSizeChange"
                  @current-change="handleMediaPageChange" />
                <el-button
                  type="primary"
                  :disabled="selectedFiles.length === 0"
                  @click="handlePackage"
                  :loading="packaging">
                  开始打包
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- 压缩包下载Tab -->
          <el-tab-pane label="下载列表" name="download">
            <div class="tab-content">
              <!-- 压缩包搜索条件 -->
              <div class="search-conditions-wrapper">
                <el-date-picker
                  v-model="packageSearchForm.createTimeStart"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="开始时间"
                  clearable
                  class="search-date-picker" />
                <el-date-picker
                  v-model="packageSearchForm.createTimeEnd"
                  type="datetime"
                  clearable
                  value-format="YYYY-MM-DD HH:mm:ss"
                  placeholder="结束时间"
                  class="search-date-picker" />
                <el-button type="primary" @click="handlePackageSearch">
                  搜索
                </el-button>
                <el-button @click="handlePackageReset">
                  重置
                </el-button>
              </div>

              <!-- 压缩包列表表格 -->
              <div class="table-container">
                <el-table
                  :data="packageList"
                  height="400px"
                  style="width: 100%"
                  v-loading="packageLoading"
                  :row-class-name="tableRowClassName"
                  :header-row-class-name="tableHeaderRowClassName">
                  <el-table-column
                    prop="taskName"
                    label="压缩包名称"
                    show-overflow-tooltip
                    min-width="200" />
                  <el-table-column
                    prop="fileCount"
                    label="文件数量"
                    width="100" />
                  <el-table-column prop="totalBytes" label="总大小" width="120">
                    <template #default="scope">
                      {{ formatFileSize(scope.row.totalBytes) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="createTime"
                    label="创建时间"
                    width="180" />
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="scope">
                      <el-tag
                        :type="
                          scope.row.status === 'success' ? 'success' : 'warning'
                        ">
                        {{ scope.row.status === "success" ? "已完成" : "打包中" }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="250" align="center">
                    <template #default="scope">
                      <el-button
                        type="primary"
                        link
                        size="small"
                        :disabled="scope.row.status !== 'success'"
                        @click="handleDownloadPackage(scope.row)">
                        下载
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 压缩包列表分页 -->
              <div class="pagination-wrapper">
                <el-pagination
                  v-model:current-page="packagePageOptions.page"
                  v-model:page-size="packagePageOptions.size"
                  :background="false"
                  :pager-count="4"
                  size="small"
                  layout="total, sizes, prev, pager, next"
                  :total="packagePageOptions.total"
                  :page-sizes="[10, 20, 50, 100]"
                  class="white-el-pagination"
                  @size-change="handlePackageSizeChange"
                  @current-change="handlePackagePageChange" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  ElDialog,
  ElButton,
  ElIcon,
  ElTable,
  ElTableColumn,
  ElTabs,
  ElTabPane,
  ElInput,
  ElSelect,
  ElOption,
  ElTag,
  ElDatePicker,
} from "element-plus";
import { Search, Folder } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import {
  $createMediaPackage,
  $getPackageList
} from "@/api/flyControl/file.ts";
import { getDeviceDictionary, fetchMediaList } from "@/transform/file.ts";

// 媒体项类型定义
interface MediaItem {
  id: string;
  name: string;
  fileType: string;
  payload: string;
  createTime: string;
  fileSize?: number;
}

// 压缩包项类型定义
interface PackageItem {
  id: string;
  packageName: string;
  fileCount: number;
  totalSize: number;
  createTime: string;
  status: "ready" | "processing";
}

// 定义组件接收的 props
const props = defineProps<{
  visible: boolean;
}>();

// 定义组件可以触发的事件
const emit = defineEmits(["update:visible", "close"]);

// 当前激活的tab页
const activeTab = ref("select");

// 搜索相关
const searchForm = ref({
  name: "",
  createTime: "",
  updateTimeEnd: "",
  fileType: "",
  payloadSn: "",
  parentId: null as string | null,
});

// 压缩包搜索相关
const packageSearchForm = ref({
  createTimeStart: "",
  createTimeEnd: "",
});

// 文件类型列表
const fileTypeList = [
  { label: "全部", value: "" },
  { label: "图片", value: "PHOTO" },
  { label: "视频", value: "VIDEO" },
  { label: "影像图片", value: "MAPIMAGE" },
  { label: "文件夹", value: "folder" },
];

// 负载类型定义
interface PayloadType {
  id: string;
  deviceType: string;
  deviceName: string;
}

// 负载类型列表
const payloadSnList = ref<PayloadType[]>([]);
const loading = ref(false);

// 文件选择相关
const selectedFiles = ref<any[]>([]);
const packaging = ref(false);

// 媒体文件列表
const mediaList = ref<MediaItem[]>([]);
const mediaLoading = ref(false);

// 压缩包列表
const packageList = ref<PackageItem[]>([]);
const packageLoading = ref(false);

// 面包屑路径和当前文件夹
const breadcrumbPath = ref<{ id: string; name: string }[]>([]);
const currentFolderId = ref<string | null>(null);

// 分页相关
const mediaPageOptions = ref({
  page: 1,
  size: 10,
  total: 0,
});

const packagePageOptions = ref({
  page: 1,
  size: 10,
  total: 0,
});

// 初始化媒体文件列表
const initMediaList = async (parentId: string | null = null) => {
  try {
    mediaLoading.value = true;

    const params = {
      ...searchForm.value,
      pageNum: mediaPageOptions.value.page,
      pageSize: mediaPageOptions.value.size,
      parentId: parentId || currentFolderId.value || "0", // 使用传入的parentId或当前文件夹ID
    };

    const { records, total, success } = await fetchMediaList(params, false);

    if (success) {
      mediaList.value = records;
      mediaPageOptions.value.total = total;
    } else {
      mediaList.value = [];
      mediaPageOptions.value.total = 0;
    }
  } catch (error) {
    console.error("获取媒体列表失败:", error);
    ElMessage.error("获取媒体列表失败");
  } finally {
    mediaLoading.value = false;
  }
};

// 初始化负载类型列表
const initPayloadSnList = async (query: string | null = null) => {
  try {
    loading.value = true;
    const params: any = {"pageNum": 1, "pageSize": 10, domain: 1};
    if (query) {
      params.deviceName = query;
    }
    const { records } = await getDeviceDictionary(params);

    loading.value = false;

    if (records) {
      payloadSnList.value = records;
    } else {
      payloadSnList.value = [];
    }
  } catch (error) {
    loading.value = false;
    ElMessage.error("获取负载类型列表失败");
  }
};

// 初始化压缩包列表
const initPackageList = async () => {
  try {
    packageLoading.value = true;

    const params = {
      pageNum: packagePageOptions.value.page,
      pageSize: packagePageOptions.value.size,
      createTimeStart: packageSearchForm.value.createTimeStart,
      createTimeEnd: packageSearchForm.value.createTimeEnd,
    };

    const response = await $getPackageList(params);
    if (response.rows) {
      packageList.value = response.rows;
      packagePageOptions.value.total = response.total || 0;
    }
  } catch (error) {
    console.error("获取压缩包列表失败:", error);
    ElMessage.error("获取压缩包列表失败");
  } finally {
    packageLoading.value = false;
  }
};

// 过滤后的媒体列表（现在直接使用从接口获取的数据）
const filteredMediaList = computed(() => {
  return mediaList.value;
});

// 处理搜索
const handleSearch = () => {
  // 重置分页到第一页
  mediaPageOptions.value.page = 1;
  // 重新获取媒体列表
  initMediaList();
};

// 处理重置
const handleReset = () => {
  searchForm.value = {
    name: "",
    createTime: "",
    updateTimeEnd: "",
    fileType: "",
    payloadSn: "",
    parentId: currentFolderId.value,
  };
  // 重置分页到第一页
  mediaPageOptions.value.page = 1;
  // 重新获取媒体列表
  initMediaList();
};

// 处理压缩包搜索
const handlePackageSearch = () => {
  // 重置分页到第一页
  packagePageOptions.value.page = 1;
  // 重新获取压缩包列表
  initPackageList();
};

// 处理压缩包重置
const handlePackageReset = () => {
  packageSearchForm.value = {
    createTimeStart: "",
    createTimeEnd: "",
  };
  // 重置分页到第一页
  packagePageOptions.value.page = 1;
  // 重新获取压缩包列表
  initPackageList();
};

// 处理文件点击事件
const handleFileClick = (file: any) => {
  if (file.fileType === 'folder') {
    // 如果是文件夹，进入文件夹
    enterFolder(file);
  }
};

// 进入文件夹
const enterFolder = (folder: any) => {
  currentFolderId.value = folder.id;

  // 添加到面包屑路径
  breadcrumbPath.value.push({
    id: folder.id,
    name: folder.name,
  });

  // 重置分页到第一页
  mediaPageOptions.value.page = 1;

  // 重新加载媒体列表
  initMediaList(folder.id);
};

// 导航到指定文件夹
const navigateToFolder = (parentId: string | null, breadcrumbIndex?: number) => {
  if (parentId === null) {
    // 返回根目录
    currentFolderId.value = null;
    breadcrumbPath.value = [];
  } else {
    // 返回到指定的面包屑层级
    if (breadcrumbIndex !== undefined) {
      breadcrumbPath.value = breadcrumbPath.value.slice(0, breadcrumbIndex + 1);
      currentFolderId.value = parentId;
    }
  }

  // 重置分页到第一页
  mediaPageOptions.value.page = 1;

  // 重新加载媒体列表
  initMediaList(currentFolderId.value);
};

// 处理文件选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedFiles.value = selection;
};

// 获取文件类型标签
const getFileTypeTag = (fileType: string) => {
  switch (fileType) {
    case "PHOTO":
      return "success";
    case "VIDEO":
      return "warning";
    case "MAPIMAGE":
      return "info";
    default:
      return "";
  }
};

// 获取文件类型标签文本
const getFileTypeLabel = (fileType: string) => {
  switch (fileType) {
    case "PHOTO":
      return "图片";
    case "VIDEO":
      return "视频";
    case "MAPIMAGE":
      return "影像图片";
    case "folder":
      return "文件夹";
    default:
      return fileType;
  }
};

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (!size) return "0 B";

  const units = ["KB", "MB", "GB"];
  let index = 0;
  let fileSize = size;

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }

  return `${fileSize.toFixed(2)} ${units[index]}`;
};

// 处理打包
const handlePackage = async () => {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning("请选择要打包的文件");
    return;
  }

  try {
    packaging.value = true;

    // 调用真实打包接口
    const response = await $createMediaPackage({
      fileIds: selectedFiles.value.filter(file => file.fileType !== 'folder').map((file) => file.fileId),
      folderIds: selectedFiles.value.filter(file => file.fileType === 'folder').map((file) => file.id),
    });

    if (response?.code === 200) {
      // 重新获取压缩包列表
      await initPackageList();

      // 切换到下载tab页
      activeTab.value = "download";

      ElMessage.success("打包完成");
    } else {
      ElMessage.error(response?.msg || "打包失败");
    }
  } catch (error) {
    ElMessage.error("打包失败");
  } finally {
    packaging.value = false;
  }
};

// 处理下载压缩包
const handleDownloadPackage = async (packageItem: any) => {
  try {
    // 检查是否有下载地址
    if (!packageItem.resultObjectKey) {
      ElMessage.error("下载地址不存在");
      return;
    }

    // 直接使用文件地址触发下载
    const link = document.createElement("a");
    link.href = packageItem.resultObjectKey;
    link.download = packageItem.taskName || `package_${packageItem.id}.zip`;
    link.style.display = "none";

    // 添加到页面并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success("开始下载");
  } catch (error) {
    console.error("下载失败:", error);
    ElMessage.error("下载失败");
  }
};

// 处理媒体列表分页变化
const handleMediaPageChange = (page: number) => {
  mediaPageOptions.value.page = page;
  initMediaList();
};

// 处理媒体列表分页大小变化
const handleMediaSizeChange = (size: number) => {
  mediaPageOptions.value.size = size;
  mediaPageOptions.value.page = 1;
  initMediaList();
};

// 处理压缩包列表分页变化
const handlePackagePageChange = (page: number) => {
  packagePageOptions.value.page = page;
  initPackageList();
};

// 处理压缩包列表分页大小变化
const handlePackageSizeChange = (size: number) => {
  packagePageOptions.value.size = size;
  packagePageOptions.value.page = 1;
  initPackageList();
};

// 表格行类名
const tableRowClassName = () => {
  return 'dark-table-row';
};

// 表格头部行类名
const tableHeaderRowClassName = () => {
  return 'dark-table-header-row';
};

// 监听对话框显示状态，当显示时初始化数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 对话框打开时初始化数据
      initMediaList();
      initPackageList();
      initPayloadSnList();
    }
  },
);

// 组件挂载时初始化压缩包列表
onMounted(() => {
  if (props.visible) {
    initMediaList();
    initPackageList();
    initPayloadSnList();
  }
});

// 处理对话框关闭
const handleClose = () => {
  // 重置状态
  searchForm.value = {
    name: "",
    createTime: "",
    updateTimeEnd: "",
    fileType: "",
    payloadSn: "",
    parentId: null,
  };

  // 重置压缩包搜索状态
  packageSearchForm.value = {
    createTimeStart: "",
    createTimeEnd: "",
  };

  selectedFiles.value = [];
  activeTab.value = "select";

  // 重置文件夹导航状态
  currentFolderId.value = null;
  breadcrumbPath.value = [];

  emit("close");
  emit("update:visible", false);
};

// 监听对话框显示状态，重置选择
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      selectedFiles.value = [];
      activeTab.value = "select";
    }
  },
);
</script>

<style lang="less" scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.package-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.el-tab-pane {
  height: 100%;
}

.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 15px;
}

.search-conditions-wrapper {
  width: 100%;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap:10px;
}


.table-container {
  flex: 1;
  background-color: rgba(51, 51, 51, 0.6);
  border-radius: 8px;
  overflow: hidden;
}

.selection-info {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  color: #ccc;
}

/* 面包屑样式 */
.breadcrumb-wrapper {
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.15);
  margin-bottom: 10px;
  border-radius: 4px;
}

/* 横向滚动容器 */
.breadcrumb-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

/* 自定义滚动条样式 */
.breadcrumb-scroll::-webkit-scrollbar {
  height: 4px;
}

.breadcrumb-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.breadcrumb-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

/* 确保面包屑在一行显示 */
.breadcrumb-wrapper :deep(.el-breadcrumb) {
  display: inline-flex;
  white-space: nowrap;
}

.breadcrumb-wrapper :deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.breadcrumb-wrapper :deep(.el-breadcrumb) {
  .el-breadcrumb__item {
    .el-breadcrumb__inner {
      color: #ccc;
      &:hover {
        color: #2d8cf0;
      }
      &.is-link {
        color: #2d8cf0;
      }
    }
  }
}

.breadcrumb-wrapper a {
  color: #ccc !important;
  text-decoration: none;
  &:hover {
    color: #2d8cf0;
  }
}

/* 文件名称单元格样式 */
.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;

  &.folder-item {
    color: #f39c12;
    font-weight: 500;

    &:hover {
      color: #e67e22;
    }
  }
}

.folder-icon {
  font-size: 16px;
  color: #f39c12;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Element Plus Table 深色主题样式 */
:deep(.el-table) {
  background-color: transparent !important;
  color: #ccc !important;
}

:deep(.el-table th.el-table__cell) {
  background-color: #444 !important;
  color: white !important;
  border-bottom: 1px solid #555 !important;
}

:deep(.el-table td.el-table__cell, .el-table th.el-table__cell) {
  border-bottom: 1px dashed #555 !important;
}

:deep(.el-table--border .el-table__cell) {
  border-right: 1px solid #555 !important;
}

:deep(.el-table::before) {
  background-color: #555 !important;
}

:deep(.el-table__empty-block) {
  background-color: transparent !important;
  color: #ccc !important;
}

:deep(.el-table__empty-text) {
  line-height: normal;
}

:deep(.el-table .el-table__inner-wrapper:before) {
  background-color: transparent !important;
}

/* 自定义表格行样式 - 使用更强的选择器 */
:deep(.el-table .dark-table-row) {
  background-color: transparent !important;
}

:deep(.el-table .dark-table-row:hover) {
  background-color: #555 !important;
}

:deep(.el-table .dark-table-header-row) {
  background-color: #444 !important;
}

/* 强制覆盖Element Plus默认悬停样式 - 使用最高优先级 */
:deep(.package-download-dialog .el-table tbody tr:hover > td.el-table__cell) {
  background-color: #555 !important;
}

:deep(.package-download-dialog .el-table tbody tr:hover) {
  background-color: #555 !important;
}

/* 额外确保悬停效果 */
:deep(.package-download-dialog .el-table .el-table__row:hover) {
  background-color: #555 !important;
}

:deep(.package-download-dialog .el-table .el-table__row:hover td) {
  background-color: #555 !important;
}

/* 确保选中状态也使用深色主题 */
:deep(.package-download-dialog .el-table tbody tr.current-row > td.el-table__cell) {
  background-color: rgba(45, 140, 240, 0.2) !important;
}

:deep(.package-download-dialog .el-table tbody tr.current-row:hover > td.el-table__cell) {
  background-color: rgba(45, 140, 240, 0.3) !important;
}

/* 表格loading背景深色主题 */
:deep(.el-loading-mask) {
  background-color: rgba(51, 51, 51, 0.8) !important;
}

:deep(.el-loading-spinner) {
  color: #ccc !important;
}

:deep(.el-loading-spinner .el-loading-text) {
  color: #ccc !important;
}


/* Element Plus Tabs 深色主题样式 */
:deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  background-color: #444;
  border-bottom: 1px solid #555;
  margin-bottom: 0;
}

:deep(.el-tabs__nav-wrap) {
  background-color: #444;
}

:deep(.el-tabs__item) {
  color: #ccc !important;
  background-color: transparent;
  padding: 10px !important;
}

:deep(.el-tabs__item.is-active) {
  color: #2d8cf0 !important;
  background-color: #333;
}

:deep(.el-tabs__item:hover) {
  color: #2d8cf0 !important;
}

:deep(.el-tabs__content) {
  flex: 1;
  padding: 10px 0;
}

:deep(.el-button) {
  background-color: #444;
  color: #fff;
  border: none;
  margin-left: 0 !important;
}

:deep(.el-button:hover) {
  background-color: #555;
  border: none;
  color: #fff;
}

:deep(.el-button:active) {
  background-color: #333;
  border-color: #444;
  color: #fff;
}

:deep(.el-button--primary) {
  background-color: #2d8cf0;
  border-color: #2d8cf0;
  color: white;
}

:deep(.el-button--primary:hover) {
  background-color: #1a7cdb;
  border-color: #1a7cdb;
  color: white;
}

:deep(.el-button--primary:active) {
  background-color: #1668b3;
  border-color: #1668b3;
  color: white;
}

:deep(.el-button--primary.is-link) {
  color: #2d8cf0;
}

:deep(.el-button--primary.is-link:hover) {
  color: #1a7cdb;
}

/* Dialog 深色主题样式 */
:deep(.package-download-dialog.el-dialog) {
  background-color: rgba(23, 44, 44, 0.9) !important;
  color: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 80vh;
}

:deep(.package-download-dialog.el-dialog .el-dialog__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #444;
  margin-right: 0;
}

:deep(.package-download-dialog.el-dialog .el-dialog__title) {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

:deep(.package-download-dialog.el-dialog .el-dialog__headerbtn) {
  top: 15px;
  right: 20px;
}


:deep(.package-download-dialog.el-dialog .el-dialog__body) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.package-download-dialog.el-dialog .el-dialog__footer) {
  padding: 15px 20px;
  border-top: 1px solid #444;
}
</style>
