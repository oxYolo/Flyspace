<template>
  <div v-if="visible" class="annotation-overlay" @click.self="closePanel">
    <div class="annotation-modal">
      <div class="panelHeader">
        <div class="header-title-wrap">
          <span class="panel-title">图像标注工作台</span>
          <span class="source-name">{{ currentFileName || "未选择图片" }}</span>
        </div>
        <div class="header-actions">
          <button
            class="btn-icon"
            :class="{ isActive: uiState.drawTool === 'rect' }"
            title="矩形标注"
            @click="setDrawTool('rect')">
            <span class="toolText">矩形</span>
          </button>
          <button
            class="btn-icon"
            :class="{ isActive: uiState.drawTool === 'polygon' }"
            title="多边形标注"
            @click="setDrawTool('polygon')">
            <span class="toolText">多边形</span>
          </button>
          <button
            class="btn-icon"
            title="撤销 Ctrl+Z"
            @click="canvasRef?.undo()">
            <el-icon><RefreshLeft /></el-icon>
          </button>
          <button
            class="btn-icon"
            title="清空所有框"
            @click="canvasRef?.clearAll()">
            <el-icon><Delete /></el-icon>
          </button>
          <button class="btn-icon btn-close" title="关闭" @click="closePanel">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="workspace-layout">
          <div class="canvas-area">
            <template v-if="isVideo && !isFrameCaptured">
              <video
                ref="videoPreviewRef"
                :src="originalVideoSrc"
                controls
                class="video-preview-player"
                @loadedmetadata="onVideoReady"
                @timeupdate="onVideoTimeUpdate"
                CrossOrigin="anonymous"></video>
            </template>
            <template v-else>
              <CanvasDrawer
                ref="canvasRef"
                :imageSrc="currentImageSrc"
                :classes="classes"
                :colors="currentColors"
                :currentClass="currentClassIdx"
                :allow-draw="!!selectedSceneCode && !!selectedSampleInfoId && !!selectedIssueTypeCode"
                :tool="uiState.drawTool"
                @draw-forbidden="handleDrawForbidden"
                @update:annotations="onAnnotationsUpdate"
                @ready="onImageReady" />
            </template>
            <div v-if="!currentImageSrc && !isVideo" class="canvas-placeholder">
              <el-icon class="canvas-placeholder-icon" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </el-icon>
              <p>从左侧成果库选择图片后开始标注</p>
            </div>
          </div>

          <div class="side-panel">
            <div class="scene-selector-group scene-selector-group-side">
              <div class="scene-field">
                <span class="label-text">巡检场景：</span>
                <el-select
                  :disabled="yoloAnnotations.length > 0"
                  v-model="selectedSceneCode"
                  placeholder="请选择巡检场景..."
                  :loading="optionsLoading"
                  style="width: 100%"
                  clearable>
                  <el-option
                    v-for="item in inspectionSceneOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.dictCode" />
                </el-select>
              </div>

              <div class="scene-field">
                <span class="label-text">样本集：</span>
                <el-select
                  :disabled="yoloAnnotations.length > 0 || !selectedSceneCode"
                  v-model="selectedSampleInfoId"
                  placeholder="请先选择巡检场景..."
                  :loading="optionsLoading"
                  style="width: 100%"
                  clearable>
                  <el-option
                    v-for="item in inspectionSampleOptions"
                    :key="item.id"
                    :label="item.sampleName"
                    :value="String(item.id)" />
                </el-select>
              </div>

              <div class="scene-field">
                <span class="label-text">识别问题：</span>
                <div
                  class="class-list"
                  :class="{ empty: !selectedSampleInfoId }">
                  <span v-if="!selectedSampleInfoId" class="scene-empty-tip">
                    请先选择样本集...
                  </span>
                  <span
                    v-else-if="
                      selectedSampleInfoId && issueTypeOptions.length === 0
                    "
                    class="scene-empty-tip">
                    当前样本集暂无识别问题!
                  </span>
                  <span
                    v-else-if="
                      selectedSampleInfoId &&
                      issueTypeOptions.length > 0 &&
                      !selectedIssueTypeCode
                    "
                    class="scene-empty-tip">
                    请选择识别问题...
                  </span>
                  <span
                    v-for="(item, idx) in issueTypeOptions"
                    :key="item.id"
                    class="class-chip"
                    :class="{ active: selectedIssueTypeCode === item.dictCode }"
                    :style="{
                      '--chip-color': currentColors[idx],
                    }"
                    @click="selectedIssueTypeCode = item.dictCode || ''">
                    {{ item.name }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="isVideo" class="video-controls">
              <template v-if="!isFrameCaptured">
                <span class="frame-label">帧 {{ currentFrame }}</span>
                <input
                  type="range"
                  :min="0"
                  :max="totalFrames - 1"
                  v-model.number="currentFrame"
                  @input="seekFrame"
                  class="frame-slider" />
                <button class="btn-capture" @click="captureFrame">
                  截取此帧标注
                </button>
              </template>
              <template v-else>
                <button
                  class="btn-capture"
                  style="width: 100%"
                  @click="cancelCapture">
                  取消标注，重新选择视频帧
                </button>
              </template>
            </div>

            <div class="annotations-list">
              <div class="list-header">
                <span>标注框 ({{ yoloAnnotations.length }})</span>
              </div>
              <div class="list-content">
                <div
                  v-for="(ann, idx) in yoloAnnotations"
                  :key="idx"
                  class="ann-row">
                  <span>{{ idx + 1 }}</span>
                  <el-select
                    :model-value="ann.classIdx"
                    @change="(classIdx) => updateAnnotationClass(idx, classIdx)"
                    class="ann-class-select"
                    size="small"
                    placeholder="选择类别...">
                    <template #prefix>
                      <div
                        v-if="
                          ann.classIdx !== undefined && ann.classIdx !== null
                        "
                        class="select-prefix-tag"
                        :style="{
                          background: currentColors[ann.classIdx],
                        }"></div>
                    </template>
                    <el-option
                      v-for="(item, index) in issueTypeOptions"
                      :key="item.id"
                      :label="item.name"
                      :value="index">
                      <div class="flex items-center">
                        <el-tag
                          :color="currentColors[index]"
                          style="margin-right: 8px; border-color: transparent"
                          size="small" />
                        <span :style="{ color: currentColors[index] }">
                          {{ item.name }}
                        </span>
                      </div>
                    </el-option>
                  </el-select>
                  <span class="ann-coords" :title="formatAnnotationCoords(ann)">
                    {{ formatAnnotationCoords(ann) }}
                  </span>
                  <button
                    class="ann-delete-btn"
                    @click="deleteAnnotation(idx)"
                    title="删除">
                    <el-icon><Close /></el-icon>
                  </button>
                </div>
              </div>
            </div>

            <div class="side-bottom">
              <div class="export-bar">
                <el-button
                  class="btn-export"
                  type="primary"
                  icon="DocumentAdd"
                  :disabled="yoloAnnotations.length === 0"
                  @click="saveAnnotations">
                  保存标注
                </el-button>
              </div>

              <div class="shortcuts">
                <span>拖拽画框</span>
                <span>点击画多边形</span>
                <span>双击结束多边形</span>
                <span>右键删除</span>
                <span>Del键删除选中</span>
                <span>Ctrl+Z 撤销</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import CanvasDrawer from "./CanvasDrawer.vue";
