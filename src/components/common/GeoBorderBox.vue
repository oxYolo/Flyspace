<!--通用面板组件-->
<template>
  <div
    class="geo-border-container common-background"
    :style="`width: ${width};height: ${height};background-color: ${bgColor}`">
    <div v-if="close" class="del" @click="emits('change', false)" />
    <div class="tips">
      <slot name="tips" />
    </div>
    <div v-if="title" class="nav-box flex">
      <div class="nav-box_left flex-left">
        <div class="flex" :class="type">
          <div class="borderIcon">
            <!-- 图标 -->
            <slot name="left" class="imgStyle" />
          </div>
          <div class="nav_title">
            {{ title }}
            <span v-if="device?.nickname" class="nickname">
              （{{ device?.nickname }}）
            </span>
          </div>
        </div>
      </div>
      <!-- 右侧新增内容 -->
      <slot name="right" />
    </div>
    <div class="content_box">
      <div class="content_box_inner" :class="{ toCenter: isCenter }">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
let props = defineProps({
  title: {
    // 标题
    type: String,
    default: "",
  },
  width: {
    type: String,
    default: "3.56rem",
  },
  height: {
    type: String,
    default: "100%",
  },
  type: {
    // 标题背景图片类型，small middle large
    type: String,
    default: "small",
  },
  close: {
    // 是否显示关闭按钮
    type: Boolean,
    default: false,
  },
  isCenter: {
    // 是否居中显示
    type: Boolean,
    default: false,
  },
  bgColor: {
    type: String,
    default: "rgba(25,81,108,0.2)",
  },
  device: {
    type: Object,
    default: () => {},
  },
});
let emits = defineEmits(["change"]);
</script>

<style scoped lang="less">
.geo-border-container {
  box-shadow: 0 0 0.1rem 0 rgba(19, 76, 144, 0.22);
  border-radius: 0.06rem;
  position: relative;
  overflow: hidden;

  .del {
    width: 0.16rem;
    height: 0.16rem;
    background: url("@/assets/images/commonComponents/close_thin.png") no-repeat;
    background-size: 100% 100%;
    position: absolute;
    top: 0.15rem;
    right: 0.15rem;
    cursor: pointer;
    z-index: 99;
  }

  .tips {
    position: absolute;
    right: 0.15rem;
    top: 0.1rem;
  }

  .nav-box {
    width: 100%;
    height: 0.4rem;
    border-radius: 0.06rem 0.06rem 0 0;
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .nav-box_left {
      height: 0.4rem;
      line-height: 0.4rem;

      .small {
        width: 1.86rem;
        height: 0.4rem;
        background: url("@/assets/images/common/tit.png") no-repeat;
        background-size: 100% 100%;
      }

      .middle {
        width: 2.16rem;
        height: 0.4rem;
        background: url("@/assets/images/common/tit.png") no-repeat;
        background-size: 100% 100%;
      }

      .large {
        width: 2.66rem;
        height: 0.4rem;
        background: url("@/assets/images/common/tit.png") no-repeat;
        background-size: 100% 100%;
      }

      .borderIcon {
        width: 0.32rem;
        height: 0.4rem;
        display: flex;
        display: -webkit-flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.1rem;
      }

      .nav_title {
        display: flex;
        width: 5rem;
        font-size: 0.16rem;
        color: #fff;
        font-weight: 600;
        margin-top: -40px;
        margin-left: 40px;
        .nickname {
          display: inline-block;
          width: 4rem;
          font-size: 0.15rem;
          color: #fff;
          font-weight: 500;
        }
      }
    }
  }

  .content_box {
    height: calc(~"100% - 0.4rem");
    padding: 0.1rem 0.05rem;

    .content_box_inner {
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    .toCenter {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}

.float-from .content_box_inner {
  overflow: hidden !important;
}
</style>
