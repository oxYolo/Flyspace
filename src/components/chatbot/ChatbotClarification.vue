<template>
  <div class="chatbot-clarification">
    <template v-if="clarification.type === 'low_altitude_confirmation'">
      <div class="chatbot-clarification__config">
        <div
          v-for="item in lowAltitudeConfig"
          :key="item.key"
          class="chatbot-clarification__config-row">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div
        v-if="showConfirmationWarning"
        class="chatbot-clarification__warning">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ confirmationWarning }}</span>
      </div>

      <div class="chatbot-clarification__actions">
        <button
          type="button"
          class="chatbot-clarification__primary-action"
          :disabled="disabled || !active || !canApproveConfirmation"
          @click="submitLowAltitudeConfirmation">
          {{ confirmationActionLabel }}
        </button>
        <span class="chatbot-clarification__hint">
          如需修改，请在输入框中描述需要调整的配置
        </span>
      </div>
    </template>

    <template v-else-if="clarification.type === 'low_altitude_input'">
      <ul
        v-if="clarificationQuestions.length"
        class="chatbot-clarification__question-list">
        <li v-for="question in clarificationQuestions" :key="question.field">
          {{ question.question }}
        </li>
      </ul>

      <div
        v-if="lowAltitudeCandidates.length && canSelectCandidate"
        class="chatbot-clarification__candidates">
        <button
          v-for="candidate in lowAltitudeCandidates"
          :key="candidate.id"
          type="button"
          class="chatbot-clarification__candidate"
          :disabled="disabled || !active"
          @click="selectCandidate(candidate)">
          <span>{{ candidate.name || candidate.title || candidate.id }}</span>
          <small v-if="candidateSecondaryText(candidate)">
            {{ candidateSecondaryText(candidate) }}
          </small>
        </button>
      </div>
      <p
        v-else-if="lowAltitudeCandidates.length"
        class="chatbot-clarification__hint">
        当前需要补充多个字段，请在输入框中说明对应信息后发送。
      </p>
    </template>

    <template v-else-if="clarification.type === 'plan_review'">
      <ol class="chatbot-clarification__plan-list">
        <li
          v-for="(step, index) in clarification.steps || []"
          :key="step.id || `plan-${index}`">
          <strong>{{ step.title || `步骤 ${index + 1}` }}</strong>
          <span v-if="step.step && step.step !== step.title">
            {{ step.step }}
          </span>
        </li>
      </ol>
      <div class="chatbot-clarification__actions">
        <button
          type="button"
          class="chatbot-clarification__primary-action"
          :disabled="disabled || !active"
          @click="approvePlan">
          确认执行
        </button>
        <span class="chatbot-clarification__hint">
          如需修改，请在输入框中描述修改意见
        </span>
      </div>
    </template>

    <template v-else-if="clarification.type === 'skill_selection'">
      <div class="chatbot-clarification__skill-list">
        <label
          v-for="option in clarification.options || []"
          :key="option.id || option.name || option.title"
          class="chatbot-clarification__skill">
          <input
            v-model="selectedSkillNames"
            type="checkbox"
            :value="option.name || option.id || option.title"
            :disabled="disabled || !active" />
          <span>
            <strong>{{ option.title || option.name || option.id }}</strong>
            <small v-if="option.description">{{ option.description }}</small>
          </span>
        </label>
      </div>
      <button
        type="button"
        class="chatbot-clarification__primary-action"
        :disabled="
          disabled ||
          !active ||
          selectedSkillNames.length < (clarification.minSelection || 1)
        "
        @click="submitSkills">
        确认选择 
      </button>
    </template>

    <ul
      v-else-if="clarificationQuestions.length"
      class="chatbot-clarification__question-list">
      <li v-for="question in clarificationQuestions" :key="question.field">
        {{ question.question }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { WarningFilled } from "@element-plus/icons-vue";
import { getViewer } from "@/services/mapService";
import type {
  ChatbotClarification,
  ClarificationCandidate,
  ClarificationSubmission,
} from "./types";

const props = defineProps<{
  clarification: ChatbotClarification;
  disabled: boolean;
  active: boolean;
}>();

const emit = defineEmits<{
  submit: [submission: ClarificationSubmission];
}>();

const selectedSkillNames = ref<string[]>([]);

// 低空候选使用 lowAltitude.candidates；它和 Planner 的 options 是两套协议。
const lowAltitudeCandidates = computed(
  () => props.clarification.lowAltitude?.candidates || [],
);

// 只有一个 missing field 时才能安全把候选 id 绑定到该字段。
// 多字段场景不自动猜测，避免把航线、设备或识别目标填错位置。
const candidateField = computed(() =>
  props.clarification.missing_fields?.length === 1
    ? props.clarification.missing_fields[0]
    : "",
);

const canSelectCandidate = computed(
  () => Boolean(candidateField.value) && lowAltitudeCandidates.value.length > 0,
);

const clarificationQuestions = computed(() => {
  const fields = props.clarification.missing_fields || [];
  const questions = props.clarification.field_questions || {};
  return fields.map((field) => ({
    field,
    // question: questions[field] || `请补充：${field}`,
    question: questions[field] ,
  }));
});

// 中文名称用于聊天记录和按钮文案，唯一 id 只放进提交请求。
const candidateSecondaryText = (candidate: ClarificationCandidate) => {
  const details = [
    candidate.description,
    candidate.updateTime ? `更新时间：${candidate.updateTime}` : "",
    candidate.airspace ? `空域：${candidate.airspace}` : "",
  ].filter(Boolean);
  return details.join("；");
};

const formatConfigValue = (key: string, value: unknown) => {
  if (typeof value === "boolean") return value ? "开启" : "关闭";

  const stringValue = String(value);
  const mappings: Record<string, Record<string, string>> = {
    executionMode: {
      immediate: "立即执行",
      scheduled: "定时执行",
      cycle: "周期执行",
    },
    waylinePrecisionType: {
      "1": "高精度 RTK",
      "0": "普通精度",
    },
    exitWaylineWhenRcLost: {
      "1": "失联自动返航",
      "0": "继续执行航线",
    },
    outOfControlAction: {
      "0": "自动返航",
      "1": "悬停",
      "2": "降落",
    },
    completionAction: {
      goHome: "自动返航",
      hover: "悬停",
      landing: "自动降落",
    },
  };

  return mappings[key]?.[stringValue] || stringValue;
};

const configLabels: Record<string, string> = {
  taskName: "任务名称",
  inspectionScene: "巡检场景",
  // problem: "识别目标",
  issue: "识别问题",
  routeName: "执行航线",
  deviceName: "执行设备",
  executionMode: "任务策略",
  executionTime: "执行时间",
  rthAltitude: "返航高度",
  waylinePrecisionType: "任务精度",
  exitWaylineWhenRcLost: "航线飞行中失联",
  // outOfControlAction: "失控策略",
  autoResumeFlight: "自动断点续飞",
  completionAction: "任务完成",
  autoReturnOnCompletion: "完成后自动返航",
};

const lowAltitudeConfig = computed(() => {
  const args = props.clarification.lowAltitude?.args || {};
  // args 是后端给出的待确认快照；这里只做展示映射，不把中文展示值回传覆盖原始参数。
  const visibleKeys = [
    "taskName",
    "inspectionScene",
    // "problem",
    "issue",
    "routeName",
    "deviceName",
    "executionMode",
    "executionTime",
    "rthAltitude",
    "waylinePrecisionType",
    "exitWaylineWhenRcLost",
    // "outOfControlAction",
    "autoResumeFlight",
    "completionAction",
    "autoReturnOnCompletion",
  ];
  const seenLabels = new Set<string>();

  return visibleKeys
    .filter((key) => args[key] !== undefined && args[key] !== null)
    .map((key) => ({
      key,
      label: configLabels[key] || key,
      value:
        key === "rthAltitude"
          ? `${formatConfigValue(key, args[key])} 米`
          : formatConfigValue(key, args[key]),
    }))
    .filter((item) => {
      if (seenLabels.has(item.label)) return false;
      seenLabels.add(item.label);
      return true;
    });
});

const confirmationActionLabel = computed(() => {
  const lowAltitude = props.clarification.lowAltitude;
  if (lowAltitude?.reason === "weather_confirmation") {
    return "确认雨天继续起飞";
  }
  if (lowAltitude?.reason === "delete_confirmation") {
    return "再次确认删除";
  }
  if (lowAltitude?.operation === "low-altitude-task-create") {
    return lowAltitude.willPublish ? "确认创建并执行" : "确认创建任务";
  }
  if (lowAltitude?.operation === "low-altitude-task-execute/distribute") {
    return "确认下发执行";
  }
  return "确认本次操作";
});

const showConfirmationWarning = computed(() => {
  const reason = props.clarification.lowAltitude?.reason;
  // 雨天、删除和会自动下发的创建操作都需要明显的风险提示。
  return Boolean(
    props.clarification.lowAltitude?.willPublish ||
      reason === "weather_confirmation" ||
      reason === "delete_confirmation",
  );
});

const confirmationWarning = computed(() => {
  const lowAltitude = props.clarification.lowAltitude;
  if (lowAltitude?.reason === "weather_confirmation") {
    const weather = lowAltitude.weather;
    const rainfallLabel = weather?.rainfallLabel || "当前降雨";
    return `执行机场检测到${rainfallLabel}，确认后将继续下发并启动任务，请确认设备状态。`;
  }
  if (lowAltitude?.reason === "delete_confirmation") {
    return "该操作可能删除平台任务，请确认是否继续。";
  }
  return lowAltitude?.willPublish
    ? "确认后将创建任务并立即下发，平台可能启动飞行，请确认配置无误。"
    : "请确认当前操作配置无误。";
});

const canApproveConfirmation = computed(
  () =>
    props.clarification.type === "low_altitude_confirmation" &&
    Boolean(props.clarification.lowAltitude?.fingerprint),
);

const submitLowAltitudeConfirmation = () => {
  const fingerprint = props.clarification.lowAltitude?.fingerprint;
  if (!fingerprint) return;

  // 低空确认不是普通字段补充：后端用 type/action/fingerprint 恢复并校验当前快照。
  const request = JSON.stringify({
    type: "low_altitude_confirmation",
    action: "approve",
    fingerprint,
  });
  emit("submit", {
    request,
    displayText: confirmationActionLabel.value,
  });
};

const selectCandidate = (candidate: ClarificationCandidate) => {
  const field = candidateField.value;
  if (!field || !candidate.id) return;

  // 页面展示候选名称，但提交候选唯一 ID，避免同名航线或设备产生歧义。
  // 外层 request 仍是字符串，因此这里必须只序列化一次。
  emit("submit", {
    request: JSON.stringify({ [field]: candidate.id }),
    displayText: candidate.name || candidate.title || candidate.id,
  });
};

const approvePlan = () => {
  // plan_review 属于通用 Planner 协议，不能复用低空确认的 fingerprint 协议。
  emit("submit", {
    request: JSON.stringify({
      type: "plan_review",
      action: "approve",
      taskRunId: props.clarification.taskRunId,
      taskTypeId: props.clarification.taskTypeId,
    }),
    displayText: "确认执行",
  });
};

const submitSkills = () => {
  // skill_selection 回传技能 name 列表；页面标题只是给用户看的可读文本。
  emit("submit", {
    request: JSON.stringify({
      type: "skill_selection",
      taskRunId: props.clarification.taskRunId,
      taskTypeId: props.clarification.taskTypeId,
      selectedSkillNames: selectedSkillNames.value,
    }),
    displayText: `已选择 ${selectedSkillNames.value.length} 项技能`,
  });
};

// 记录上次 flyTo 的指纹，避免同一个确认卡反复触发飞行动画。
let lastFlyToFingerprint: string | null = null;

watch(
  () => props.clarification,
  (clarification) => {
    selectedSkillNames.value = [...(clarification.defaultSelectedSkillNames || [])];

    // 低空确认卡片：若携带设备实时经纬度则自动飞到该位置。
    if (clarification.type !== "low_altitude_confirmation") return;
    const lowAltitude = clarification.lowAltitude;
    if (!lowAltitude) return;

    const fingerprint = lowAltitude.fingerprint ?? null;
    if (fingerprint && fingerprint === lastFlyToFingerprint) return;

    const device = lowAltitude.device;
    const lon = device?.longitude;
    const lat = device?.latitude;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

    const viewer = getViewer();
    const Cesium = (window as any).Cesium;
    if (!viewer || !Cesium) return;

    try {
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, device?.altitude ?? 0);
      const boundingSphere = new Cesium.BoundingSphere(position, 1);
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-45),
          device?.altitude ? device.altitude * 1.5 : 5000,
        ),
      });
      lastFlyToFingerprint = fingerprint;
    } catch (err) {
      console.warn("flyTo device failed:", err);
    }
  },
  { immediate: true },
);
</script>