import { useYoloExport } from "../composables/useYoloExport.js";
import { issueTypeOptions as constantIssueTypes } from "../composables/constants.ts";
import { $getProblemCategoryList } from "@/api/flyControl/smart.ts";
import {
  $getInspectionSampleByScene,
  $getInspectionSampleLabelInfos,
  $saveAnnotation,
} from "@/api/flyControl/file.ts";
import { ElMessage } from "element-plus";

// ── Props：父组件传入当前选中的成果图片 ───────────────────
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  // 从成果库列表点击后传入
  selectedImage: {
    type: Object, // { name, url }
    default: null,
  },
});

const emit = defineEmits(["update:visible"]);

// ── 状态 ─────────────────────────────────────────────────
const panelOpen = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});
const canvasRef = ref(null);

const optionsLoading = ref(false);
const inspectionSceneOptions = ref([]);
const inspectionSampleOptions = ref([]);
const issueTypeOptions = ref([]);
const selectedSceneCode = ref("");
const selectedSampleInfoId = ref("");
const selectedIssueTypeCode = ref("");
const uiState = reactive({
  drawTool: "rect",
});

const classColors = [
  "#FF0000",
  "#FF6600",
  "#FFCC00",
  "#00CC00",
  "#00CCCC",
  "#0066FF",
  "#6600CC",
  "#9933FF",
  "#FF0099",
  "#FF6633",
];

