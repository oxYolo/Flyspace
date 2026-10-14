<template>
  <div class="search-filter">
    <!-- 左半边：搜索框 -->
    <div class="search-section">
      <input 
        class="search-input" 
        v-model="searchKeyword"
        placeholder="搜索名称" 
        @input="handleSearchInput"
        @keyup.enter="handleSearch"
      />
    </div>
    
    <!-- 右半边：类型选择器 -->
    <div class="filter-section">
       <select 
         class="type-select" 
         v-model="selectedType"
         @change="handleTypeChange"
       >
         <option value="">全部类型</option>
         <option value="机场周边">机场周边</option>
         <option value="军事禁区与军事管理区">军事禁区与军事管理区</option>
         <option value="党政机关">党政机关</option>
         <option value="重要基础设施">重要基础设施</option>
         <option value="其他敏感区域">其他敏感区域</option>
         <option value="国界线、边境线">国界线、边境线</option>
       </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Emits {
  (e: 'search', keyword: string): void
  (e: 'filter', type: string): void
  (e: 'change', params: { keyword: string; type: string }): void
}

const emit = defineEmits<Emits>()

const searchKeyword = ref('')
const selectedType = ref('')

// 防抖处理搜索输入
let searchTimeout: NodeJS.Timeout | null = null

function handleSearchInput(): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    emit('search', searchKeyword.value)
    emit('change', { keyword: searchKeyword.value, type: selectedType.value })
  }, 300) // 300ms 防抖
}

function handleSearch(): void {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  emit('search', searchKeyword.value)
  emit('change', { keyword: searchKeyword.value, type: selectedType.value })
}

function handleTypeChange(): void {
  emit('filter', selectedType.value)
  emit('change', { keyword: searchKeyword.value, type: selectedType.value })
}

// 重置功能
function reset(): void {
  searchKeyword.value = ''
  selectedType.value = ''
  emit('search', '')
  emit('filter', '')
  emit('change', { keyword: '', type: '' })
}

// 暴露重置方法给父组件
defineExpose({ reset })
</script>

<style lang="less" scoped>
.search-filter {
  display: flex;
  gap: 8px;
  width: 100%;
  height: 35px;
}

.search-section {
  flex: 1;
  min-width: 0;
}

.search-input {
  width: 100%;
  height: 100%;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px 0 0 8px;
  color: #cbefff;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: rgba(203, 239, 255, 0.6);
}

.search-input:focus {
  border-color: #00ffff;
  background: rgba(0, 255, 255, 0.15);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.filter-section {
  flex: 1;
  min-width: 0;
}

.type-select {
  width: 100%;
  height: 100%;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 0 8px 8px 0;
  color: #cbefff;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  cursor: pointer;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300ffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.type-select:focus {
  border-color: #00ffff;
  background-color: rgba(0, 255, 255, 0.15);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.type-select option {
  background: rgba(0, 28, 56, 0.95);
  color: #cbefff;
  padding: 8px 12px;
}

.type-select:hover {
  border-color: rgba(0, 255, 255, 0.5);
  background-color: rgba(0, 255, 255, 0.12);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .search-filter {
    flex-direction: column;
    height: auto;
    gap: 6px;
  }
  
  .search-input {
    border-radius: 8px;
  }
  
  .type-select {
    border-radius: 8px;
  }
}
</style>
