<template>
  <GeoCommonDialog
    v-model:dialogVisible="currentVisible"
    title="选择模型"
    height="56vh"
    width="640px"
    @close="handleClosed"
    @cancel="cancel"
    @confirm="confirm">
    <div class="dialogContent" v-loading="loading">
      <el-form label-position="left" class="ai-model-form ai-model-form-inline">
        <el-row :gutter="12">
          <el-col :span="23">
            <el-form-item label="巡检场景：" class="inline-form-item">
              <el-select
                v-model="formModel.inspectionSceneName"
                placeholder="请选择巡检场景"
                :teleported="false"
                clearable>
                <el-option
                  v-for="item in inspectionSceneOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.dictCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="23">
            <el-form-item label="识别问题大类：" class="inline-form-item">
              <el-select
                v-model="formModel.problemCategoryName"
                placeholder="请选择识别问题大类"
                :teleported="false"
                clearable
                :disabled="!formModel.inspectionSceneName">
                <el-option
                  v-for="item in problemCategoryOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.dictCode" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="识别问题小类：" label-position="top">
              <div
                class="ai-tags-wrapper"
                :class="{ disabled: !formModel.problemCategoryName }">
                <el-checkbox-group
                  v-model="formModel.aiTags"
                  class="ai-tags-group">
                  <el-checkbox
                    v-for="item in aiTagsOption"
                    :key="item.id"
                    :label="item.dictCode">
                    {{ item.name }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>
  </GeoCommonDialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import GeoCommonDialog from "@/components/common/GeoCommonDialog.vue";
import { ElMessage } from "element-plus";
import { getTaskDictList } from "@/transform/control";

type TaskDictItem = {
  id: number;
  parentId: number;
  name: string;
  dictCode?: string;
};

type AiModelValue = {
  inspectionSceneName: string;
  problemCategoryName: string;
  aiTags: string[];
};

const props = withDefaults(
  defineProps<{
    modelValue?: AiModelValue;
    visible?: boolean;
  }>(),
  {
    modelValue: () => ({
      inspectionSceneName: "",
      problemCategoryName: "",
      aiTags: [],
    }),
    visible: false,
  },
);

const emit = defineEmits([
  "update:modelValue",
  "confirm",
  "cancel",
  "update:visible",
]);

const loading = ref(false);
const currentVisible = ref(false);
const formModel = reactive<AiModelValue>({
  inspectionSceneName: "",
  problemCategoryName: "",
  aiTags: [],
});

const inspectionSceneOptions = ref<TaskDictItem[]>([]);
const problemCategoryOptions = ref<TaskDictItem[]>([]);
const aiTagsOption = ref<TaskDictItem[]>([]);

const applyDefaultAiTagsIfEmpty = () => {
  if (!Array.isArray(formModel.aiTags) || formModel.aiTags.length === 0) {
    formModel.aiTags = aiTagsOption.value
      .map((x) => x.dictCode)
      .filter(Boolean) as string[];
  }
};

const loadInspectionScenes = async () => {
  loading.value = true;
  try {
    const list = (await getTaskDictList(null)) as TaskDictItem[];
    inspectionSceneOptions.value = Array.isArray(list) ? list : [];
    if (
      !formModel.inspectionSceneName &&
      inspectionSceneOptions.value.length === 1
    ) {
      formModel.inspectionSceneName =
        inspectionSceneOptions.value[0].dictCode || "";
    }
    if (formModel.inspectionSceneName) {
      const selected = inspectionSceneOptions.value.find(
        (x) => x.dictCode === formModel.inspectionSceneName,
      );
      if (selected) {
        await loadProblemCategories(selected.id);
        if (formModel.problemCategoryName) {
          const category = problemCategoryOptions.value.find(
            (x) => x.dictCode === formModel.problemCategoryName,
          );
          if (category) {
            await loadAiTags(category.id);
          }
        }
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取巡检场景失败");
  } finally {
    loading.value = false;
  }
};

const loadProblemCategories = async (sceneId: number) => {
  loading.value = true;
  try {
    const list = (await getTaskDictList(sceneId)) as TaskDictItem[];
    problemCategoryOptions.value = Array.isArray(list) ? list : [];
    if (
      !formModel.problemCategoryName &&
      problemCategoryOptions.value.length === 1
    ) {
      formModel.problemCategoryName =
        problemCategoryOptions.value[0].dictCode || "";
    } else if (
      formModel.problemCategoryName &&
      !problemCategoryOptions.value.some(
        (x) => x.dictCode === formModel.problemCategoryName,
      )
    ) {
      formModel.problemCategoryName = "";
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题大类失败");
  } finally {
    loading.value = false;
  }
};

const loadAiTags = async (categoryId: number) => {
  loading.value = true;
  try {
    const list = (await getTaskDictList(categoryId)) as TaskDictItem[];
    const options = Array.isArray(list) ? list : [];
    aiTagsOption.value = options;

    const availableCodes = new Set(
      options.map((x) => x.dictCode).filter(Boolean) as string[],
    );
    if (!Array.isArray(formModel.aiTags)) {
      formModel.aiTags = [];
    }
    formModel.aiTags = formModel.aiTags
      .map((x: any) => String(x || ""))
      .filter((x: any) => availableCodes.has(x));
    applyDefaultAiTagsIfEmpty();
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题小类失败");
  } finally {
    loading.value = false;
  }
};

const syncFromModelValue = () => {
  const v = props.modelValue || ({} as any);
  formModel.inspectionSceneName = String(v.inspectionSceneName || "");
  formModel.problemCategoryName = String(v.problemCategoryName || "");
  formModel.aiTags = Array.isArray(v.aiTags)
    ? v.aiTags.map((x: any) => String(x))
    : [];
};

watch(
  () => props.visible,
  (newVal) => {
    currentVisible.value = Boolean(newVal);
    if (currentVisible.value) {
      syncFromModelValue();
      loadInspectionScenes();
    }
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  () => {
    if (!currentVisible.value) return;
    syncFromModelValue();
    loadInspectionScenes();
  },
  { deep: true },
);

watch(
  () => currentVisible.value,
  (newVal) => {
    if (props.visible !== newVal) {
      emit("update:visible", newVal);
    }
  },
);

watch(
  () => formModel.inspectionSceneName,
  async (sceneCode: string, prevSceneCode: string) => {
    const selected = inspectionSceneOptions.value.find(
      (x) => x.dictCode === sceneCode,
    );
    const changed = Boolean(prevSceneCode) && prevSceneCode !== sceneCode;

    if (!selected) {
      if (changed) {
        formModel.problemCategoryName = "";
        formModel.aiTags = [];
      }
      problemCategoryOptions.value = [];
      aiTagsOption.value = [];
      return;
    }

    if (changed) {
      formModel.problemCategoryName = "";
      formModel.aiTags = [];
      problemCategoryOptions.value = [];
      aiTagsOption.value = [];
    }

    const hadCategory = Boolean(formModel.problemCategoryName);
    await loadProblemCategories(selected.id);
    if (hadCategory) {
      const category = problemCategoryOptions.value.find(
        (x) => x.dictCode === formModel.problemCategoryName,
      );
      if (category) {
        await loadAiTags(category.id);
      }
    }
  },
);

watch(
  () => formModel.problemCategoryName,
  async (categoryCode: string, prevCategoryCode: string) => {
    const selected = problemCategoryOptions.value.find(
      (x) => x.dictCode === categoryCode,
    );
    const changed =
      Boolean(prevCategoryCode) && prevCategoryCode !== categoryCode;

    if (!selected) {
      if (changed) {
        formModel.aiTags = [];
      }
      aiTagsOption.value = [];
      return;
    }

    if (changed) {
      formModel.aiTags = [];
      aiTagsOption.value = [];
    }
    await loadAiTags(selected.id);
  },
);

// 处理对话框关闭事件
const handleClosed = () => {
  currentVisible.value = false;
  emit("update:visible", false);
};

onMounted(() => {
  if (props.visible) {
    syncFromModelValue();
    loadInspectionScenes();
  }
});

const confirm = () => {
  currentVisible.value = false;
  emit("update:visible", false);
  const value: AiModelValue = {
    inspectionSceneName: formModel.inspectionSceneName,
    problemCategoryName: formModel.problemCategoryName,
    aiTags: Array.isArray(formModel.aiTags) ? formModel.aiTags : [],
  };
  emit("update:modelValue", value);
  emit("confirm", value);
};

const cancel = () => {
  currentVisible.value = false;
  emit("update:visible", false);
  emit("cancel");
};
</script>

<style lang="less" scoped>
.dialogContent {
  height: 100%;
  padding: 12px 12px 0;
  pointer-events: auto;
  overflow: auto;
}

.ai-model-form {
  :deep(.el-form-item__label) {
    color: #303133;
    line-height: 1;
    padding: 0 0 8px;
  }
  :deep(.el-input__wrapper) {
    background-color: #fff;
  }
  :deep(.el-input__inner) {
    color: #303133;
  }
  :deep(.el-select__wrapper) {
    background-color: #fff;
  }
  :deep(.el-select__selected-item) {
    color: #303133;
  }
  :deep(.el-select__placeholder) {
    color: #606266 !important;
  }
  :deep(.el-select__input) {
    color: #303133;
  }
}

.ai-model-form-inline {
  :deep(.inline-form-item .el-form-item__label) {
    padding: 0;
    line-height: 32px;
  }
  :deep(.inline-form-item .el-form-item__content) {
    align-items: center;
  }
}

.ai-tags-wrapper {
  width: 100%;
  background: #f6f7f8;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 10px;
  max-height: 44vh;
  overflow: auto;
}

.ai-tags-wrapper.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.ai-tags-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>
