<template>
  <div class="zone-list">
    <!-- 背景图片 -->
    <div class="list-background">
      <img src="/src/assets/images/common/边框.png" alt="边框" class="border-bg" />
    </div>
    
    <!-- 标题 -->
    <div class="list-title">
      <img src="/src/assets/images/common/tit.png" alt="标题" class="title-bg" />
      <span class="title-text">禁飞区列表</span>
      <button class="expand-btn" title="展开查询" @click="emit('expand')"></button>
    </div>
    
    <!-- 搜索和筛选 -->
    <div class="search-container">
      <SearchFilter 
        @search="handleSearch"
        @filter="handleFilter"
        @change="handleSearchChange"
        ref="searchFilterRef"
      />
    </div>
    
    <!-- 列表内容 -->
    <div class="list-content">
      <ul class="items" v-if="props.items && props.items.length">
        <li v-for="item in props.items" :key="item.id!" class="item">
          <div class="item-info">
            <div class="name" @click="handleLocate(item.id!)" title="点击定位">
              {{ item.name }}
            </div>
            <div class="type" v-if="item.type">
              {{ item.type }}
            </div>
          </div>
          <div class="ops">
            <button class="mini edit-btn" @click.stop="handleEdit(item)">编辑</button>
            <button class="mini danger" @click.stop="handleDelete(item.id!)">删除</button>
          </div>
        </li>
      </ul>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-text">暂无禁飞区数据</div>
      </div>
    </div>
    
    <!-- 分页组件 -->
    <div class="pagination-container" v-if="props.total > props.pageSize">
      <div class="pagination-info">
        共 {{ props.total }} 条，第 {{ props.page }} / {{ totalPages }} 页
      </div>
      <div class="pagination-controls">
        <button 
          class="page-btn" 
          :disabled="props.page <= 1"
          @click="handlePageChange(props.page - 1)"
          title="上一页"
        >
          ‹
        </button>
        <span class="page-info">{{ props.page }} / {{ totalPages }}</span>
        <button 
          class="page-btn" 
          :disabled="props.page >= totalPages"
          @click="handlePageChange(props.page + 1)"
          title="下一页"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { INoFlyZone } from '@/model/noFlyZone'
import SearchFilter from './SearchFilter.vue'

interface Props {
  items: INoFlyZone[]
  total: number
  page: number
  pageSize: number
}

