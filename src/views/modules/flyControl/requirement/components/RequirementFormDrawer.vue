<template>
  <div class="requirement-form-drawer">
    <el-drawer
      v-model="drawerVisible"
      direction="rtl"
      size="440px"
      :modal="false"
      :show-close="false"
      :with-header="false"
      :append-to-body="false"
      style="top: 70px; height: calc(100vh - 76px)"
      @close="handleClose">
      <div class="drawer-header">
        <div class="drawer-title">{{ drawerTitle }}</div>
        <el-icon class="close-icon" @click="handleClose">
          <Close />
        </el-icon>
      </div>

      <div class="drawer-body" v-loading="detailLoading">
        <template v-if="isDetailMode">
          <div class="detail-list">
            <div
              v-for="item in detailFields"
              :key="item.label"
              class="detail-item">
              <div class="detail-label">{{ item.label }}:</div>
              <div class="detail-value">{{ item.value }}</div>
            </div>
          </div>
        </template>

        <el-form
          v-else
          ref="formRef"
          :model="formModel"
          :rules="formRules"
          label-position="left"
          label-width="84px"
          require-asterisk-position="left"
          class="requirement-form">
          <el-form-item label="需求名称" prop="name" required class="form-row">
            <div class="row-field">
              <el-input
                v-model="formModel.name"
                maxlength="128"
                placeholder="请输入需求名称" />
            </div>
          </el-form-item>

          <el-form-item
            label="需求单位"
            prop="unitName"
            required
            class="form-row">
            <div class="row-field">
              <el-input
                v-model="formModel.unitName"
                maxlength="255"
                placeholder="请输入需求单位" />
            </div>
          </el-form-item>

          <el-form-item
            label="需求科室"
            prop="divisionName"
            required
            class="form-row">
            <div class="row-field">
              <el-input
                v-model="formModel.divisionName"
                maxlength="255"
                placeholder="请输入需求科室" />
            </div>
          </el-form-item>

          <el-form-item
            label="飞行类型"
            prop="flightType"
            required
            class="form-row">
            <div class="row-field">
              <el-select
                v-model="formModel.flightType"
                placeholder="请选择飞行类型"
                clearable>
                <el-option
                  v-for="option in flightTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item
            label="成果类型"
            prop="resultTypeValues"
            required
            class="form-row">
            <div class="row-field">
              <el-select
                v-model="formModel.resultTypeValues"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :max-collapse-tags="3"
                placeholder="请选择成果类型">
                <el-option
                  v-for="option in resultTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value" />
              </el-select>
            </div>
          </el-form-item>

          <div class="form-row upload-row">
            <div class="row-label">附件上传</div>
            <div class="row-field upload-field">
              <div class="upload-inline-row">
                <el-upload
                  ref="uploadRef"
                  class="upload-trigger"
                  :auto-upload="false"
                  :show-file-list="false"
                  :limit="1"
                  :disabled="uploadLoading || submitLoading"
                  :before-upload="beforeUpload"
                  :on-change="handleFileChange"
                  :on-exceed="handleUploadExceed">
                  <el-button
                    :icon="Upload"
                    class="upload-button"
                    :loading="uploadLoading"
                    plain>
                    上 传
                  </el-button>
                </el-upload>

                <span
                  v-if="uploadDisplayText"
                  class="upload-status-text"
                  :class="{ error: uploadStatus === 'error' }">
                  {{ uploadDisplayText }}
                </span>
              </div>

              <div v-if="formModel.fileName" class="upload-file-pill">
                <span class="file-name">{{ formModel.fileName }}</span>
                <el-icon class="clear-file" @click="clearUploadedFile">
                  <CircleClose />
                </el-icon>
              </div>
            </div>
          </div>

          <el-form-item
            label="位置"
            prop="positionText"
            required
            class="form-row">
            <div class="row-field">
              <el-input
                v-model="formModel.positionText"
                placeholder="在地图上打点或者输入经纬度">
                <template #suffix>
                  <el-icon class="location-icon" @click="handleLocateClick">
                    <LocationFilled />
                  </el-icon>
                </template>
              </el-input>
            </div>
          </el-form-item>

          <el-form-item label="详细地址" class="form-row">
            <div class="row-field">
              <el-input
                v-model="formModel.address"
                maxlength="255"
                placeholder="输入地址" />
            </div>
          </el-form-item>

          <el-form-item label="需求描述" class="form-row textarea-row">
            <div class="row-field">
              <el-input
                v-model="formModel.description"
                type="textarea"
                :rows="6"
                maxlength="1024"
                placeholder="请输入需求描述"
                show-word-limit />
            </div>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="!isDetailMode" class="drawer-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit">
          {{ props.mode === "create" ? "确定新增" : "保存修改" }}
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { computed, nextTick, reactive, ref, watch } from "vue";
import {
  CircleClose,
  Close,
  LocationFilled,
  Upload,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import {
  $createRequirement,
  $getRequirementChunkUploadTask,
  $getRequirementChunkUploadUrl,
  $getRequirementDetail,
  $initRequirementChunkUploadTask,
  $mergeRequirementChunkUploadTask,
  $updateRequirement,
  $updateRequirementChunkUploadTaskState,
} from "@/api/flyControl/requirementApi";
import {
  REQUIREMENT_FLIGHT_TYPE_OPTIONS,
  REQUIREMENT_RESULT_TYPE_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
} from "../constants";

type DrawerMode = "create" | "edit" | "detail";

interface RequirementFormState {
  id?: number | string;
  name: string;
  unitName: string;
  divisionName: string;
  flightType?: number;
  resultTypeValues: string[];
  longitude: string;
  latitude: string;
  address: string;
  fileName: string;
  filePath: string;
  bucket: string;
  description: string;
  positionText: string;
  createUserName?: string;
  createTime?: string;
  auditUserName?: string;
  updateTime?: string;
  status?: number;
  statusName?: string;
  auditDesc?: string;
}

type UploadStatus = "idle" | "uploading" | "merging" | "success" | "error";

interface ChunkUploadTask {
  file: File;
  identifier: string;
  chunkSize: number;
  totalChunks: number;
  uploadedParts: number[];
  uploadedBytes: number;
  sessionUploadedBytes: number;
  startMs: number;
}

interface UploadedFileLocation {
  bucket: string;
  objectKey: string;
  url?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    mode?: DrawerMode;
    requirementId?: number | string | null;
    pickedLocation?: {
      longitude: number;
      latitude: number;
      address?: string;
      token?: number | string;
    } | null;
  }>(),
  {
    mode: "create",
    requirementId: null,
    pickedLocation: null,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
  (e: "start-locate", payload: { positionText: string }): void;
}>();

const flightTypeOptions = [...REQUIREMENT_FLIGHT_TYPE_OPTIONS];
const resultTypeOptions = [...REQUIREMENT_RESULT_TYPE_OPTIONS];
const statusOptions = [...REQUIREMENT_STATUS_OPTIONS];
const CHUNK_SIZE = 10 * 1024 * 1024;
const MERGE_POLL_INTERVAL = 2000;
const MERGE_MAX_WAIT = 10 * 60 * 1000;

const resultTypeLabelMap = resultTypeOptions.reduce<Record<string, string>>(
  (acc, item) => {
    acc[item.value] = item.label;
    return acc;
  },
  {},
);

const createDefaultForm = (): RequirementFormState => ({
  name: "",
  unitName: "",
  divisionName: "",
  flightType: undefined,
  resultTypeValues: [],
  longitude: "",
  latitude: "",
  address: "",
  fileName: "",
  filePath: "",
  bucket: "drone",
  description: "",
  positionText: "",
  createUserName: "",
  createTime: "",
  auditUserName: "",
  updateTime: "",
  status: undefined,
  statusName: "",
  auditDesc: "",
});

const drawerVisible = ref(false);
const detailLoading = ref(false);
const submitLoading = ref(false);
const uploadLoading = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref<UploadStatus>("idle");
const uploadStatusText = ref("");
const uploadSpeedText = ref("");
const uploadErrorText = ref("");
const currentUploadTask = ref<ChunkUploadTask>();
const uploadRef = ref<any>();
const formRef = ref<FormInstance>();
const formModel = reactive<RequirementFormState>(createDefaultForm());

const isDetailMode = computed(() => props.mode === "detail");

const drawerTitle = computed(() => {
  if (props.mode === "edit") return "编辑需求";
  if (props.mode === "detail") return "详情查看";
  return "新建需求";
});

const resultTypeText = computed(() => {
  if (!formModel.resultTypeValues.length) return "-";
  return formModel.resultTypeValues
    .map((value) => resultTypeLabelMap[value] || value)
    .join(" / ");
});

const flightTypeText = computed(() => {
  return (
    flightTypeOptions.find((item) => item.value === formModel.flightType)
      ?.label || "-"
  );
});

const statusText = computed(() => {
  return (
    statusOptions.find((item) => item.value === Number(formModel.status))
      ?.label || "--"
  );
});

const uploadDisplayText = computed(() => {
  if (uploadErrorText.value) return uploadErrorText.value;
  if (uploadStatusText.value) return uploadStatusText.value;
  return formModel.fileName ? "附件已上传完成" : "";
});

const validatePositionText = (_rule: any, value: string, callback: any) => {
  if (!value?.trim()) {
    callback(new Error("请输入经纬度或地图打点位置"));
    return;
  }

  const parts = value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    callback(new Error("请输入合法经纬度，格式如：114.123456,30.123456"));
    return;
  }

  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    callback(new Error("请输入合法经纬度，格式如：114.123456,30.123456"));
    return;
  }

  callback();
};

