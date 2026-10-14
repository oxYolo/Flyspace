<template>
  <div class="airspace-application-container">
    <div class="application-content">
      <div class="header">
        <img src="/src/assets/images/common/tit.png" class="title-bg" alt="标题" />
        <span class="title">空域申请</span>
      </div>
      
      <div class="content">
        <div class="placeholder">
          <div class="placeholder-icon">📋</div>
          <div class="placeholder-text">空域申请功能正在开发中...</div>
          <div class="placeholder-desc">该功能将提供空域申请、审批、管理等功能</div>
        </div>
      </div>
    </div>
    
    <!-- 调试信息 -->
    <div class="debug-info">
      <p>页面已加载 - 时间: {{ currentTime }}</p>
      <p>路由路径: {{ $route.path }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentTime = ref(new Date().toLocaleString())

onMounted(() => {
  console.debug('[AirspaceApplication] 空域申请页面已加载')
  console.debug('[AirspaceApplication] 页面容器:', document.querySelector('.airspace-application-container'))
  console.debug('[AirspaceApplication] 页面内容:', document.querySelector('.application-content'))
  console.debug('[AirspaceApplication] 当前路由:', route.path)
})
</script>

<style scoped lang="less">
.airspace-application-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  overflow: hidden;
  z-index: 1000;
}

.application-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 600px;
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
}

.header {
  position: relative;
  text-align: center;
  margin-bottom: 40px;
  
  .title-bg {
    width: 100%;
    height: auto;
    max-width: 300px;
  }
  
  .title {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
  }
}

.content {
  text-align: center;
}

.placeholder {
  padding: 60px 20px;
  
  .placeholder-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.7;
  }
  
  .placeholder-text {
    font-size: 20px;
    color: #cbefff;
    margin-bottom: 15px;
    font-weight: 500;
  }
  
  .placeholder-desc {
    font-size: 14px;
    color: #8a9ba8;
    line-height: 1.6;
  }
}

.debug-info {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 9999;
  
  p {
    margin: 2px 0;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .application-content {
    width: 90%;
    padding: 30px 20px;
  }
  
  .header .title {
    font-size: 20px;
  }
  
  .placeholder {
    padding: 40px 15px;
    
    .placeholder-icon {
      font-size: 48px;
    }
    
    .placeholder-text {
      font-size: 18px;
    }
    
    .placeholder-desc {
      font-size: 13px;
    }
  }
}
</style>