const classes = computed(() =>
  issueTypeOptions.value.map((item) => item?.name).filter(Boolean),
);

// 根据接口获取的issueTypeOptions与本地常量匹配颜色
const currentColors = computed(() => {
  return issueTypeOptions.value.map((item, idx) => {
    if (item?.color) {
      return item.color;
    }
    if (item && item.dictCode) {
      const found = constantIssueTypes.find(
        (opt) => opt.dictCode === item.dictCode,
      );
      if (found && found.color) {
        return found.color;
      }
    }
    return classColors[idx % classColors.length];
  });
});

const currentClassIdx = ref(0);

const currentImageSrc = ref(props.selectedImage?.url || null);
const currentFileName = ref(props.selectedImage?.name || "");
const isVideo = ref(false);

const yoloAnnotations = ref([]);

// 视频相关
const videoPreviewRef = ref(null);
const originalVideoSrc = ref("");
const isFrameCaptured = ref(false);

const currentFrame = ref(0);
const totalFrames = ref(0);
const frameRate = ref(25);

const { exportSingleTxt } = useYoloExport();

const setDrawTool = (tool) => {
  if (uiState.drawTool === tool) return;
  canvasRef.value?.cancelCurrentDrawing?.();
  uiState.drawTool = tool;
};

const syncSelectedImageState = (img = props.selectedImage) => {
  currentFileName.value = img?.name || "";
  isVideo.value = img?.fileType === "VIDEO";
  if (isVideo.value) {
    currentImageSrc.value = null;
    originalVideoSrc.value = img?.url || "";
  } else {
    currentImageSrc.value = img?.url || null;
    originalVideoSrc.value = "";
  }
  isFrameCaptured.value = false;
  currentFrame.value = 0;
  totalFrames.value = 0;
};

const resetWorkbenchState = () => {
  canvasRef.value?.cancelCurrentDrawing?.();
  canvasRef.value?.clearAll?.();
  uiState.drawTool = "rect";
  inspectionSceneOptions.value = [];
  inspectionSampleOptions.value = [];
  issueTypeOptions.value = [];
  selectedSceneCode.value = "";
  selectedSampleInfoId.value = "";
  selectedIssueTypeCode.value = "";
  currentClassIdx.value = 0;
  yoloAnnotations.value = [];
  syncSelectedImageState();
};

const syncCurrentClassIndex = () => {
  const nextIndex = issueTypeOptions.value.findIndex(
    (item) => item?.dictCode === selectedIssueTypeCode.value,
  );
  currentClassIdx.value = nextIndex >= 0 ? nextIndex : 0;
};

const formatYoloAnnotationValue = (ann) => {
  if (ann?.shapeType === "polygon" && Array.isArray(ann?.polygonPoints)) {
    return ann.polygonPoints
      .flatMap((point) => [
        Number(point?.x || 0).toFixed(4),
        Number(point?.y || 0).toFixed(4),
      ])
      .join(" ");
  }

  return [
    Number(ann?.cx || 0).toFixed(4),
    Number(ann?.cy || 0).toFixed(4),
    Number(ann?.w || 0).toFixed(4),
    Number(ann?.h || 0).toFixed(4),
  ].join(" ");
};

const formatAnnotationCoords = (ann) => {
  if (ann?.shapeType === "polygon" && Array.isArray(ann?.polygonPoints)) {
    return ann.polygonPoints
      .flatMap((point) => [
        Number(point?.x || 0).toFixed(4),
        Number(point?.y || 0).toFixed(4),
      ])
      .join(",");
  }

  return [
    Number(ann?.cx || 0).toFixed(4),
    Number(ann?.cy || 0).toFixed(4),
    Number(ann?.w || 0).toFixed(4),
    Number(ann?.h || 0).toFixed(4),
  ].join(",");
};

