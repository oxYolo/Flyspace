<template>
  <div class="resultCard">
    <div class="imageArea">
      <el-image
        class="resultImage"
        :src="displayImageUrl"
        :preview-src-list="previewSrcList"
        :preview-teleported="true"
        fit="cover"
        hide-on-click-modal>
      </el-image>
      <div class="statusTag" :class="statusClass">{{ statusText }}</div>
    </div>
    <div class="cardFooter">
      <div class="footerGrid">
        <div class="footerField footerIssue">
          <span class="footerLabel">问题小类</span>
          <span class="footerValue" :title="item.issueType">
            {{
              props.issueTypeOptions?.find(
                (opt) => opt?.dictCode === item.issueType,
              )?.name || item.issueType
            }}
          </span>
        </div>

        <div class="footerField footerTime">
          <span class="footerLabel">识别时间</span>
          <span class="footerValue" :title="displayIssueTime">
            {{ displayIssueTime }}
          </span>
        </div>

        <div class="footerField footerLng">
          <span class="footerLabel">经度</span>
          <span
            class="footerValue footerValueClickable"
            :class="{ isDisabled: !hasValidLocation }"
            v-tooltip="hasValidLocation ? '地图定位' : '暂无坐标'"
            @click="handleLocateClick">
            {{ item.longitude || "--" }}
          </span>
        </div>

        <div class="footerField footerLat">
          <span class="footerLabel">纬度</span>
          <span
            class="footerValue footerValueClickable"
            :class="{ isDisabled: !hasValidLocation }"
            v-tooltip="hasValidLocation ? '地图定位' : '暂无坐标'"
            @click="handleLocateClick">
            {{ item.latitude || "--" }}
          </span>
        </div>

        <div class="reviewAction">
          <el-button
            :icon="MapLocation"
            size="small"
            type="primary"
            class="locateButton"
            :disabled="!hasValidLocation"
            v-tooltip="hasValidLocation ? '地图定位' : '暂无坐标'"
            @click="handleLocateClick" />

          <el-popover
            :visible="reviewPopoverVisible"
            placement="bottom"
            :width="280"
            trigger="click"
            popper-class="reviewPopper"
            @update:visible="handlePopoverVisibleChange">
            <div class="reviewPanel">
              <div class="reviewTitle">人工审核</div>
              <el-radio-group v-model="reviewValue" class="reviewRadio">
                <el-radio label="CORRECT">识别正确</el-radio>
                <el-radio label="INCORRECT">识别错误</el-radio>
              </el-radio-group>
              <div class="reviewButtons">
                <el-button size="small" @click="handleCancelReview">
                  取消
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click="handleConfirmReview"
                  :loading="approving"
                  :disabled="approving">
                  确定
                </el-button>
              </div>
            </div>
            <template #reference>
              <el-button size="small" type="primary" class="reviewButton">
                人工审核
              </el-button>
            </template>
          </el-popover>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, dayjs } from "element-plus";
import { MapLocation } from "@element-plus/icons-vue";
import { $approveInspectionIssue } from "@/api/flyControl/smart.ts";

interface RecognitionResultItem {
  id: string;
  issueType: string;
  issueTime?: string;
  reviewStatus?: "PENDING" | "CORRECT" | "INCORRECT";
  longitude?: string | number;
  latitude?: string | number;
  issuePicture?: string;
}

const props = defineProps<{
  item: RecognitionResultItem;
  issueTypeOptions: any[];
}>();

const emits = defineEmits<{
  (
    e: "reviewed",
    payload: { id: string; reviewStatus: "CORRECT" | "INCORRECT" },
  ): void;
  (
    e: "locate",
    payload: {
      longitude: number;
      latitude: number;
      imageUrl?: string;
      id?: string;
    },
  ): void;
}>();

const approving = ref(false);

const displayStatus = computed<
  NonNullable<RecognitionResultItem["reviewStatus"]>
>(() => {
  return (props.item.reviewStatus || "PENDING") as NonNullable<
    RecognitionResultItem["reviewStatus"]
  >;
});

const statusText = computed(() => {
  if (displayStatus.value === "PENDING") return "未审核";
  if (displayStatus.value === "CORRECT") return "识别正确";
  return "识别错误";
});

const statusClass = computed(() => {
  if (displayStatus.value === "PENDING") return "isWarning";
  if (displayStatus.value === "CORRECT") return "isSuccess";
  return "isDanger";
});

const previewSrcList = computed(() =>
  displayImageUrl.value ? [displayImageUrl.value] : [],
);

