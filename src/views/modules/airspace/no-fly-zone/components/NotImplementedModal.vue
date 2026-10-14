<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>功能提示</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      <div class="modal-body">
        <div class="icon-container">
          <div class="feature-icon">🚧</div>
        </div>
        <div class="message">
          <h4>{{ title }}</h4>
          <p>{{ message }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-confirm" @click="handleClose">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  title?: string
  message?: string
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '功能暂未实现',
  message: '该功能正在开发中，敬请期待！'
})

const emit = defineEmits<Emits>()

function handleClose(): void {
  emit('close')
}
</script>

<style lang="less" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
  pointer-events: auto; /* 重要：父容器可能是 pointer-events:none，这里强制可交互 */
}

.modal-content {
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  border-radius: 15px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(-50px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  background: transparent;
  color: #cbefff;
  padding: 20px 25px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}

.close-btn {
  background: none;
  border: none;
  color: #cbefff;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #00ffff;
  transform: scale(1.1);
}

.modal-body {
  padding: 30px 25px;
  text-align: center;
  color: #cbefff;
  background: rgba(0, 0, 0, 0.35);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.icon-container {
  margin-bottom: 25px;
}

.feature-icon {
  font-size: 64px;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.message h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #00ffff;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
}

.message p {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: rgba(203, 239, 255, 0.9);
  max-width: 300px;
}

.modal-footer {
  padding: 20px 25px;
  display: flex;
  justify-content: center;
  border-top: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.2);
}

.btn-confirm {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #00aaff, #0088cc);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 170, 255, 0.3);
}

.btn-confirm:hover {
  background: linear-gradient(135deg, #0088cc, #006699);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 170, 255, 0.4);
}

.btn-confirm:active {
  transform: translateY(0);
}
</style>
