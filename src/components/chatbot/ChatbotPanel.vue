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
          <h2 class="chatbot-panel__title">智能问答</h2>
          <div class="chatbot-panel__status">
            <!-- <span class="chatbot-panel__status-dot"></span> -->
            <span>XXXXXXX</span>
          </div>
        </div>
      </div>
      <div class="chatbot-panel__header-actions">
        <button
          class="chatbot-panel__icon-btn"
          type="button"
          title="新建聊天"
          aria-label="新建聊天"
          @click="newChat">
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
      class="chatbot-panel__messages"
      @scroll.passive="handleMessagesScroll">
      <div class="chatbot-panel__welcome">你好，我是平台智能助手。</div>

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
            <!-- <div class="chatbot-panel__clarification-title">需要你的确认</div> -->
            <p
              v-if="clarificationText(message.clarification)"
              class="chatbot-panel__clarification-title">
              {{ clarificationText(message.clarification) }}
            </p>

            <template v-if="message.clarification.type === 'plan_review'">
              <ol class="chatbot-panel__plan-list">
                <li
                  v-for="(step, index) in message.clarification.steps || []"
                  :key="step.id || `${message.id}-plan-${index}`">
                  <strong>{{ step.title || `步骤 ${index + 1}` }}</strong>
                  <span v-if="step.step && step.step !== step.title">{{
                    step.step
                  }}</span>
                </li>
              </ol>
              <div class="chatbot-panel__clarification-actions">
                <button
                  type="button"
                  :disabled="
                    loading || stopping || !isActiveClarification(message)
                  "
                  @click="submitPlanReview(message, 'approve')">
                  确认执行
                </button>
                <span>如需修改，请在下方输入修改意见后发送</span>
              </div>
            </template>

            <ul
              v-else-if="
                clarificationQuestions(message.clarification).length
              "
              class="chatbot-panel__question-list">
              <li
                v-for="question in clarificationQuestions(
                  message.clarification,
                )"
                :key="question.field">
                {{ question.question }}
              </li>
            </ul>
          </div>
        </div>
        <div
          v-if="message.role === 'user'"
          class="chatbot-panel__message-avatar chatbot-panel__message-avatar--user">
          我
        </div>
      </div>
    </section>

    <footer class="chatbot-panel__composer">
      <textarea
        v-model="inputValue"
        class="chatbot-panel__input"
        maxlength="500"
        :placeholder="composerPlaceholder"
        :disabled="loading || stopping"
        @keydown.enter.exact.prevent="sendMessage()"></textarea>
      <div class="chatbot-panel__composer-bottom">
        <div class="chatbot-panel__agent-tabs">
          <button
            type="button"
            class="chatbot-panel__agent-tab"
            :class="{ 'is-active': agentType === 'policy' }"
            @click="selectAgent('policy')">
            政策答疑
          </button>
          <button
            type="button"
            class="chatbot-panel__agent-tab"
            :class="{ 'is-active': agentType === 'route' }"
            @click="selectAgent('route')">
            航线规划智能体
          </button>
        </div>
        <button
          class="chatbot-panel__send"
          type="button"
          :disabled="stopping || (!loading && !inputValue.trim())"
          :title="loading ? '停止生成' : '发送消息'"
          :aria-label="loading ? '停止生成' : '发送消息'"
          :class="{ 'is-stop': loading }"
          @click="loading ? stopMessage() : sendMessage()">
          <span
            v-if="loading"
            style="width: 10px; height: 10px; background: #fff; border-radius: 2px"></span>
          <el-icon v-else><Promotion /></el-icon>
          <span>{{ loading ? "停止" : "发送" }}</span>
        </button>
      </div>
    </footer>
  </aside>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  ArrowDown,
  ArrowRight,
  Close,
  Delete,
  Loading,
  Promotion,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { marked } from "marked";
import chatbotAvatar from "@/assets/icons/chatbot.gif";
import {
  AI_USER_ID,
  openAiChatStream,
  readSseEvents,
  stopAiAgent,
} from "@/api/chatbot";
import { useChatbotStore } from "@/stores/chatbot";

const chatbot = useChatbotStore();

interface ClarificationStep {
  id?: string;
  title?: string;
  step?: string;
  skill_name?: string;
}

interface Clarification {
  type: "plan_review" | "missing_fields" | string;
  assistantMessageId?: number;
  taskRunId?: string;
  taskTypeId?: string;
  steps?: ClarificationStep[];
  friendly_message?: string;
  message?: string;
  missing_fields?: string[];
  field_questions?: Record<string, string>;
}

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
  clarification?: Clarification | null;
  awaitingClarification?: boolean;
  isError?: boolean;
}

const messagesRef = ref<HTMLElement | null>(null);
const inputValue = ref("");
const loading = ref(false);
const stopping = ref(false);
const messages = ref<ChatMessage[]>([]);
const shouldFollowScroll = ref(true);
const sessionId = ref<string | null>(null);
const currentClarification = ref<Clarification | null>(null);
const resizing = ref(false);
let requestController: AbortController | null = null;
let messageId = 0;
let typingQueue: Promise<unknown> = Promise.resolve();
let typingError: unknown = null;
let stopResizeListeners: (() => void) | null = null;

const composerPlaceholder = computed(() => {
  if (currentClarification.value?.type === "plan_review")
    return "请输入计划修改意见...";
  if (currentClarification.value?.missing_fields?.length)
    return "请补充所需信息...";
  return "请输入你的问题...";
});

