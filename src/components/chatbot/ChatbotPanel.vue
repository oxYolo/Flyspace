<template>
  <aside
    v-show="chatbot.visible"
    class="chatbot-panel"
    :class="{ 'is-resizing': resizing }"
    aria-label="智能问答窗口"
    :style="{ width: `${chatbot.panelWidth}vw` }">
    <button
      class="chatbot-panel__resize-handle"
      type="button"
      aria-label="调整面板宽度"
      @pointerdown="startResize"></button>

    <header class="chatbot-panel__header">
      <div class="chatbot-panel__identity">
        <div class="chatbot-panel__avatar">
          <img :src="chatbotAvatar" alt="" />
        </div>
        <div>
          <h2 class="chatbot-panel__title">低空智飞助手</h2>
          <div class="chatbot-panel__status">
            <!-- <span class="chatbot-panel__status-dot"></span> -->
            <span>我是您的平台AI数字人，24小时在线</span>
          </div>
        </div>
      </div>
      <div class="chatbot-panel__header-actions">
        <button
          class="chatbot-panel__icon-btn"
          type="button"
          title="历史对话"
          aria-label="历史对话"
          @click="openHistory">
          <el-icon><ChatDotRound /></el-icon>
        </button>
        <button
          class="chatbot-panel__icon-btn"
          type="button"
          title="新建对话"
          aria-label="新建对话"
          @click="handleNewChat">
          <el-icon><Plus /></el-icon>
        </button>
        <button
          class="chatbot-panel__icon-btn"
          type="button"
          title="关闭智能问答"
          aria-label="关闭智能问答"
          @click="chatbot.close()">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </header>

    <section
      ref="messagesRef"
      v-show="panelView === 'chat'"
      class="chatbot-panel__messages"
      @scroll.passive="handleMessagesScroll">
      <div class="chatbot-panel__welcome">您好，我是低空智飞助手，召唤即现，掌控全域！支持低空政策答疑、一键飞行，可接收各类飞行任务指令。即刻开启，体验从数据分析到任务执行的无缝协同。</div>
      <div v-if="!messages.length" class="chatbot-panel__built-in">
        <div class="chatbot-panel__built-in-title">您可以这样问我</div>
        <button
          v-for="question in builtInQuestions"
          :key="question"
          class="chatbot-panel__built-in-question"
          type="button"
          :disabled="loading || stopping"
          @click="sendBuiltInQuestion(question)">
          {{ question }}
        </button>
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="chatbot-panel__message"
        :class="`chatbot-panel__message--${message.role}`">
        <div
          v-if="message.role === 'assistant'"
          class="chatbot-panel__message-avatar">
          <img :src="chatbotAvatar" alt="" />
        </div>
        <div class="chatbot-panel__bubble">
          <div
            v-if="message.role === 'assistant' && message.thoughtSteps?.length"
            class="chatbot-panel__thought"
            :class="{ 'is-complete': message.phase !== 'thinking' }">
            <button
              class="chatbot-panel__thought-title"
              type="button"
              :disabled="message.phase === 'thinking'"
              :aria-expanded="message.thoughtExpanded"
              :title="
                message.phase === 'thinking'
                  ? '思考进行中'
                  : message.thoughtExpanded
                    ? '收起思考过程'
                    : '展开思考过程'
              "
              @click="toggleThought(message.id)">
              <el-icon v-if="message.phase === 'thinking'" class="is-loading">
                <Loading />
              </el-icon>
              <el-icon v-else>
                <ArrowDown v-if="message.thoughtExpanded" />
                <ArrowRight v-else />
              </el-icon>
              <span>{{
                message.phase === "thinking" ? "思考中..." : "思考过程"
              }}</span>
            </button>
            <template v-if="message.thoughtExpanded">
              <div
                v-for="(step, index) in message.thoughtSteps"
                :key="`${message.id}-thought-${index}`"
                class="chatbot-panel__thought-step">
                {{ index + 1 }}. {{ step }}
                <el-icon
                  v-if="
                    message.phase === 'thinking' &&
                    index === message.thoughtSteps.length - 1
                  "
                  class="chatbot-panel__thought-cursor is-loading"
                  aria-label="思考中">
                  <Loading />
                </el-icon>
              </div>
            </template>
          </div>

          <div
            v-if="message.role === 'assistant' && message.content"
            class="chatbot-panel__answer">
            <div
              class="chatbot-panel__markdown"
              v-html="renderMarkdown(message.content)"></div>
            <el-icon
              v-if="message.phase === 'answering'"
              class="chatbot-panel__answer-cursor is-loading">
              <Loading />
            </el-icon>
          </div>
          <span
            v-else-if="message.role === 'user'"
            class="chatbot-panel__user-text"
            >{{ message.content }}</span
          >

          <div
            v-if="
              message.role === 'assistant' &&
              message.awaitingClarification &&
              message.clarification
            "
            class="chatbot-panel__clarification">
            <p
              v-if="clarificationText(message.clarification)"
              class="chatbot-panel__clarification-title">
              {{ clarificationText(message.clarification) }}
            </p>
            <ChatbotClarification
              :clarification="message.clarification"
              :disabled="loading || stopping"
              :active="isActiveClarification(message)"
              @submit="submitClarification(message, $event)" />
          </div>
        </div>
        <div
          v-if="message.role === 'user'"
          class="chatbot-panel__message-avatar chatbot-panel__message-avatar--user">
          我
        </div>
      </div>
    </section>

    <footer v-show="panelView === 'chat'" class="chatbot-panel__composer">
      <div class="chatbot-panel__input-wrap">
        <textarea
          v-model="inputValue"
          class="chatbot-panel__input"
          maxlength="500"
          :placeholder="composerPlaceholder"
          :disabled="loading || stopping || isRecording || isTranscribing"
          @keydown.enter.exact.prevent="sendMessage()"></textarea>
        <button
          class="chatbot-panel__voice"
          :class="{
            'is-recording': isRecording,
            'is-stop': loading,
            'is-send': !loading && inputValue.trim(),
          }"
          type="button"
          :disabled="stopping || isTranscribing"
          :title="composerActionLabel"
          :aria-label="composerActionLabel"
          :aria-pressed="isRecording"
          @click="handleComposerAction">
          <el-icon v-if="isTranscribing" class="is-loading"><Loading /></el-icon>
          <span v-else-if="loading" class="chatbot-panel__stop-icon"></span>
          <el-icon v-else-if="inputValue.trim()"><Top /></el-icon>
          <el-icon v-else><Microphone /></el-icon>
        </button>
      </div>
    </footer>

    <ChatbotHistoryList
      v-show="panelView === 'history'"
      :active="panelView === 'history'"
      @back="panelView = 'chat'"
      @select="openHistorySession"
      @deleted="handleHistoryDeleted" />
  </aside>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowDown,
  ArrowRight,
  ChatDotRound,
  Close,
  Loading,
  Microphone,
  Top,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { marked } from "marked";
