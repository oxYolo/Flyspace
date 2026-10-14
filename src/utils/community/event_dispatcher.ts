// 事件监听器函数类型
export type EventListener<T = any> = (data: T) => void;

// 事件映射接口
export interface EventMap {
  [key: string]: any;
}

/**
 * 优化的事件分发器
 * 支持多个监听器、类型安全、内存管理
 */
export class EventDispatcher<Events extends EventMap = EventMap> {
  private listeners: Map<keyof Events, Set<EventListener>> = new Map();

  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   * @returns 返回移除监听器的函数
   */
  addEventListener<K extends keyof Events>(
    type: K,
    listener: EventListener<Events[K]>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    const listenerSet = this.listeners.get(type)!;
    listenerSet.add(listener);
    
    // 返回移除函数
    return () => this.removeEventListener(type, listener);
  }

  /**
   * 移除特定的事件监听器
   * @param type 事件类型
   * @param listener 要移除的监听器函数
   */
  removeEventListener<K extends keyof Events>(
    type: K,
    listener: EventListener<Events[K]>
  ): void {
    const listenerSet = this.listeners.get(type);
    if (listenerSet) {
      listenerSet.delete(listener);
      if (listenerSet.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  /**
   * 移除某个事件类型的所有监听器
   * @param type 事件类型
   */
  removeAllListeners<K extends keyof Events>(type: K): void {
    this.listeners.delete(type);
  }

  /**
   * 清空所有事件监听器
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 分发事件
   * @param type 事件类型
   * @param data 事件数据
   */
  dispatchEvent<K extends keyof Events>(type: K, data: Events[K]): void {
    const listenerSet = this.listeners.get(type);
    if (listenerSet) {
      // 创建副本避免在执行过程中被修改
      const listeners = Array.from(listenerSet);
      listeners.forEach(listener => {
        try {
          listener.call(this, data);
        } catch (error) {
          console.error(`Error in event listener for ${String(type)}:`, error);
        }
      });
    }
  }

  /**
   * 获取某个事件类型的监听器数量
   * @param type 事件类型
   * @returns 监听器数量
   */
  getListenerCount<K extends keyof Events>(type: K): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  /**
   * 检查是否有某个事件类型的监听器
   * @param type 事件类型
   * @returns 是否有监听器
   */
  hasListeners<K extends keyof Events>(type: K): boolean {
    return this.getListenerCount(type) > 0;
  }

  /**
   * 获取所有事件类型
   * @returns 事件类型数组
   */
  getEventTypes(): Array<keyof Events> {
    return Array.from(this.listeners.keys());
  }
}