const detailFields = computed(() => {
  return [
    { label: "需求名称", value: formModel.name || "--" },
    { label: "需求单位", value: formModel.unitName || "--" },
    { label: "需求科室", value: formModel.divisionName || "--" },
    { label: "飞行类型", value: flightTypeText.value },
    { label: "成果类型", value: resultTypeText.value },
    {
      label: "位置",
      value:
        formModel.longitude && formModel.latitude
          ? `${formModel.longitude}, ${formModel.latitude}`
          : "--",
    },
    { label: "详细地址", value: formModel.address || "--" },
    { label: "创建人", value: formModel.createUserName || "--" },
    { label: "创建时间", value: formModel.createTime || "--" },
    { label: "需求状态", value: statusText.value },
    { label: "审核人", value: formModel.auditUserName || "--" },
    { label: "需求描述", value: formModel.description || "--" },
    { label: "驳回原因", value: formModel.auditDesc || "--" },
  ];
});

const formRules = reactive<FormRules<RequirementFormState>>({
  name: [{ required: true, message: "请输入需求名称", trigger: "blur" }],
  unitName: [{ required: true, message: "请输入需求单位", trigger: "blur" }],
  divisionName: [
    { required: true, message: "请输入需求科室", trigger: "blur" },
  ],
  flightType: [
    { required: true, message: "请选择飞行类型", trigger: "change" },
  ],
  resultTypeValues: [
    { required: true, message: "请选择成果类型", trigger: "change" },
  ],
  positionText: [{ validator: validatePositionText, trigger: "blur" }],
});

