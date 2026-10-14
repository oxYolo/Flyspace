import { EventDispatcher } from './event_dispatcher.ts';
import type { EventListener } from './event_dispatcher.ts';

// WebSocket事件类型定义
export interface WebSocketEvents {
  open: Event;
  message: MessageEvent;
  close: CloseEvent;
  error: Event;
  reconnect_start: number; // 重连次数
  reconnect_failed: void;
  heartbeat_sent: void;
  heartbeat_timeout: void;
}

// WebSocket客户端配置
export interface WebSocketClientOptions {
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  heartbeatMessage?: string | object;
  autoReconnect?: boolean;
  protocols?: string | string[];
}

// 连接状态枚举
export enum WebSocketState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * 优化的WebSocket客户端
 * 支持自动重连、心跳检测、类型安全
 */
export class WebSocketClient extends EventDispatcher<WebSocketEvents> {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private state: WebSocketState = WebSocketState.CLOSED;
  private manualClose = false;

  private readonly url: string;
  private readonly protocols?: string | string[];
  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;
  private readonly heartbeatInterval: number;
  private readonly heartbeatTimeout: number;
  private readonly heartbeatMessage: string;
  private readonly autoReconnect: boolean;

  constructor(url: string, options: WebSocketClientOptions = {}) {
    super();

    this.url = url;
    this.protocols = options.protocols;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectInterval = options.reconnectInterval ?? 10000;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.heartbeatTimeout = options.heartbeatTimeout ?? 5000;
    this.autoReconnect = options.autoReconnect ?? true;

    // 设置心跳消息
    if (typeof options.heartbeatMessage === 'string') {
      this.heartbeatMessage = options.heartbeatMessage;
    } else if (typeof options.heartbeatMessage === 'object') {
      this.heartbeatMessage = JSON.stringify(options.heartbeatMessage);
    } else {
      this.heartbeatMessage = JSON.stringify({ type: 'heartbeat', timestamp: Date.now() });
    }
  }

  /**
   * 连接WebSocket
   */
  connect(): void {
    if (this.state === WebSocketState.OPEN ||
        this.state === WebSocketState.CONNECTING) {
      return;
    }

    this.manualClose = false;
    this.clearReconnectTimer();

    try {
      this.setState(WebSocketState.CONNECTING);
      this.socket = new WebSocket(this.url, this.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.setState(WebSocketState.FAILED);
      this.dispatchEvent('error', error as Event);
      this.handleReconnect();
    }
  }

  /**
   * 设置WebSocket事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = (event) => {
      this.setState(WebSocketState.OPEN);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.dispatchEvent('open', event);
    };

    this.socket.onmessage = (event) => {
      this.resetHeartbeatTimeout();
      this.dispatchEvent('message', event);
    };

    this.socket.onclose = (event) => {
      this.setState(WebSocketState.CLOSED);
      this.stopHeartbeat();
      this.dispatchEvent('close', event);
      // 自动重连（除非是手动关闭）
      if (!this.manualClose && this.autoReconnect) {
        this.handleReconnect();
      }
    };

    this.socket.onerror = (event) => {
      this.setState(WebSocketState.FAILED);
      this.stopHeartbeat();
      this.dispatchEvent('error', event);
    };
  }

  /**
   * 发送消息
   */
  send(message: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.socket.send(message);
    } catch (error) {
      this.dispatchEvent('error', error as Event);
    }
  }

  /**
   * 发送JSON消息
   */
  sendJSON(data: any): void {
    try {
      const message = JSON.stringify(data);
      this.send(message);
    } catch (error) {
      this.dispatchEvent('error', new Event('json_serialize_error'));
    }
  }

