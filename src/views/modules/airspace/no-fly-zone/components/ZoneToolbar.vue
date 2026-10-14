<template>
  <div class="zone-toolbar">
    <button class="toolbar-btn create-btn" :class="{ active: activeKey==='create' }" @click="handleCreate">
      <span class="btn-icon">+</span>
      <span class="btn-text">创建禁飞区</span>
    </button>
    <button class="toolbar-btn edit-btn" :class="{ active: activeKey==='edit' }" @click="handleEdit">
      <span class="btn-icon">✏️</span>
      <span class="btn-text">编辑模式</span>
    </button>
    <button class="toolbar-btn save-btn" @click="handleSave">
      <span class="btn-icon">💾</span>
      <span class="btn-text">保存编辑</span>
    </button>
    <button class="toolbar-btn cancel-btn" @click="handleCancel">
      <span class="btn-icon">❌</span>
      <span class="btn-text">取消操作</span>
    </button>
    <button class="toolbar-btn arc-btn" :class="{ active: activeKey==='arc' }" @click="handleCreateArc">
      <span class="btn-icon">◴</span>
      <span class="btn-text">圆弧区</span>
    </button>
    
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
interface Emits { (e: 'create'): void; (e: 'edit'): void; (e: 'save'): void; (e: 'cancel'): void; (e: 'deleted', id: string): void; (e: 'create-arc'): void }
const emit = defineEmits<Emits>()
const activeKey = ref<string>('')
function setActive(key: string) { activeKey.value = key }
function clearActive() { activeKey.value = '' }
function handleCreate(): void { setActive('create'); emit('create') }
function handleEdit(): void { setActive('edit'); emit('edit') }
function handleSave(): void { clearActive(); emit('save') }
function handleCancel(): void { clearActive(); emit('cancel') }
function handleCreateArc(): void { setActive('arc'); emit('create-arc') }

</script>

<style lang="less" scoped>
.zone-toolbar {
  display: flex;
  gap: 20px; // 统一按钮间距
  padding: 14px 24px;
  background: linear-gradient(180deg, rgba(6, 18, 30, 0.92) 0%, rgba(8, 18, 28, 0.92) 100%);
  border: 1px solid rgba(0, 255, 255, 0.22);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 28px rgba(0, 18, 30, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  pointer-events: auto; // 确保可以接收点击事件
}

// 胶囊蓝色按钮（与飞控底部标签同源素材）
.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 132px; // 统一按钮宽度
  height: 38px;     // 统一按钮高度
  padding: 0 16px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  position: relative;
  overflow: hidden;
  background: url("@/assets/images/flyControl/bottom_nav_middle.png") center/100% 100% no-repeat;
  box-shadow: 0 4px 14px rgba(0, 115, 230, 0.25);
  transition: transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease;
}
.toolbar-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.24), transparent);
  transition: left 0.5s;
}
.toolbar-btn:hover::before { left: 100%; }
.toolbar-btn:hover { transform: translateY(-1px); filter: brightness(1.04); box-shadow: 0 6px 18px rgba(0, 115, 230, 0.35); }
.toolbar-btn:active { transform: translateY(0); filter: brightness(0.98); }
.toolbar-btn.active {
  background: url("@/assets/images/flyControl/bottom_active_middle.png") center/100% 100% no-repeat;
}

// 左右箭头外形：首尾按钮分别使用左右切片
.zone-toolbar .toolbar-btn:first-child {
  min-width: 148px; // 左右箭头两侧略宽
  padding-left: 24px;
  background: url("@/assets/images/flyControl/bottom_nav_left.png") center/100% 100% no-repeat;
}
.zone-toolbar .toolbar-btn:first-child.active {
  background: url("@/assets/images/flyControl/bottom_active_left.png") center/100% 100% no-repeat;
}

.zone-toolbar .toolbar-btn:last-child {
  min-width: 148px;
  padding-right: 24px;
  background: url("@/assets/images/flyControl/bottom_nav_right.png") center/100% 100% no-repeat;
}
.zone-toolbar .toolbar-btn:last-child.active {
  background: url("@/assets/images/flyControl/bottom_active_right.png") center/100% 100% no-repeat;
}

.btn-icon { font-size: 18px; line-height: 1; filter: drop-shadow(0 1px 0 rgba(0,0,0,0.25)); }
.btn-text { line-height: 1; white-space: nowrap; }

@media (max-width: 768px) {
  .zone-toolbar { flex-wrap: wrap; gap: 10px; padding: 10px 15px; }
  .toolbar-btn { min-width: auto; height: 34px; padding: 0 12px; font-size: 12px; }
  .btn-text { display: none; }
}
</style>

