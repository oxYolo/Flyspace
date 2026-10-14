<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useSideTabStore } from "@/stores/side-tab";
import { storeToRefs } from "pinia";
import { getRootFontSize } from "@/utils/utils";
import { difference } from "lodash";

// 面板状态定义
interface IPanelStatus {
  id: string;
  name: string;
  isVisible: boolean;
  isCreate: boolean;
  isExpand: boolean;
}

// 定义 props
const props = defineProps({
  //  面板ID
  id: {
    type: String,
    default: "panel",
    required: true,
  },
  // 面板名称
  name: {
    type: String,
    default: "面板",
  },
  // 面板宽度，单位px
  width: {
    type: Number,
    default: 326,
  },
  // 面板高度，默认为面板最大高度，单位px
  height: {
    type: Number,
    default: 1920,
  },
  // 面板是否创建
  isCreate: {
    type: Boolean,
    default: true,
  },
  // 面板是否显示
  isVisible: {
    type: Boolean,
    default: true,
  },
  // 是否注册停靠标签
  isRegisterSideTab: {
    type: Boolean,
    default: false,
  },
  // 是否显示关闭图标
  isShowCloseIcon: {
    type: Boolean,
    default: false,
  },
  // 是否显示折叠图标
  isShowFoldIcon: {
    type: Boolean,
    default: true,
  },
  // 点击关闭按钮回调方法
  onClose: {
    type: Function,
    default: () => {},
  },
  // 点击折叠按钮回调方法
  onCollapse: {
    type: Function,
    default: () => {},
  },
  //拖拽时回调方法
  onDrag: {
    type: Function,
    default: () => {},
  },
});

// 面板状态
const panelStatus = ref({
  id: props.id,
  name: props.name,
  isVisible: props.isVisible,
  isCreate: props.isCreate,
  isExpand: true,
} as IPanelStatus);

// 全局状态
const sideTabStore = useSideTabStore();
// 使用 storeToRefs 保持响应性
const { isSideTabFixed } = storeToRefs(sideTabStore);
// 面板Ref
const panelRef = ref();
// 面板初始位置
let panelStartPosition = {
  x: 0,
  y: 0,
};
// 面板隐藏的时间间隔，单位ms
const HIDE_TIME = 3000;
// 面板隐藏定时器
let hideInterval: any = null;
// 面板是否隐藏
const isHidden = ref(false);
// 面板未固定时，初次隐藏定时器
let firstHideInterval: any = null;

// 获取面板尺寸样式
const getPaneltyle = () => {
  // 获取根元素的字体大小
  const rootFontSize = getRootFontSize();
  //计算目标元素的大小（以rem为单位）
  const width = props?.width
    ? Number(props?.width) / rootFontSize + "rem"
    : "auto";
  const height = props?.height
    ? Number(props?.height) / rootFontSize + "rem"
    : "auto";

  return { width, maxHeight: height };
};

/**
 * 执行关闭面板方法
 */
const handleClosePanel = () => {
  panelStatus.value.isVisible = false;
  sideTabStore.removeSideTab(panelStatus.value);
  const { onClose } = props;
  onClose && onClose();
};

/**
 * 执行折叠面板方法
 */
const handleCollapsePanel = () => {
  const { onCollapse } = props;
  onCollapse && onCollapse();

  panelStatus.value.isExpand = false;
  props.isRegisterSideTab && sideTabStore.updateSideTab(panelStatus.value);

  // 未固定情况下，点击收起面板是即时的，无需等待3s
  if (!isSideTabFixed.value) {
    clearHideInterval();
    isHidden.value = true;
  }
};

/**
 * 执行鼠标进入面板区域方法
 * @param {any} e --鼠标事件对象，包含了鼠标事件的相关信息，如事件类型、坐标等。
 */
const handleEnterPanel = (e: any) => {
  e.stopPropagation();
  if (isSideTabFixed.value) return;
  panelStatus.value.isExpand = true;
  props.isRegisterSideTab && sideTabStore.updateSideTab(panelStatus.value);
};

