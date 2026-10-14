<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useSideTabStore, type SideTabType } from "@/stores/side-tab";
import { getImageUrl } from "@/utils/utils";
import { useLayerManageStore } from "@/stores/layer-manage.ts";
const layerManageStore = useLayerManageStore();
// 标签列表类型枚举
enum ListTypeEnum {
  VISIBLE = "visible",
  INVISIBLE = "inVisible",
}

// 全局状态
const sideTabStore = useSideTabStore();
// 可见的标签列表
const visibleList = ref<SideTabType[]>([]);
// 不可见的标签列表
const invisibleList = ref<SideTabType[]>([]);
// 可见的标签列表ul容器
const tabUlRef = ref();
// 是否展开不可见的标签列表
const isExpandInvisibleList = ref(false);
// ul的最大高度, 单位px
const MAX_HEIGHT = 860;

// 监听停靠标签列表数据,调整显示列表
watch(
  () => sideTabStore.sideTabList,
  () => {
    adjustList();
  },
);

// 在组件挂载后和窗口大小改变时调整列表
onMounted(() => {
  adjustList();
  window.addEventListener("resize", adjustList);
});

/**
 * 根据高度调整显示列表和额外列表
 */
const adjustList = () => {
  if (!tabUlRef.value) return;
  const allTabList = sideTabStore.sideTabList.filter((item) => !item.isDraged);
  visibleList.value = allTabList;

  // 列表渲染完后计算高度
  nextTick(() => {
    let currentHeight = 0;
    let currentIndex = null;

    // 遍历列表，找到最大可显示的列表项索引
    for (let i = 0; i < allTabList.length; i++) {
      const itemElement = tabUlRef.value.children[i];
      if (!itemElement) break;

      const itemHeight = itemElement.offsetHeight;
      if (currentHeight + itemHeight > MAX_HEIGHT) {
        currentIndex = i;
        break;
      }
      currentHeight += itemHeight;
    }

    // 根据索引值设置显示列表和额外列表
    if (currentIndex && currentIndex < allTabList.length) {
      visibleList.value = allTabList.slice(0, currentIndex);
      invisibleList.value = allTabList.slice(currentIndex);
    } else {
      visibleList.value = allTabList;
      invisibleList.value = [];
    }
  });
};

/**
 * 执行点击固定按钮方法
 */
const handleFixSideTab = () => {
  sideTabStore.setSideTabFixed(!sideTabStore.isSideTabFixed);
};

/**
 * 执行点击切换标签显隐状态的方法
 * @param {SideTabType} item --当前标签项
 * @param {string} type --标签位置 visible:可见区域，inVisible:不可见区域
 */
const handleToggleTabActive = (item: SideTabType, type: string) => {
  if (item.isDraged) {
    item.isVisible = true;
  } else {
    item.isVisible = true;
    item.isExpand = true;
  }

  if (type === ListTypeEnum.INVISIBLE) {
    // 需要更新位置,调整至列表第一个;
    sideTabStore.updateSideTab(item, 0);
    return;
  }
  sideTabStore.updateSideTab(item);
};

/**
 * 执行关闭标签方法
 * @param {SideTabType} item --当前标签项
 */
const handleCloseTab = (item: SideTabType) => {
  sideTabStore.removeSideTab(item);
  layerManageStore.setLayerManageVisible(false);
};

/**
 * 执行进入停靠标签区域方法
 */
const handleEnterSideTab = () => {
  if (sideTabStore.isSideTabFixed) return;
  const item = sideTabStore.sideTabList.find(
    (item) => item.isVisible && !item.isDraged,
  );
  if (item) {
    item.isExpand = true;
    sideTabStore.updateSideTab(item);
  }
};

/**
 * 执行离开停靠标签区域方法
 */
const handleLeaveSideTab = () => {
  const item = sideTabStore.sideTabList.find(
    (item) => item.isVisible && !item.isDraged,
  );
  if (sideTabStore.isSideTabFixed || !item || item.isDraged) return;
  item.isExpand = false;
  sideTabStore.updateSideTab(item);
};
</script>

