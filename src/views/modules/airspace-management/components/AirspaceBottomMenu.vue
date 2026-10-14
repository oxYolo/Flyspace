<template>
  <div class="bottom-box">
    <div class="container">
      <ul class="inner-box">
        <li v-for="item in menus" :key="item.key"
            :class="{ active: item.key === modelValue }"
            @click="handleClick(item.key)">
          {{ item.label }}
        </li>
      </ul>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface MenuItem { key: string; label: string }

const props = defineProps<{ modelValue: string; menus: MenuItem[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'change', v: string): void }>()

function handleClick(key: string) {
  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<style scoped lang="less">
.bottom-box {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 13rem;
  height: 0.62rem;
  z-index: 99;

  .container {
    position: absolute;
    bottom: 0.01rem;
    left: 50%;
    transform: translateX(-50%);

    .inner-box {
      li {
        width: 1.28rem;
        height: 0.6rem;
        float: left;
        background: url("@/assets/images/flyControl/bottom_nav_middle.png") no-repeat;
        background-size: 100% 100%;
        text-align: center;
        color: #fff;
        line-height: 0.6rem;
        font-weight: 700;
        margin-right: -0.15rem; // 负边距拼接
        font-size: 0.18rem;
        cursor: pointer;

        &.active {
          background-image: url("@/assets/images/flyControl/bottom_active_middle.png");
          text-shadow: 1px 1px 1px grey;
        }

        &:nth-child(1) {
          width: 1.52rem;
          padding-left: 0.36rem;
          background: url("@/assets/images/flyControl/bottom_nav_left.png") no-repeat;
          background-size: 100% 100%;
          &.active { background-image: url("@/assets/images/flyControl/bottom_active_left.png"); }
        }

        &:last-child {
          width: 1.52rem;
          padding-right: 0.36rem;
          background: url("@/assets/images/flyControl/bottom_nav_right.png") no-repeat;
          background-size: 100% 100%;
          &.active { background-image: url("@/assets/images/flyControl/bottom_active_right.png"); }
        }
      }
    }
  }
}
</style>


