<template>
  <el-dialog
    v-model="visibleProxy"
    title="新建识别任务"
    width="420px"
    top="0px"
    class="createDialog"
    modal-class="createDialogModal"
    destroy-on-close
    @closed="handleClosed">
    <el-form
      :model="formModel"
      label-position="top"
      label-width="100px"
      class="formRoot">
      <el-form-item label="识别任务名称" required>
        <el-input
          v-model="formModel.name"
          placeholder="请输入识别任务名称..." />
      </el-form-item>

      <el-form-item label="巡检场景" required>
        <el-select
          v-model="formModel.scene"
          placeholder="请选择巡检场景..."
          class="fullWidth"
          :loading="dictLoading.scene"
          clearable>
          <el-option
            v-for="item in inspectionSceneOptions"
            :key="item.id"
            :label="item.name"
            :value="String(item.dictCode || '')" />
        </el-select>
      </el-form-item>

      <el-form-item label="识别问题大类">
        <el-select
          v-model="formModel.majorCategory"
          placeholder="请选择识别问题大类..."
          class="fullWidth"
          :disabled="!formModel.scene"
          :loading="dictLoading.major"
          clearable>
          <el-option
            v-for="item in majorCategoryOptions"
            :key="item.id"
            :label="item.name"
            :value="item.dictCode || String(item.id)" />
        </el-select>
      </el-form-item>

      <el-form-item label="识别问题小类">
        <el-checkbox-group
          v-model="formModel.minorCategories"
          class="checkboxGrid">
          <el-checkbox
            class="minorCheckbox"
            v-for="item in minorCategoryOptions"
            :key="item.id"
            :label="item.dictCode || String(item.id)">
            <el-tooltip effect="light" :content="item.name">
              {{ item.name }}
            </el-tooltip>
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="待识别视频" required>
        <el-upload
          v-model:file-list="uploadFileList"
          class="uploadRoot"
          method="post"
          :disabled="uploadLoading"
          drag
          :auto-upload="false"
          :limit="1"
          :multiple="false"
          accept="video/*"
          action=""
          :on-change="handleUploadChange"
          :on-remove="handleRemoveFile">
          <el-icon class="uploadIcon"><UploadFilled /></el-icon>
          <div class="uploadText">请上传待识别视频</div>
          <div class="uploadHint">拖拽视频到此处，或点击上传（最大 2GB）</div>
          <template #file="{ file }">
            <div class="uploadListItem">
              <div class="fileName" :title="file.name">{{ file.name }}</div>
              <div class="fileStatus" v-if="file.name">
                <span v-if="uploadLoading" class="statusRow">
                  <el-icon class="statusIcon isLoading"><Loading /></el-icon>
                  <span class="statusText">
                    上传中{{ uploadPercent ? ` ${uploadPercent}%` : "" }}
                  </span>
                </span>
                <span v-else-if="uploadedVideoUrl" class="statusRow success">
                  <el-icon class="statusIcon isSuccess">
                    <CircleCheck />
                  </el-icon>
                  <span class="statusText">已上传</span>
                </span>
                <span v-else-if="uploadTried" class="statusRow fail">
                  <el-icon class="statusIcon isFail"><CircleClose /></el-icon>
                  <span class="statusText">上传失败</span>
                </span>
              </div>
              <el-icon class="removeIcon" @click.stop="handleRemoveFile">
                <Close />
              </el-icon>
            </div>
          </template>
        </el-upload>
      </el-form-item>

      <el-form-item label="视频开始时间">
        <el-date-picker
          v-model="formModel.startTime"
          type="datetime"
          placeholder="请选择视频开始时间..."
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          class="fullWidth"
          style="width: 100%" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="footerRow">
        <el-button @click="visibleProxy = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          :disabled="uploadLoading || !uploadedVideoUrl"
          @click="handleSubmit">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { UploadFile, UploadFiles, UploadUserFile } from "element-plus";
import {
  UploadFilled,
  Loading,
  CircleCheck,
  CircleClose,
  Close,
} from "@element-plus/icons-vue";
import { getTaskDictList } from "@/transform/control";
import dayjs from "dayjs";
import {
  $createInspectionTask,
  $uploadInspectionTaskVideo,
} from "@/api/flyControl/smart.ts";

