<template>
   <div class="right-bottom-panel op-theme-filter" title="通知公告">
     <div class="card-body">
        <div
          v-for="(item, index) in noticeList"
          :key="index"
          class="notice-item"
        >
          <span class="notice-tag">通知公告</span>
          <span class="notice-title" v-tooltip="item.title">{{ item.title }}</span>
          <span class="notice-time">{{ item.pubDate }}</span>
        </div>
     </div>
   </div>
</template>

<script setup lang="ts">
import { useRightBottomModule } from '../composables/useRightBottomModule'
const { noticeList } = useRightBottomModule()
</script>


<style lang="less" scoped>
.right-bottom-panel{
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  .card-body {
    width: 100%;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 5px;
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 238, 255, 0.3);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    .notice-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      padding-right: 5px ;
      font-size: 18px;
      &:hover{
        background: rgba(0, 227, 252, 0.1);
        border: 1px solid rgba(0, 238, 255, 0.8);
        .notice-title {
          color: #06FFF8;
          font-weight: bold;
        }
      }
      .notice-tag {
        background: #0A909B;
        border: 1px solid rgba(0, 238, 255, 0.5);
        padding: 5px;
        display: inline-block;
        font-size: 14px;
      }
      .notice-title {
        flex: 1;
        max-width: 150px;
        margin: 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .notice-time {
        color: rgba(255, 255, 255, 0.8);
        text-align: right;
        min-width: 150px;
        font-size: 16px;
      }
    }

  }
}
</style>