const resetFormState = () => {
  Object.assign(formModel, createDefaultForm());
  resetChunkUploadState();
  nextTick(() => {
    formRef.value?.clearValidate();
    uploadRef.value?.clearFiles?.();
  });
};

const parseResultTypeValues = (resultTypeName?: string) => {
  if (!resultTypeName) return [];
  const parts = String(resultTypeName)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return resultTypeOptions
    .filter(
      (option) => parts.includes(option.label) || parts.includes(option.value),
    )
    .map((option) => option.value);
};

const fillForm = (data: Record<string, any>) => {
  Object.assign(formModel, {
    id: data.id,
    name: data.name || "",
    unitName: data.unitName || "",
    divisionName: data.divisionName || "",
    flightType: data.flightType ?? undefined,
    resultTypeValues: parseResultTypeValues(data.resultTypeName),
    longitude:
      data.longitude === null || data.longitude === undefined
        ? ""
        : String(data.longitude),
    latitude:
      data.latitude === null || data.latitude === undefined
        ? ""
        : String(data.latitude),
    address: data.address || "",
    fileName: data.fileName || "",
    filePath: data.filePath || "",
    bucket: data.bucket || "drone",
    description: data.description || "",
    positionText:
      data.longitude !== null &&
      data.longitude !== undefined &&
      data.latitude !== null &&
      data.latitude !== undefined
        ? `${data.longitude},${data.latitude}`
        : "",
    createUserName: data.createUserName || "",
    createTime: data.createTime || "",
    auditUserName: data.auditUserName || "",
    updateTime: data.updateTime || "",
    status: data.status,
    statusName: data.statusName || "",
    auditDesc: data.auditDesc || data.remark || "",
  });
};

