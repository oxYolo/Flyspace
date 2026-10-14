
import mitt from "mitt";

// 创建事件总线实例
const emitter = mitt();

// 添加到全局window对象，确保在任何地方都可以访问
if (typeof window !== 'undefined') {
  window.mittInstance = emitter;
}

export default emitter;