const loadInspectionScenes = async () => {
  optionsLoading.value = true;
  try {
    const res = await $getProblemCategoryList();
    if (res?.code !== 200) {
      inspectionSceneOptions.value = [];
      issueTypeOptions.value = [];
      selectedSceneCode.value = "";
      selectedIssueTypeCode.value = "";
      currentClassIdx.value = 0;
      ElMessage.error(res?.msg || "获取巡检场景失败");
      return;
    }

    inspectionSceneOptions.value = Array.isArray(res?.data) ? res.data : [];
    const currentSceneExists = inspectionSceneOptions.value.some(
      (item) => item?.dictCode === selectedSceneCode.value,
    );

    if (!selectedSceneCode.value && inspectionSceneOptions.value.length === 1) {
      selectedSceneCode.value = inspectionSceneOptions.value[0]?.dictCode || "";
    } else if (!currentSceneExists) {
      issueTypeOptions.value = [];
      selectedIssueTypeCode.value = "";
      currentClassIdx.value = 0;
    }
  } catch (error) {
    inspectionSceneOptions.value = [];
    issueTypeOptions.value = [];
    selectedSceneCode.value = "";
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    ElMessage.error(error?.message || "获取巡检场景失败");
  } finally {
    optionsLoading.value = false;
  }
};

const loadInspectionSampleOptions = async (sceneCode = "") => {
  const code = String(sceneCode || "").trim();
  if (!code) {
    inspectionSampleOptions.value = [];
    selectedSampleInfoId.value = "";
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    return;
  }

  const sceneItem = inspectionSceneOptions.value.find(
    (item) => String(item?.dictCode || "").trim() === code,
  );
  const sceneKeyword = String(
    sceneItem?.name || sceneItem?.dictCode || code,
  ).trim();

  optionsLoading.value = true;
  try {
    const res = await $getInspectionSampleByScene(sceneKeyword);
    if (res?.code !== 200) {
      inspectionSampleOptions.value = [];
      selectedSampleInfoId.value = "";
      ElMessage.error(res?.msg || "获取样本集失败");
      return;
    }
    inspectionSampleOptions.value = Array.isArray(res?.data) ? res.data : [];
    const exists = inspectionSampleOptions.value.some(
      (x) => String(x?.id) === String(selectedSampleInfoId.value || ""),
    );
    if (!exists) {
      selectedSampleInfoId.value = "";
      issueTypeOptions.value = [];
      selectedIssueTypeCode.value = "";
      currentClassIdx.value = 0;
    }
  } catch (error) {
    inspectionSampleOptions.value = [];
    selectedSampleInfoId.value = "";
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    ElMessage.error(error?.message || "获取样本集失败");
  } finally {
    optionsLoading.value = false;
  }
};

const loadIssueTypes = async (sampleInfoId, preserveSelection = false) => {
  const id = String(sampleInfoId || "").trim();
  if (!id) {
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    return;
  }

  optionsLoading.value = true;
  try {
    const res = await $getInspectionSampleLabelInfos(id);
    if (res?.code !== 200) {
      issueTypeOptions.value = [];
      selectedIssueTypeCode.value = "";
      currentClassIdx.value = 0;
      ElMessage.error(res?.msg || "获取识别问题失败");
      return;
    }

    issueTypeOptions.value = Array.isArray(res?.data)
      ? res.data.map((item) => ({
          ...item,
          name: item?.labelCn || "",
          dictCode: item?.labelEn || "",
        }))
      : [];
    const validSelection = issueTypeOptions.value.some(
      (item) => item?.dictCode === selectedIssueTypeCode.value,
    );

    if (!preserveSelection || !validSelection) {
      selectedIssueTypeCode.value = issueTypeOptions.value[0]?.dictCode || "";
    }

    syncCurrentClassIndex();
  } catch (error) {
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    ElMessage.error(error?.message || "获取识别问题失败");
  } finally {
    optionsLoading.value = false;
  }
};

// ── 监听父组件传入的图片 ─────────────────────────────────
watch(
  () => props.selectedImage,
  (img) => {
    if (img) {
      canvasRef.value?.cancelCurrentDrawing?.();
      uiState.drawTool = "rect";
      syncSelectedImageState(img);
      yoloAnnotations.value = [];
    }
  },
);

watch(
  () => props.visible,
  (visible) => {
    panelOpen.value = visible;
    if (visible) {
      resetWorkbenchState();
      loadInspectionScenes();
      return;
    }
    resetWorkbenchState();
  },
);

