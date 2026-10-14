<template>
  <div class="map-vertical-toolbar">
    <div class="toolbar-columns">
      <!-- 主按钮列 -->
      <div class="toolbar-col">
        <div class="toolbar-title">基于飞行器位置</div>
        <div
          v-for="(item, idx) in mainButtons"
          :key="item.label"
          class="toolbar-row"
          @mouseenter="hoverIdx = idx"
          @mouseleave="hoverIdx = null"
          @click="handleClickToolbarBtn(item)"
        >
          <button
            class="toolbar-btn"
          >
            <img :src="item.icon" :alt="item.label" class="icon-img" />
          </button>
          <span
            class="toolbar-label"
            :class="{ hovered: hoverIdx === idx }"
            v-tooltip="item.label"
            v-html="item.label"
          ></span>
        </div>
        <!-- 视角相关按钮单独一组 -->
        <div class="view-btns">
          <div
            v-for="(item, idx) in viewButtons"
            :key="item.label"
            class="toolbar-row view-toolbar-row"
            style="position:relative;"
          >
            <button
              class="toolbar-btn"
              v-tooltip="item.label"
              @mouseenter="hoverViewIdx = idx"
              @mouseleave="hoverViewIdx = null"
            >
              <img :src="item.icon" :alt="item.label" class="icon-img" />
            </button>
            <span
              class="toolbar-label show-on-hover abs-label"
              :class="{ hovered: hoverViewIdx === idx }"
              v-tooltip="item.label"
              v-html="item.label"
              v-show="hoverViewIdx === idx"
            ></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import orientedShoot from '@/assets/images/tool/相机2.svg'
import iconPanorama from '@/assets/images/tool/360度、全景.svg'
import iconVideoStart from '@/assets/images/tool/开始录像.svg'
import iconVideoStop from '@/assets/images/tool/停止录像.svg'
import iconHover from '@/assets/images/tool/悬停.svg'
import iconYaw from '@/assets/images/tool/飞行器偏航角.svg'
import iconGimbal from '@/assets/images/tool/云台俯仰角.svg'
import iconPhoto from '@/assets/images/tool/拍照.svg'
import iconZoom from '@/assets/images/tool/相机变焦.svg'
import iconViewUnfollow from '@/assets/images/tool/鼠标滚轮.svg'
import iconViewFollow from '@/assets/images/tool/开锁.svg'
import gimbalYawRotateAngle from '@/assets/images/tool/云台偏航角.svg'
import emitter from "@/stores/mitt";

const mainButtons = [
  { type: "reachPoint", id: "startRecord", icon: iconVideoStart, label: '开始录像' },
  { type: "reachPoint", id: "stopRecord", icon: iconVideoStop, label: '停止录像' },
  { type: "reachPoint", id: "hoverTime", icon: iconHover, label: '悬停' },
  { type: "reachPoint", id: "aircraftHeading", icon: iconYaw, label: '飞行器偏航角' },
  { type: "reachPoint", id: "gimbalPitchRotateAngle", icon: iconGimbal, label: '云台俯仰角' },
  { type: "reachPoint", id: "gimbalYawRotateAngle", icon: gimbalYawRotateAngle, label: '云台偏航角' },
  { type: "reachPoint", id: "takePhotoType", icon: iconPhoto, label: '拍照' },
  { type: "reachPoint", id: "orientedPhotoMode", icon: orientedShoot, label: '定向拍照 [F]' },
  { type: "reachPoint", id: "panoShot", icon: iconPanorama, label: '全景拍照' },
  { type: "reachPoint", id: "zoom", icon: iconZoom, label: '相机变焦' },
];

const hoverIdx = ref<number|null>(null);
const viewButtons = [
  { icon: iconViewUnfollow, label: '视角不跟随鼠标[v]' },
  { icon: iconViewFollow, label: '视角跟随' }
];
const hoverViewIdx = ref<number|null>(null);

const handleClickToolbarBtn = (toolbar: any) => {
  emitter.emit('add-action-to-waypoint', toolbar);
}
</script>

<style scoped>
.map-vertical-toolbar {
  position: fixed;
  top: 120px;
  left: calc(370px + var(--fly-control-left-panel-width, 320px));
  width: 420px;
  height: 600px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
  background: transparent;
  transition: left 0.3s ease;
}
.toolbar-columns {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
}
.toolbar-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
  flex: none;
}
.toolbar-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
  margin-bottom: 10px;
  letter-spacing: 1px;
  pointer-events: auto;
  white-space: nowrap;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}
.toolbar-btn {
  width: 35px;
  height: 35px;
  background: #222;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.icon-img {
  width: 22px;
  height: 22px;
  filter: brightness(10); /* 变白色 */
}
.toolbar-label {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  line-height: 18px;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
  padding: 7px 10px;
  border-radius: 6px;
  background: transparent;
  transition: background 0.2s, color 0.2s;
  user-select: none;
  font-family: Open Sans,PingFang SC,Microsoft YaHei,Helvetica Neue,Hiragino Sans GB,WenQuanYi Micro Hei,Arial,sans-serif;
}
.toolbar-label.hovered {
  background: #222;
  color: #fff;
}
.toolbar-label.show-on-hover {
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  display: inline-block;
  min-height: 24px;
  min-width: 135px;
  color: transparent;
  background: transparent;
  text-shadow: none;
  white-space: pre-line;
  overflow: visible;
}
.toolbar-row:hover .toolbar-label.show-on-hover {
  opacity: 1;
  pointer-events: auto;
  color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
  /* background: #222; */
}
.view-btns {
  margin-top: 20px; /* 与主按钮组拉开距离，可根据实际调整 */
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.view-toolbar-row {
  position: relative;
}

.abs-label {
  position: absolute;
  left: 48px; /* 按实际按钮宽度+间距调整 */
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  max-width: 220px;
  white-space: pre-line;
  word-break: break-all; /* 允许长单词/英文自动断行 */
  opacity: 0;
  pointer-events: none;
  color: transparent;
  background: transparent;
  text-shadow: none;
  transition: opacity 0.2s;
  font-size: 16px;
  font-weight: 700;
  line-height: 18px;
  border-radius: 6px;
  padding: 7px 10px;
  font-family: Open Sans,PingFang SC,Microsoft YaHei,Helvetica Neue,Hiragino Sans GB,WenQuanYi Micro Hei,Arial,sans-serif;
  box-sizing: border-box;
}

.view-toolbar-row:hover .abs-label {
  opacity: 1;
  pointer-events: auto;
  color: #fff;
  text-shadow: 0 0 10px rgba(0,0,0,.6),-1px -1px rgba(0,0,0,.5),1px -1px rgba(0,0,0,.5),-1px 1px rgba(0,0,0,.5),1px 1px rgba(0,0,0,.5);
  /* background: #222; */
}
</style>