const loadDetail = async () => {
  if (!props.requirementId) return;
  detailLoading.value = true;
  try {
    const res: any = await $getRequirementDetail(props.requirementId);
    if (res?.code === 200 && res.data) {
      fillForm(res.data);
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "获取需求详情失败");
  } finally {
    detailLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  async (value) => {
    drawerVisible.value = value;
    if (!value) {
      resetFormState();
      return;
    }

    resetFormState();
    if (props.mode === "edit" || props.mode === "detail") {
      await loadDetail();
    }
  },
  { immediate: true },
);

watch(
  () => [props.requirementId, props.mode],
  async () => {
    if (!drawerVisible.value) return;
    resetFormState();
    if (props.mode === "edit" || props.mode === "detail") {
      await loadDetail();
    }
  },
);

watch(drawerVisible, (value) => {
  emit("update:modelValue", value);
});

watch(
  () => props.pickedLocation,
  (value) => {
    if (!value) return;
    const longitude = Number(value.longitude);
    const latitude = Number(value.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
    formModel.longitude = String(longitude);
    formModel.latitude = String(latitude);
    formModel.positionText = `${longitude.toFixed(6)},${latitude.toFixed(6)}`;
    if (value.address) {
      formModel.address = String(value.address).trim();
    }
    nextTick(() => {
      formRef.value?.validateField("positionText").catch(() => undefined);
    });
  },
  { deep: true },
);

const parsePositionText = () => {
  const rawText = formModel.positionText.trim();
  if (!rawText) {
    return {
      longitude: undefined,
      latitude: undefined,
    };
  }

  const parts = rawText
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      longitude: undefined,
      latitude: undefined,
    };
  }

  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);

  return {
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
  };
};

const beforeUpload = (_file: File) => {
  return true;
};

const handleUploadExceed = () => {
  ElMessage.warning("仅支持上传 1 个附件，请先删除原文件");
};

const handleFileChange = async (uploadFile: any) => {
  const file = uploadFile?.raw as File | undefined;
  if (!file) return;
  uploadRef.value?.clearFiles?.();
  resetChunkUploadState();
  currentUploadTask.value = undefined;
  uploadErrorText.value = "";
  formModel.fileName = file.name;
  formModel.filePath = "";
  try {
    const uploadedFile = await continueChunkUpload(file);
    formModel.fileName = file.name;
    formModel.filePath = uploadedFile.objectKey;
    formModel.bucket = uploadedFile.bucket || "drone";
    uploadStatus.value = "success";
    uploadProgress.value = 100;
    uploadStatusText.value = "附件上传完成";
    uploadErrorText.value = "";
    ElMessage.success("附件上传成功");
  } catch (error: any) {
    uploadStatus.value = "error";
    uploadErrorText.value = error?.message || "附件上传失败";
    uploadStatusText.value = "分片上传失败，请重新选择文件";
    formModel.filePath = "";
    ElMessage.error(error?.message || "附件上传失败");
  }
};

const continueChunkUpload = async (file: File) => {
  uploadLoading.value = true;
  try {
    const { task, finishedLocation } = await prepareChunkUploadTask(file);
    if (finishedLocation) {
      return finishedLocation;
    }
    return await uploadChunks(task);
  } finally {
    uploadLoading.value = false;
  }
};

const clearUploadedFile = () => {
  resetChunkUploadState();
  formModel.fileName = "";
  formModel.filePath = "";
  formModel.bucket = "drone";
  uploadRef.value?.clearFiles?.();
};

const handleLocateClick = () => {
  emit("start-locate", {
    positionText: formModel.positionText,
  });
};

const buildSubmitPayload = () => {
  const resultTypeNames = formModel.resultTypeValues
    .map((value) => resultTypeLabelMap[value] || value)
    .join(",");

  const { longitude, latitude } = parsePositionText();

  return {
    id: formModel.id,
    name: formModel.name.trim(),
    unitName: formModel.unitName.trim(),
    divisionName: formModel.divisionName.trim(),
    flightType: formModel.flightType,
    flightTypeName:
      flightTypeOptions.find((item) => item.value === formModel.flightType)
        ?.label || "",
    resultTypeName: resultTypeNames,
    longitude,
    latitude,
    address: formModel.address.trim(),
    fileName: formModel.fileName.trim(),
    filePath: formModel.filePath.trim(),
    bucket: formModel.bucket.trim(),
    description: formModel.description.trim(),
  };
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  if (uploadLoading.value) {
    ElMessage.warning("附件上传中，请稍后再提交");
    return;
  }
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitLoading.value = true;
  try {
    const payload = buildSubmitPayload();
    const request =
      props.mode === "edit" ? $updateRequirement : $createRequirement;
    const res: any = await request(payload);
    if (res?.code === 200) {
      ElMessage.success(props.mode === "edit" ? "修改成功" : "新增成功");
      emit("success");
      handleClose();
    }
  } catch (error: any) {
    ElMessage.error(error?.message || "提交需求失败");
  } finally {
    submitLoading.value = false;
  }
};