import chatbotAvatar from "@/assets/icons/chatbot.gif";
import {
  getChatSessionDetail,
  openAiChatStream,
  readSseEvents,
  stopAiAgent,
  transcribeAiSpeech,
} from "@/api/chatbot";
import type { ChatHistoryMessage } from "@/api/chatbot";
import { useChatbotStore } from "@/stores/chatbot";
import ChatbotClarification from "./ChatbotClarification.vue";
import ChatbotHistoryList from "./ChatbotHistoryList.vue";
import type {
  ChatbotClarification as ChatbotClarificationData,
  ClarificationSubmission,
} from "./types";

const chatbot = useChatbotStore();
const router = useRouter();

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  phase?:
    | "thinking"
    | "answering"
    | "finished"
    | "awaiting_input"
    | "cancelled"
    | "error";
  thoughtSteps?: string[];
  thoughtExpanded?: boolean;
  isStreaming?: boolean;
  sessionId?: string | null;
  messageId?: string | number | null;
  runState?: string;
  clarification?: ChatbotClarificationData | null;
  awaitingClarification?: boolean;
  isError?: boolean;
}

interface VoiceRecordingSession {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  size: number;
  discard: boolean;
  tooLarge: boolean;
}

const MAX_SPEECH_AUDIO_BYTES = 7_000_000;
const MAX_COMPOSER_LENGTH = 500;
const builtInQuestions = [
  "平台累计巡护里程和累计飞行时长是多少？",
  "总共完成的巡检面积是多少平方公里？",
  "使用中试谷无人机、中试谷水域巡检航线，识别水域漂浮物。",
];
const messagesRef = ref<HTMLElement | null>(null);
const inputValue = ref("");
const loading = ref(false);
const stopping = ref(false);
const isRecording = ref(false);
const isTranscribing = ref(false);
const messages = ref<ChatMessage[]>([]);
const shouldFollowScroll = ref(true);
const sessionId = ref<string | null>(null);
const currentClarification = ref<ChatbotClarificationData | null>(null);
const resizing = ref(false);
// 面板视图：chat 聊天窗口 / history 历史任务列表
const panelView = ref<"chat" | "history">("chat");
let requestController: AbortController | null = null;
let messageId = 0;
let typingQueue: Promise<unknown> = Promise.resolve();
let typingError: unknown = null;
let stopResizeListeners: (() => void) | null = null;
let recordingSession: VoiceRecordingSession | null = null;
let speechRequestController: AbortController | null = null;
let voiceGeneration = 0;

const composerPlaceholder = computed(() => {
  if (currentClarification.value?.type === "plan_review")
    return "请输入计划修改意见...";
  if (currentClarification.value?.missing_fields?.length)
    return "请补充所需信息...";
  return "请输入你的问题...";
});
const composerActionLabel = computed(() => {
  if (isTranscribing.value) return "正在转写";
  if (loading.value) return "停止生成";
  if (inputValue.value.trim()) return "发送消息";
  if (isRecording.value) return "停止录音";
  return "语音转文字";
});

// 当前智能体类型：policy 政策答疑 / route 航线规划 / null 未选中
const agentType = ref<"policy" | "route" | null>(null);
const selectAgent = (type: "policy" | "route") => {
  if (
    loading.value ||
    stopping.value ||
    isRecording.value ||
    isTranscribing.value
  )
    return;
  // 再次点击已选中项则取消选中
  agentType.value = agentType.value === type ? null : type;
  // 切换智能体后隔离会话，避免上下文串台
  sessionId.value = null;
  currentClarification.value = null;
};

