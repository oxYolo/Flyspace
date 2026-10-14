<template>
  <div class="splice-route-drawer-container">
    <el-drawer
      v-model="props.visible"
      :direction="'ltr'"
      :size="'350px'"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="splice-route-drawer"
      :modal="false"
      :modal-class="'drawer-modal'"
      :show-close="false"
      style="top: 90px; left: 370px; height: calc(100vh - 160px);"
      @close="handleClose"
    >
      <!-- 自定义头部 -->
      <template #header>
        <div class="panel-header">
          <div class="header-title">航线拼接</div>
          <el-icon :size="20" class="close-button" @click="handleClose"><Close /></el-icon>
        </div>
      </template>

      <!-- 内容区域 -->
      <div class="panel-content">
        <div class="description">
          将多条航线首尾拼接在一起，拼接后将生成新的航线，仅支持航点航线，可拖动航线调整拼接顺序并在右侧预览。
        </div>

        <div class="route-list-section">
          <!-- 航线列表 -->
          <div class="spliced-routes">
            <draggable
              v-model="splicedRoutes"
              item-key="id"
              handle=".drag-handle"
              class="draggable-list"
            >
              <template #item="{ element: route, index }">
                <div class="spliced-route-wrapper">
                  <div class="route-index-outside">{{ index + 1 }}</div>
                  <div class="spliced-route-item">
                    <div class="route-info">
                      <div class="route-title">{{ route.title }}</div>
                      <div class="route-meta">{{ route.meta }}</div>
                      <div class="route-update-time">更新时间 {{ route.updateTime }}</div>
                    </div>
                    <div class="route-actions">
                      <!-- 拖拽手柄 -->
                      <el-icon class="drag-handle"><Operation /></el-icon>
                      <!-- 删除按钮 -->
                      <el-icon class="delete-route" @click="removeRoute(route.id)"><Delete /></el-icon>
                    </div>
                  </div>
                </div>
              </template>
            </draggable>
          </div>

          <!-- 添加航线按钮 -->
          <div class="add-route-button" @click="handleAddRoute">
            <el-icon><Plus /></el-icon>
            <span>添加航线</span>
          </div>
        </div>

        <div class="footer-note">
          拼接后航线全局设置将以首航线为准，请检查拼接后航线安全性
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="panel-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirmSplice">航线拼接</el-button>
      </div>
    </el-drawer>

    <!-- 新增：航线选择抽屉组件 -->
    <RouteSelectionDrawer
      :visible="showRouteSelectionDrawer"
      :allRoutes="allRoutes"
      :selectedRoutes="splicedRoutes"
      @update:visible="showRouteSelectionDrawer = $event"
      @select-routes="handleSelectRoutes"
      @close="showRouteSelectionDrawer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElDrawer, ElIcon, ElButton } from 'element-plus';
import { Close, Plus, Operation, Delete } from '@element-plus/icons-vue';
import RouteSelectionDrawer from './RouteSelectionDrawer.vue'; // 导入新的航线选择抽屉组件
import draggable from 'vuedraggable'; // 导入 vuedraggable

const props = defineProps<{
  visible: boolean;
  initialRoute: any; // 初始要拼接的航线
  allRoutes: any[]; // 新增：所有可用的航线列表
}>();

const emit = defineEmits(['update:visible', 'close', 'confirm-splice']);

// 存储要拼接的航线列表
const splicedRoutes = ref<any[]>([]);
// 控制航线选择抽屉的显示状态
const showRouteSelectionDrawer = ref(false);

// 监听 initialRoute 的变化，当抽屉打开且 initialRoute 存在时，将其添加到列表中
watch(() => props.initialRoute, (newVal) => {
  if (newVal && props.visible) {
    // 确保只添加一次，或者根据需求清空再添加
    if (!splicedRoutes.value.some(route => route.id === newVal.id)) {
      splicedRoutes.value = [newVal]; // 默认只显示当前航线
    }
  }
}, { immediate: true }); // immediate: true 确保在组件初始化时也执行一次

