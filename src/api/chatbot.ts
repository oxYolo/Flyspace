import { getToken } from "@/utils/auth";

// 智能体后端网关通过 Vite /ai 代理，本地目标见 AGENT_PROXY_TARGET。
const AI_API_BASE = "/ai/v1".replace(/\/+$/, "");
export const AI_USER_ID = 2;

export interface ChatStreamPayload {
  // request 始终是字符串；低空确认、候选选择等结构化对象需先 JSON.stringify。
  request: string;
  session_id?: string | null;
  agent_type?: string;
  files?: Array<
    | string
    | {
        url: string;
        resource_id?: string;
        name?: string;
        data_type?: "raster" | "vector" | "table" | "unknown";
        format?: string;
        object_key?: string;
      }
  >;
}

export interface SseEvent {
  event: string;
  data: any;
}

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// 复用低空智飞平台原有登录令牌，无需再次登录智能体。
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const openAiChatStream = async (
  payload: ChatStreamPayload,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Response> => {
  const response = await fetch(`${AI_API_BASE}/agent/chat/stream`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    // 聊天接口通过 Bearer token 识别用户，当前协议不再传 user_id。
    // request 内层如果是交互对象，也必须保持为字符串，不能直接传对象。
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    const detail =
      typeof data === "string" ? data : data?.message || data?.msg || data?.detail;
    throw new Error(detail || `AI 对话请求失败（${response.status}）`);
  }
  if (!response.body) {
    throw new Error("AI 对话未返回可读取的数据流");
  }
  return response;
};

export const transcribeAiSpeech = async (
  audio: Blob,
  { signal }: { signal?: AbortSignal } = {},
): Promise<{ text: string }> => {
  // 接口接收音频原始字节；只保留 MIME 主类型，兼容带 codec 参数的浏览器录音格式。
  const contentType = audio.type.split(";")[0] || "audio/webm";
  const response = await fetch(`${AI_API_BASE}/speech/transcribe`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": contentType,
      ...getAuthHeaders(),
    },
    body: audio,
    signal,
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    const detail =
      typeof data === "string"
        ? data
        : data?.message || data?.msg || data?.detail;
    const error = new Error(
      detail || `语音转写失败（${response.status}）`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (typeof data?.text !== "string") {
    throw new Error("语音转写接口未返回有效文本");
  }
  return { text: data.text };
};

export const stopAiAgent = async (messageId: string | number | null = null) => {
  const response = await fetch(`${AI_API_BASE}/agent/stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      user_id: AI_USER_ID,
      ...(messageId ? { message_id: messageId } : {}),
    }),
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    const detail =
      typeof data === "string" ? data : data?.message || data?.msg;
    throw new Error(detail || `AI 停止请求失败（${response.status}）`);
  }

  return parseResponseBody(response);
};

const parseSseFrame = (frame: string): SseEvent | null => {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }

  if (!dataLines.length) return null;

  const dataText = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(dataText) };
  } catch {
    return { event, data: dataText };
  }
};

export async function* readSseEvents(
  stream: ReadableStream<Uint8Array>,
  { signal }: { signal?: AbortSignal } = {},
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("The AI chat request was aborted.", "AbortError");
      }

      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";

      for (const frame of frames) {
        const parsed = parseSseFrame(frame);
        if (parsed) yield parsed;
      }

      if (done) break;
    }

    const finalFrame = parseSseFrame(buffer);
    if (finalFrame) yield finalFrame;
  } finally {
    reader.releaseLock();
  }
}