const handleClose = () => {
  drawerVisible.value = false;
};

const prepareChunkUploadTask = async (file: File) => {
  const identifier = await createFileIdentifier(file);
  const totalChunks = Math.max(Math.ceil(file.size / CHUNK_SIZE), 1);
  const task: ChunkUploadTask = {
    file,
    identifier,
    chunkSize: CHUNK_SIZE,
    totalChunks,
    uploadedParts: [],
    uploadedBytes: 0,
    sessionUploadedBytes: 0,
    startMs: Date.now(),
  };

  uploadStatus.value = "uploading";
  uploadStatusText.value = "正在初始化分片上传任务...";
  uploadSpeedText.value = "";

  const response = await $initRequirementChunkUploadTask({
    identifier,
    fileName: file.name,
    totalSize: file.size,
    chunkSize: task.chunkSize,
    lastModified: file.lastModified,
  });
  const data = response?.data || {};

  if (data.finished) {
    currentUploadTask.value = task;
    return {
      task,
      finishedLocation: resolveUploadedFileLocation(data),
    };
  }

  task.totalChunks = Number(data.chunkNum) || totalChunks;
  task.uploadedParts = normalizeUploadedParts(data.uploadedChunks);
  task.uploadedBytes = calculateUploadedBytes(task);
  currentUploadTask.value = task;
  syncUploadProgress(task);

  return {
    task,
    finishedLocation: undefined,
  };
};

const uploadChunks = async (task: ChunkUploadTask) => {
  for (let partNumber = 1; partNumber <= task.totalChunks; partNumber += 1) {
    if (task.uploadedParts.includes(partNumber)) {
      continue;
    }

    const start = task.chunkSize * (partNumber - 1);
    const end = Math.min(start + task.chunkSize, task.file.size);
    const blob = task.file.slice(start, end);

    uploadStatus.value = "uploading";
    uploadStatusText.value = `正在上传分片 ${partNumber}/${task.totalChunks}`;

    const presignResponse = await $getRequirementChunkUploadUrl(
      task.identifier,
      partNumber,
    );
    const presignedUrl = presignResponse?.data?.url;
    if (!presignedUrl) {
      throw new Error(`未获取到分片 ${partNumber} 的上传地址`);
    }

    await axios.put(presignedUrl, blob, {
      headers: { "Content-Type": "application/octet-stream" },
    });

    task.uploadedParts = [...task.uploadedParts, partNumber].sort(
      (a, b) => a - b,
    );
    task.uploadedBytes += blob.size;
    task.sessionUploadedBytes += blob.size;
    syncUploadProgress(task);

    if (partNumber % 5 === 0 || partNumber === task.totalChunks) {
      await updateChunkTaskState(task);
    }
  }

  uploadStatus.value = "merging";
  uploadStatusText.value = "分片上传完成，正在合并文件...";
  uploadSpeedText.value = "";

  return await mergeUploadedChunks(task);
};

const mergeUploadedChunks = async (task: ChunkUploadTask) => {
  const mergeResponse = await $mergeRequirementChunkUploadTask(task.identifier);
  const mergeData = mergeResponse?.data || {};

  if (mergeData.finished) {
    return resolveUploadedFileLocation(mergeData);
  }

  const startTime = Date.now();
  while (Date.now() - startTime < MERGE_MAX_WAIT) {
    await wait(MERGE_POLL_INTERVAL);
    const pollResponse = await $getRequirementChunkUploadTask(task.identifier);
    const pollData = pollResponse?.data || {};

    if (pollData.finished) {
      return resolveUploadedFileLocation(pollData);
    }
    if (pollData.mergeFailed) {
      throw new Error("后端文件合并失败，请稍后重试");
    }

    uploadStatus.value = "merging";
    uploadStatusText.value = "文件合并中，请稍候...";
    uploadSpeedText.value = `已等待 ${Math.floor((Date.now() - startTime) / 1000)} 秒`;
  }

  throw new Error("文件合并超时，请稍后重试");
};

