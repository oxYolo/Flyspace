<script setup lang="ts">
import { useThemeStore } from "@/stores/theme";
import { onMounted } from "vue";
const themeStore = useThemeStore();
import zhCnLocale from 'element-plus/es/locale/lang/zh-cn'
import urlConfig from "@/public-path.ts";
onMounted(async () => {
  // 初始化默认主题
  themeStore.changeTheme("default");
  document.title = urlConfig.systemName;
});
</script>

<template>
  <el-config-provider :locale="zhCnLocale">
    <router-view />
  </el-config-provider>
</template>

<style scoped>

</style>
