<template>
  <!-- 左侧边栏容器 -->
  <div class="left-sidebar-container">
    <!-- 左侧始终展示的切换菜单 -->
    <div class="toggle-menu">
      <!-- 切换按钮 -->
      <div
        class="menu-item toggle-button"
        @click="toggleLeftPanel"
        v-tooltip="isLeftPanelExpanded ? '收起面板' : '展开面板'">
        <el-icon :size="20">
          <component
            :is="isLeftPanelExpanded ? ArrowLeftBold : ArrowRightBold" />
        </el-icon>
      </div>

      <!-- <div
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        :class="{
          active: activeMenuItem === item.id,
        }"
        @click="selectMenuItem(item.id)">
        <el-icon :size="20"><component :is="item.iconComponent" /></el-icon>
        <span class="menu-item-text">{{ item.tooltip }}</span>
      </div> -->
    </div>

    <!-- 可展开收缩的左侧功能区 -->
    <div class="left-panel" :style="{ width: leftPanelWidth }">
      <!-- 根据选中的菜单项显示不同的组件 -->
      <div class="panel-content">
        <component :is="currentContentComponent" />
      </div>
    </div>

    <!-- 禁飞区管理面板：航线库页面右侧 -->
    <NoFlyZonePanel v-if="activeMenuItem === 'route'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, watch } from "vue";
import {
  ArrowLeftBold,
  ArrowRightBold,
  DataLine,
  Calendar,
  Picture,
} from "@element-plus/icons-vue";
// @ts-ignore
import { initWaypointService } from "@/services/waypointService";
// 从emitter中导入事件总线
import emitter from "@/stores/mitt";
import { useRoute, useRouter } from "vue-router";

// 异步加载内容组件以修复 "no default export" 错误
const RouteLibraryPanel = defineAsyncComponent(
  () => import("@/views/modules/flyControl/RouteLibrary/RouteLibraryPanel.vue"),
);
const MediaPanel = defineAsyncComponent(
  () => import("@/views/modules/flyControl/Media/MediaPanel.vue"),
);
const PlanPanel = defineAsyncComponent(
  () => import("@/views/modules/flyControl/Plan/PlanPanel.vue"),
);
// 禁飞区管理面板（练习功能）：航线库右侧
const NoFlyZonePanel = defineAsyncComponent(
  () => import("@/views/modules/flyControl/RouteLibrary/components/NoFlyZonePanel.vue"),
);

const router = useRouter();
const route = useRoute();
const menuItems = [
  {
    id: "route",
    tooltip: "航线",
    iconComponent: DataLine,
  },
  {
    id: "task",
    tooltip: "任务",
    iconComponent: Calendar,
  },
  {
    id: "achievement",
    tooltip: "成果",
    iconComponent: Picture,
  },
];

// 控制左侧面板是否展开的状态
const isLeftPanelExpanded = ref(true); // 默认展开

const syncLeftPanelWidthVar = (expanded: boolean) => {
  document.documentElement.style.setProperty(
    "--fly-control-left-panel-width",
    expanded ? "320px" : "0px",
  );
};

// 计算左侧面板的宽度
const leftPanelWidth = computed(() => {
  // 展开时的宽度，例如 300px
  const expandedWidth = 320;
  // 收缩时的宽度，设置为 0
  const collapsedWidth = 0;
  return isLeftPanelExpanded.value
    ? `${expandedWidth}px`
    : `${collapsedWidth}px`;
});

// 切换左侧面板展开/收缩状态的方法
const toggleLeftPanel = () => {
  isLeftPanelExpanded.value = !isLeftPanelExpanded.value;
};

// 当前选中的菜单项
const activeMenuItem = ref(""); // 初始为空，将在组件挂载时设置为第一个有权限的项

// 根据选中的菜单项动态加载对应的组件
const contentComponents: Record<string, any> = {
  route: RouteLibraryPanel,
  task: PlanPanel,
  achievement: MediaPanel,
};

const currentContentComponent = computed(() => {
  return contentComponents[activeMenuItem.value];
});

// 选择菜单项的方法
const selectMenuItem = (item: string) => {
  const menuItem = menuItems.find((m) => m.id === item);
  if (!menuItem) return;

  activeMenuItem.value = item;
  router.push(item);
  // 如果面板当前是收缩的，点击菜单项时可以考虑展开面板
  if (!isLeftPanelExpanded.value) {
    isLeftPanelExpanded.value = true;
  }
};

// 创建一个标志，用于跟踪基础数据是否已经加载
const baseDataLoaded = ref(false);