// 当前智能体类型：policy 政策答疑 / route 航线规划 / null 未选中
const agentType = ref<"policy" | "route" | null>(null);
const selectAgent = (type: "policy" | "route") => {
  if (loading.value || stopping.value) return;
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

const newChat = () => {
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

const clarificationText = (clarification: Clarification | null) =>
  clarification?.friendly_message || clarification?.message || "";

const clarificationQuestions = (clarification: Clarification | null) => {
  const fields = Array.isArray(clarification?.missing_fields)
    ? clarification!.missing_fields!
    : [];
  const questions = clarification?.field_questions || {};
  return fields.map((field) => ({
    field,
    question: questions[field] || `请补充：${field}`,
  }));
};

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
        item?.type === "markdown" || item?.type === "text" || !item?.type,
    )
    .map((item: any) => (typeof item?.data === "string" ? item.data : ""))
    .filter(Boolean)
    .join("\n\n");
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

  let requestText = request ?? text;
  const clarification = currentClarification.value;
  if (!request && clarification?.type === "plan_review") {
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
        user_id: AI_USER_ID,
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
        const finalText = extractFinalText(event.data);
        if (event.data?.sessionId) sessionId.value = event.data.sessionId;
        const awaitingClarification = event.data?.awaitingClarification === true;
        const nextClarification: Clarification | null = awaitingClarification
          ? {
              ...(event.data?.clarification || {}),
              assistantMessageId: assistantMessage.id,
            }
          : null;

        enqueueTyping(async () => {
          if (finalText) {
            await typeFinalAnswer(
              assistantMessage.id,
              finalText,
              controller.signal,
              awaitingClarification ? "awaiting_input" : "finished",
            );
          }
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

const submitPlanReview = (message: ChatMessage, action: "approve" | "revise") => {
  const clarification = message.clarification;
  if (!clarification || !isActiveClarification(message)) return;

  sendMessage({
    displayText: action === "approve" ? "确认执行" : inputValue.value,
    request: JSON.stringify({
      type: "plan_review",
      action,
      taskRunId: clarification.taskRunId,
      taskTypeId: clarification.taskTypeId,
      ...(action === "revise" ? { feedback: inputValue.value.trim() } : {}),
    }),
  });
};

watch(
  () => chatbot.visible,
  (isOpen) => {
    if (isOpen) {
      shouldFollowScroll.value = true;
      scrollToBottom({ force: true });
    }
  },
);

onBeforeUnmount(() => {
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

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
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
  width: 34px;
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
  border: @border-cyan;
  border-radius: 6px;
  color: @text-main;
  background: @bg-hl;
  font-size: 13px;
  line-height: 1.7;
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
  padding: 10px 11px;
  border: 1px solid @cyan-soft;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

.chatbot-panel__clarification-title {
  margin-bottom: 6px;
  color: @cyan;
  font-weight: 600;
}

.chatbot-panel__clarification-message {
  margin: 0 0 8px;
  color: @text-main;
  line-height: 1.55;
}

.chatbot-panel__plan-list,
.chatbot-panel__question-list {
  margin: 8px 0;
  padding-left: 20px;
  color: @text-sub;
  line-height: 1.6;
}

.chatbot-panel__plan-list li {
  margin-bottom: 7px;

  strong,
  span {
    display: block;
  }

  strong {
    color: @text-main;
  }
}

.chatbot-panel__clarification-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 9px;
  color: @text-sub;
  font-size: 11px;

  button {
    padding: 4px 9px;
    border: 1px solid @cyan;
    border-radius: 4px;
    color: @cyan;
    background: @bg-hl;
    cursor: pointer;
    font-size: 12px;

    &:hover:not(:disabled) {
      background: rgba(0, 255, 255, 0.2);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
}

.chatbot-panel__markdown {
  min-width: 0;
  max-width: 100%;

  :deep(p) {
    margin: 12px 0;
  }
  :deep(p:last-child) {
    margin-bottom: 0;
  }
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

.chatbot-panel__input {
  width: 100%;
  min-height: 72px;
  padding: 10px 11px;
  resize: none;
  border: 1px solid @cyan-soft;
  border-radius: 6px;
  outline: none;
  color: @text-main;
  background: rgba(0, 0, 0, 0.35);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;

  &::placeholder {
    color: @text-sub;
  }

  &:focus {
    border-color: @cyan;
    box-shadow: 0 0 0 2px @bg-hl, 0 0 10px rgba(0, 255, 255, 0.4);
  }
}

.chatbot-panel__composer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
}

.chatbot-panel__agent-tabs {
  display: flex;
  gap: 6px;
}

.chatbot-panel__agent-tab {
  padding: 4px 10px;
  border: 1px solid @cyan-soft;
  border-radius: 4px;
  color: @text-sub;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;

  &:hover {
    color: @cyan;
    border-color: @cyan;
  }

  &.is-active {
    color: #001016;
    background: @cyan;
    border-color: @cyan;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.chatbot-panel__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 78px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid @cyan;
  border-radius: 4px;
  color: @cyan;
  background: @bg-hl;
  cursor: pointer;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.2);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &.is-stop {
    color: #fff;
    background: #d9534f;
    border-color: #d9534f;

    &:hover {
      background: #c9302c;
    }
  }
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