const isAtBottom = (element: HTMLElement | null) => {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 12;
};

const handleMessagesScroll = () => {
  shouldFollowScroll.value = isAtBottom(messagesRef.value);
};

const releaseStream = (stream: MediaStream) => {
  stream.getTracks().forEach((track) => track.stop());
};

const cancelVoiceInput = () => {
  // 关闭或重置聊天时丢弃尚未完成的录音和转写，并立即释放麦克风。
  voiceGeneration += 1;
  speechRequestController?.abort();
  speechRequestController = null;
  isTranscribing.value = false;

  const session = recordingSession;
  if (!session) return;
  session.discard = true;
  if (session.recorder.state !== "inactive") {
    session.recorder.stop();
  }
  releaseStream(session.stream);
  recordingSession = null;
  isRecording.value = false;
};

const newChat = () => {
  cancelVoiceInput();
  // 清空前先取出运行中的消息 id，stop 接口需要它
  const streamingMessage = messages.value.find(
    (message) => message.role === "assistant" && message.isStreaming,
  );
  const wasRunning = loading.value;

  requestController?.abort();
  requestController = null;
  loading.value = false;
  messages.value = [];
  inputValue.value = "";
  sessionId.value = null;
  currentClarification.value = null;
  typingQueue = Promise.resolve();
  typingError = null;
  shouldFollowScroll.value = true;

  // 前端 abort 只是断开 SSE，后端任务仍在跑，需要显式通知停止
  if (wasRunning) {
    void stopAiAgent(streamingMessage?.messageId || null).catch((error) => {
      console.warn("AI 停止请求失败", error);
    });
  }
};

const mapHistoryPhase = (
  status?: string,
  awaitingClarification?: boolean,
): ChatMessage["phase"] => {
  if (status === "error") return "error";
  if (status === "cancelled") return "cancelled";
  if (awaitingClarification || status === "need_clarification")
    return "awaiting_input";
  return "finished";
};

// 把历史消息按 ChatMessage 结构还原到聊天窗口，不做打字动画直接落位。
const restoreHistoryMessages = (
  historyMessages: ChatHistoryMessage[],
  restoredSessionId: string,
) => {
  const restored: ChatMessage[] = [];
  let lastClarification: ChatbotClarificationData | null = null;

  historyMessages.forEach((item) => {
    if (item?.query) {
      restored.push({ id: ++messageId, role: "user", content: item.query });
    }

    const assistantId = ++messageId;
    const awaitingClarification =
      item?.awaitingClarification === true ||
      item?.status === "need_clarification";
    const clarification: ChatbotClarificationData | null =
      awaitingClarification && item?.clarification
        ? {
            ...(item.clarification as ChatbotClarificationData),
            assistantMessageId: assistantId,
          }
        : null;
    const thoughtSteps = (
      item?.progressMessages?.length
        ? item.progressMessages
        : (item?.trace || []).map((step) => step?.name || "")
    ).filter(Boolean);

    restored.push({
      id: assistantId,
      role: "assistant",
      content: extractFinalText({ content: item?.content }),
      phase: mapHistoryPhase(item?.status, awaitingClarification),
      thoughtSteps,
      thoughtExpanded: false,
      isStreaming: false,
      sessionId: restoredSessionId,
      messageId: item?.messageId || null,
      clarification,
      awaitingClarification,
      isError: item?.status === "error",
    });

    if (clarification) lastClarification = clarification;
  });

  messages.value = restored;
  sessionId.value = restoredSessionId;
  currentClarification.value = lastClarification;
  shouldFollowScroll.value = true;
};

const openHistory = () => {
  cancelVoiceInput();
  panelView.value = "history";
};

// 新建聊天：清空当前会话并切回聊天视图（历史页点它也要回到聊天窗口）
const handleNewChat = () => {
  newChat();
  panelView.value = "chat";
};

const openHistorySession = async (restoredSessionId: string) => {
  // newChat 内部会中止流式请求、关闭录音并清空会话状态
  newChat();
  stopping.value = false;

  try {
    const res = await getChatSessionDetail(restoredSessionId);
    restoreHistoryMessages(res?.messages || [], restoredSessionId);
  } catch (error) {
    const err = error as Error & { status?: number };
    ElMessage.error(
      err?.status === 401
        ? "登录状态无效，请重新登录后再试"
        : err?.message || "获取历史会话失败，请重试",
    );
    return;
  }

  // 先切回聊天视图，消息区脱离 display:none 后才能正确滚动到底部
  panelView.value = "chat";
  void scrollToBottom({ force: true });
};

const handleHistoryDeleted = (deletedSessionId: string) => {
  // 被删除的正好是当前打开的会话时，重置聊天，返回后即原始页面。
  if (sessionId.value === deletedSessionId) newChat();
};