<style lang="less" scoped>
@cyan: #00ffff;
@cyan-soft: rgba(0, 255, 255, 0.3);
@text-main: #e6f7ff;
@text-sub: #8acdd6;

.chatbot-clarification {
  margin-top: 12px;
  padding: 10px 11px;
  border: 1px solid @cyan-soft;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

.chatbot-clarification__config {
  display: grid;
  gap: 6px;
}

.chatbot-clarification__config-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: @text-sub;
  line-height: 1.5;

  strong {
    color: @text-main;
    font-weight: 500;
    text-align: right;
  }
}

.chatbot-clarification__warning {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding: 8px;
  border: 1px solid rgba(255, 170, 0, 0.65);
  color: #ffd27a;
  background: rgba(255, 170, 0, 0.1);
  line-height: 1.5;
}

.chatbot-clarification__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.chatbot-clarification__primary-action {
  padding: 5px 10px;
  border: 1px solid @cyan;
  border-radius: 4px;
  color: #001016;
  background: @cyan;
  cursor: pointer;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: #9fffff;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.chatbot-clarification__hint {
  color: @text-sub;
  font-size: 11px;
}

.chatbot-clarification__candidates,
.chatbot-clarification__skill-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.chatbot-clarification__candidate {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 9px;
  border: 1px solid @cyan-soft;
  border-radius: 4px;
  color: @text-main;
  background: rgba(0, 255, 255, 0.04);
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: @cyan;
    background: rgba(0, 255, 255, 0.14);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  small {
    color: @text-sub;
  }
}

.chatbot-clarification__skill {
  display: flex;
  gap: 8px;
  color: @text-main;
  cursor: pointer;

  input {
    accent-color: @cyan;
  }

  span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  small {
    color: @text-sub;
  }
}

.chatbot-clarification__plan-list,
.chatbot-clarification__question-list {
  // margin: 8px 0;
  // padding-left: 20px;
  color: @text-sub;
  line-height: 1.6;
}

.chatbot-clarification__plan-list li {
  margin-bottom: 7px;

  strong,
  span {
    display: block;
  }

  strong {
    color: @text-main;
  }
}
</style>