// 监听路由变化，更新激活菜单
watch(
  () => route.path,
  () => {
    activeMenuItem.value = "";
    const currentPath = route.path;
    const matchedMenu = menuItems.find(
      (item) => currentPath.indexOf(item.id) > -1,
    );
    if (matchedMenu) {
      activeMenuItem.value = matchedMenu.id;
    }
  },
  { immediate: true },
);

watch(
  isLeftPanelExpanded,
  (expanded) => {
    syncLeftPanelWidthVar(expanded);
  },
  { immediate: true },
);

onMounted(() => {
  // 检查是否已经从地图组件加载了基础数据
  emitter.on("map-base-data-loaded", () => {
    baseDataLoaded.value = true;
  });

  // 监听收起/展开左侧面板事件
  emitter.on("toggle-left-panel", (val: unknown) => {
    if (typeof val === 'boolean') {
      isLeftPanelExpanded.value = val;
    }
  });

  // 给地图组件一点时间加载基础数据
  setTimeout(() => {
    // 如果地图组件没有加载基础数据，则在这里加载
    if (!baseDataLoaded.value) {
      initWaypointService();
    }
  }, 500); // 延迟500毫秒检查
});
</script>

<style scoped lang="less">
.left-sidebar-container {
  position: fixed; /* 启用相对定位，用于定位 left-panel */
  left: 10px;
  top: 90px;
  height: calc(100% - 160px); /* 高度占满父容器 */
  display: flex; /* 使用 flex 布局管理 toggle-menu 和 left-panel */
  /* left-sidebar-container 的宽度由 App.vue 中的 flex 布局控制 */
}

.toggle-menu {
  width: 40px; /* 始终展示的宽度 */
  height: 43px;
  background-color: rgba(23, 44, 44, 0.9); /* 深色背景 */
  color: #ccc; /* 默认图标颜色 */
  z-index: 10; /* 确保在最上层 */
  flex-shrink: 0; /* 防止被压缩 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px; /* 调整顶部内边距 */
  border-right: 1px solid #444; /* 右侧灰色边框 */
}

.menu-item {
  width: 100%; /* 使菜单项宽度占满 toggle-menu */
  height: 50px; /* 菜单项高度 */
  display: flex;
  gap: 2px;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin-bottom: 5px; /* 菜单项之间的间距 */
  transition:
    background-color 0.2s ease,
    color 0.2s ease; /* 添加过渡效果 */
  box-sizing: border-box; /* 确保边框不增加元素总尺寸 */
}

.menu-item:hover {
  background-color: rgba(68, 68, 68, 0.7); /* 悬停背景色，增加透明度 */
}

.menu-item.active {
  background-color: rgba(68, 68, 68, 0.7); /* 选中背景色，增加透明度 */
}

.menu-item.active .el-icon,
.menu-item.active .menu-item-text {
  color: #2d8cf0; /* 选中图标颜色 */
}

/* 禁用状态样式 */
.menu-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(50%);
}

.menu-item.disabled:hover {
  background-color: rgba(23, 44, 44, 0.9); /* 禁用时不改变背景色 */
}

.menu-item.disabled .el-icon {
  color: #666; /* 禁用时的图标颜色 */
}

.toggle-button {
  margin-bottom: 10px; /* 调整切换按钮下边距 */
  border: none; /* 移除边框 */
  background: none; /* 移除背景 */
  padding: 0; /* 移除内边距 */
  color: #ccc; /* 默认颜色 */
}

.left-panel {
  position: absolute; /* 绝对定位，使其可以覆盖右侧区域 */
  height: 100%;
  left: 0px; /* 紧邻切换菜单 */
  top: 0;
  bottom: 0;
  /* width is controlled by v-bind:style */
  background-color: rgba(23, 44, 44, 0.9); /* 与 toggle-menu 相同的深色背景 */
  transition: width 0.3s ease; /* 添加宽度过渡效果 */
  z-index: 5; /* 在右侧面板之上 */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2); /* 添加阴影增强层次感 */
  display: flex; /* 使 left-panel 成为 flex 容器 */
  flex-direction: column; /* 使标题和内容垂直排列 */
}

.panel-content {
  flex-grow: 1; /* 内容区域占据剩余空间 */
  overflow-y: auto; /* 内容超出时允许垂直滚动 */
  overflow-x: visible;
  /* padding 移到 RouteLibraryPanel 内部 */

  :deep(.panel-header) {
    padding-left: 45px;
  }
}
</style>
