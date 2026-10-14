<template>
  <aside class="tool-dock">
    <div class="dock-cap top"></div>
    <ul class="dock-list">
      <li v-for="btn in buttons" :key="btn.key"
          class="dock-item"
          :class="{ active: activeKey === btn.key }"
          @click="handleClick(btn.key)">
        <div class="icon-wrap">
          <img :src="btn.icon" :alt="btn.label" />
        </div>
        <div class="label">{{ btn.label }}</div>
        <div class="separator"></div>
      </li>
    </ul>
    <div class="dock-cap bottom"></div>
  </aside>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue'

interface DockButton { key: string; label: string; icon: string }

const props = defineProps<{ modelValue: string; buttons: DockButton[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'select', v: string): void }>()

const activeKey = ref<string>(props.modelValue)

function handleClick(key: string) {
  activeKey.value = key
  emit('update:modelValue', key)
  emit('select', key)
}
</script>

<style scoped lang="less">
.tool-dock {
  position: absolute;
  right: 24px;
  top: 140px;
  width: 96px;
  padding: 0;
  pointer-events: auto;
}
.dock-cap {
  height: 18px;
  background: url("@/assets/images/flyControl/bottom_nav_left.png") center/100% 100% no-repeat;
  &.bottom { background-image: url("@/assets/images/flyControl/bottom_nav_right.png"); }
}
.dock-list {
  background: rgba(0, 10, 20, 0.9);
  border: 1px solid rgba(0, 255, 255, 0.28);
  border-left-width: 2px;
  border-right-width: 2px;
  border-radius: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 78px;
  padding: 8px 6px 6px;
  cursor: pointer;
  color: #cfefff;
  transition: background 0.15s ease, filter 0.15s ease;
  position: relative;
}
.dock-item .icon-wrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url("@/assets/images/flyControl/bottom_nav_middle.png") center/100% 100% no-repeat;
  border-radius: 8px;
  margin-bottom: 6px;
  box-shadow: 0 4px 12px rgba(0, 115, 230, 0.25);
}
.dock-item .icon-wrap img { width: 22px; height: 22px; filter: brightness(1.2); }
.dock-item .label { font-size: 12px; font-weight: 700; text-align: center; line-height: 1.1; }
.dock-item .separator { position: absolute; bottom: 0; left: 10px; right: 10px; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,255,255,.6), transparent); opacity: .35; }
.dock-item:last-child .separator { display: none; }
.dock-item:hover { filter: brightness(1.06); }
.dock-item.active .icon-wrap { background-image: url("@/assets/images/flyControl/bottom_active_middle.png"); }

@media (max-width: 1200px) {
  .tool-dock { right: 12px; top: 120px; width: 86px; }
  .dock-item { height: 70px; }
}
</style>


