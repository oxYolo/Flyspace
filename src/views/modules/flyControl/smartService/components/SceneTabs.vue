<template>
  <div class="sceneTabs">
    <el-tabs
      v-model="innerValue"
      type="border-card"
      class="tabsRoot"
      @tab-change="handleTabChange">
      <el-tab-pane
        v-for="item in sceneOptions"
        :key="item.id"
        :label="item.name"
        :name="item.dictCode"
      />
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { $getProblemCategoryList } from "@/api/flyControl/smart.ts";

type SceneKey = string;

type SceneDictItem = {
  id: number;
  parentId: number;
  name: string;
  dictCode: string;
};

const props = defineProps<{
  modelValue: SceneKey;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", value: SceneKey): void;
}>();

const sceneOptions = ref<SceneDictItem[]>([]);

const innerValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emits("update:modelValue", value);
  },
});

/** Tab切换时，同步 v-model 值 */
function handleTabChange(value: string | number) {
  emits("update:modelValue", String(value || ""));
}

/** 获取巡检场景字典并初始化当前选中值 */
async function loadSceneOptions() {
  try {
    const res: any = await $getProblemCategoryList();
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "获取巡检场景失败");
      sceneOptions.value = [];
      return;
    }
    const list = Array.isArray(res?.data) ? (res.data as SceneDictItem[]) : [];
    sceneOptions.value = list.filter((x) => String(x?.dictCode || "").trim());
    if (!props.modelValue && sceneOptions.value.length > 0) {
      emits("update:modelValue", sceneOptions.value[0].dictCode);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取巡检场景失败");
    sceneOptions.value = [];
  }
}

onMounted(() => {
  loadSceneOptions();
});
</script>

<style scoped lang="less">
.sceneTabs {
  width: 100%;
}

.tabsRoot {
  border: none;

  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    background-color: rgba(23, 44, 44, 0.9);
  }

  :deep(.el-tabs__nav-wrap) {
    background-color: rgba(23, 44, 44, 0.9);
  }

  :deep(.el-tabs__nav) {
    border: none;
  }

  :deep(.el-tabs__item) {
    height: 44px;
    line-height: 44px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.78);
    background-color: rgba(23, 44, 44, 0.9);
    border-color: rgba(255, 255, 255, 0.12);
  }

  :deep(.el-tabs__item.is-active) {
    color: #fff;
    background-color: rgba(45, 140, 240, 0.22);
    border-bottom-color: rgba(23, 44, 44, 0.9);
    border-color: transparent;
  }

  :deep(.el-tabs__content) {
    display: none;
  }

  :deep(.el-tabs__item:hover) {
    color: rgba(255, 255, 255, 0.92);
  }

  :deep(.el-tabs__nav-wrap::after) {
    background-color: transparent;
  }

  :deep(.el-tabs--border-card) {
    background-color: rgba(23, 44, 44, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
}
</style>
