import type { App } from 'vue'

interface DragElement extends HTMLElement {
  setAttribute(name: string, value: string | boolean): void;
  getAttribute(name: string): string | null;
}

export default {
  install(app: App) {
    app.directive('drag', {
      // mounted表示一个元素，插入到DOM中会执行mounted函数，只触发一次
      mounted(el: DragElement) {
        const odiv = el // 获取当前元素
        let firstTime = ''; let lastTime = ''
        const edgeThreshold = 20 // 拖拽边缘距离
        
        // 阻止默认事件，防止文本选择
        const preventSelection = (e: Event) => {
          e.preventDefault();
          return false;
        };
        
        const pointFlag = (e: MouseEvent): boolean => {
          const rect = el.getBoundingClientRect()
          return (e.clientX > rect.right - edgeThreshold ||
            e.clientX < rect.left + edgeThreshold ||
            e.clientY > rect.bottom - edgeThreshold ||
            e.clientY < rect.top + edgeThreshold)
        }
        
        el.onmousemove = function(e: MouseEvent) {
          if (!pointFlag(e)) {
            odiv.style.cursor = 'default'
          } else {
            odiv.style.cursor = 'move'
          }
        }
        
        el.onmousedown = function(e: MouseEvent) {
          // 只有dom边框，才允许拖拽
          if (!pointFlag(e)) {
            return
          }
          
          // 阻止默认事件，防止文本选择
          e.preventDefault();
          
          const disx = e.pageX - el.offsetLeft
          const disy = e.pageY - el.offsetTop
          // 给当前元素添加属性，用于元素状态的判断
          odiv.setAttribute('ele-flag', 'false')
          odiv.setAttribute('dragging-flag', 'true')
          
          // 在拖拽过程中阻止文本选择
          document.addEventListener('selectstart', preventSelection);
          // 阻止图片拖拽
          document.addEventListener('dragstart', preventSelection);
          
          firstTime = new Date().getTime().toString()
          
          document.onmousemove = function(e: MouseEvent) {
            // 阻止默认事件，防止文本选择
            e.preventDefault();
            
            el.style.left = e.pageX - disx + 'px'
            el.style.top = e.pageY - disy + 'px'
          }
          
          document.onmouseup = function(event: MouseEvent) {
            document.onmousemove = document.onmouseup = null
            
            // 移除阻止文本选择的事件监听
            document.removeEventListener('selectstart', preventSelection);
            document.removeEventListener('dragstart', preventSelection);
            
            lastTime = new Date().getTime().toString()
            if ((parseInt(lastTime) - parseInt(firstTime)) > 200) {
              odiv.setAttribute('ele-flag', 'true')
              event.stopPropagation()
            }
            
            setTimeout(function() {
              odiv.setAttribute('dragging-flag', 'false')
            }, 100)
          }
        }
        
        // 样式优化：确保元素可拖动
        if (getComputedStyle(el).position === 'static') {
          el.style.position = 'relative';
        }
        
        // 添加用户选择样式，在拖拽时禁止选择文本
        el.style.userSelect = 'none';
        el.style.webkitUserSelect = 'none';
        
        // 使用CSS属性方式设置其他浏览器的用户选择样式
        el.style.setProperty('-moz-user-select', 'none');
        el.style.setProperty('-ms-user-select', 'none');
      }
    })
  }
}
