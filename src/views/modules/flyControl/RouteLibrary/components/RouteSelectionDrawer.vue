<template>
  <div class="route-selection-drawer-container">
    <el-drawer
      v-model="props.visible"
      :direction="'ltr'"
      :size="'350px'"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="route-selection-drawer"
      :modal="false"
      :modal-class="'drawer-modal'"
      :show-close="false"
      style="top: 90px; left: 732px; height: calc(100vh - 160px);"
      @close="handleClose"
    >
      <!-- 自定义头部 -->
      <template #header>
        <div class="panel-header">
          <div class="header-title">航线 ({{ filteredRoutes.length }})</div>
          <el-icon :size="20" class="close-button" @click="handleClose"><Close /></el-icon>
        </div>
      </template>

      <!-- 内容区域 -->
      <div class="panel-content">
        <div class="route-list">
          <div
            v-for="route in filteredRoutes"
            :key="route.id"
            class="route-item"
            :class="{ selected: isRouteSelected(route.id) }"
            @click="toggleRouteSelection(route)"
          >
            <div class="route-info">
              <div class="route-title">{{ route.title }}</div>
              <div class="route-meta">{{ route.meta }}</div>
              <div class="route-update-time">更新时间 {{ route.updateTime }}</div>
            </div>
            <el-tooltip
              v-if="route.type !== 'waypoint'"
              content="仅支持航点航线"
              placement="top"
            >
              <el-icon class="warning-icon"><Warning /></el-icon>
            </el-tooltip>
          </div>
          <div v-if="filteredRoutes.length === 0" class="no-routes-message">
            暂无航线数据。
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElDrawer, ElIcon, ElTooltip } from 'element-plus'; // 移除 ElCheckbox
import { Close, Warning } from '@element-plus/icons-vue';

const props = defineProps<{
  visible: boolean;
  allRoutes: any[]; // 所有可用的航线列表
  selectedRoutes: any[]; // 当前已选中的航线列表 (来自 SpliceRouteDrawer)
}>();

const emit = defineEmits(['update:visible', 'select-routes', 'close']);

// 内部维护的选中航线列表，用于复选框状态
const internalSelectedRoutes = ref<any[]>([]);

// 过滤掉已锁定的航线，并且只显示航点航线
const filteredRoutes = computed(() => {
  return props.allRoutes.filter(route => route.type === 'waypoint');
});

// 监听 props.selectedRoutes 的变化，同步到 internalSelectedRoutes
watch(() => props.selectedRoutes, (newVal) => {
  internalSelectedRoutes.value = [...newVal];
}, { immediate: true });

// 检查航线是否已被选中
const isRouteSelected = (routeId: number | string) => {
  return internalSelectedRoutes.value.some(route => route.id === routeId);
};

// 切换航线选中状态
const toggleRouteSelection = (route: any) => {
  const index = internalSelectedRoutes.value.findIndex(item => item.id === route.id);
  if (index !== -1) {
    // 如果已选中，则移除
    internalSelectedRoutes.value.splice(index, 1);
  } else {
    // 如果未选中，则添加
    internalSelectedRoutes.value.push(route);
  }
  // 每次选中状态改变时，都向上层组件发出事件
  emit('select-routes', internalSelectedRoutes.value);
};

const handleClose = () => {
  emit('close');
  emit('update:visible', false);
};
</script>

<style lang="less" scoped>
.route-selection-drawer-container {
  :deep(.el-drawer) {
    pointer-events: auto;
    background-color: rgba(23, 44, 44, 0.9) !important;
    color: #fff;
    box-shadow: 2px 0 5px rgba(0,0,0,0.5);
  }

  :deep(.route-selection-drawer .el-drawer__header) {
    padding: 0;
    margin-bottom: 0;
  }

  :deep(.route-selection-drawer .el-drawer__body) {
    padding: 0;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.drawer-modal){
    width: 0px !important;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: white;
}

.close-button {
  cursor: pointer;
  color: #fff;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: white;
}

.panel-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1px 13px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 15px 0;
}

.route-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 7px;
}

.route-item {
  background-color: rgba(51, 51, 51, 0.6); /* 与 SpliceRouteDrawer 保持一致 */
  border-radius: 4px;
  padding: 15px; /* 与 SpliceRouteDrawer 保持一致 */
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  cursor: pointer; /* 表示可点击 */
  border: 1px solid transparent; /* 默认透明边框 */
  transition: border-color 0.2s ease; /* 边框过渡效果 */

  &:hover {
    border-color: rgba(45, 140, 240, 0.5); /* 鼠标悬停时的边框颜色 */
  }

  &.selected {
    border-color: #2d8cf0; /* 选中时的边框颜色 */
  }
}

/* 移除所有与 el-checkbox 相关的样式 */
/* .route-item :deep(.el-checkbox) { ... } */
/* .route-item :deep(.el-checkbox__input) { ... } */
/* .route-item :deep(.el-checkbox__label) { ... } */

.route-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  /* 移除 padding-left: 10px; 因为没有复选框了 */
}

.route-title {
  font-size: 15px;
  font-weight: bold;
  color: white;
}

.route-meta, .route-update-time {
  font-size: 12px;
  color: #aaa;
}

.warning-icon {
  color: #e6a23c; /* 警告颜色 */
  font-size: 16px;
  margin-left: auto; /* 推到最右边 */
  flex-shrink: 0;
}

.no-routes-message {
  text-align: center;
  color: #aaa;
  padding-top: 20px;
}
</style>