const transcribeRecording = async (audio: Blob) => {
  if (!audio.size) {
    ElMessage.warning("没有录到有效音频，请重试");
    return;
  }
  if (audio.size > MAX_SPEECH_AUDIO_BYTES) {
    ElMessage.warning("录音超过 7 MB，请缩短录音后重试");
    return;
  }

  const controller = new AbortController();
  speechRequestController = controller;
  isTranscribing.value = true;
  try {
    const result = await transcribeAiSpeech(audio, {
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;

    const recognizedText = result.text.trim();
    if (!recognizedText) {
      ElMessage.warning("没有识别到语音内容，请重试");
      return;
    }

    const existingText = inputValue.value;
    const separator =
      existingText && !/\s$/.test(existingText) ? " " : "";
    const availableLength = MAX_COMPOSER_LENGTH - existingText.length;
    const acceptedCharacters: string[] = [];
    let acceptedLength = 0;
    for (const character of `${separator}${recognizedText}`) {
      if (acceptedLength + character.length > availableLength) break;
      acceptedCharacters.push(character);
      acceptedLength += character.length;
    }
    inputValue.value = existingText + acceptedCharacters.join("");
    if (acceptedLength < `${separator}${recognizedText}`.length) {
      ElMessage.warning("识别内容已截断，输入框最多支持 500 个字符");
    } else {
      ElMessage.success("语音转写完成，请检查后发送");
    }
  } catch (error) {
    const err = error as Error & { name?: string; status?: number };
    if (err.name === "AbortError") return;
    const messageByStatus: Record<number, string> = {
      401: "登录状态无效，请重新登录后再试",
      413: "录音文件超过服务端大小限制",
      415: "当前录音格式暂不支持",
      502: "语音识别服务暂时不可用",
      503: "语音识别服务尚未配置",
    };
    const errorText = err.message || "";
    const noWords =
      errorText.includes("ASR_RESPONSE_HAVE_NO_WORDS") ||
      errorText.includes("没有识别到有效词");

    if (noWords) {
      // 百炼返回该错误码时，通常表示录音成功上传但没有识别出人声，
      // 不是聊天接口参数错误；提示用户检查麦克风和录音内容即可。
      ElMessage.warning("没有识别到清晰语音，请靠近麦克风后重新录音");
    } else {
      ElMessage.error(
        (err.status && messageByStatus[err.status]) ||
          errorText ||
          "语音转写失败，请重试",
      );
    }
  } finally {
    if (speechRequestController === controller) {
      speechRequestController = null;
      isTranscribing.value = false;
    }
  }
};

const startVoiceRecording = async () => {
  if (
    loading.value ||
    stopping.value ||
    isRecording.value ||
    isTranscribing.value
  )
    return;
  if (
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    ElMessage.error("当前浏览器无法录音，请使用支持录音的 Chrome");
    return;
  }

  const generation = ++voiceGeneration;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (generation !== voiceGeneration) return;
    const err = error as Error;
    const message =
      err.name === "NotAllowedError" || err.name === "SecurityError"
        ? "麦克风未授权，请检查浏览器站点权限"
        : "无法访问麦克风，请检查录音设备";
    ElMessage.error(message);
    return;
  }

  if (generation !== voiceGeneration) {
    releaseStream(stream);
    return;
  }

  const mimeType = [
    "audio/webm;codecs=opus",
    "audio/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type));

  try {
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    const session: VoiceRecordingSession = {
      recorder,
      stream,
      chunks: [],
      size: 0,
      discard: false,
      tooLarge: false,
    };
    recordingSession = session;

    recorder.ondataavailable = (event) => {
      if (!event.data.size || session.discard) return;
      if (session.size + event.data.size > MAX_SPEECH_AUDIO_BYTES) {
        session.tooLarge = true;
        recorder.stop();
        return;
      }
      session.chunks.push(event.data);
      session.size += event.data.size;
    };

    recorder.onerror = () => {
      session.discard = true;
      if (recorder.state !== "inactive") recorder.stop();
      ElMessage.error("录音发生错误，请重试");
    };

    recorder.onstop = () => {
      releaseStream(stream);
      if (recordingSession === session) {
        recordingSession = null;
        isRecording.value = false;
      }
      if (session.discard) return;
      if (session.tooLarge) {
        ElMessage.warning("录音超过 7 MB，请缩短录音后重试");
        return;
      }

      // MediaRecorder 的最后一个音频片段会在 stop 事件前送达。
      const audio = new Blob(session.chunks, {
        type: recorder.mimeType || session.chunks[0]?.type || "audio/webm",
      });
      void transcribeRecording(audio);
    };

    recorder.start(1000);
    isRecording.value = true;
  } catch (error) {
    releaseStream(stream);
    recordingSession = null;
    isRecording.value = false;
    ElMessage.error(
      error instanceof Error ? error.message : "无法启动录音，请重试",
    );
  }
};

const stopVoiceRecording = () => {
  const session = recordingSession;
  if (!session || session.recorder.state === "inactive") return;
  session.recorder.stop();
};

const handleComposerAction = () => {
  if (stopping.value || isTranscribing.value) return;
  if (loading.value) {
    stopMessage();
  } else if (inputValue.value.trim()) {
    void sendMessage();
  } else if (isRecording.value) {
    stopVoiceRecording();
  } else {
    void startVoiceRecording();
  }
};

const startResize = (event: PointerEvent) => {
  if (event.button !== 0) return;
  event.preventDefault();
  stopResizeListeners?.();
  resizing.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  const handleMove = (moveEvent: PointerEvent) => {
    const nextWidth =
      ((window.innerWidth - moveEvent.clientX) / window.innerWidth) * 100;
    chatbot.setWidth(nextWidth);
  };
  const stopResize = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    resizing.value = false;
    stopResizeListeners = null;
  };

  stopResizeListeners = stopResize;
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", stopResize);
  window.addEventListener("pointercancel", stopResize);
};

const stopMessage = () => {
  if (!loading.value) return;

  messages.value = messages.value.map((message) =>
    message.role === "assistant" && message.isStreaming && message.thoughtExpanded
      ? { ...message, thoughtExpanded: false }
      : message,
  );
  currentClarification.value = null;
  requestController?.abort();
  loading.value = false;
  stopping.value = true;
  const streamingMessage = messages.value.find(
    (message) => message.role === "assistant" && message.isStreaming,
  );
  void stopAiAgent(streamingMessage?.messageId || null)
    .catch((error) => {
      console.warn("AI 停止请求失败", error);
    })
    .finally(() => {
      stopping.value = false;
    });
};

const clarificationText = (clarification: ChatbotClarificationData | null) =>
  clarification?.friendly_message || clarification?.message || "";

const isActiveClarification = (message: ChatMessage) =>
  currentClarification.value?.assistantMessageId === message.id;

const renderMarkdown = (content: string) => marked.parse(content || "");

const updateAssistantMessage = (
  id: number,
  updater: (message: ChatMessage) => Partial<ChatMessage>,
) => {
  messages.value = messages.value.map((message) => {
    if (message.id !== id) return message;
    return { ...message, ...updater(message) };
  });
};

const toggleThought = (id: number) => {
  updateAssistantMessage(id, (message) => ({
    thoughtExpanded: !message.thoughtExpanded,
  }));
};

const extractFinalText = (payload: any) => {
  const finalItems = Array.isArray(payload?.content) ? payload.content : [];
  return finalItems
    .filter(
      (item: any) =>
        item?.type === "markdown" ||
        item?.type === "text" ||
        item?.type === "list" ||
        !item?.type,
    )
    .map((item: any) => {
      if (typeof item?.data === "string") return item.data;
      if (item?.type === "list" && Array.isArray(item.data)) {
        return item.data.map((value: unknown) => `- ${String(value)}`).join("\n");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
};

const redirectToUavFlyControl = (payload: any) => {
  const deviceData =
    payload?.content?.[0]?.metadata?.facts?.skillResults?.[0]?.data;
  const deviceSn =
    deviceData?.success === true && deviceData?.deviceSn
      ? String(deviceData.deviceSn).trim()
      : "";

  if (!deviceSn) return;

  // 特殊处理：飞控技能成功返回设备编号时，使用当前站点路由跳转到飞控页面，保留当前访问的 IP 或域名。
  router.push({
    path: "/flyControl",
    query: { deviceSn },
  });
};

const enqueueTyping = (task: () => Promise<unknown>) => {
  typingQueue = typingQueue.then(task).catch((error) => {
    typingError = error;
  });
  return typingQueue;
};

const waitForStreamTick = (signal: AbortSignal, duration: number) =>
  new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => signal.removeEventListener("abort", handleAbort);
    const handleAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DOMException("The AI chat request was aborted.", "AbortError"));
    };
    const finish = () => {
      cleanup();
      resolve();
    };

    if (signal.aborted) {
      handleAbort();
      return;
    }

    signal.addEventListener("abort", handleAbort, { once: true });
    timer = setTimeout(finish, duration);
  });