watch(selectedSampleInfoId, (sampleInfoId, previousSampleInfoId) => {
  if (!sampleInfoId) {
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    return;
  }

  if (sampleInfoId !== previousSampleInfoId) {
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
  }

  loadIssueTypes(sampleInfoId);
});

watch(selectedSceneCode, (sceneCode, previousSceneCode) => {
  if (!sceneCode) {
    inspectionSampleOptions.value = [];
    selectedSampleInfoId.value = "";
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
    return;
  }

  if (sceneCode !== previousSceneCode) {
    selectedSampleInfoId.value = "";
    issueTypeOptions.value = [];
    selectedIssueTypeCode.value = "";
    currentClassIdx.value = 0;
  }

  loadInspectionSampleOptions(sceneCode);
});

watch(selectedIssueTypeCode, () => {
  syncCurrentClassIndex();
});

// ── 本地文件 ─────────────────────────────────────────────
function onFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  currentFileName.value = file.name;
  const url = URL.createObjectURL(file);

  if (file.type.startsWith("video/")) {
    isVideo.value = true;
    currentImageSrc.value = null;
    originalVideoSrc.value = url;
    isFrameCaptured.value = false;
    currentFrame.value = 0;
  } else {
    isVideo.value = false;
    currentImageSrc.value = url;
    originalVideoSrc.value = "";
    isFrameCaptured.value = false;
    yoloAnnotations.value = [];
  }
}

// ── 视频帧 ───────────────────────────────────────────────
function onVideoReady(e) {
  const video = e.target;
  // 估算总帧数（这里默认25帧/秒估算）
  totalFrames.value = Math.floor((video.duration || 0) * frameRate.value);
}

function onVideoTimeUpdate(e) {
  const video = e.target;
  currentFrame.value = Math.floor((video.currentTime || 0) * frameRate.value);
}

function seekFrame() {
  const video = videoPreviewRef.value;
  if (!video) return;
  video.currentTime = currentFrame.value / frameRate.value;
}

function captureFrame() {
  const video = videoPreviewRef.value;
  if (!video) return;
  const cvs = document.createElement("canvas");
  cvs.width = video.videoWidth;
  cvs.height = video.videoHeight;
  cvs.getContext("2d").drawImage(video, 0, 0, cvs.width, cvs.height);
  currentImageSrc.value = cvs.toDataURL("image/jpeg");
  isFrameCaptured.value = true;
  yoloAnnotations.value = [];
}

function cancelCapture() {
  isFrameCaptured.value = false;
  currentImageSrc.value = null;
  yoloAnnotations.value = [];
}

// ── 标注更新回调 ─────────────────────────────────────────
function onAnnotationsUpdate(anns) {
  yoloAnnotations.value = anns;
}

function onImageReady({ width, height }) {
  // 图片尺寸就绪
}

function handleDrawForbidden() {
  ElMessage.warning("请先选择巡检场景、样本集和识别问题再开始标注");
}

// ── 类别管理 ─────────────────────────────────────────────
// ── 导出 ─────────────────────────────────────────────────
function doExportTxt() {
  exportSingleTxt(yoloAnnotations.value, currentFileName.value || "annotation");
}

function updateAnnotationClass(annotationIdx, newClassIdx) {
  // 更新 Canvas 中对应框的类别
  canvasRef.value?.updateAnnotationClass(annotationIdx, newClassIdx);
  // Canvas 会自动触发 update:annotations 事件，yoloAnnotations 会更新
}

function deleteAnnotation(idx) {
  // 从 Canvas 中删除（触发撤销栈和重绘）
  canvasRef.value?.deleteAnnotation(idx);
  // yoloAnnotations 会通过 onAnnotationsUpdate 回调自动更新
}