type SceneKey = string;

const props = defineProps<{
  modelValue: boolean;
  defaultScene: SceneKey;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (
    e: "submit",
    payload: {
      name: string;
      scene: SceneKey;
      majorCategory: string;
      minorCategories: string[];
      videoSource: "history" | "upload";
      videoName?: string;
      startTime: string;
      taskId?: string;
      videoUrl?: string;
    },
  ): void;
}>();

type TaskDictItem = {
  id: number;
  parentId: number;
  name: string;
  dictCode?: string;
};

const dictLoading = ref({
  scene: false,
  major: false,
  minor: false,
});

const inspectionSceneOptions = ref<TaskDictItem[]>([]);
const majorCategoryOptions = ref<TaskDictItem[]>([]);
const minorCategoryOptions = ref<TaskDictItem[]>([]);

const visibleProxy = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emits("update:modelValue", value);
  },
});

const formModel = reactive<{
  name: string;
  scene: SceneKey;
  majorCategory: string;
  minorCategories: string[];
  videoSource: "history" | "upload";
  videoName: string;
  startTime: string;
}>({
  name: "",
  scene: "",
  majorCategory: "",
  minorCategories: [],
  videoSource: "upload",
  videoName: "",
  startTime: "",
});

const uploadFileList = ref<UploadUserFile[]>([]);
const submitLoading = ref(false);
const uploadLoading = ref(false);
const selectedFile = ref<File | null>(null);
const uploadedVideoUrl = ref("");
const uploadToken = ref(0);
const uploadTried = ref(false);
const uploadPercent = ref(0);
const maxVideoSizeBytes = 2 * 1024 * 1024 * 1024;

/** 加载巡检场景字典，并同步当前表单的scene值 */
async function loadInspectionScenes() {
  dictLoading.value.scene = true;
  try {
    const list = (await getTaskDictList(null)) as TaskDictItem[];
    inspectionSceneOptions.value = Array.isArray(list) ? list : [];
  } catch (e: any) {
    ElMessage.error(e?.message || "获取巡检场景失败");
    inspectionSceneOptions.value = [];
  } finally {
    dictLoading.value.scene = false;
  }
}