const typeThoughtStep = async (
  id: number,
  step: string,
  signal: AbortSignal,
) => {
  if (!step) return;

  updateAssistantMessage(id, (message) => ({
    thoughtSteps: [...(message.thoughtSteps || []), ""],
  }));
  let content = "";
  for (const character of Array.from(step)) {
    if (signal.aborted) {
      throw new DOMException("The AI chat request was aborted.", "AbortError");
    }
    content += character;
    updateAssistantMessage(id, (message) => ({
      thoughtSteps: (message.thoughtSteps || []).map((item, index, items) =>
        index === items.length - 1 ? content : item,
      ),
    }));
    void scrollToBottom();
    await waitForStreamTick(signal, 6);
  }
};

const typeFinalAnswer = async (
  id: number,
  text: string,
  signal: AbortSignal,
  completedPhase: ChatMessage["phase"] = "finished",
) => {
  let content = "";
  for (const character of Array.from(text)) {
    if (signal.aborted) {
      throw new DOMException("The AI chat request was aborted.", "AbortError");
    }
    content += character;
    updateAssistantMessage(id, () => ({ content, phase: "answering" }));
    void scrollToBottom();
    await waitForStreamTick(signal, 24);
  }
  updateAssistantMessage(id, () => ({
    content,
    phase: completedPhase,
    thoughtExpanded: false,
  }));
};

