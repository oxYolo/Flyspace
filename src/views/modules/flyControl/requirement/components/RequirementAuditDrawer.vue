<template>
  <div class="requirement-audit-drawer">
    <el-drawer
      v-model="drawerVisible"
      direction="rtl"
      size="400px"
      :modal="false"
      :show-close="false"
      :with-header="false"
      :append-to-body="false"
      style="top: 70px; height: calc(100vh - 76px)"
      @close="handleClose">
      <div class="drawer-header">
        <div class="drawer-title">需求审核</div>
        <el-icon class="close-icon" @click="handleClose">
          <Close />
        </el-icon>
      </div>

      <div class="drawer-body">
        <el-form
          label-position="left"
          label-width="84px"
          require-asterisk-position="left"
          class="audit-form">
          <el-form-item label="审核结果" required class="audit-form-item">
            <div class="audit-tabs">
              <button
                v-for="item in auditActionOptions"
                :key="item.value"
                type="button"
                class="audit-tab"
                :class="{ active: auditStatus === item.value }"
                @click="auditStatus = item.value as 1 | 2">
                {{ item.label.replace("审核", "") }}
              </button>
            </div>
          </el-form-item>

          <el-form-item
            v-if="auditStatus === 2"
            label="驳回原因"
            required
            class="audit-form-item remark-block">
            <el-input
              v-model="remark"
              type="textarea"
              :rows="7"
              maxlength="255"
              show-word-limit
              placeholder="请输入驳回原因" />
          </el-form-item>
        </el-form>
      </div>

      <div class="drawer-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit">
          确定
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Close } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { $auditRequirement } from "@/api/flyControl/requirementApi";
import { REQUIREMENT_AUDIT_ACTION_OPTIONS } from "../constants";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    requirementId?: number | string | null;
  }>(),
  {
    requirementId: null,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const drawerVisible = ref(false);
const submitLoading = ref(false);
const auditStatus = ref<1 | 2>(1);
const remark = ref("");
const auditActionOptions = [...REQUIREMENT_AUDIT_ACTION_OPTIONS];

const resetState = () => {
  auditStatus.value = 1;
  remark.value = "";
};

watch(
  () => props.modelValue,
  (value) => {
    drawerVisible.value = value;
    if (value) {
      resetState();
    }
  },
  { immediate: true },
);

watch(drawerVisible, (value) => {
  emit("update:modelValue", value);
});

const handleClose = () => {
  drawerVisible.value = false;
};

const handleSubmit = async () => {
  if (!props.requirementId) return;
  if (auditStatus.value === 2 && !remark.value.trim()) {
    ElMessage.warning("请输入驳回原因");
    return;
  }

  submitLoading.value = true;
  try {
    const res: any = await $auditRequirement({
      id: props.requirementId,
      status: auditStatus.value,
      remark: remark.value.trim(),
    });
    if (res?.code === 200) {
      ElMessage.success("审核完成");
      emit("success");
      handleClose();
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "审核需求失败");
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped lang="less">
.requirement-audit-drawer {
  :deep(.el-drawer) {
    pointer-events: auto;
    background: rgba(7, 31, 45, 0.94);
    border-left: 1px solid rgba(0, 197, 254, 0.22);
    box-shadow:
      inset 0 0 30px rgba(0, 197, 254, 0.05),
      -12px 0 32px rgba(0, 0, 0, 0.28);
    color: #dff9ff;
  }

  :deep(.el-drawer__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.el-textarea__inner) {
    background: rgba(5, 30, 43, 0.92);
    color: #dff9ff;
    box-shadow: inset 0 0 0 1px rgba(0, 197, 254, 0.2);
  }

  :deep(.el-textarea__inner::placeholder) {
    color: rgba(226, 248, 255, 0.45);
  }

  :deep(.el-form-item__label) {
    color: rgba(226, 248, 255, 0.78);
    justify-content: flex-start;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }

  :deep(.el-button:not(.is-text):not(.is-link)) {
    border-color: rgba(0, 197, 254, 0.24);
    background: rgba(8, 46, 61, 0.88);
    color: #dff9ff;
  }

  :deep(.el-button--primary) {
    background: linear-gradient(90deg, #009ad6, #00c5fe);
    border-color: transparent;
    color: #ffffff;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(0, 197, 254, 0.14);
}

.drawer-title {
  font-size: 18px;
  font-weight: 600;
  color: #e6fbff;
}

.close-icon {
  cursor: pointer;
  color: rgba(226, 248, 255, 0.6);
  font-size: 18px;
}

.drawer-body {
  flex: 1;
  min-height: 0;
  padding: 18px 20px 8px;
}

.audit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.audit-form-item {
  margin-bottom: 0;
}

.audit-tabs {
  display: flex;
  gap: 12px;
}

.audit-tab {
  min-width: 92px;
  height: 34px;
  border: 1px solid rgba(0, 197, 254, 0.2);
  background: rgba(5, 30, 43, 0.92);
  color: rgba(226, 248, 255, 0.72);
  cursor: pointer;
  transition: all 0.2s ease;
}

.audit-tab.active {
  border-color: #00c5fe;
  color: #ffffff;
  background: linear-gradient(
    90deg,
    rgba(0, 154, 214, 0.78),
    rgba(0, 197, 254, 0.78)
  );
  box-shadow: 0 0 12px rgba(0, 197, 254, 0.18);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px 18px;
  border-top: 1px solid rgba(0, 197, 254, 0.14);
}
</style>