/** 根据巡检场景ID加载识别问题大类 */
async function loadMajorCategories(sceneId: number) {
  dictLoading.value.major = true;
  try {
    const list = (await getTaskDictList(sceneId)) as TaskDictItem[];
    majorCategoryOptions.value = Array.isArray(list) ? list : [];
    if (
      formModel.majorCategory &&
      !majorCategoryOptions.value.some(
        (x) => (x.dictCode || String(x.id)) === formModel.majorCategory,
      )
    ) {
      formModel.majorCategory = "";
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题大类失败");
    majorCategoryOptions.value = [];
  } finally {
    dictLoading.value.major = false;
  }
}

/** 根据识别问题大类ID加载识别问题小类，并同步checkbox选中值 */
async function loadMinorCategories(categoryId: number) {
  dictLoading.value.minor = true;
  try {
    const list = (await getTaskDictList(categoryId)) as TaskDictItem[];
    minorCategoryOptions.value = Array.isArray(list) ? list : [];
    const availableCodes = new Set(
      minorCategoryOptions.value.map((x) => x.dictCode || String(x.id)),
    );
    formModel.minorCategories = (formModel.minorCategories || []).filter((x) =>
      availableCodes.has(String(x)),
    );
    if (formModel.minorCategories.length === 0) {
      formModel.minorCategories = Array.from(availableCodes);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取识别问题小类失败");
    minorCategoryOptions.value = [];
    formModel.minorCategories = [];
  } finally {
    dictLoading.value.minor = false;
  }
}

/** 打开弹窗时，初始化联动字典数据 */
async function bootstrapDicts() {
  await loadInspectionScenes();
  const selectedScene = inspectionSceneOptions.value.find(
    (x) =>
      String(x.dictCode || "").trim() === String(formModel.scene || "").trim(),
  );
  if (!selectedScene) {
    majorCategoryOptions.value = [];
    minorCategoryOptions.value = [];
    formModel.majorCategory = "";
    formModel.minorCategories = [];
    return;
  }
  await loadMajorCategories(selectedScene.id);
  if (formModel.majorCategory) {
    const selectedMajor = majorCategoryOptions.value.find(
      (x) => (x.dictCode || String(x.id)) === formModel.majorCategory,
    );
    if (selectedMajor) {
      await loadMinorCategories(selectedMajor.id);
    }
  } else {
    minorCategoryOptions.value = [];
    formModel.minorCategories = [];
  }
}

watch(
  () => props.defaultScene,
  (scene) => {
    if (!visibleProxy.value) return;
    formModel.scene = String(scene || "").trim();
  },
);

watch(
  () => visibleProxy.value,
  async (visible) => {
    if (!visible) return;
    formModel.scene = String(props.defaultScene || "").trim();
    formModel.majorCategory = "";
    formModel.minorCategories = [];
    await bootstrapDicts();
  },
);

watch(
  () => formModel.scene,
  async (sceneCode, prevSceneCode) => {
    if (!visibleProxy.value) return;
    const changed = Boolean(prevSceneCode) && sceneCode !== prevSceneCode;
    const selectedScene = inspectionSceneOptions.value.find(
      (x) => String(x.dictCode || "").trim() === String(sceneCode || "").trim(),
    );
    if (!selectedScene) {
      if (changed) {
        formModel.majorCategory = "";
        formModel.minorCategories = [];
      }
      majorCategoryOptions.value = [];
      minorCategoryOptions.value = [];
      return;
    }
    if (changed) {
      formModel.majorCategory = "";
      formModel.minorCategories = [];
      majorCategoryOptions.value = [];
      minorCategoryOptions.value = [];
    }
    await loadMajorCategories(selectedScene.id);
  },
);

watch(
  () => formModel.majorCategory,
  async (majorCode, prevMajorCode) => {
    if (!visibleProxy.value) return;
    const changed = Boolean(prevMajorCode) && majorCode !== prevMajorCode;
    const selectedMajor = majorCategoryOptions.value.find(
      (x) => (x.dictCode || String(x.id)) === majorCode,
    );
    if (!selectedMajor) {
      if (changed) formModel.minorCategories = [];
      minorCategoryOptions.value = [];
      return;
    }
    if (changed) {
      formModel.minorCategories = [];
      minorCategoryOptions.value = [];
    }
    await loadMinorCategories(selectedMajor.id);
  },
);

/** 关闭弹窗后，重置表单状态 */
function handleClosed() {
  handleReset();
}

/** 重置表单内容到默认状态 */
function handleReset() {
  formModel.name = "";
  formModel.scene = "";
  formModel.majorCategory = "";
  formModel.minorCategories = [];
  formModel.videoSource = "upload";
  formModel.videoName = "";
  formModel.startTime = "";
  uploadFileList.value = [];
  selectedFile.value = null;
  uploadedVideoUrl.value = "";
  uploadLoading.value = false;
  uploadToken.value += 1;
  uploadTried.value = false;
  uploadPercent.value = 0;
}

/** 选择待识别视频文件时，记录文件名并保持仅一个文件 */
function handleUploadChange(_file: UploadFile, fileList: UploadFiles) {
  const latest = fileList[fileList.length - 1];
  const raw = (latest as any)?.raw as File | undefined;
  if (raw && raw.size > maxVideoSizeBytes) {
    ElMessage.warning("视频大小不能超过 2GB");
    handleRemoveFile();
    return;
  }

  uploadFileList.value = latest ? [latest] : [];
  formModel.videoName = latest?.name || "";
  selectedFile.value = raw || null;
  uploadedVideoUrl.value = "";
  if (!selectedFile.value) return;

  const token = uploadToken.value + 1;
  uploadToken.value = token;
  uploadLoading.value = true;
  uploadTried.value = true;
  uploadPercent.value = 0;
  void (async () => {
    try {
      const uploadRes: any = await $uploadInspectionTaskVideo(
        selectedFile.value!,
        {
          timeout: 0,
          onUploadProgress: (evt: ProgressEvent) => {
            if (uploadToken.value !== token) return;
            const total = (evt as any)?.total;
            const loaded = (evt as any)?.loaded;
            if (!total || !loaded) return;
            uploadPercent.value = Math.min(
              100,
              Math.max(0, Math.round((loaded / total) * 100)),
            );
          },
        },
      );
      if (uploadToken.value !== token) return;
      if (uploadRes?.code !== 200 || !uploadRes?.data) {
        ElMessage.error(uploadRes?.msg || "视频上传失败");
        uploadedVideoUrl.value = "";
        return;
      }
      const videoUrl = String(uploadRes.data || "").trim();
      if (!videoUrl) {
        ElMessage.error("视频上传失败");
        uploadedVideoUrl.value = "";
        return;
      }
      uploadedVideoUrl.value = videoUrl;
      ElMessage.success("视频上传成功");
      uploadPercent.value = 100;
    } catch (e: any) {
      if (uploadToken.value !== token) return;
      ElMessage.error(e?.message || "视频上传失败");
      uploadedVideoUrl.value = "";
    } finally {
      if (uploadToken.value === token) {
        uploadLoading.value = false;
      }
    }
  })();
}

/** 移除已选择的视频文件时，清空文件名 */
function handleRemoveFile() {
  formModel.videoName = "";
  uploadFileList.value = [];
  selectedFile.value = null;
  uploadedVideoUrl.value = "";
  uploadLoading.value = false;
  uploadToken.value += 1;
  uploadTried.value = false;
  uploadPercent.value = 0;
}

async function handleSubmit() {
  if (submitLoading.value) return;
  if (!formModel.name.trim()) {
    ElMessage.warning("请填写识别任务名称");
    return;
  }
  if (!String(formModel.scene || "").trim()) {
    ElMessage.warning("请选择巡检场景");
    return;
  }
  if (!formModel.videoName.trim()) {
    ElMessage.warning("请上传待识别视频");
    return;
  }
  if (uploadLoading.value) {
    ElMessage.warning("视频上传中，请稍后");
    return;
  }
  if (!uploadedVideoUrl.value) {
    ElMessage.warning("请先等待视频上传成功");
    return;
  }

  const hasStart = Boolean(String(formModel.startTime || "").trim());
  const startTimestamp = hasStart
    ? dayjs(formModel.startTime).valueOf()
    : undefined;
  if (hasStart && Number.isNaN(startTimestamp as number)) {
    ElMessage.warning("视频开始时间格式不正确");
    return;
  }

  submitLoading.value = true;
  try {
    const videoUrl = uploadedVideoUrl.value;

    const createRes: any = await $createInspectionTask({
      videoUrl,
      taskName: formModel.name.trim(),
      aiTags: (formModel.minorCategories || []).join(","),
      inspectionSceneName: String(formModel.scene || "").trim(),
      problemCategoryName:
        String(formModel.majorCategory || "").trim() || undefined,
      videoStartTimestamp: startTimestamp,
    });
    if (createRes?.code !== 200) {
      ElMessage.error(createRes?.msg || "新建识别任务失败");
      return;
    }

    const taskId = String(
      createRes?.data?.taskId || createRes?.data?.id || "",
    ).trim();
    ElMessage.success("新建识别任务成功");
    emits("submit", {
      name: formModel.name.trim(),
      scene: formModel.scene,
      majorCategory: formModel.majorCategory,
      minorCategories: formModel.minorCategories,
      videoSource: formModel.videoSource,
      videoName: formModel.videoName || undefined,
      startTime: formModel.startTime,
      taskId: taskId || undefined,
      videoUrl,
    });
    visibleProxy.value = false;
  } catch (e: any) {
    ElMessage.error(e?.message || "新建识别任务失败");
  } finally {
    submitLoading.value = false;
  }
}
</script>

<style scoped lang="less">
.formRoot {
  padding: 0px 16px;
  padding-top: 4px;
}

.fullWidth {
  width: 100%;
}

.checkboxGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  height: 92px;
  width: 100%;
  padding: 10px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.checkboxGrid .el-checkbox {
  margin-right: 0 !important;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}
.checkboxGrid::-webkit-scrollbar {
  width: 6px;
}

.checkboxGrid::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.22);
}