const scrollToBottom = async ({ force = false }: { force?: boolean } = {}) => {
  await nextTick();
  const element = messagesRef.value;
  if (!element || (!force && !shouldFollowScroll.value)) return;
  element.scrollTop = element.scrollHeight;
  shouldFollowScroll.value = true;
};

const sendMessage = async ({
  request,
  displayText,
}: { request?: string; displayText?: string } = {}) => {
  const text = (displayText ?? inputValue.value).trim();
  if (!text || loading.value || stopping.value) return;

  // 普通输入直接作为文本；按钮交互传入的 request 已在子组件中序列化。
  let requestText = request ?? text;
  const clarification = currentClarification.value;
  if (!request && clarification?.type === "plan_review") {
    // 计划修改仍使用 plan_review 的 revise 协议，低空确认修改则走普通补参。
    requestText = JSON.stringify({
      type: "plan_review",
      action: "revise",
      taskRunId: clarification.taskRunId,
      taskTypeId: clarification.taskTypeId,
      feedback: text,
    });
  }

  messages.value.push({
    id: ++messageId,
    role: "user",
    content: text,
  });
  inputValue.value = "";
  loading.value = true;

  const assistantMessage: ChatMessage = {
    id: ++messageId,
    role: "assistant",
    content: "",
    phase: "thinking",
    thoughtSteps: [],
    thoughtExpanded: true,
    isStreaming: true,
  };
  messages.value.push(assistantMessage);

  requestController = new AbortController();
  const controller = requestController;
  shouldFollowScroll.value = true;
  await scrollToBottom({ force: true });
  typingQueue = Promise.resolve();
  typingError = null;

  try {
    const response = await openAiChatStream(
      {
        request: requestText,
        session_id: sessionId.value,
        agent_type: agentType.value ?? undefined,
      },
      { signal: controller.signal },
    );

    for await (const event of readSseEvents(response.body!, {
      signal: controller.signal,
    })) {
      if (event.event === "thinking" || event.event === "progress") {
        enqueueTyping(() =>
          typeThoughtStep(
            assistantMessage.id,
            event.data?.message,
            controller.signal,
          ),
        );
      }

      if (event.event === "session") {
        sessionId.value = event.data?.sessionId || sessionId.value;
        updateAssistantMessage(assistantMessage.id, () => ({
          sessionId: sessionId.value,
          messageId: event.data?.messageId || null,
        }));
      }

      if (event.event === "run_state") {
        if (event.data?.sessionId) sessionId.value = event.data.sessionId;
        updateAssistantMessage(assistantMessage.id, () => ({
          runState: event.data?.phase || event.data?.status || "",
          sessionId: sessionId.value,
        }));
      }

      if (event.event === "final") {
        redirectToUavFlyControl(event.data);
        const finalText = extractFinalText(event.data);
        if (event.data?.sessionId) sessionId.value = event.data.sessionId;
        // 某些后端版本只设置 status=need_clarification，因此两种状态都要识别。
        const shouldAwaitClarification =
          event.data?.awaitingClarification === true ||
          event.data?.status === "need_clarification";
        // 只有当前轮仍在等待用户输入时才挂载交互卡片，避免把普通 final 误当成可操作状态。
        const nextClarification: ChatbotClarificationData | null =
          shouldAwaitClarification && event.data?.clarification
          ? {
              ...(event.data?.clarification || {}),
              assistantMessageId: assistantMessage.id,
            }
          : null;
        const awaitingClarification = Boolean(nextClarification);

        // final 只代表后端结果已经准备好，不代表前端已完成思考过程的展示。
        // 这里先保存会话元数据，阶段仍保持 thinking，避免正文抢在思考动画前出现。
        updateAssistantMessage(assistantMessage.id, () => ({
          sessionId: sessionId.value,
          messageId: event.data?.messageId || null,
        }));

        enqueueTyping(async () => {
          // enqueueTyping 会等待此前已经收到的 thinking/progress 消息逐条展示完成。
          // 思考区在正文开始前收起，避免最终正文和仍在展开的思考内容同时出现。
          updateAssistantMessage(assistantMessage.id, () => ({
            phase: finalText ? "answering" : awaitingClarification ? "awaiting_input" : "finished",
            thoughtExpanded: false,
          }));

          if (finalText) {
            await typeFinalAnswer(
              assistantMessage.id,
              finalText,
              controller.signal,
              awaitingClarification ? "awaiting_input" : "finished",
            );
          }

          // 最终正文展示完成后，才激活确认卡片，防止用户在思考过程尚未结束时操作。
          currentClarification.value = nextClarification;
          updateAssistantMessage(assistantMessage.id, () => ({
            sessionId: sessionId.value,
            messageId: event.data?.messageId || null,
            phase: awaitingClarification ? "awaiting_input" : "finished",
            clarification: nextClarification,
            awaitingClarification,
          }));
        });
      }

      if (event.event === "error") {
        const errorMessage = event.data?.message || "AI 对话处理失败";
        updateAssistantMessage(assistantMessage.id, () => ({
          content: errorMessage,
          phase: "error",
          isError: true,
        }));
        const error = new Error(errorMessage) as Error & {
          isAiStreamError?: boolean;
        };
        error.isAiStreamError = true;
        throw error;
      }
    }

    await typingQueue;
    if (typingError) throw typingError;
  } catch (error) {
    const err = error as Error & { name?: string; isAiStreamError?: boolean };
    if (err?.name === "AbortError") {
      updateAssistantMessage(assistantMessage.id, () => ({
        content: "本次回答已取消",
        phase: "cancelled",
        thoughtExpanded: false,
        isStreaming: false,
      }));
    } else if (!err?.isAiStreamError) {
      ElMessage.error("暂时无法完成回答，请稍后再试");
      updateAssistantMessage(assistantMessage.id, () => ({
        content: "暂时无法完成回答，请稍后再试。",
        phase: "finished",
        isStreaming: false,
      }));
    }
  } finally {
    if (requestController === controller) {
      requestController = null;
      loading.value = false;
    }
    updateAssistantMessage(assistantMessage.id, () => ({ isStreaming: false }));
    await scrollToBottom();
  }
};

