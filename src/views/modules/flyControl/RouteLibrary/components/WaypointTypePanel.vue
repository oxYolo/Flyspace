<template>
  <div class="waypoint-type-panel">
    <div class="type-row">
      <span class="triangle"></span>
      <span class="waypoint-index">1</span>
      <button class="icon-btn"><el-icon><Edit /></el-icon></button>
      <button class="icon-btn"><el-icon><Delete /></el-icon></button>
    </div>
    <div class="key-row">
      <div class="key-btn"><el-icon><BottomLeft /></el-icon><span>Q</span></div>
      <div class="key-btn"><el-icon><ArrowUp /></el-icon><span>W</span></div>
      <div class="key-btn"><el-icon><BottomRight /></el-icon><span>E</span></div>
    </div>
    <div class="status-row">虚拟飞行中</div>
    <div class="key-row">
      <div class="key-btn"><el-icon><ArrowLeft /></el-icon><span>A</span></div>
      <div class="key-btn"><el-icon><ArrowDown /></el-icon><span>S</span></div>
      <div class="key-btn"><el-icon><ArrowRight /></el-icon><span>D</span></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Edit, Delete, ArrowLeft, ArrowUp, ArrowRight, ArrowDown, BottomLeft, BottomRight } from '@element-plus/icons-vue';
</script>
<style scoped>
.waypoint-type-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #0ff;
  min-width: 120px;
}
.type-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.dropdown-btn, .icon-btn {
  background: #444;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}
.waypoint-index, .type-label {
  font-size: 18px;
  color: #0ff;
  font-weight: bold;
  margin: 0 4px;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
}
.key-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.key-row {
  display: flex;
  gap: 6px;
  padding: 8px;
  padding-bottom: 12px;
  background: #444;
  border-radius: 8px;
}
.key-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 4px;
  width: 32px;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
.key-btn span {
  background: #222;
  padding: 3px 7px;
  cursor: pointer;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
}
.key-btn .el-icon {
  margin: 4px;
}
.value-row {
  margin: 4px 0;
  color: #0ff;
  font-size: 14px;
  font-weight: bold;
}
.unit {
  background: transparent;
}
.status-row {
  color: #0ff;
  text-align: center;
  margin: 6px 0;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
}
.triangle {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 12px solid #2196f3;
  margin-right: 6px;
  display: inline-block;
  vertical-align: middle;
  /* 黑色描边 */
  filter: drop-shadow(-1px -1px 0 #000) drop-shadow(1px -1px 0 #000) drop-shadow(-1px 1px 0 #000) drop-shadow(1px 1px 0 #000);
}
.latlng-input {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex: 1;
  height: 100%;
}
</style> 