.checkboxGrid::-webkit-scrollbar-track {
  background: transparent;
}

.actionRow {
  display: flex;
  gap: 10px;
  padding-left: 100px;
  margin-top: 8px;
}

.footerRow {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.uploadRoot {
  width: 100%;
}

.uploadListItem {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0px 10px;
}

.fileName {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.82);
}

.fileStatus {
  flex-shrink: 0;
}

.removeIcon {
  flex-shrink: 0;
  cursor: pointer;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.55);
}

.removeIcon:hover {
  color: rgba(255, 255, 255, 0.85);
}

.statusRow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.statusRow.success {
  color: rgba(103, 194, 58, 0.95);
}

.statusRow.fail {
  color: rgba(245, 108, 108, 0.95);
}

.statusIcon {
  font-size: 14px;
}

.statusIcon.isLoading {
  animation: spin 1s linear infinite;
  color: rgba(45, 140, 240, 0.95);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

:deep(.el-upload-list__item .el-icon--close) {
  display: none !important;
}

.uploadIcon {
  font-size: 30px;
  color: rgba(45, 140, 240, 0.9);
}

.uploadText {
  line-height: 30px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.uploadHint {
  line-height: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 5px;
}

:deep(.uploadRoot .el-upload-dragger) {
  width: 100%;
  padding: 0px 12px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.04);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

:deep(.uploadRoot .el-upload-dragger:hover) {
  border-color: rgba(45, 140, 240, 0.8);
  background: rgba(45, 140, 240, 0.08);
}

:deep(.uploadRoot .el-upload-list__item) {
  background-color: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}
</style>

<style lang="less">
.createDialog.el-dialog {
  background-color: rgba(23, 44, 44, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.86) !important;
  padding: 0px;
}

.createDialog .el-dialog__header {
  padding: 16px;
  margin-right: 0 !important;
  background-color: rgba(23, 44, 44, 0.9) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.createDialog .el-dialog__title {
  color: rgba(255, 255, 255, 0.92) !important;
}

.createDialog .el-dialog__body {
  background-color: rgba(23, 44, 44, 0.9) !important;
}

.createDialog .el-dialog__footer {
  padding: 16px;
  background-color: rgba(23, 44, 44, 0.9) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.createDialog .el-form-item {
  margin-bottom: 12px;
}

.createDialog .el-form-item__label {
  color: rgba(255, 255, 255, 0.8) !important;
}

.createDialog .el-dialog__headerbtn {
  font-size: 24px;
}

.createDialog .el-dialog__close {
  color: rgba(255, 255, 255, 0.7) !important;
}

.createDialog .el-dialog__close:hover {
  color: rgba(255, 255, 255, 0.92) !important;
}

.createDialog .el-input__wrapper,
.createDialog .el-select__wrapper {
  font-size: 14px;
  background-color: rgba(23, 44, 44, 0.9) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14) inset !important;
}

.createDialog .el-checkbox__label {
  color: rgba(255, 255, 255, 1) !important;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  .el-tooltip__trigger {
    display: inline-block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.createDialog .el-upload-list__item-name {
  color: rgba(255, 255, 255, 0.76) !important;
}

.createDialog .el-upload-list__item:hover {
  background-color: rgba(255, 255, 255, 0.06) !important;
}

.createDialog .el-button {
  border-color: rgba(255, 255, 255, 0.18) !important;
}

.createDialog .el-button:not(.el-button--primary) {
  background-color: rgba(255, 255, 255, 0.06) !important;
  color: rgba(255, 255, 255, 0.82) !important;
}

.createDialog .el-button:not(.el-button--primary):hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.createDialogModal {
  --el-overlay-color-lighter: rgba(0, 0, 0, 0.55);
}

.el-picker-panel {
  .el-input .el-input__wrapper .el-input__inner {
    color: #333 !important;
  }
}
</style>
