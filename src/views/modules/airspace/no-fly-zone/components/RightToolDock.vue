<template>
  <div class="right-tool-dock">

    <div class="dock-body">
      <div
        v-for="btn in buttons"
        :key="btn.key"
        class="tool-item"
        :class="{ active: activeKey === btn.key }"
        @click="onClick(btn.key)"
      >
        <div class="icon">{{ btn.icon }}</div>
        <div class="label">{{ btn.label }}</div>
        <div class="divider" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type ToolKey =
  | 'create'
  | 'edit'
  | 'save'
  | 'cancel'
  | 'arc'

const emit = defineEmits<{
  (e: 'create'): void
  (e: 'edit'): void
  (e: 'save'): void
  (e: 'cancel'): void
  (e: 'create-arc'): void
}>()

const activeKey = ref<ToolKey | ''>('')

const buttons: Array<{ key: ToolKey; label: string; icon: string; emit: string }> = [
  { key: 'create', label: '创建禁飞区', icon: '＋', emit: 'create' },
  { key: 'edit', label: '编辑模式', icon: '✎', emit: 'edit' },
  { key: 'save', label: '保存编辑', icon: '💾', emit: 'save' },
  { key: 'cancel', label: '取消操作', icon: '✕', emit: 'cancel' },
  { key: 'arc', label: '圆弧区', icon: '◴', emit: 'create-arc' },
]

function onClick(key: ToolKey) {
  activeKey.value = key
  switch (key) {
    case 'create': emit('create'); break
    case 'edit': emit('edit'); break
    case 'save': emit('save'); break
    case 'cancel': emit('cancel'); break
    case 'arc': emit('create-arc'); break
  }
}
</script>

<style scoped lang="less">
.right-tool-dock {
  position: relative;
  width: 120px;
  pointer-events: auto;
}

.dock-cap {
  width: 100%;
  height: 26px;
  background: url("@/assets/images/flyControl/bottom_nav_left.png") center/100% 100% no-repeat;
  filter: hue-rotate(180deg) brightness(0.9);
}


.dock-body {
  background: rgba(0, 10, 20, 0.85);
  border: 1px solid rgba(0, 255, 255, 0.28);
  border-left-width: 2px;
  border-right-width: 2px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.35);
  backdrop-filter: blur(8px);
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 86px;
  color: #cfefff;
  cursor: pointer;
  position: relative;
  transition: filter .2s ease, background-color .2s ease;
}

.tool-item .icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 6px;
  text-shadow: 0 0 6px rgba(0,255,255,0.6);
}

.tool-item .label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
}

.tool-item .divider {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,255,255,.5), transparent);
  box-shadow: 0 0 8px rgba(0,255,255,.5);
}

.tool-item:last-child .divider { display: none; }

.tool-item:hover { filter: brightness(1.1); }
.tool-item.active {
  background: linear-gradient(180deg, rgba(0, 120, 200, 0.35), rgba(0, 50, 120, 0.35));
  box-shadow: inset 0 0 10px rgba(0, 200, 255, 0.4);
}

@media (max-width: 768px) {
  .right-tool-dock { width: 100px; }
  .tool-item { height: 72px; }
  .tool-item .icon { font-size: 20px; }
  .tool-item .label { font-size: 11px; }
}
</style>