const updateChunkTaskState = async (task: ChunkUploadTask) => {
  const elapsedSeconds = Math.max((Date.now() - task.startMs) / 1000, 1);
  const speed = task.sessionUploadedBytes / elapsedSeconds;
  const remainingSeconds =
    speed > 0 ? Math.ceil((task.file.size - task.uploadedBytes) / speed) : 0;

  try {
    await $updateRequirementChunkUploadTaskState({
      identifier: task.identifier,
      process: String(uploadProgress.value),
      speed: speed > 0 ? `${(speed / 1024 / 1024).toFixed(2)}mbps` : "0.00mbps",
      timeLeft: speed > 0 ? `${remainingSeconds}s` : "未知",
      totalTime: `${Math.floor(elapsedSeconds)}s`,
    });
  } catch (error) {
    return error;
  }
};

const resetChunkUploadState = () => {
  currentUploadTask.value = undefined;
  uploadProgress.value = 0;
  uploadStatus.value = "idle";
  uploadStatusText.value = "";
  uploadSpeedText.value = "";
  uploadErrorText.value = "";
};

const createFileIdentifier = async (file: File) => {
  const raw = `${file.name}|${file.size}|${file.lastModified}`;
  const subtleDigest = globalThis.crypto?.subtle?.digest;
  if (typeof subtleDigest === "function") {
    try {
      const buffer = await subtleDigest.call(
        globalThis.crypto.subtle,
        "SHA-256",
        new TextEncoder().encode(raw),
      );
      return Array.from(new Uint8Array(buffer))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    } catch {}
  }

  let hash1 = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) {
    hash1 ^= raw.charCodeAt(i);
    hash1 =
      (hash1 +
        (hash1 << 1) +
        (hash1 << 4) +
        (hash1 << 7) +
        (hash1 << 8) +
        (hash1 << 24)) >>>
      0;
  }

  const raw2 = `${raw}|fallback`;
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < raw2.length; i += 1) {
    hash2 ^= raw2.charCodeAt(i);
    hash2 =
      (hash2 +
        (hash2 << 1) +
        (hash2 << 4) +
        (hash2 << 7) +
        (hash2 << 8) +
        (hash2 << 24)) >>>
      0;
  }

  return `${hash1.toString(16).padStart(8, "0")}${hash2
    .toString(16)
    .padStart(8, "0")}`;
};

const normalizeUploadedParts = (parts: any) => {
  if (!Array.isArray(parts)) return [];
  return parts
    .map((item: any) => Number(item))
    .filter((item: number) => Number.isInteger(item) && item > 0)
    .sort((a: number, b: number) => a - b);
};

const calculateUploadedBytes = (task: ChunkUploadTask) => {
  return task.uploadedParts.reduce((total: number, partNumber: number) => {
    const start = task.chunkSize * (partNumber - 1);
    const end = Math.min(start + task.chunkSize, task.file.size);
    return total + (end - start);
  }, 0);
};

const syncUploadProgress = (task: ChunkUploadTask) => {
  uploadProgress.value = task.file.size
    ? Math.min(Math.round((task.uploadedBytes / task.file.size) * 100), 100)
    : 0;

  const elapsedSeconds = Math.max((Date.now() - task.startMs) / 1000, 1);
  const speed = task.sessionUploadedBytes / elapsedSeconds;
  const remainingSeconds =
    speed > 0 ? Math.ceil((task.file.size - task.uploadedBytes) / speed) : 0;

  uploadStatusText.value = `已上传 ${task.uploadedParts.length}/${task.totalChunks} 个分片`;
  uploadSpeedText.value =
    speed > 0
      ? `速度：${formatFileSize(speed)}/s，预计剩余 ${remainingSeconds}s`
      : `已完成 ${uploadProgress.value}%`;
};