  /**
   * 关闭连接
   */
  close(code?: number, reason?: string): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.socket) {
      this.setState(WebSocketState.CLOSING);
      this.socket.close(code, reason);
      this.socket = null;
    } else {
      this.setState(WebSocketState.CLOSED);
    }
    // 清除所有监听器
    this.clear();
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (!this.autoReconnect ||
        this.manualClose ||
        this.reconnectAttempts >= this.maxReconnectAttempts) {

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.setState(WebSocketState.FAILED);
        this.dispatchEvent('reconnect_failed');
      }
      return;
    }
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    this.setState(WebSocketState.RECONNECTING);
    this.dispatchEvent('reconnect_start', this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.clearReconnectTimer();
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval <= 0) return;

    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // 发送心跳前设置超时定时器
        this.setHeartbeatTimeout();

        // 创建带时间戳的心跳消息
        const heartbeat = this.heartbeatMessage.includes('timestamp')
          ? this.heartbeatMessage.replace(/timestamp":\d+/, `timestamp":${Date.now()}`)
          : this.heartbeatMessage;

        this.socket.send(heartbeat);
        this.dispatchEvent('heartbeat_sent');
      }
    }, this.heartbeatInterval);
  }

  /**
   * 设置心跳超时检测
   */
  private setHeartbeatTimeout(): void {
    this.clearHeartbeatTimeout();

    if (this.heartbeatTimeout > 0) {
      this.heartbeatTimeoutTimer = setTimeout(() => {
        this.dispatchEvent('heartbeat_timeout');
        // 心跳超时，考虑重连
        if (this.autoReconnect) {
          this.socket?.close();
        }
      }, this.heartbeatTimeout);
    }
  }

  /**
   * 重置心跳超时（收到任何消息时调用）
   */
  private resetHeartbeatTimeout(): void {
    this.clearHeartbeatTimeout();
    this.setHeartbeatTimeout();
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  /**
   * 清除心跳超时定时器
   */
  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // 状态和信息获取方法
  getState(): WebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === WebSocketState.OPEN &&
           this.socket?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getReadyState(): number | null {
    return this.socket?.readyState ?? null;
  }

  getUrl(): string {
    return this.url;
  }

  /**
   * 重置重连计数器
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * 手动触发重连
   */
  reconnect(): void {
    if (this.socket) {
      this.close();
    }
    this.manualClose = false;
    this.connect();
  }

  // 便捷的事件监听方法
  onOpen(callback: EventListener<Event>): () => void {
    return this.addEventListener('open', callback);
  }

  onMessage(callback: EventListener<MessageEvent>): () => void {
    return this.addEventListener('message', callback);
  }

  onClose(callback: EventListener<CloseEvent>): () => void {
    return this.addEventListener('close', callback);
  }

  onError(callback: EventListener<Event>): () => void {
    return this.addEventListener('error', callback);
  }

  onReconnectStart(callback: EventListener<number>): () => void {
    return this.addEventListener('reconnect_start', callback);
  }

  onReconnectFailed(callback: EventListener<void>): () => void {
    return this.addEventListener('reconnect_failed', callback);
  }

  onHeartbeatSent(callback: EventListener<void>): () => void {
    return this.addEventListener('heartbeat_sent', callback);
  }

  onHeartbeatTimeout(callback: EventListener<void>): () => void {
    return this.addEventListener('heartbeat_timeout', callback);
  }

  // 私有方法
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
    }
  }
}

// 使用示例
/*
const wsClient = new WebSocketClient('ws://localhost:8765', {
  maxReconnectAttempts: 10,
  reconnectInterval: 5000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  heartbeatMessage: { type: 'ping', timestamp: Date.now() },
  autoReconnect: true
});

// 连接
wsClient.connect();

// 监听事件
wsClient.onOpen(() => {
  console.log('WebSocket connected');
  wsClient.sendJSON({ type: 'hello', message: 'Hello Server!' });
});

wsClient.onMessage((event) => {
  try {
    const data = JSON.parse(event.data);
    console.log('Received JSON:', data);
  } catch {
    console.log('Received text:', event.data);
  }
});

wsClient.onError((error) => {
  console.error('WebSocket error:', error);
});

wsClient.onReconnectStart((attempts) => {
  console.log(`Reconnecting... attempt ${attempts}`);
});

wsClient.onHeartbeatTimeout(() => {
  console.warn('Heartbeat timeout detected');
});

// 发送消息
setInterval(() => {
  if (wsClient.isConnected()) {
    wsClient.sendJSON({
      type: 'data',
      payload: 'Regular message',
      timestamp: Date.now()
    });
  }
}, 10000);
*/
