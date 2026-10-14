<template>
  <div class="bottom-box">
    <div class="container">
      <ul class="flex-float inner-box">
        <!--一级目录-->
        <li v-for="item in reactiveMenu" :key="item.name"
          :class="{
            active: item.name === activeMenu,
          }"
          @click.self="listClick(item)">
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { ref, onBeforeMount, watch } from "vue";
const router = useRouter();
const route = useRoute();


const bottomList = [
  { name: '空域管理', path: 'list' },
  { name: '禁飞区', path: 'no-fly-zone' },
  { name: '空域申请', path: 'application' },
]
const activeMenu = ref('')
const reactiveMenu = ref([])

// 根据当前路由设置激活菜单
function setActiveMenuByRoute() {
  activeMenu.value = ''
  const currentPath = route.path
  const matchedMenu = reactiveMenu.value.find(item => currentPath.indexOf(item.path) > -1)
  if (matchedMenu) {
    activeMenu.value = matchedMenu.name
  }
}

onBeforeMount(() => {
  reactiveMenu.value = bottomList
  // 根据当前路由设置激活菜单
  setActiveMenuByRoute()
})

// 监听路由变化，更新激活菜单
watch(() => route.path, () => {
  setActiveMenuByRoute()
})

// 一级
function listClick(item: any = {}) {
  activeMenu.value = item.name;
  router.push(`/airspace-management/${item.path}`);
}
</script>

<style scoped lang="less">
@font-color: #ffffff;

.bottom-box {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  -webkit-transform: translateX(-50%);
  width: 13rem;
  height: 0.62rem;
  background-size: 100% 100%;
  z-index: 99;

  .container {
    position: absolute;
    bottom: 0.01rem;
    left: 50%;
    transform: translateX(-50%);
    -webkit-transform: translateX(-50%);

    .inner-box {
      li {
        width: 1.28rem;
        height: 0.6rem;
        float: left;
        background: url("@/assets/images/flyControl/bottom_nav_middle.png") no-repeat;
        background-size: 100% 100%;
        text-align: center;
        color: @font-color;
        line-height: 0.6rem;
        font-weight: 700;
        margin-right: -0.15rem;
        font-size: 0.18rem;
        cursor: pointer;
        position: relative;

        &.active {
          background-image: url("@/assets/images/flyControl/bottom_active_middle.png");
          color: #fff;
          text-shadow: 1px 1px 1px grey;
        }


        &:nth-child(1) {
          width: 1.52rem;
          height: 0.6rem;
          padding-left: 0.36rem;
          background: url("@/assets/images/flyControl/bottom_nav_left.png") no-repeat;
          background-size: 100% 100%;
          text-align: center;
          color: @font-color;
          line-height: 0.6rem;
          font-weight: 700;
          margin-right: -0.15rem;
          cursor: pointer;

          &.active {
            background-image: url("@/assets/images/flyControl/bottom_active_left.png");
            color: #fff;
            text-shadow: 1px 1px 1px grey;
          }
        }

        &:last-child {
          width: 1.52rem;
          height: 0.6rem;
          padding-right: 0.36rem;
          background: url("@/assets/images/flyControl/bottom_nav_right.png") no-repeat;
          background-size: 100% 100%;
          text-align: center;
          color: @font-color;
          line-height: 0.6rem;
          font-weight: 700;
          margin-right: -0.15rem;
          cursor: pointer;

          &.active {
            background-image: url("@/assets/images/flyControl/bottom_active_right.png");
            color: #fff;
            text-shadow: 1px 1px 1px grey;
          }
        }

        // 禁用状态样式
        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;

          &:hover {
            opacity: 0.9;
          }
        }
      }
    }
  }
}
</style>
