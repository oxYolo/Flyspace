<template>
  <div class="zone-legend">
    <div class="legend-header">
      <h4>
        <i class="el-icon-picture-outline"></i>
        禁飞区图例
      </h4>
      <div class="header-actions">
        <button 
          class="action-btn" 
          @click="toggleAll"
          title="切换全部显示/隐藏"
        >
          <i class="el-icon-refresh"></i>
        </button>
        <button 
          class="toggle-btn" 
          @click="toggleCollapsed"
          :class="{ collapsed: isCollapsed }"
        >
          {{ isCollapsed ? '展开' : '收起' }}
        </button>
      </div>
    </div>
    
    <div class="legend-content" :class="{ collapsed: isCollapsed }">
      <div v-if="legendConfigs.length === 0" class="empty-state">
        <i class="el-icon-info"></i>
        <span>暂无禁飞区数据</span>
      </div>
      <div 
        v-for="(config, index) in legendConfigs" 
        :key="index"
        class="legend-item"
        :class="{ 
          active: config.active, 
          'no-data': config.count === 0
        }"
        @click="toggleZoneType(config.type)"
      >
        <div 
          class="legend-color" 
          :style="{ 
            backgroundColor: config.color,
            opacity: config.count === 0 ? 0.3 : 1
          }"
        ></div>
        <div class="legend-text">
          <span class="legend-name">{{ config.name }}</span>
          <span class="legend-count" :class="{ 'no-data': config.count === 0 }">
            ({{ config.count }})
          </span>
        </div>
        <div class="legend-toggle">
          <i v-if="config.count > 0" :class="config.active ? 'el-icon-check' : 'el-icon-close'"></i>
          <i v-else class="el-icon-minus"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { INoFlyZone } from '@/model/noFlyZone'

interface LegendConfig {
  type: string
  name: string
  color: string
  count: number
  active: boolean
}

interface Props {
  zones: INoFlyZone[]
  visibleTypes?: string[]
}

interface Emits {
  (e: 'toggle-type', type: string): void
  (e: 'update-visible-types', types: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  visibleTypes: () => []
})

const emit = defineEmits<Emits>()

const isCollapsed = ref(false)

// 禁飞区类型配置
const ZONE_TYPE_CONFIG = {
  '机场周边': { color: '#FF6B6B', name: '机场周边' },
  '军事禁区与军事管理区': { color: '#8B0000', name: '军事禁区' },
  '党政机关': { color: '#FFD700', name: '党政机关' },
  '重要基础设施': { color: '#FF8C00', name: '重要基础设施' },
  '其他敏感区域': { color: '#9370DB', name: '其他敏感区域' },
  '国界线、边境线': { color: '#00CED1', name: '国界线' }
}

// 计算图例配置
const legendConfigs = computed<LegendConfig[]>(() => {
  const typeCounts = props.zones.reduce((acc, zone) => {
    const type = zone.type || '其他敏感区域'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(ZONE_TYPE_CONFIG).map(([type, config]) => ({
    type,
    name: config.name,
    color: config.color,
    count: typeCounts[type] || 0,
    active: props.visibleTypes.includes(type)
  })) // 始终显示所有类型，没有数据的显示为(0)
})

// 切换折叠状态
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

// 切换全部显示/隐藏
const toggleAll = () => {
  const allTypes = legendConfigs.value.map(config => config.type)
  const allVisible = allTypes.every(type => props.visibleTypes.includes(type))
  
  if (allVisible) {
    // 全部隐藏
    emit('update-visible-types', [])
  } else {
    // 全部显示
    emit('update-visible-types', allTypes)
  }
}

// 切换禁飞区类型显示
const toggleZoneType = (type: string) => {
  // 只发出 toggle-type 事件，让父组件处理状态更新
  emit('toggle-type', type)
}

// 监听可见类型变化，更新图例状态
watch(() => props.visibleTypes, (newTypes) => {
  // 这里可以添加额外的逻辑
}, { deep: true })
</script>

<style lang="less" scoped>
.zone-legend {
  background: url('@/assets/images/common/边框.png') no-repeat center center;
  background-size: 100% 100%;
  border: none;
  border-radius: 8px;
  padding: 15px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
  transition: all 0.3s ease;
  pointer-events: auto;
  max-width: 300px;
  min-width: 250px;
  position: relative;
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
  position: relative;
  z-index: 1;
}

.legend-header h4 {
  margin: 0;
  color: #00ffff;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
  position: relative;
  z-index: 2;
  background-image: url('@/assets/images/common/tit.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: left center;
  padding-left: 20px;
  min-height: 20px;
}

.legend-header h4 i {
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.toggle-btn {
  background: linear-gradient(45deg, #00ffff, #0080ff);
  border: none;
  color: #000;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
}

.toggle-btn:hover {
  background: linear-gradient(45deg, #00cccc, #0066cc);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 255, 255, 0.3);
}

.toggle-btn.collapsed {
  background: linear-gradient(45deg, #666, #444);
  color: #ccc;
}

.action-btn {
  background: linear-gradient(45deg, #9370DB, #8A2BE2);
  border: none;
  color: white;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.action-btn:hover {
  background: linear-gradient(45deg, #8A2BE2, #7B68EE);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(147, 112, 219, 0.3);
}

.legend-content {
  max-height: none;
  overflow: visible;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.legend-content.collapsed {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 2px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid transparent;
  min-width: 160px;
}

.legend-item:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: rgba(0, 255, 255, 0.3);
  transform: translateX(2px);
}

.legend-item.active {
  background: rgba(0, 255, 255, 0.15);
  border-color: #00ffff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
}

.legend-item.no-data {
  opacity: 0.7;
  cursor: pointer;
}

.legend-item.no-data:hover {
  background: rgba(0, 255, 255, 0.08);
  border-color: rgba(0, 255, 255, 0.2);
  transform: translateX(2px);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  margin-right: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.legend-text {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 0;
  gap: 3px;
}

.legend-name {
  color: #cbefff;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.legend-count {
  color: #888;
  font-size: 11px;
  font-weight: 400;
  flex-shrink: 0;
}

.legend-count.no-data {
  color: #666;
  font-style: italic;
}

.legend-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.legend-toggle i {
  font-size: 12px;
  color: #00ffff;
}

.legend-item:not(.active) .legend-toggle i {
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  color: #888;
  font-size: 12px;
  text-align: center;
}

.empty-state i {
  font-size: 24px;
  margin-bottom: 8px;
  color: #666;
}


/* 响应式设计 */
@media (max-width: 768px) {
  .zone-legend {
    padding: 8px;
    margin-bottom: 10px;
  }
  
  .legend-header h4 {
    font-size: 12px;
  }
  
  .legend-item {
    padding: 6px 4px;
  }
  
  .legend-name {
    font-size: 11px;
  }
  
  .legend-count {
    font-size: 9px;
  }
}
</style>