const resolveUploadedFileLocation = (payload: any): UploadedFileLocation => {
  const source =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const url = sanitizeUrl(source?.url || source?.fileUrl || source?.previewUrl);
  let bucket = firstNonEmptyString(
    source?.bucket,
    source?.fileBucket,
    source?.minioBucket,
  );
  let objectKey = firstNonEmptyString(
    source?.objectKey,
    source?.fileKey,
    source?.objectName,
    source?.key,
    source?.path,
  );

  if ((!bucket || !objectKey) && url) {
    const parsed = parseBucketAndObjectKey(url);
    bucket = bucket || parsed.bucket;
    objectKey = objectKey || parsed.objectKey;
  }

  if (!bucket || !objectKey) {
    throw new Error("文件上传成功，但未获取到 bucket/objectKey");
  }

  return { bucket, objectKey, url };
};

const parseBucketAndObjectKey = (url: string) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return {
      bucket: segments[0] || "",
      objectKey: segments.slice(1).join("/"),
    };
  } catch (error) {
    const segments = String(url).split("?")[0].split("/").filter(Boolean);
    return {
      bucket: segments[0] || "",
      objectKey: segments.slice(1).join("/"),
    };
  }
};

const sanitizeUrl = (value?: string) => {
  return value
    ? String(value)
        .trim()
        .replace(/^`+|`+$/g, "")
    : "";
};

const firstNonEmptyString = (...values: any[]) => {
  const matched = values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  return matched ? String(matched) : "";
};

const wait = (ms: number) => {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
</script>

<style scoped lang="less">
.requirement-form-drawer {
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

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select__wrapper) {
    background: rgba(5, 30, 43, 0.92);
    box-shadow: inset 0 0 0 1px rgba(0, 197, 254, 0.2);
  }

  :deep(.el-form-item__label) {
    color: rgba(226, 248, 255, 0.78);
    padding-bottom: 4px;
    justify-content: flex-start;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }

  :deep(.el-input__inner),
  :deep(.el-textarea__inner),
  :deep(.el-select__placeholder),
  :deep(.el-select__selected-item),
  :deep(.el-tag__content) {
    color: #dff9ff;
  }

  :deep(.el-textarea__inner::placeholder),
  :deep(.el-input__inner::placeholder) {
    color: rgba(226, 248, 255, 0.45);
  }

  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    color: #dff9ff;
  }

  :deep(.el-input__suffix-inner),
  :deep(.el-select__caret) {
    color: rgba(0, 197, 254, 0.8);
  }

  :deep(.el-tag) {
    background: rgba(0, 197, 254, 0.12);
    border-color: rgba(0, 197, 254, 0.2);
    color: #dff9ff;
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
  overflow-y: auto;
  padding: 22px 18px 12px;
}

.requirement-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-row {
  align-items: flex-start;
}

.row-label {
  width: 68px;
  flex-shrink: 0;
  padding-top: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(226, 248, 255, 0.78);
  text-align: left;
}

.row-field {
  flex: 1;
}

.upload-row {
  display: flex;
  align-items: flex-start;
}

.upload-row .row-label {
  width: 84px;
  padding-top: 8px;
}

.upload-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-inline-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-button {
  min-width: 132px;
  border-color: rgba(0, 197, 254, 0.24);
  color: #dff9ff;
}

.upload-status-text {
  color: rgba(226, 248, 255, 0.72);
  font-size: 12px;
  line-height: 1.4;
}

.upload-status-text.error {
  color: #fca5a5;
}

.upload-file-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(0, 197, 254, 0.18);
  border-radius: 8px;
  background: rgba(5, 30, 43, 0.9);
}

.file-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #dff9ff;
  font-size: 13px;
}

.clear-file {
  cursor: pointer;
  color: rgba(226, 248, 255, 0.55);
  font-size: 16px;
}

.location-icon {
  cursor: pointer;
  color: #00c5fe;
  font-size: 18px;
}

.textarea-row {
  align-items: flex-start;
}

.section-title {
  margin: 4px 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #e6fbff;
}

.meta-list {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(5, 30, 43, 0.88);
}

.meta-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.meta-label {
  color: rgba(226, 248, 255, 0.62);
}

.meta-value {
  color: #dff9ff;
  text-align: right;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px 18px;
  border-top: 1px solid rgba(0, 197, 254, 0.14);
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.6;
  font-size: 14px;
}

.detail-label {
  width: 72px;
  flex-shrink: 0;
  color: rgba(226, 248, 255, 0.62);
}

.detail-value {
  flex: 1;
  color: #dff9ff;
  word-break: break-word;
}
</style>
