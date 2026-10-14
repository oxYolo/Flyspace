<template>
  <div class="title">
    <span
      class="text"
      :class="[
        { 'left-text': type === 'left' },
        { 'right-text': type === 'right' },
      ]"
      >{{ text }}</span
    >
  </div>
</template>

<script setup lang="ts">
interface Props {
  text?: string;
  type?: "left" | "right";
}

withDefaults(defineProps<Props>(), {
  text: "",
  type: "left",
});
</script>

<style lang="less" scoped>
.title {
  width: calc(100% - 20px);
  height: 32px;
  background: url("@/assets/images/common/tit.png") no-repeat;
  background-size: 250px 100%;
  margin: 6px 10px;
}
.text {
  font-size: 20px;
  font-family: com;
  font-weight: 500;
  background-clip: text;
  color: transparent;
  background-image: linear-gradient(to bottom, #ffffff 40%, #72e5ff 100%);
  display: inline-block;
  vertical-align: middle;
  height: 38px;
  line-height: 32px;
  padding-left: 50px;
}
</style>
