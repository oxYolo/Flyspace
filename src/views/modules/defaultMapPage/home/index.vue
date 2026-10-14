<script setup lang="ts">
import CompanyServiceLeft from "./left/index.vue";
import CompanyServiceRight from "./right/index.vue";

import { useSidebarStore } from "@/stores/sidebar";
import leftCollapseImg from '@/assets/images/common/左折叠.png'
import leftExpandImg from '@/assets/images/common/左展开.png'
import rightCollapseImg from '@/assets/images/common/右折叠.png'
import rightExpandImg from '@/assets/images/common/右展开.png'

const sidebarStore = useSidebarStore();

const clickLeftAndRightBtn = () => {
  const flag = sidebarStore.leftOpen
  sidebarStore.setLeftOpen(!flag)
  sidebarStore.setRightOpen(!flag)
}
</script>

<template>
  <div>
    <div class="left-btn" @click="clickLeftAndRightBtn">
      <img v-if="sidebarStore.leftOpen" :src="leftCollapseImg" alt="" />
      <img v-else :src="leftExpandImg" alt="" />
    </div>
    <div class="right-btn" @click="clickLeftAndRightBtn">
      <img v-if="sidebarStore.rightOpen" :src="rightCollapseImg" alt="" />
      <img v-else :src="rightExpandImg" alt="" />
    </div>
    <CompanyServiceLeft />
    <CompanyServiceRight />
  </div>
</template>