// 保存标注
const saveAnnotations = async () => {
  // 验证必要的数据
  if (!props.selectedImage?.id && !props.selectedImage?.fileId) {
    ElMessage.error("无法获取文件ID");
    return;
  }

  if (!selectedSceneCode.value) {
    ElMessage.error("请选择巡检场景");
    return;
  }

  if (!selectedSampleInfoId.value) {
    ElMessage.error("请选择样本集");
    return;
  }

  if (!selectedIssueTypeCode.value) {
    ElMessage.error("请选择识别问题");
    return;
  }

  if (yoloAnnotations.value.length === 0) {
    ElMessage.error("没有标注框");
    return;
  }

  try {
    // 获取当前选中的场景信息
    const sceneItem = inspectionSceneOptions.value.find(
      (item) => item?.dictCode === selectedSceneCode.value,
    );
    const issueItem = issueTypeOptions.value.find(
      (item) => item?.dictCode === selectedIssueTypeCode.value,
    );

    if (!sceneItem || !issueItem) {
      ElMessage.error("场景或问题类型信息缺失");
      return;
    }

    const imageId = String(
      props.selectedImage?.fileId || props.selectedImage?.id || "",
    ).trim();
    if (!imageId) {
      ElMessage.error("无法获取图片ID");
      return;
    }

    // 构建图片标注信息列表
    const imageLabelInfos = yoloAnnotations.value.map((ann) => {
      // 找到该框指定的具体问题大类项（下拉选择的类，如果没有则取当前全局选中的）
      const item = issueTypeOptions.value[ann.classIdx] || issueItem;
      // 用 dictCode 去本地常量配置里寻找 color
      const constItem = constantIssueTypes.find(
        (c) => c.dictCode === item.dictCode,
      );

      return {
        labelCn: item.name, // 使用该框独立的中文标签
        labelEn: item.dictCode, // 使用该框独立的英文编码
        yoloAnnotation: formatYoloAnnotationValue(ann),
        color:
          item.color ||
          constItem?.color ||
          currentColors.value[ann.classIdx] ||
          "#999999",
        ...(item?.sort === undefined || item?.sort === null
          ? {}
          : { yoloSort: Number(item.sort) }),
      };
    });

    const annotationData = {
      imageId,
      sampleInfoId: selectedSampleInfoId.value,
      identifyDictId: sceneItem.id,
      imageLabelInfos,
    };

    // 调用保存接口
    const res = await $saveAnnotation(annotationData);

    if (res?.code === 200) {
      ElMessage.success("标注信息保存成功");
      // 清空标注框
      yoloAnnotations.value = [];
      canvasRef.value?.clearAll();
      // 关闭面板
      emit("update:visible", false);
    } else {
      ElMessage.error(res?.msg || "保存失败，请重试");
    }
  } catch (error) {
    ElMessage.error(error?.message || "保存标注失败");
    console.error("保存标注错误:", error);
  }
};

function closePanel() {
  resetWorkbenchState();
  emit("update:visible", false);
}
</script>

<style scoped>
/* ── 遮罩与弹框 ─────────────────────────────────── */
.annotation-overlay {
  position: fixed;
  top: 0px;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20px;
  background: rgba(7, 14, 20, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  backdrop-filter: blur(1px);
}

.annotation-modal {
  margin-top: 60px;
  width: min(1336px, calc(100vw - 64px));
  height: min(960px, calc(100vh - 96px));
  background: rgba(23, 44, 44, 0.96);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);

  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.42);
}

.panelHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  flex-shrink: 0;
}

.header-title-wrap {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
  letter-spacing: 0.5px;
}
.source-name {
  font-size: 13px;
  color: #cbd5e1;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-close {
  color: #f8fafc;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: row;
  padding: 16px;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
}

