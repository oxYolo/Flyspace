<template>
  <div class="zone-explorer" v-show="visible">
    <div class="header">
      <img src="/src/assets/images/common/tit.png" class="title-bg" alt="标题" />
      <span class="title">禁飞区/限飞区查询</span>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="filters">
      <input class="keyword" v-model="keyword" placeholder="请输入禁飞区名称" @keyup.enter="handleSearch" />
      <select class="type" v-model="zoneType">
        <option value="">全部类型</option>
        <option value="机场周边">机场周边</option>
        <option value="军事禁区与军事管理区">军事禁区与军事管理区</option>
        <option value="党政机关">党政机关</option>
        <option value="重要基础设施">重要基础设施</option>
        <option value="其他敏感区域">其他敏感区域</option>
        <option value="国界线、边境线">国界线、边境线</option>
      </select>
      <select class="type" v-model="status">
        <option value="">全部状态</option>
        <option value="禁飞区">禁飞区</option>
        <option value="限飞区">限飞区</option>
      </select>
      <button class="primary" @click="handleSearch">搜索</button>
      <button class="reset" @click="reset">重置</button>
    </div>
    <div class="result">
      <div class="table" role="table">
        <div class="thead" role="rowgroup">
          <div class="tr" role="row">
            <div class="th col-name" role="columnheader">名称</div>
            <div class="th col-type" role="columnheader">类型</div>
            <div class="th col-height" role="columnheader">高度范围</div>
            <div class="th col-buffer" role="columnheader">缓冲</div>
            <div class="th col-op" role="columnheader">操作</div>
          </div>
        </div>
        <div class="tbody" role="rowgroup">
          <template v-for="item in items" :key="item.id">
            <div class="tr" role="row">
              <div class="td col-name" role="cell">{{ item.name }}</div>
              <div class="td col-type" role="cell">{{ item.type || '—' }}</div>
              <div class="td col-height" role="cell">{{ (item.minAltitude ?? 0) }}m - {{ (item.maxAltitude ?? 0) }}m</div>
              <div class="td col-buffer" role="cell">{{ item.bufferMeters ?? 0 }}m</div>
              <div class="td col-op" role="cell">
                <button class="link" @click="$emit('locate', item.id!)">定位</button>
                <button class="link" @click="toggleDesc(item.id!)">描述</button>
              </div>
            </div>
            <div class="tr desc-row" v-if="expandedId === item.id" role="row">
              <div class="td desc-cell" role="cell" colspan="5">{{ item.description || '暂无描述' }}</div>
            </div>
          </template>
        </div>
      </div>

      <!-- 横向分页（无竖向滚动） -->
      <div class="pagination-container" v-if="totalPages > 1">
        <div class="pagination-controls">
          <button class="page-btn" :disabled="page <= 1" @click="handlePageChange(page - 1)" title="上一页">‹</button>
          <span class="page-info">{{ page }} / {{ totalPages }}</span>
          <button class="page-btn" :disabled="page >= totalPages" @click="handlePageChange(page + 1)" title="下一页">›</button>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { INoFlyZone } from '@/model/noFlyZone'

interface Props { visible: boolean; items: INoFlyZone[]; total: number; page: number; pageSize: number }
const props = defineProps<Props>()
const emit = defineEmits<{(e:'search', p:{ keyword:string; type:string; page:number; pageSize:number }):void, (e:'close'):void, (e:'locate', id:string):void, (e:'page-change', page:number):void }>()

const keyword = ref('')
const zoneType = ref('')
const status = ref('')
const expandedId = ref<string>('')

// 计算总页数
const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

function emitSearch() {
  // 搜索时重置到第一页
  emit('search', { 
    keyword: keyword.value, 
    type: zoneType.value, 
    page: 1, 
    pageSize: props.pageSize 
  })
}

function handleSearch() {
  // 处理搜索输入，重置到第一页
  console.debug('[ZoneExplorer] handleSearch:', { 
    keyword: keyword.value, 
    type: zoneType.value, 
    page: 1, 
    pageSize: props.pageSize 
  })
  emit('search', { 
    keyword: keyword.value, 
    type: zoneType.value, 
    page: 1, 
    pageSize: props.pageSize 
  })
}

function reset() {
  keyword.value = ''
  zoneType.value = ''
  status.value = ''
  emit('search', { keyword: '', type: '', page: 1, pageSize: props.pageSize })
}

function handlePageChange(page: number) {
  emit('page-change', page)
}

function toggleDesc(id: string): void {
  expandedId.value = expandedId.value === id ? '' : id
}

watch(() => props.visible, (v) => { 
  if (v) {
    // 打开时重置搜索条件，但不自动触发搜索
    // 让主组件控制何时进行初始数据加载
    keyword.value = ''
    zoneType.value = ''
    status.value = ''
  }
})
</script>

<style scoped lang="less">
.zone-explorer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1000px;
  height: 680px; /* 固定高度，避免纵向滚动 */
  overflow: hidden;
  z-index: 2200;
  padding: 16px 16px 18px 16px;
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  pointer-events: auto; /* 确保可以接收点击事件 */
}
.header { position: relative; height: 40px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.title-bg { position: absolute; top: 0; left: 50%; transform: translateX(-50%); height: 100%; }
.title { position: relative; color: #00ffff; font-weight: 700; }
.close-btn { position: absolute; right: 6px; top: 6px; width: 28px; height: 28px; border: none; border-radius: 4px; cursor: pointer; background: rgba(0,0,0,0.35); color: #fff; }
.filters { display: flex; gap: 12px; padding: 10px; align-items: center; }
.keyword { flex: 1.8; height: 40px; background: rgba(0, 28, 56, 0.85); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 10px; color: #cbefff; padding: 0 12px; }
.type { flex: 1; height: 40px; background: rgba(0, 28, 56, 0.85); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 10px; color: #cbefff; padding: 0 12px; }
.type { appearance: none; -webkit-appearance: none; -moz-appearance: none; }
.type option { background-color: #0b1a3a; color: #cbefff; }
.primary, .reset { height: 40px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(0,255,255,0.35); cursor: pointer; color: #fff; }
.primary { background: linear-gradient(135deg, #00aaff, #0088cc); }
.reset { background: rgba(0, 28, 56, 0.85); }
.result { padding: 10px 12px 0; height: calc(100% - 120px); display: flex; flex-direction: column; }
.table { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.thead { flex: none; }
.tbody { flex: 1; overflow: hidden; }
.tr { display: grid; grid-template-columns: 3fr 2fr 2.5fr 1.5fr 1.8fr; align-items: center; }
.th, .td { padding: 8px 10px; border-bottom: 1px solid rgba(0,255,255,0.15); color: #cbefff; }
.th { font-weight: 700; background: rgba(0, 28, 56, 0.7); }
.td { background: rgba(0,255,255,0.04); }
.td.col-op { display: flex; gap: 10px; }
.link { background: transparent; border: 1px solid rgba(0,255,255,0.35); color: #cbefff; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.link:hover { background: rgba(0,255,255,0.12); }
.desc-row .desc-cell { grid-column: 1 / -1; background: rgba(0, 28, 56, 0.6); border-bottom: 1px solid rgba(0,255,255,0.15); }

/* 分页组件样式 */
.pagination-container { 
  margin-top: 12px; 
  padding: 10px; 
  background: rgba(0, 28, 56, 0.8); 
  border-top: 1px solid rgba(0, 255, 255, 0.2); 
  border-radius: 8px;
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


