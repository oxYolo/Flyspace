import type { App, DirectiveBinding } from 'vue'

interface TooltipElement extends HTMLElement {
  tooltip?: HTMLElement;
  handleMouseEnter?: (e: MouseEvent) => void;
  handleMouseMove?: (e: MouseEvent) => void;
  handleMouseLeave?: () => void;
  tooltipTimer?: number;
  currentMousePosition?: { x: number, y: number };
}

// 定义指令修饰符或值的接口
interface TooltipOptions {
  content: string;   // 提示内容
  delay?: number;    // 延迟显示时间(毫秒)
}

export default {
  install(app: App) {
    app.directive('tooltip', {
      mounted(el: TooltipElement, binding: DirectiveBinding) {
        // 解析指令值
        let tooltipContent: string;
        let delay: number = 1000; // 默认延迟1秒

        // 初始化鼠标位置存储
        el.currentMousePosition = { x: 0, y: 0 };

        // 处理指令值，支持字符串或对象格式
        if (typeof binding.value === 'string') {
          tooltipContent = binding.value;
        } else if (typeof binding.value === 'object') {
          const options = binding.value as TooltipOptions;
          tooltipContent = options?.content;
          delay = options?.delay || delay;
        } else {
          tooltipContent = '';
        }

        // 创建 Tooltip 元素
        const tooltip = document.createElement('div')
        tooltip.className = 'vue-tooltip'
        tooltip.textContent = tooltipContent

        // 初始化样式
        Object.assign(tooltip.style, {
          position: 'fixed',
          display: 'none',
          background: '#333',
          color: '#fff',
          padding: '10px',
          lineHeight: '20px',
          borderRadius: '5px',
          fontSize: '14px',
          pointerEvents: 'none', // 防止遮挡鼠标事件
          zIndex: '9999',
          maxWidth: '400px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          transition: 'transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out',
          boxShadow: '0 2px 12px 0 rgba(0, 0, 0, 0.3)'
        })

        document.body.appendChild(tooltip)

        // 更新位置函数 - 使用当前记录的鼠标位置并处理边缘情况
        function updatePosition() {
          if (!el.currentMousePosition) return;

          // 获取鼠标位置（使用clientX/Y而不是pageX/Y，因为我们使用fixed定位）
          const mouseX = el.currentMousePosition.x
          const mouseY = el.currentMousePosition.y

          // 获取窗口尺寸
          const windowWidth = window.innerWidth
          const windowHeight = window.innerHeight

          // 确保tooltip已经渲染，获取其尺寸
          const tooltipWidth = tooltip.offsetWidth
          const tooltipHeight = tooltip.offsetHeight

          // 默认偏移量
          const offset = 15

          // 初始位置（默认在鼠标右下方）
          let posX = mouseX + offset
          let posY = mouseY + offset

          // 检查右边界
          if (posX + tooltipWidth > windowWidth - 20) {
            // 如果右侧空间不足，显示在鼠标左侧
            posX = mouseX - tooltipWidth - offset
          }

          // 检查下边界
          if (posY + tooltipHeight > windowHeight - 20) {
            // 如果下方空间不足，显示在鼠标上方
            posY = mouseY - tooltipHeight - offset
          }

          // 确保不会超出左边界和上边界
          posX = Math.max(20, posX)
          posY = Math.max(20, posY)

          // 应用位置
          tooltip.style.left = `${posX}px`
          tooltip.style.top = `${posY}px`
        }

        // 鼠标移入事件
        el.handleMouseEnter = (e: MouseEvent) => {
          // 记录初始鼠标位置（使用clientX/Y而不是pageX/Y）
          el.currentMousePosition = { x: e.clientX, y: e.clientY };

          // 清除可能存在的定时器
          if (el.tooltipTimer) {
            clearTimeout(el.tooltipTimer);
          }

          // 设置延迟显示
          if (delay > 0) {
            el.tooltipTimer = window.setTimeout(() => {
              // 先设置为可见，这样才能获取正确的尺寸
              tooltip.style.display = 'block';
              // 使用最新的鼠标位置计算位置
              updatePosition();
            }, delay);
          } else {
            tooltip.style.display = 'block';
            updatePosition();
          }
        }

        // 鼠标移动事件（实时跟随）
        el.handleMouseMove = (e: MouseEvent) => {
          // 实时更新鼠标位置（使用clientX/Y而不是pageX/Y）
          el.currentMousePosition = { x: e.clientX, y: e.clientY };

          if (tooltip.style.display === 'block') {
            updatePosition();
          }
        }

        // 鼠标移出事件
        el.handleMouseLeave = () => {
          // 清除定时器
          if (el.tooltipTimer) {
            clearTimeout(el.tooltipTimer);
            el.tooltipTimer = undefined;
          }
          tooltip.style.display = 'none';
        }

        // 绑定事件监听
        el.addEventListener('mouseenter', el.handleMouseEnter)
        el.addEventListener('mousemove', el.handleMouseMove)
        el.addEventListener('mouseleave', el.handleMouseLeave)

        // 保存引用到元素
        el.tooltip = tooltip
      },

      updated(el: TooltipElement, binding: DirectiveBinding) {
        // 当指令值更新时，更新tooltip内容
        if (el.tooltip) {
          let tooltipContent: string;

          if (typeof binding.value === 'string') {
            tooltipContent = binding.value;
          } else if (typeof binding.value === 'object') {
            const options = binding.value as TooltipOptions;
            tooltipContent = options?.content;
          } else {
            tooltipContent = '';
          }

          el.tooltip.textContent = tooltipContent;
        }
      },

      unmounted(el: TooltipElement) {
        // 清除定时器
        if (el.tooltipTimer) {
          clearTimeout(el.tooltipTimer);
        }

        // 移除事件监听
        if (el.handleMouseEnter) {
          el.removeEventListener('mouseenter', el.handleMouseEnter)
        }
        if (el.handleMouseMove) {
          el.removeEventListener('mousemove', el.handleMouseMove)
        }
        if (el.handleMouseLeave) {
          el.removeEventListener('mouseleave', el.handleMouseLeave)
        }

        // 移除 Tooltip 元素
        if (el.tooltip) {
          document.body?.removeChild(el.tooltip)
        }
      }
    })
  }
}