/**
 * 执行鼠标离开面板区域方法
 * @param e --鼠标事件对象，包含了鼠标事件的相关信息，如事件类型、坐标等。
 */
const handleLeavePanel = (e: any) => {
  e.stopPropagation();
  if (isSideTabFixed.value) return;
  panelStatus.value.isExpand = false;
  props.isRegisterSideTab && sideTabStore.updateSideTab(panelStatus.value);
};

/**
 * 清除面板消失定时器
 */
const clearHideInterval = () => {
  if (hideInterval) {
    clearInterval(hideInterval);
    hideInterval = null;
  }
};

/**
 * 清理面板未固定时，面板初次隐藏定时器
 */
const clearFirstHideInterval = () => {
  if (firstHideInterval) {
    clearInterval(firstHideInterval);
    firstHideInterval = null;
  }
};

// 监听停靠标签列表变化，修改当前面板状态
watch(
  () => sideTabStore.sideTabList,
  (newValue, oldValue) => {
    clearFirstHideInterval();
    const newPanel = newValue.find((item) => item.id === props.id);
    if (newPanel) {
      if (isSideTabFixed.value) {
        // 停靠标签固定时，面板显隐状态与停靠标签展开状态同步
        clearHideInterval();
        isHidden.value = !newPanel.isExpand;
      } else {
        // 当面板未固定，如果面板需要折叠，对面板设定3秒隐藏；
        if (!newPanel.isExpand) {
          clearHideInterval();
          hideInterval = setTimeout(() => {
            isHidden.value = !newPanel.isExpand;
            clearHideInterval();
          }, HIDE_TIME);
        } else {
          clearHideInterval();
          isHidden.value = !newPanel.isExpand;
        }
      }

      panelStatus.value = { ...newPanel };
    }

    if (isSideTabFixed.value) return;
    const oldIds = oldValue.map((item) => item.id);
    const newIds = newValue.map((item) => item.id);
    const differenceArr = difference(newIds, oldIds);
    // 新增标签时，如果处于未固定的状态，面板需要自动收起，因面板动画有3s，所以延时3秒后执行收起面板
    if (differenceArr.length > 0) {
      differenceArr.forEach((id) => {
        const panel = sideTabStore.sideTabList.find((item) => item.id === id);
        if (panel) {
          clearFirstHideInterval();
          firstHideInterval = setTimeout(() => {
            sideTabStore.updateSideTab({
              ...panel,
              isExpand: false,
            });
            clearFirstHideInterval();
          }, HIDE_TIME);
        }
      });
    }
  },
);

// 监听固定状态，对面板的状态进行更新
watch(
  () => sideTabStore.isSideTabFixed,
  (newValue) => {
    if (newValue) {
      clearHideInterval();
      clearFirstHideInterval();
      panelStatus.value.isExpand = true;
      sideTabStore.updateSideTab(panelStatus.value);
    } else {
      isHidden.value = true;
    }
  },
);

// 初始化面板方法
const init = () => {
  panelStatus.value.isVisible = props.isVisible;
  panelStatus.value.isCreate = props.isCreate;
  panelStatus.value.isExpand = true;
};

// 销毁面板方法
const destroy = () => {
  panelStatus.value.isVisible = props.isVisible;
  panelStatus.value.isCreate = props.isCreate;
};

// 监听是否注册停靠标签，添加/删除停靠标签
watch(
  () => props.isRegisterSideTab,
  (newValue) => {
    if (newValue) {
      init();
      sideTabStore.addSideTab(panelStatus.value);
    } else {
      destroy();
      sideTabStore.removeSideTab(panelStatus.value);
    }
  },
);

// 监听面板名称，更新停靠标签名称
watch(
  () => props.name,
  (newValue) => {
    panelStatus.value.name = newValue;
  },
);

// 执行组件挂载生命周期
onMounted(() => {
  init();
  if (props.isRegisterSideTab) {
    sideTabStore.addSideTab(panelStatus.value);
  }
});