const displayImageUrl = computed(() => {
  const raw = String(props.item.issuePicture || "").trim();
  return raw ? raw.replace(/`/g, "").trim() : "";
});

const displayIssueTime = computed(() => {
  const raw = String(props.item.issueTime || "").trim();
  if (!raw) return "";
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : raw;
});

const hasValidLocation = computed(() => {
  const longitude = Number(props.item.longitude);
  const latitude = Number(props.item.latitude);
  return Number.isFinite(longitude) && Number.isFinite(latitude);
});

function handleLocateClick() {
  if (!hasValidLocation.value) return;
  emits("locate", {
    longitude: Number(props.item.longitude),
    latitude: Number(props.item.latitude),
    imageUrl: displayImageUrl.value,
    id: props.item.id,
  });
}

const reviewPopoverVisible = ref(false);
const reviewValue = ref<"CORRECT" | "INCORRECT" | null>(null);

/** 控制审核弹窗的显示/隐藏状态 */
function handlePopoverVisibleChange(visible: boolean) {
  reviewPopoverVisible.value = visible;
}

/** 取消人工审核并关闭弹窗 */
function handleCancelReview() {
  reviewPopoverVisible.value = false;
}

const syncReviewValueFromStatus = () => {
  reviewValue.value =
    displayStatus.value === "PENDING" ? null : displayStatus.value;
};

watch(
  () => reviewPopoverVisible.value,
  (visible) => {
    if (!visible) return;
    syncReviewValueFromStatus();
  },
  { immediate: true },
);

watch(
  () => props.item.reviewStatus,
  () => {
    if (!reviewPopoverVisible.value) return;
    syncReviewValueFromStatus();
  },
);

/** 提交人工审核结果并关闭弹窗 */
async function handleConfirmReview() {
  if (approving.value) return;
  if (!reviewValue.value) {
    ElMessage.warning("请选择审核结果");
    return;
  }
  approving.value = true;
  const reviewStatus = reviewValue.value;
  try {
    const res: any = await $approveInspectionIssue({
      id: props.item.id,
      reviewStatus,
    });
    if (res?.code !== 200) {
      ElMessage.error(res?.msg || "人工审核提交失败");
      return;
    }
    ElMessage.success("已提交人工审核结果");
    emits("reviewed", { id: props.item.id, reviewStatus });
    reviewPopoverVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || "人工审核提交失败");
  } finally {
    approving.value = false;
  }
}
</script>

<style scoped lang="less">
.resultCard {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background-color: rgba(23, 44, 44, 0.9);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.footerValueClickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.45);
  text-underline-offset: 2px;
}

.footerValueClickable.isDisabled {
  cursor: not-allowed;
  text-decoration: none;
}

.imageArea {
  position: relative;
  height: 190px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.imagePlaceholder {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  text-align: center;
  padding: 0 12px;
}

.resultImage {
  width: 100%;
  height: 100%;
}

:deep(.el-image__inner) {
  width: 100%;
  height: 100%;
}

.statusTag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.35);
}

.statusTag.isWarning {
  color: rgba(255, 165, 0, 1);
  background: rgba(230, 162, 60, 0.2);
  border-color: rgba(230, 162, 60, 0.8);
}

.statusTag.isSuccess {
  color: rgba(0, 255, 0, 1);
  background: rgba(103, 194, 58, 0.2);
  border-color: rgba(103, 194, 58, 0.8);
}

.statusTag.isDanger {
  color: rgba(255, 0, 0, 1);
  background: rgba(245, 108, 108, 0.2);
  border-color: rgba(245, 108, 108, 0.8);
}

.cardFooter {
  padding: 10px 12px 12px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.76);
}

.footerGrid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) auto;
  grid-auto-rows: minmax(0, auto);
  gap: 6px;
  align-items: center;
}

.footerLabel {
  color: rgba(255, 255, 255, 0.62);
  flex-shrink: 0;
  width: 56px;
}

.footerValue {
  color: rgba(255, 255, 255, 0.84);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footerField {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.reviewAction {
  flex-shrink: 0;
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: center;

  .locateButton {
    height: 28px;
    background: #2d8cf0 !important;
    color: white !important;
    padding: 4px !important;
    :deep(.el-icon) {
      font-size: 18px;
    }
  }
}

.reviewButton {
  height: 28px;
  padding: 0 12px;
  min-width: 88px;
  margin-left: 6px;
}

.reviewPanel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reviewTitle {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.reviewRadio {
  display: flex;
  gap: 16px;
}

.reviewButtons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

<style lang="less">
.reviewPopper.el-popover.el-popper {
  background-color: rgba(23, 44, 44, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.86) !important;
}

.reviewPopper.el-popover.el-popper .el-popper__arrow::before {
  background-color: rgba(23, 44, 44, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.reviewPopper .el-radio__label {
  color: rgba(255, 255, 255, 0.8) !important;
}

.reviewPopper .el-radio__inner {
  border-color: rgba(255, 255, 255, 0.35) !important;
  background-color: rgba(255, 255, 255, 0.02) !important;
}

.reviewPopper .el-radio__input.is-checked .el-radio__inner {
  border-color: #2d8cf0 !important;
  background-color: #2d8cf0 !important;
}

.reviewPopper .el-button {
  border-color: rgba(255, 255, 255, 0.18) !important;
}

.reviewPopper .el-button:not(.el-button--primary) {
  background-color: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

.reviewPopper .el-button:not(.el-button--primary):hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