interface Emits {
  (e: 'refresh'): void
  (e: 'search', keyword: string): void
  (e: 'filter', type: string): void
  (e: 'search-change', params: { keyword: string; type: string }): void
  (e: 'delete', id: string): void
  (e: 'edit', row: INoFlyZone): void
  (e: 'locate', id: string): void
  (e: 'expand'): void
  (e: 'page-change', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 搜索过滤器引用
const searchFilterRef = ref<InstanceType<typeof SearchFilter> | null>(null)

// 计算总页数
const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

function handleSearch(keyword: string): void {
  emit('search', keyword)
}

function handleFilter(type: string): void {
  emit('filter', type)
}

function handleSearchChange(params: { keyword: string; type: string }): void {
  emit('search-change', params)
}

// no-op: 列表项不再展开详情

function handleEdit(item: INoFlyZone): void { emit('edit', item) }
function handleDelete(id: string): void { emit('delete', id) }
function handleLocate(id: string): void { emit('locate', id) }
function handlePageChange(page: number): void { emit('page-change', page) }
</script>

<style lang="less" scoped>
.zone-list { 
  position: relative; 
  width: 100%; 
  height: 100%; 
  color: #cbefff; 
  pointer-events: auto; /* 确保可以接收点击事件 */
  display: flex;
  flex-direction: column;
}
.list-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
.border-bg { width: 100%; height: 100%; object-fit: fill; }
.list-title { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; height: 40px; margin-bottom: 15px; margin-top: -20px; }
.title-bg { position: absolute; top: 0; left: 50%; transform: translateX(-50%); height: 100%; object-fit: contain; pointer-events: none; }
.title-text { position: relative; z-index: 3; color: #00ffff; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); margin-right: 8px; }
.title-controls { display: none; }
.expand-btn { width: 28px; height: 28px; border: none; cursor: pointer; background: url("@/assets/images/common/右展开.png") center no-repeat; background-size: 24px 24px; border-radius: 4px; }
.expand-btn:hover { filter: brightness(1.1); }
.search-container { position: relative; z-index: 2; margin-bottom: 15px; padding: 0 10px; }
.list-content { 
  position: relative; 
  z-index: 2; 
  flex: 1; 
  overflow-y: auto; 
  padding: 0 10px; 
  background: url("@/assets/images/common/边框.png") center no-repeat; 
  background-size: 100% 100%;
  min-height: 0; /* 重要：允许flex子元素收缩 */
}
.items { list-style: none; padding: 0; margin: 0; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 8px; transition: all 0.3s ease; cursor: pointer; }
.detail { margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,255,255,0.25); }
.detail-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #cbefff; }
.detail-row label { width: 42px; color: #00ffff; }
.item:hover { background: rgba(0, 255, 255, 0.1); border-color: rgba(0, 255, 255, 0.4); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2); }
.item-info { flex: 1; min-width: 0; }
.name { font-size: 16px; font-weight: bold; color: #cbefff; margin-bottom: 4px; cursor: pointer; transition: color 0.2s; }
.name:hover { color: #00ffff; }
.type { font-size: 12px; color: rgba(203, 239, 255, 0.7); }
.ops { display: flex; gap: 8px; }
.mini { padding: 6px 12px; border-radius: 15px; background: rgba(0, 160, 255, 0.3); border: 1px solid rgba(0, 233, 255, 0.6); color: #fff; cursor: pointer; font-size: 12px; transition: all 0.3s ease; }
.mini:hover { background: rgba(0, 160, 255, 0.5); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0, 160, 255, 0.3); }
.mini.danger { background: rgba(255, 80, 80, 0.3); border-color: rgba(255, 80, 80, 0.7); }
.mini.danger:hover { background: rgba(255, 80, 80, 0.5); box-shadow: 0 2px 8px rgba(255, 80, 80, 0.3); }
.empty-state { display: flex; align-items: center; justify-content: center; height: 200px; color: rgba(203, 239, 255, 0.6); }
.empty-text { font-size: 14px; }
.list-content::-webkit-scrollbar { width: 6px; }
.list-content::-webkit-scrollbar-track { background: rgba(0, 255, 255, 0.1); border-radius: 3px; }
.list-content::-webkit-scrollbar-thumb { background: rgba(0, 255, 255, 0.3); border-radius: 3px; }
.list-content::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 255, 0.5); }

/* 分页组件样式 */
.pagination-container { 
  position: relative; 
  z-index: 2; 
  padding: 10px; 
  background: rgba(0, 28, 56, 0.8); 
  border-top: 1px solid rgba(0, 255, 255, 0.2); 
  margin-top: 10px; 
}
.pagination-info { 
  font-size: 12px; 
  color: rgba(203, 239, 255, 0.7); 
  text-align: center; 
  margin-bottom: 8px; 
}
.pagination-controls { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 10px; 
}
.page-btn { 
  width: 28px; 
  height: 28px; 
  border: 1px solid rgba(0, 255, 255, 0.3); 
  background: rgba(0, 28, 56, 0.8); 
  color: #cbefff; 
  border-radius: 4px; 
  cursor: pointer; 
  font-size: 16px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: all 0.3s ease; 
}
.page-btn:hover:not(:disabled) { 
  background: rgba(0, 255, 255, 0.1); 
  border-color: rgba(0, 255, 255, 0.6); 
  color: #00ffff; 
}
.page-btn:disabled { 
  opacity: 0.4; 
  cursor: not-allowed; 
  background: rgba(0, 28, 56, 0.4); 
}
.page-info { 
  font-size: 12px; 
  color: #cbefff; 
  min-width: 60px; 
  text-align: center; 
}
</style>