// 执行组件卸载生命周期
onUnmounted(() => {
  destroy();
  sideTabStore.removeSideTab(panelStatus.value);
});
</script>

<template>
  <div
    v-show="panelStatus.isVisible"
    :class="['panel-container', !isHidden ? 'expand' : 'collapse']"
    :id="props.id"
    :style="getPaneltyle()"
    @mouseenter="handleEnterPanel"
    @mouseleave="handleLeavePanel"
    ref="panelRef">
    <div class="panel-header" v-if="$slots.header">
      <slot name="header"></slot>
    </div>
    <div class="panel-header" v-else>
      <div class="header-title">{{ panelStatus.name }}</div>
      <div class="header-btn">
        <a
          href="javascript:;"
          class="a-fold"
          v-show="props.isShowFoldIcon"
          @click="handleCollapsePanel"
          title="收起">
          <img src="@/assets/icons/icon-fold.svg" alt="" />
        </a>
        <a
          href="javascript:;"
          class="a-close"
          title="关闭"
          v-show="props.isShowCloseIcon"
          @click="handleClosePanel">
          <img src="@/assets/icons/icon-close.svg" alt="" />
        </a>
      </div>
    </div>
    <div class="panel-body" v-if="$slots.body">
      <slot name="body"></slot>
    </div>
    <div class="panel-bottom" v-if="$slots.bottom">
      <slot name="bottom"></slot>
    </div>
  </div>
</template>

<style scoped lang="less">
.panel-container {
  position: fixed;
  top: 1.5rem;
  right: 0.32rem;
  background-color: var(--app-panel-bg);
  padding: 0.16rem;
  border-radius: 0.08rem;
  z-index: 999999999;
  user-select: none;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: url("./assets/title-bg.png") no-repeat center bottom;
    background-size: auto;
    box-sizing: border-box;
    height: 0.32rem;
    user-select: none;

    .header-title {
      font-size: 0.15rem;
      font-family: douyu;
      color: var(--app-title-text);
      height: 0.32rem;
      line-height: 0.32rem;
      flex-grow: 1;
    }

    .header-btn {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: 0.1rem;
      align-items: flex-start;

      a {
        cursor: pointer;
        width: 0.16rem;
        height: 0.16rem;
        opacity: 0.7;

        &:hover {
          opacity: 1;
        }
      }
      .a-fold {
        margin-bottom: 0.12rem;
      }
    }
  }

  .panel-body {
    padding-top: 0.1rem;
  }

  &.expand {
    animation: ANI-panel-expand 1.5s;
    -webkit-animation: ANI-panel-expand 1.5s; /* Safari and Chrome */
    animation-fill-mode: forwards;
    -webkit-animation-fill-mode: forwards;
  }

  &.collapse {
    animation: ANI-panel-collapse 1.5s;
    -webkit-animation: ANI-panel-collapse 1.5s; /* Safari and Chrome */
    animation-fill-mode: forwards;
    -webkit-animation-fill-mode: forwards;
    /* animation-delay: 1.5s;
  -webkit-animation-delay: 1.5s; */
    pointer-events: none;
  }

  @keyframes ANI-panel-expand {
    from {
      opacity: 0;
      transform: translateX(120%);
      pointer-events: none;
    }
    to {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }
  }
  @-webkit-keyframes ANI-panel-expand /* Safari and Chrome */ {
    from {
      opacity: 0;
      transform: translateX(120%);
      pointer-events: none;
    }
    to {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }
  }

  @keyframes ANI-panel-collapse {
    from {
      opacity: 1;
      pointer-events: none;
    }
    to {
      opacity: 0;
      transform: translateX(120%);
    }
  }
  @-webkit-keyframes ANI-panel-collapse /* Safari and Chrome */ {
    from {
      opacity: 1;
      pointer-events: none;
    }
    to {
      opacity: 0;
      transform: translateX(120%);
    }
  }
}
</style>