.btn-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);

  color: #cbd5e1;
  padding: 4px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.btn-icon.isActive {
  background: rgba(125, 211, 252, 0.16);
  border-color: rgba(125, 211, 252, 0.35);
  color: #7dd3fc;
}
.toolText {
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.btn-icon:hover {
  background: rgba(125, 211, 252, 0.1);
  color: #7dd3fc;
}

.scene-selector-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scene-field {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.workspace-layout {
  display: flex;
  align-items: stretch;
  gap: 10px;
  min-height: 0;
}

/* ── 类别选择 ─────────────────────────────────── */
.class-selector {
  padding: 2px 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.label-text {
  min-width: 70px;
  text-align: right;
  font-size: 14px;
  color: #94a3b8;
  flex-shrink: 0;
}
.class-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  height: 66px;
  overflow: auto;
  border: 1px solid #2193ad;
  border-radius: 4px;
  padding: 6px 8px;
}
.class-list.empty {
  min-height: 32px;
  font-size: 14px;
}
.class-chip {
  font-size: 11px;
  padding: 3px 4px;
  border-radius: 2px;
  border: 1px solid var(--chip-color, #7dd3fc);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.15s;
  background: rgba(255, 255, 255, 0.02);
}
.class-chip.active {
  background: var(--chip-color, #7dd3fc);
  color: #03131a;
  font-weight: 600;
}
.scene-empty-tip {
  font-size: 14px;
  color: #999999;
}
.btn-add-class {
  font-size: 11px;
  color: #7dd3fc;
  background: none;
  border: 1px dashed rgba(125, 211, 252, 0.34);

  padding: 3px 8px;
  cursor: pointer;
}

.add-class-row {
  display: flex;
  gap: 6px;
  padding: 0;
  align-items: center;
}
.add-class-row input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.18);

  color: #e2e8f0;
  font-size: 12px;
  padding: 4px 8px;
}
.add-class-row button {
  font-size: 11px;
  padding: 4px 8px;

  border: 1px solid rgba(125, 211, 252, 0.24);
  background: none;
  color: #7dd3fc;
  cursor: pointer;
}

/* ── Canvas区 ─────────────────────────────────── */
.video-preview-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.canvas-area {
  flex: 1 1 auto;
  position: relative;
  margin: 0;

  overflow: hidden;
  min-height: 520px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  display: flex;
  align-items: center;
  justify-content: center;
}
.canvas-placeholder-icon {
  color: #94a3b8;
  width: 40px;
  height: 40px;
}
.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.canvas-placeholder p {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  margin: 0;
  padding: 0 20px;
}

.side-panel {
  width: 350px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.scene-selector-group-side {
  gap: 8px;
}

.scene-selector-group-side .scene-field {
  align-items: center;
  flex-direction: row;
}

.scene-selector-group-side .scene-field .label-text {
  white-space: nowrap;
  flex: 0 0 auto;
}

.scene-selector-group-side .scene-field .class-list,
.scene-selector-group-side .scene-field .el-select {
  flex: 1 1 auto;
  min-width: 0;
}

.scene-selector-group-side .class-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  max-height: 120px;
  overflow: auto;
}

.scene-selector-group-side .scene-empty-tip {
  line-height: 1.4;
}

/* ── 视频控制 ─────────────────────────────────── */
.video-controls {
  padding: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.frame-label {
  font-size: 11px;
  color: #94a3b8;
  min-width: 50px;
}
.frame-slider {
  flex: 1;
  accent-color: #7dd3fc;
}
.btn-capture {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid rgba(125, 211, 252, 0.24);
  background: rgba(125, 211, 252, 0.08);
  color: #7dd3fc;
  cursor: pointer;
  white-space: nowrap;
}

/* ── 标注列表 ─────────────────────────────────── */
.annotations-list {
  height: 400px;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex: 1 1 auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.list-header {
  font-size: 14px;
  color: #94a3b8;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}
.list-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.ann-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}
.ann-dot {
  width: 8px;
  height: 8px;

  flex-shrink: 0;
}
.ann-label {
  font-size: 12px;
  color: #e2e8f0;
  min-width: 40px;
}
.ann-class-select {
  flex: 0 0 auto;
  width: 120px;
}
.ann-class-select :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(125, 211, 252, 0.2);
  padding: 2px 8px;
}
.ann-class-select :deep(.el-input__inner) {
  font-size: 12px;
  color: #e2e8f0;
}
.ann-class-select :deep(.el-input__prefix) {
  display: flex;
  align-items: center;
}
.select-prefix-tag {
  width: 12px;
  height: 12px;
  margin-right: 2px;
  flex-shrink: 0;
}
.option-tag-block {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 8px;
  flex-shrink: 0;
}
.ann-coords {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}
.ann-delete-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ann-delete-btn:hover {
  color: #f87171;
}
.ann-delete-btn:active {
  transform: scale(0.95);
}

/* ── 导出 ─────────────────────────────────────── */
.export-bar {
  display: flex;
  gap: 8px;
  padding: 0;
}

.side-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn-export {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  font-size: 14px;
  transition: all 0.15s;
}
.btn-export:hover:not(:disabled) {
  background: rgba(125, 211, 252, 0.16);
}
.btn-export:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-export.secondary {
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  border-color: rgba(255, 255, 255, 0.08);
}

/* ── 快捷键提示 ───────────────────────────────── */
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
}
.shortcuts span {
  font-size: 10px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);

  padding: 2px 6px;
}

.el-tag {
  border: none;
  border-radius: 0px;
  aspect-ratio: 1;
}
</style>
