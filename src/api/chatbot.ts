import { getToken } from "@/utils/auth";

// 智能体后端网关地址（走 Vite 代理 /gn-agent，避免跨域；后续切换接口时改这里 + vite.config.ts 代理 target）
const AI_API_BASE = "/gn-agent/v1".replace(/\/+$/, "");
export const AI_USER_ID = 2;

export interface ChatStreamPayload {
  request: string;
  session_id?: string | null;
  user_id?: number;
  agent_type?: string;
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

// 复用系统登录 token（与 src/utils/request.ts 拦截器一致的 Bearer 头）
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
    body: JSON.stringify({
      ...payload,
      user_id: AI_USER_ID,
    }),
    signal,
  });

  if (!response.ok) {
    const data = await parseResponseBody(response);
    const detail =
      typeof data === "string" ? data : data?.message || data?.msg;
    throw new Error(detail || `AI 对话请求失败（${response.status}）`);
  }
  if (!response.body) {
    throw new Error("AI 对话未返回可读取的数据流");
  }
  return response;
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
