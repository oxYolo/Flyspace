<template>
  <div
    class="task-library-panel"
    v-loading="loading"
    element-loading-text="加载中...">
    <!-- 将头部和成果列表包裹在新的容器中 -->
    <div class="main-content-area">
      <!-- 顶部标题和操作区 -->
      <div class="panel-header">
        <div class="header-title">成果库（{{ pageOptions.total }}）</div>
        <div class="header-actions">
          <!-- 创建新任务按钮 -->
          <el-icon
            v-tooltip="'打包下载'"
            :size="20"
            class="action-icon"
            @click="handlePackageDownload">
            <Download />
          </el-icon>
        </div>
      </div>

      <!-- 项目空间使用情况 -->
      <div class="space-usage-section">
        <div
          v-for="item in spaceUsageStats"
          :key="item.name"
          class="usage-item">
          <div
            class="usage-icon-wrapper"
            :style="{ backgroundColor: item.color }">
            <el-icon class="usage-icon"><component :is="item.icon" /></el-icon>
          </div>
          <div class="usage-details">
            <div class="usage-name">{{ item.name }}</div>
            <div class="usage-count">{{ item.count }} 文件</div>
          </div>
          <div class="usage-size">{{ item.size }}</div>
        </div>
      </div>

      <!-- 条件搜索区（仅 L1 根目录支持搜索） -->
      <div v-if="viewLevel === 'root'" class="search-conditions-wrapper">
        <div class="search-conditions-header">
          <el-input
            class="header-search-input"
            v-model="searchForm.name"
            placeholder="按文件名称搜索"
            clearable
            @keyup.enter="handleSearch" />
          <div class="expand-btn">
            <div
              class="toggle"
              @click="isSearchConditionsVisible = !isSearchConditionsVisible">
              <span>
                {{ !isSearchConditionsVisible ? "收起" : "展开" }}搜索
              </span>
              <el-icon
                class="toggle-icon"
                :class="{ rotated: !isSearchConditionsVisible }">
                <ArrowDown />
              </el-icon>
            </div>
          </div>
        </div>
        <div v-if="!isSearchConditionsVisible" class="advanced-search-fields">
          <el-date-picker
            v-model="searchForm.createTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="开始时间"
            clearable
            @change="handleSearch"></el-date-picker>
          <el-date-picker
            v-model="searchForm.updateTimeEnd"
            type="datetime"
            clearable
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="结束时间"
            @change="handleSearch"></el-date-picker>
          <!-- <el-select
            clearable
            popper-class="black-select"
            :teleported="false"
            class="black-select"
            v-model="searchForm.fileType"
            placeholder="选择文件类型"
            @change="handleSearch">
            <el-option
              v-for="el in fileTypeList"
              :key="el.value"
              :label="el.label"
              :value="el.value" />
          </el-select> -->
        </div>
      </div>
      <!-- 面包屑导航 -->
      <div v-if="breadcrumbPath.length > 0" class="breadcrumb-wrapper">
        <div class="breadcrumb-scroll">
          <el-breadcrumb :separator-icon="ArrowRight">
            <el-breadcrumb-item @click="navigateToFolder(null)">
              <a href="javascript:void(0)">根目录</a>
            </el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="folder in breadcrumbPath"
              :key="folder.id"
              @click="navigateToFolder(folder)">
              <a href="javascript:void(0)">{{ folder.name }}</a>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>

      <!-- 成果列表区 -->
      <div class="task-list">
        <!-- 通过 v-for 渲染成果卡片 -->
        <div
          v-for="task in tasks"
          :key="task.id"
          :data-media-id="task.id"
          class="task-card"
          :class="{ active: selectedRouteId === task.id }"
          @click="handleTaskClick(task)">
          <div
            v-if="task.fileType === 'PHOTO' || task.fileType === 'VIDEO'"
            class="card-image">
            <el-image class="el-image-file" :src="getMediaThumbnail(task)">
              <template #error>
                <div class="image-slot">
                  <el-icon color="#000"><icon-picture /></el-icon>
                  <div>暂无图片</div>
                </div>
              </template>
            </el-image>
          </div>
          <div v-else-if="task.fileType === 'folder'" class="card-folder">
            <el-icon class="card-model folder-icon">
              <component :is="getFolderIcon(task)" />
            </el-icon>
          </div>
          <div v-else class="card-folder">
            <el-icon class="card-model"><Files /></el-icon>
          </div>
          <div class="card-list">
            <div
              v-tooltip="task.name"
              class="card-title"
              :class="{ finalTitle: task.fileType !== 'folder' }">
              {{ task.name ||task.fileName}}
            </div>
            <div class="card-meta">拍摄负载 {{ task.drone || "-" }}</div>
            <div class="card-meta">文件类型 {{ task.isVirtual ? "分类" : task.fileType }}</div>
            <div class="card-meta">创建时间 {{ task.createTime || "-" }}</div>
          </div>
          <div v-if="task.fileType !== 'folder'" class="card-actions-bar">
            <el-popconfirm
              width="240"
              :title="`确定要删除「${task.name}」吗？此操作不可恢复。`"
              confirm-button-text="确定删除"
              cancel-button-text="取消"
              :disabled="deletingMediaId === task.id"
              @confirm="() => handleDelete(task)">
              <template #reference>
                <el-icon
                  v-tooltip="'删除'"
                  class="action-icon deleteIcon"
                  @click.stop>
                  <Delete />
                </el-icon>
              </template>
            </el-popconfirm>
            <el-dropdown
              trigger="click"
              popper-class="route-card-dropdown-popper"
              :teleported="false">
              <el-icon class="action-icon">
                <MoreFilled />
              </el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="action in actions"
                    :key="action.command"
                    @click="action?.action(task)">
                    {{ action.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <!-- 如果没有成果，可以显示一个提示 -->
        <div v-if="tasks.length === 0" class="no-tasks-message">
          暂无成果数据。
        </div>
      </div>

      <div v-if="viewLevel !== 'category'" class="actions">
        <el-pagination
          v-model:current-page="pageOptions.page"
          v-model:page-size="pageOptions.size"
          :background="false"
          :pager-count="4"
          size="small"
          layout="prev, pager, next,total"
          :total="pageOptions.total"
          class="white-el-pagination"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange" />
      </div>
    </div>

    <!-- 打包下载对话框 -->
    <PackageDownloadDialog
      v-model:visible="packageDownloadVisible"
      @close="handlePackageDownloadClose" />
  </div>
  <!-- 媒体详情面板 -->
  <MediaDetailPanel />
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  nextTick,
  watch,
} from "vue";
import {
  ArrowDown,
  Download,
  Delete,
  Files,
  Folder,
  MoreFilled,
  Picture as IconPicture,
  VideoCamera,
  ArrowRight,
} from "@element-plus/icons-vue";
import {
  deleteMedia,
  exportMedia,
  fetchMediaList,
  fetchMediaByTask,
  getAllMediaSize,
} from "@/transform/file";
import { ElMessage, dayjs } from "element-plus";

import {
  clearMediaFromMap,
  locateToMedia,
  // @ts-ignore
} from "@/services/mediaService_readable.js";
import emitter from "@/stores/mitt";
import type { PageOptions } from "@/model/commonModel.ts";
import PackageDownloadDialog from "./components/PackageDownloadDialog.vue";
import MediaDetailPanel from "./components/MediaDetailPanel.vue";
import videoThumb from "./assets/images/video_thumb.jpg";
// TODO: 此处应从API获取数据
const spaceUsageStats = ref([
  {
    icon: IconPicture,
    name: "照片",
    type: "PHOTO",
    count: 0,
    size: "0 M",
    color: "rgba(130, 106, 249, 0.7)",
  },
  {
    icon: VideoCamera,
    name: "视频",
    type: "VIDEO",
    count: 0,
    size: "0 M",
    color: "rgba(251, 192, 45, 0.7)",
  },
  
]);

// 定义搜索条件
const searchForm = ref({
  name: "",
  createTime: "",
  updateTimeEnd: "",
  fileType: "",
  parentId: null as string | null,
});

// 文件类型列表
const fileTypeList = [
  { label: "全部", value: "" },
  { label: "图片", value: "PHOTO" },
  { label: "视频", value: "VIDEO" },
  { label: "影像图片", value: "MAPIMAGE" },
  { label: "文件夹", value: "folder" },
];

// 媒体项定义
interface MediaItem {
  id: string;
  fileType: string;
  filePath: string;
  name: string;
  scalePath: string;
  payload: string;
  createTime: string;
  latitude: number;
  longitude: number;
}

const getMediaThumbnail = (media: MediaItem) => {
  if (media.fileType === "VIDEO") return videoThumb;
  return media.scalePath || media.filePath;
};

// 层级定义：root 任务文件夹列表 / category 照片+视频虚拟分类 / files 具体文件
type ViewLevel = "root" | "category" | "files";

// 面包屑路径项定义
interface BreadcrumbItem {
  id: string;
  name: string;
  level: ViewLevel;
  category?: "PHOTO" | "VIDEO";
}

const loading = ref(false);
const pageOptions = ref<PageOptions>({
  page: 1,
  size: 10,
  total: 0,
});
const deletingMediaId = ref<string | null>(null);

const tasks = ref<any[]>([]);

// 面包屑路径和当前层级状态
const breadcrumbPath = ref<BreadcrumbItem[]>([]);
const viewLevel = ref<ViewLevel>("root");
const currentTaskId = ref<string | null>(null); // L3 调接口用（取自 folder.taskId）
const currentTaskName = ref<string>("");
const currentCategory = ref<"PHOTO" | "VIDEO" | null>(null); // L3 文件类型

const breadcrumbPrefixName = computed(() => {
  return String(breadcrumbPath.value?.[0]?.name || "").trim();
});

watch(
  () => breadcrumbPrefixName.value,
  (name) => {
    emitter.emit("updateMediaBreadcrumbPrefix", name);
  },
  { immediate: true },
);

// 打包下载对话框显示状态
const packageDownloadVisible = ref(false);

// 定义航线卡片操作的下拉菜单项
const actions = computed(() => {
  return [
    {
      command: "download",
      label: "下载",
      action: (task: any) => handleDownload(task),
    },
    {
      command: "locate",
      label: "定位",
      action: (task: any) => handleLocate(task),
    },
  ];
});

// 初始化函数
onMounted(() => {
  // 初始化媒体服务
  loadRoot();
  initMediaSize();

  // 监听请求媒体列表事件
  emitter.on("requestMediaList", () => {
    // 筛选能预览的媒体
    const canViewList = tasks.value.filter(
      (e) => !["OTHER", "folder"].includes(e.fileType),
    );
    // 发送当前媒体列表给详情面板
    emitter.emit("receiveMediaList", canViewList);
  });

  // 监听照片弹框的媒体选择变化事件
  emitter.on("updateSelectedMedia", (mediaId: any) => {
    selectedRouteId.value = mediaId;

    // 自动滚动到选中的卡片
    nextTick(() => {
      const cardElement = document.querySelector(
        `.task-card[data-media-id="${mediaId}"]`,
      );
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
});

// 修改onUnmounted钩子，移除事件监听
onUnmounted(() => {
  // 移除事件监听器
  if (emitter && typeof emitter.off === "function") {
    emitter.off("requestMediaList");
    emitter.off("updateSelectedMedia");
  }
});

// L1 根目录：调 allPage 获取任务文件夹列表
const loadRoot = async () => {
  loading.value = true;
  try {
    const params = {
      ...searchForm.value,
      parentId: "0",
      pageNum: pageOptions.value.page,
      pageSize: pageOptions.value.size,
    };
    const { records, total, success } = await fetchMediaList(params, true);
    if (success) {
      tasks.value = records.map((e: any) => ({
        ...e,
        createTime: e.createTime
          ? dayjs(e.createTime).format("YYYY-MM-DD HH:mm:ss")
          : "",
        name: formatNodeName(e.name || ""),
      }));
      pageOptions.value.total = total;
    } else {
      tasks.value = [];
      pageOptions.value.total = 0;
    }
    return { success, records };
  } catch (error) {
    ElMessage.error("获取媒体列表失败");
    tasks.value = [];
    return { success: false, records: [] };
  } finally {
    loading.value = false;
  }
};

// L2 分类层：构造照片/视频两个虚拟文件夹（不调接口、不分页）
const loadCategory = () => {
  const taskId = currentTaskId.value || "";
  tasks.value = [
    {
      id: `${taskId}__PHOTO`,
      fileType: "folder",
      name: "照片文件夹",
      isVirtual: true,
      category: "PHOTO",
      drone: "",
      createTime: "",
    },
    {
      id: `${taskId}__VIDEO`,
      fileType: "folder",
      name: "视频文件夹",
      isVirtual: true,
      category: "VIDEO",
      drone: "",
      createTime: "",
    },
  ];
  pageOptions.value.total = 2;
  loading.value = false;
};

// L3 文件层：按 taskId + fileType 调新接口获取照片/视频
const loadFiles = async () => {
  if (!currentTaskId.value || !currentCategory.value) {
    tasks.value = [];
    pageOptions.value.total = 0;
    return;
  }
  loading.value = true;
  try {
    const params = {
      fileType: currentCategory.value,
      pageNum: pageOptions.value.page,
      pageSize: pageOptions.value.size,
    };
    const { records, total, success } = await fetchMediaByTask(
      currentTaskId.value,
      params,
      true,
    );
    if (success) {
      tasks.value = records.map((e: any) => ({
        ...e,
        createTime: e.createTime
          ? dayjs(e.createTime).format("YYYY-MM-DD HH:mm:ss")
          : "",
        name: e.name || "",
      }));
      pageOptions.value.total = total;
    } else {
      tasks.value = [];
      pageOptions.value.total = 0;
    }
  } catch (error) {
    ElMessage.error("获取文件列表失败");
    tasks.value = [];
  } finally {
    loading.value = false;
  }
};

// 按当前层级统一刷新
const reload = () => {
  if (viewLevel.value === "root") return loadRoot();
  if (viewLevel.value === "files") return loadFiles();
  return Promise.resolve();
};

// 格式化目录树名称
const formatNodeName = (name: string | null | undefined): string => {
  if (!name) return "";

  const isTimeFormat = /^\d{4}-\d{2}-\d{2}T/.test(name);
  if (isTimeFormat) {
    const dayObj = dayjs(name);
    // isValid() 是 dayjs 自带的方法，用来判断传入的字符串是否能转化为合法时间
    if (dayObj.isValid()) {
      return dayObj.format("YYYY-MM-DD HH:mm:ss");
    }
  }

  return name;
};

// 当前选中的成果ID
const selectedRouteId = ref<string | null>(null);

// 选择媒体项并定位到地图上
const selectRoute = (task: MediaItem) => {
  selectedRouteId.value = task.id;

  // 发送事件到MediaDetailPanel
  if (task.fileType !== "OTHER") {
    emitter.emit("openMediaDetail", task);
  }
  // 如果媒体项有经纬度信息，则定位到该位置
  if (task && task.latitude && task.longitude) {
    handleLocate(task);
  }
};

// 虚拟分类文件夹图标
const getFolderIcon = (task: any) => {
  if (task?.isVirtual && task.category === "PHOTO") return IconPicture;
  if (task?.isVirtual && task.category === "VIDEO") return VideoCamera;
  return Folder;
};

// 处理任务点击事件
const handleTaskClick = (task: any) => {
  if (task.isVirtual) {
    // L2 虚拟分类文件夹 → L3 文件层
    enterCategoryFolder(task);
  } else if (task.fileType === "folder") {
    // L1 任务文件夹 → L2 分类层
    enterTaskFolder(task);
  } else {
    // L3 具体文件 → 预览
    selectRoute(task);
  }
};

// 进入任务文件夹（L1 → L2 分类层）
const enterTaskFolder = (folder: any) => {
  // taskId 取自 allPage 返回的 folder.taskId，缺省时回退 id
  currentTaskId.value = folder.taskId || folder.id;
  currentTaskName.value = folder.name;
  currentCategory.value = null;
  viewLevel.value = "category";

  breadcrumbPath.value.push({
    id: folder.taskId || folder.id,
    name: folder.name,
    level: "category",
  });

  pageOptions.value.page = 1;
  selectedRouteId.value = null;
  loadCategory();
};

// 进入照片/视频文件夹（L2 → L3 文件层）
const enterCategoryFolder = (virtual: any) => {
  currentCategory.value = virtual.category;
  viewLevel.value = "files";

  breadcrumbPath.value.push({
    id: virtual.id,
    name: virtual.name,
    level: "files",
    category: virtual.category,
  });

  pageOptions.value.page = 1;
  selectedRouteId.value = null;
  loadFiles();
};

// 导航到指定面包屑层级（按层级回退）
const navigateToFolder = (target: BreadcrumbItem | null) => {
  selectedRouteId.value = null;
  pageOptions.value.page = 1;

  if (target === null) {
    // 返回根目录
    viewLevel.value = "root";
    currentTaskId.value = null;
    currentTaskName.value = "";
    currentCategory.value = null;
    breadcrumbPath.value = [];
    loadRoot();
    return;
  }

  // 截断面包屑到目标层
  const idx = breadcrumbPath.value.findIndex(
    (b) => b.id === target.id && b.level === target.level,
  );
  if (idx >= 0) {
    breadcrumbPath.value = breadcrumbPath.value.slice(0, idx + 1);
  }
  viewLevel.value = target.level;

  if (target.level === "category") {
    currentCategory.value = null;
    loadCategory();
  } else if (target.level === "files") {
    currentCategory.value = target.category || null;
    loadFiles();
  }
};
// 搜索方法
const handleSearch = () => {
  // 重置分页到第一页
  pageOptions.value.page = 1;

  reload().then(() => {
    // 如果媒体详情面板已经打开，通知它更新列表
    if (emitter) {
      // 筛选能预览的媒体
      const canViewList = tasks.value.filter(
        (e) => !["OTHER", "folder"].includes(e.fileType),
      );
      // 发送当前媒体列表给详情面板
      emitter.emit("receiveMediaList", canViewList);
    }
  });
};
// 控制查询条件区域显示隐藏
const isSearchConditionsVisible = ref(true);

// 控制分页大小
const handleSizeChange = (size: number) => {
  pageOptions.value.size = size;
  pageOptions.value.page = 1; // 改变分页大小时重置到第一页
  reload().then(() => {
    // 发送更新后的媒体列表给详情面板
    if (emitter) {
      const canViewList = tasks.value.filter(
        (e) => !["OTHER", "folder"].includes(e.fileType),
      );
      emitter.emit("receiveMediaList", canViewList);
    }
  });
};

// 控制分页页码
const handleCurrentChange = (page: number) => {
  pageOptions.value.page = page;
  reload().then(() => {
    // 发送更新后的媒体列表给详情面板
    if (emitter) {
      const canViewList = tasks.value.filter(
        (e) => !["OTHER", "folder"].includes(e.fileType),
      );
      emitter.emit("receiveMediaList", canViewList);
    }
  });
};

// 下载文件
const handleDownload = async (task: any) => {
  try {
    const successMsg = await exportMedia(task);
    ElMessage.success(successMsg);
  } catch (error) {
    ElMessage.error("下载失败");
  }
};

// 删除文件
const handleDelete = async (task: any) => {
  const id = String(task?.id || "");
  if (!id) return;
  if (deletingMediaId.value === id) return;
  deletingMediaId.value = id;
  try {
    const successMsg = await deleteMedia(id);
    ElMessage.success(successMsg);
    reload();
  } catch (error) {
    ElMessage.error("删除失败");
  } finally {
    deletingMediaId.value = null;
  }
};

// 定位到媒体
const handleLocate = (task: MediaItem) => {
  try {
    // 检查是否有位置信息
    if (!task || !task.latitude || !task.longitude) {
      ElMessage({
        message: `该媒体文件没有位置信息`,
        type: "warning",
        duration: 2000,
      });
      return;
    }

    console.log("task:", task);

    // 确保坐标是数值类型
    if (task) {
      task.latitude = parseFloat(String(task.latitude));
      task.longitude = parseFloat(String(task.longitude));
    }
    // 调用媒体服务定位功能
    locateToMedia(task);
  } catch (error) {
    console.error("定位失败:", error);
  }
};

// 获取各类型文件大小
const initMediaSize = async () => {
  const data = await getAllMediaSize();
  spaceUsageStats.value.forEach((item) => {
    if (data[item.type]) {
      item.size = data[item.type].totalSize;
      item.count = data[item.type].count;
    }
  });
};

// 处理打包下载
const handlePackageDownload = () => {
  packageDownloadVisible.value = true;
};

// 处理打包下载对话框关闭
const handlePackageDownloadClose = () => {
  packageDownloadVisible.value = false;
};
onBeforeUnmount(() => {
  clearMediaFromMap();
});
</script>
<style lang="less" scoped>
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
    background-color: #333 !important;
    border-color: #555 !important;
    color: #ccc !important;

    &:hover {
      background-color: #555 !important;
      border-color: #666 !important;
    }
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
  .el-date-editor.el-input,
  .el-date-editor.el-input__wrapper {
    background-color: #333 !important;
    box-shadow: 0 0 0 1px #555 inset !important;
    width: 100%;
  }
}

.task-library-panel {
  color: #ccc; /* 文字颜色适应深色背景 */
  height: 100%; /* 确保占据父容器 panel-content 的高度 */
  display: flex; /* 应用 Flexbox 布局 */
  flex-direction: row; /* 子元素水平排列 */
  /* position: relative; /* 添加相对定位，用于定位 RouteSettingsPanel */ /* 移除相对定位，因为 RouteSettingsPanel 不再绝对定位 */
}

.main-content-area {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* 占据剩余空间 */
  width: 100%;
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

.space-usage-section {
  padding: 8px 10px;
  border-bottom: 1px solid #444;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.usage-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.usage-icon {
  font-size: 16px;
  color: white;
}

.usage-details {
  flex-grow: 1;
}

.usage-name {
  color: #e0e0e0;
  font-size: 13px;
}

.usage-count {
  color: #aaa;
  font-size: 11px;
}

.usage-size {
  color: white;
  font-size: 13px;
  font-weight: 500;
}

.panel-header {
  display: flex;
  justify-content: space-between; /* 左右对齐 */
  align-items: center;
  padding: 10px; /* 调整内边距 */
  border-bottom: 1px solid #444; /* 底部灰色边框 */
  flex-shrink: 0; /* 防止被压缩 */
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: white; /* 标题颜色 */
  width: 40%;
}

.search-conditions-wrapper {
  width: 100%;
  padding: 10px 10px 0px;

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
    margin-top: 10px;
  }

  .expand-btn {
    .toggle {
      cursor: pointer;
      display: flex;
      align-items: center;
      white-space: nowrap;
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

.header-actions {
  display: flex;
  gap: 15px; /* 图标之间的间距 */
}

.action-icon {
  width: 16px;
  height: 16px;
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

.deleteIcon :hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.12);
}

.task-list {
  flex-grow: 1; /* 占据剩余空间 */
  padding: 10px; /* 列表内边距 */
  overflow-y: auto; /* 内容超出时允许垂直滚动 */
  min-height: 0; /* 允许 Flex 项目缩小到小于其内容的最小高度 */
  /* height: calc(100% - 45px); /* 设置高度为父容器高度减去头部高度 */ /* 移除 calc 高度 */
  width: 100%;
}

.task-card {
  background-color: rgba(51, 51, 51, 0.6); /* 卡片默认背景色 */
  padding: 10px 0;
  margin-bottom: 10px; /* 卡片之间的间距 */
  border-radius: 4px; /* 圆角 */
  position: relative; /* 用于定位卡片内的操作按钮 */
  cursor: pointer; /* 鼠标悬停时显示手型 */
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease; /* 添加过渡效果 */
  display: flex;
  align-items: stretch;
  width: 100%;
}
.card-actions-bar {
  position: absolute;
  right: 10px;
  top: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.task-card:hover {
  background-color: #444; /* 鼠标悬停时背景变浅 */
}

.task-card.active {
  background-color: #444;
  border: 1px solid #007bff; /* 选中状态边框变蓝 */
}

.card-image {
  flex-shrink: 0;
  width: 30%;
  margin-right: 5px;
  padding: 10px;
  .el-image-file {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    .image-slot {
      text-align: center;
      div {
        font-size: 12px;
        margin-top: 5px;
      }
    }
  }
}

.card-model {
  width: 100%;
  height: 100%;
  font-size: 48px;
  color: #999;
  margin-right: 5px;
  background: rgba(0, 0, 0, 0.1);
}

.card-list {
  width: 200px;
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  color: white;
  margin-bottom: 5px;
  display: inline-block; /* 或 block，根据布局需求 */
  width: 100%; /* 继承父容器宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.finalTitle {
  width: 77%; /* 继承父容器宽度 */
}

.card-meta {
  font-size: 12px;
  color: #aaa; /* 元信息文字颜色 */
  margin-bottom: 3px;
  display: flex;
  align-items: center;
}

.card-meta .el-icon {
  margin-right: 5px;
  font-size: 14px; /* 元信息图标大小 */
  color: #aaa; /* 元信息图标颜色 */
}

/* 面包屑样式 */
.breadcrumb-wrapper {
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.15);
  // margin-bottom: 10px;
  border-radius: 4px;
}

/* 横向滚动容器 */
.breadcrumb-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

  :deep(.el-breadcrumb__separator) {
    margin: 0 0px;
  }
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

/* 文件夹图标样式 */
.card-folder {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 80px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
}

.folder-icon {
  font-size: 40px;
  color: #f39c12;
}

.card-actions {
  position: absolute; /* 绝对定位到卡片右上角 */
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px; /* 操作图标间距 */
}

.card-actions .action-icon {
  font-size: 16px; /* 卡片内操作图标大小 */
}

.no-tasks-message {
  text-align: center;
  color: #aaa;
  padding-top: 20px;
}

.is-expand {
  height: 40px !important;
}
.not-expand {
  height: auto !important;
}

:deep(.el-dropdown .el-dropdown__popper) {
  border: none !important;
}
:deep(.route-card-dropdown-popper) {
  /* 设置下拉菜单容器的背景色 */
  background-color: #444 !important; /* 使用 !important 确保覆盖 */
  /* 移除或修改默认的边框和阴影 */
  border: none !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3) !important; /* 调整阴影 */
}

/* 修改下拉菜单内部的 el-dropdown-menu 样式 (通常不需要再次设置背景色) */
:deep(.route-card-dropdown-popper .el-dropdown-menu) {
  padding: 5px 0 !important; /* 调整内边距 */
  background-color: #444 !important; /* 下拉菜单背景色 */
}

/* 修改菜单项的样式 */
:deep(.route-card-dropdown-popper .el-dropdown-menu__item) {
  color: #ccc !important; /* 默认文字颜色 */
  padding: 0 20px !important; /* 调整菜单项内边距 */
  line-height: 36px !important; /* 调整行高 */
}

:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-disabled) {
  color: #aaa !important; /* 默认文字颜色 */
}

/* 修改菜单项悬停时的样式 */
:deep(
  .route-card-dropdown-popper .el-dropdown-menu__item:not(.is-disabled):hover
) {
  background-color: #555 !important; /* 悬停背景色 */
  color: white !important; /* 悬停文字颜色 */
}

/* 修改分割线的样式 */
:deep(.route-card-dropdown-popper .el-dropdown-menu__item.is-divided) {
  border-top: 1px solid #555 !important; /* 分割线颜色 */
  margin-top: 5px !important; /* 分割线上方间距 */
  padding-top: 5px !important; /* 分割线下方内边距 */
}
:deep(.route-card-dropdown-popper .el-popper__arrow:before) {
  background-color: #444 !important;
  border: 1px solid #444 !important;
}
:deep(.route-card-dropdown-popper .el-dropdown-menu__item--divided) {
  border-top: 1px solid #ccc !important;
}

.action-icon {
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s ease;
}

.action-icon:hover {
  color: white;
}
</style>

<style lang="less">
.el-popover.el-popper {
  background: #172c2ce6;
  border: 1px solid #444;
  color: #fff;
  .el-popper__arrow:before {
    background: #172c2ce6;
    border: 1px solid #444;
  }
}
</style>