const sendBuiltInQuestion = (question: string) => {
  if (loading.value || stopping.value) return;
  void sendMessage({ displayText: question });
};

const submitClarification = (
  message: ChatMessage,
  submission: ClarificationSubmission,
) => {
  if (!message.clarification || !isActiveClarification(message)) return;
  // 子组件同时提供“聊天里显示的中文”和“发给后端的 request”，两者不能混用。
  sendMessage({
    displayText: submission.displayText,
    request: submission.request,
  });
};

watch(
  () => chatbot.visible,
  (isOpen) => {
    if (isOpen) {
      shouldFollowScroll.value = true;
      scrollToBottom({ force: true });
    } else {
      cancelVoiceInput();
    }
  },
);

onBeforeUnmount(() => {
  cancelVoiceInput();
  requestController?.abort();
  stopResizeListeners?.();
});
</script>

<style lang="less" scoped>
@cyan: #00ffff;
@cyan-soft: rgba(0, 255, 255, 0.3);
@bg-fill: rgba(0, 10, 20, 0.82);
@bg-hl: rgba(0, 255, 255, 0.08);
@border-cyan: 1px solid @cyan-soft;
@text-main: #e6f7ff;
@text-sub: #8acdd6;

.chatbot-panel {
 position: absolute;
    top: 0px;
    right: 0;
    bottom: 0;
    z-index: 900;
    display: flex;
    flex-direction: column;
    min-width: 350px;
    overflow: visible;
    border-left: 1px solid rgba(0, 255, 255, 0.3);
    /* background: rgba(0, 10, 20, 0.82); */
    box-shadow: 0 0 24px rgba(0, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    pointer-events: auto;
    transform: translateX(0);
    transition: transform 0.28s ease;
    background-color: rgba(28, 99, 99, 0.6);

  &.is-resizing {
    transition: none;
  }
}

.chatbot-panel__resize-handle {
  position: absolute;
  top: 0;
  left: -6px;
  z-index: 3;
  width: 12px;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  outline: none;

  // &:hover {
  //   background: @cyan-soft;
  // }
}

.chatbot-panel__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding-left: 16px;
  border-bottom: @border-cyan;
  color: @cyan;
  background: linear-gradient(
    90deg,
    rgba(0, 255, 255, 0.06),
    transparent
  );
  margin-top: 75px;
}

.chatbot-panel__identity {
  display: flex;
  align-items: center;
  gap: 11px;
}

.chatbot-panel__avatar {
  width: 40px;
  height: 40px;
  overflow: hidden;
  border: 1px solid @cyan;
  border-radius: 50%;
  background: @bg-hl;
      background: radial-gradient(circle at 50% 32%, #3CC3DA 0%, #1B7F9E 42%, #0C4A63 100%);
    border: 2px solid #5FE0EC;
    box-shadow: 0 0 0 3px rgba(95, 224, 236, .12);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    padding: 2px;
  }
}

.chatbot-panel__title {
  margin: 0;
  color: @cyan;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
}

.chatbot-panel__status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: @text-sub;
  font-size: 12px;
}

.chatbot-panel__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #55d6a7;
  box-shadow: 0 0 8px rgba(85, 214, 167, 0.85);
}

.chatbot-panel__header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
}

.chatbot-panel__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 34px;
  border: 0;
  border-radius: 4px;
  color: @text-main;
  background: transparent;
  cursor: pointer;

  &:hover {
    color: @cyan;
    background: @bg-hl;
  }
}

.chatbot-panel__messages {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 20px 18px;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 255, 0.35);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.chatbot-panel__welcome {
  margin-bottom: 20px;
  padding: 13px 14px;
  // border: @border-cyan;
  border-radius: 6px;
  color: @text-main;
  background: @bg-hl;
  font-size: 13px;
  line-height: 1.7;
}

.chatbot-panel__built-in {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: -8px 0 20px;
}

.chatbot-panel__built-in-title {
  color: @text-sub;
  font-size: 12px;
}

