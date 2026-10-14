<template>
  <!-- 左侧边栏容器 -->
  <div class="left-sidebar-container">
    <!-- 左侧始终展示的切换菜单 -->
    <div class="toggle-menu">
      <!-- 切换按钮 -->
      <div
        class="menu-item toggle-button"
        @click="toggleLeftPanel"
        v-tooltip="smartServiceStore.showLeftPanel ? '收起面板' : '展开面板'">
        <el-icon :size="20">
          <component
            :is="
              smartServiceStore.showLeftPanel ? ArrowLeftBold : ArrowRightBold
            " />
        </el-icon>
      </div>

      <div
        v-for="item in menuItems"
        :key="item.id"
        class="menu-item"
        :class="{
          active: activeMenuItem === item.id,
        }"
        @click="selectMenuItem(item.id)">
        <el-icon :size="20"><component :is="item.iconComponent" /></el-icon>
        <span class="menu-item-text">{{ item.tooltip }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  ArrowLeftBold,
  ArrowRightBold,
  Money,
  // Guide,
  Files,
  // Coordinate,
} from "@element-plus/icons-vue";
import { useRoute, useRouter } from "vue-router";
import { useSmartServiceStore } from "@/views/modules/smartService/commonStore.ts";

const smartServiceStore = useSmartServiceStore();

const router = useRouter();
const route = useRoute();
const menuItems = [
  {
    id: "objectRecognition",
    tooltip: "目标识别",
    iconComponent: Money,
  },
  {
    id: "modelReconstruction",
    tooltip: "模型重建",
    iconComponent: Files,
  },
  // {
  //   id: "changeDetection",
  //   tooltip: "变化检测",
  //   iconComponent: Guide,
  // },
  // {
  //   id: "featureExtraction",
  //   tooltip: "地物提取",
  //   iconComponent: Coordinate,
  // },
];

// 切换左侧面板展开/收缩状态的方法
const toggleLeftPanel = () => {
  smartServiceStore.changeLeftPanelVisible();
};

// 当前选中的菜单项
const activeMenuItem = ref(""); // 初始为空，将在组件挂载时设置为第一个有权限的项

// 选择菜单项的方法
const selectMenuItem = (item: string) => {
  const menuItem = menuItems.find((m) => m.id === item);
  if (!menuItem) return;

  activeMenuItem.value = item;
  router.push(item);
  // 如果面板当前是收缩的，点击菜单项时可以考虑展开面板
  if (!smartServiceStore.showLeftPanel) {
    smartServiceStore.changeLeftPanelVisible(true);
  }
};

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
</script>

<style scoped>
.left-sidebar-container {
  position: fixed; /* 启用相对定位，用于定位 left-panel */
  left: 10px;
  top: 90px;
  height: calc(100% - 160px); /* 高度占满父容器 */
  display: flex; /* 使用 flex 布局管理 toggle-menu 和 left-panel */
  z-index: 99;
}

.toggle-menu {
  width: 60px; /* 始终展示的宽度 */
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

.menu-item-text {
  width: 28px;
  text-align: center;
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
</style>