// 监听 visible 变化，当抽屉关闭时清空列表
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    splicedRoutes.value = []; // 抽屉关闭时清空列表
  }
});

const handleClose = () => {
  showRouteSelectionDrawer.value = false;
  emit('close');
};

const handleAddRoute = () => {
  // 打开航线选择抽屉
  showRouteSelectionDrawer.value = true;
};

const removeRoute = (routeId: number | string) => {
  splicedRoutes.value = splicedRoutes.value.filter(route => route.id !== routeId);
};

const handleConfirmSplice = () => {
  // 触发确认拼接事件，并传递当前拼接列表
  emit('confirm-splice', splicedRoutes.value);
};

// 处理从 RouteSelectionDrawer 传回的选中航线列表
const handleSelectRoutes = (selected: any[]) => {
  // 过滤掉非航点航线，并更新拼接列表
  // 确保只添加航点航线，并且不重复
  const newSelected = selected.filter(route => route.type === 'waypoint');
  const currentIds = new Set(splicedRoutes.value.map(r => r.id));
  newSelected.forEach(route => {
    if (!currentIds.has(route.id)) {
      splicedRoutes.value.push(route);
    }
  });
  // 移除在选择器中取消选择的航线
  splicedRoutes.value = splicedRoutes.value.filter(route =>
    newSelected.some(s => s.id === route.id)
  );
};
</script>

<style lang="less" scoped>
.splice-route-drawer-container {
  :deep(.el-drawer) {
    pointer-events: auto;
    background-color: rgba(23, 44, 44, 0.9) !important;
    color: #fff;
    box-shadow: 2px 0 5px rgba(0,0,0,0.5);
  }

  :deep(.splice-route-drawer .el-drawer__header) {
    padding: 0;
    margin-bottom: 0;
  }

  :deep(.splice-route-drawer .el-drawer__body) {
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

.description {
  font-size: 13px;
  color: #ccc;
  line-height: 1.5;
  margin-bottom: 15px;
  padding: 0 7px;
}

.route-list-section {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 7px;
}

.spliced-routes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.spliced-route-wrapper {
  display: flex;
  align-items: flex-start; /* 序号和卡片顶部对齐 */
  gap: 5px;
}

.route-index-outside {
  font-size: 14px; /* 序号字体大小 */
  font-weight: bold;
  color: #fff; /* 序号颜色 */
  width: 25px; /* 序号宽度 */
  text-align: center;
  flex-shrink: 0;
  padding-top: 10px; /* 调整序号与卡片顶部的对齐 */
}

.spliced-route-item {
  background-color: rgba(51, 51, 51, 0.6);
  border-radius: 4px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1; /* 占据剩余空间 */
}

.route-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
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

.route-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.drag-handle {
  cursor: grab;
  color: #ccc;
  font-size: 18px;
}

.delete-route {
  cursor: pointer;
  color: #f56c6c;
  font-size: 18px;
  /* 移除 opacity 相关的样式，使其始终显示 */
  /* transition: opacity 0.2s ease;
  opacity: 0; */
}

/* 移除鼠标悬停显示删除按钮的样式 */
/* .spliced-route-item:hover .delete-route {
  opacity: 1;
} */

.add-route-button {
  border: 1px dashed #666;
  border-radius: 4px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 14px;
  transition: all 0.2s ease;
  &:hover {
    border-color: #2d8cf0;
    color: #2d8cf0;
    background-color: rgba(45, 140, 240, 0.1);
  }
}

.footer-note {
  font-size: 12px;
  color: #aaa;
  line-height: 1.4;
  margin-top: auto; /* 推到底部 */
  padding: 10px 7px;
  border-top: 1px solid #444;
  flex-shrink: 0;
}

.panel-footer {
  padding: 15px 20px;
  border-top: 1px solid #555;
  display: flex;
  justify-content: flex-end; /* 按钮靠右 */
  gap: 10px;
  flex-shrink: 0;
}

/* 按钮样式与 RouteSettingsPanel 保持一致 */
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
</style>