<template>
  <!-- 右侧停靠标签 -->
  <div class="side-tabs-container">
    <img
      class="fixed-img"
      v-show="sideTabStore.sideTabList.length > 0"
      :src="
        getImageUrl(
          `components/common/side-tabs/assets/${sideTabStore.isSideTabFixed ? 'side-tab-fix' : 'side-tab-unfix'}.png`,
        )
      "
      :title="sideTabStore.isSideTabFixed ? '取消固定' : '固定面板'"
      @click="handleFixSideTab" />
    <ul
      class="tab-list"
      ref="tabUlRef"
      @mouseenter="handleEnterSideTab"
      @mouseleave="handleLeaveSideTab">
      <li
        v-for="(item, i) in visibleList"
        v-show="!item.isDraged"
        :key="i"
        @click="handleToggleTabActive(item, ListTypeEnum.VISIBLE)"
        :class="[item.isVisible ? 'active' : '']">
        <span>{{ item.name }}</span>
        <img
          src="@/assets/icons/icon-close.svg"
          @click.stop="handleCloseTab(item)"
          title="关闭" />
      </li>
    </ul>
    <div
      class="invisible-div"
      @click="() => (isExpandInvisibleList = !isExpandInvisibleList)"
      v-show="invisibleList.length > 0">
      <img
        :class="['invisible-img', isExpandInvisibleList ? '' : 'rotate']"
        src="@/assets/icons/icon-fold.svg"
        :title="isExpandInvisibleList ? '收起' : '展开'" />

      <div class="invisible-content" v-show="isExpandInvisibleList">
        <ul class="invisible-tab-list">
          <li
            v-for="(item, i) in invisibleList"
            v-show="!item.isDraged"
            :key="i"
            @click="handleToggleTabActive(item, ListTypeEnum.INVISIBLE)">
            <span>{{ item.name }}</span>
            <img
              src="@/assets/icons/icon-close.svg"
              @click.stop="handleCloseTab(item)"
              title="关闭" />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.side-tabs-container {
  position: fixed;
  top: 200px;
  right: 0;
  z-index: 9999;
  .fixed-img {
    position: absolute;
    top: -0.3rem;
    cursor: pointer;
  }

  .tab-list {
    li {
      cursor: pointer !important;
      display: flex;
      flex-direction: column;
      width: 0.24rem;
      box-sizing: border-box;
      padding: 0.15rem 0.04rem 0.09rem 0.06rem;
      background: var(--app-panel-bg);
      border-radius: 4px 0px 0px 4px;

      span {
        color: var(--app-white-color);
        opacity: 0.7;
        margin: 0 auto;
        width: 0.24rem;
        /* padding: 5px; */
        display: inline-block;
        font-size: 0.14rem;
        line-height: 0.16rem;
        /* height: 60px; */
        margin-bottom: 0.08rem;
      }

      img {
        width: 0.14rem;
        height: 0.14rem;
        opacity: 0.7;
      }

      &:hover,
      &.active {
        background: var(--app-tag-active-bg);
        background-size: 100% 100% !important;

        span,
        img {
          opacity: 1 !important;
        }
      }
    }
  }

  .invisible-div {
    background: var(--app-panel-bg);
    width: 0.24rem;
    height: 0.24rem;
    border-radius: 4px 0px 0px 4px;
    display: flex;
    flex-direction: row;
    align-content: center;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    margin-top: 0.05rem;
    position: relative;

    .invisible-img {
      cursor: pointer;
      width: 0.14rem;
      height: 0.14rem;
      opacity: 0.7;

      &.rotate {
        transform: rotate(180deg);
      }
      &:hover {
        opacity: 1;
      }
    }

    .invisible-content {
      position: absolute;
      bottom: 0;
      right: 0.32rem;
      width: 1.5rem;
      background: var(--app-panel-bg);
      border-radius: 8px;
      padding: 0.16rem 0.16rem;

      .invisible-tab-list {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: 0.1rem;

        li {
          display: flex;
          justify-content: space-between;
          cursor: pointer;
          align-items: center;

          span {
            color: var(--app-white-color);
            opacity: 0.7;
            font-size: 0.14rem;
          }

          img {
            opacity: 0.7;
            width: 0.14rem;
            height: 0.14rem;
          }

          &:hover {
            span,
            img {
              opacity: 1 !important;
            }
          }
        }
      }
    }
  }
}
</style>