.chatbot-panel__built-in-question {
  //align-self: center;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid @cyan-soft;
  border-radius: 5px;
  color: @text-main;
  background: rgba(0, 255, 255, 0.04);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover:not(:disabled) {
    border-color: @cyan;
    background: rgba(0, 255, 255, 0.12);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.chatbot-panel__message {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: 9px;
  margin-bottom: 17px;
  box-sizing: border-box;

  &--user {
    justify-content: flex-end;

    .chatbot-panel__bubble {
      border-color: @cyan;
      color: #001016;
      background: rgba(0, 255, 255, 0.85);
    }
  }

  &--assistant .chatbot-panel__bubble {
    width: 100%;
  }
}

.chatbot-panel__message-avatar {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  overflow: hidden;
  border: 1px solid @cyan-soft;
  border-radius: 50%;
  color: @cyan;
  background: @bg-hl;
  font-size: 11px;
  line-height: 26px;
  text-align: center;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--user {
    color: @cyan;
  }
}

.chatbot-panel__bubble {
  min-width: 0;
  max-width: calc(100% - 38px);
  padding: 10px 12px;
  border-radius: 6px;
  color: @text-main;
  background: @bg-hl;
  border: 1px solid @cyan-soft;
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.chatbot-panel__user-text {
  display: inline-block;
  // padding: 10px 12px;
}

.chatbot-panel__thought {
  margin-bottom: 10px;
  padding: 9px 10px;
  border-left: 3px solid @cyan;
  color: @text-sub;
  background: rgba(0, 0, 0, 0.25);
  font-size: 12px;
  line-height: 1.6;
}

.chatbot-panel__thought-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin: 0 0 5px;
  padding: 0;
  border: 0;
  color: @text-main;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  text-align: left;

  &:disabled {
    cursor: default;
  }
}

.chatbot-panel__thought-step {
  word-break: break-word;
}

.chatbot-panel__thought-cursor {
  display: inline-flex;
  margin-left: 5px;
  vertical-align: -2px;
  color: @cyan;
  font-size: 13px;
}

.chatbot-panel__answer {
  position: relative;
}

.chatbot-panel__answer-cursor {
  margin-left: 5px;
  color: @cyan;
  font-size: 12px;
  vertical-align: middle;
}

.chatbot-panel__clarification {
  margin-top: 12px;
}

.chatbot-panel__clarification-title {
  margin: 0 0 8px;
  color: @cyan;
  font-size: 12px;
  font-weight: 600;
}

.chatbot-panel__markdown {
  min-width: 0;
  max-width: 100%;

  :deep(p) {
    margin: 12px 0;
  }
  // :deep(p:last-child) {
  //   margin-bottom: 0;
  // }
  :deep(h2),
  :deep(h3) {
    margin: 16px 0 8px;
    color: @cyan;
    font-size: 15px;
  }
  :deep(li + li) {
    margin-top: 5px;
  }
  :deep(hr) {
    margin: 16px 0;
    opacity: 0.35;
  }
  :deep(table) {
    width: 100%;
    max-width: 100%;
    margin: 8px 0;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  :deep(th),
  :deep(td) {
    padding: 5px 6px;
    border: 1px solid @cyan-soft;
    overflow-wrap: anywhere;
    text-align: left;
  }
  :deep(th) {
    color: @cyan;
    background: @bg-hl;
  }
  :deep(pre) {
    max-width: 100%;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  :deep(code) {
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
  }
  :deep(blockquote) {
    margin: 0;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.25);
    border-left: 3px solid @cyan;
    border-radius: 0 6px 6px 0;

    p {
      margin: 0;
    }
  }
}

.chatbot-panel__composer {
  flex-shrink: 0;
  padding: 13px 15px 15px;
  border-top: @border-cyan;
  background: rgba(0, 0, 0, 0.3);
}

.chatbot-panel__input-wrap {
  position: relative;
}

.chatbot-panel__input {
  width: 100%;
  min-height: 72px;
  padding: 10px 42px 32px 11px;
  resize: none;
  border: 1px solid @cyan-soft;
  border-radius: 6px;
  outline: none;
  color: @text-main;
  background: rgba(0, 0, 0, 0.35);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
      margin-bottom: -4px;

  &::placeholder {
    color: @text-sub;
  }

  &:focus {
    border-color: @cyan;
    box-shadow: 0 0 0 2px @bg-hl, 0 0 10px rgba(0, 255, 255, 0.4);
  }
}

.chatbot-panel__voice {
  position: absolute;
  right: 7px;
  bottom: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: @cyan;
  background: @cyan-soft;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: @cyan;
    background: @bg-hl;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &.is-send {
    color: white;
    font-size: 17px;
    // border-color: @cyan;
    // background: @cyan;

    &:hover:not(:disabled) {
      background: @cyan-soft;
    }
  }

  &.is-stop,
  &.is-recording {
    color: #fff;
    border-color: #d9534f;
    background: #d9534f;

    &:hover:not(:disabled) {
      background: #c9302c;
    }
  }
}

.chatbot-panel__stop-icon {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: currentColor;
}

.is-loading {
  animation: chatbot-rotate 1s linear infinite;
}

@keyframes chatbot-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .chatbot-panel {
    width: 100vw !important;
    min-width: 0;
  }

  .chatbot-panel__resize-handle {
    display: none;
  }
}
</style>
