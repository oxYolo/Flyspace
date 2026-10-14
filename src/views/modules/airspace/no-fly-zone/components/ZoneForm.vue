<template>
  <div class="zone-form-overlay" @mousedown="handleOverlayMouseDown" @click="handleOverlayClick">
    <div class="zone-form-modal" @click.stop @mousedown.stop>
      <div class="form-header">
        <h3>{{ isEdit ? '编辑禁飞区' : '创建禁飞区' }}</h3>
        <button class="close-btn" @click="handleCancel">×</button>
      </div>
      <div class="form-content">
        <form @submit.prevent="handleSubmit">
          <div class="form-section">
            <h4 class="section-title">基本信息</h4>
            <div class="form-row">
              <label class="form-label required">禁飞区名称</label>
              <input v-model="formData.name" type="text" class="form-input" placeholder="请输入禁飞区名称" required />
            </div>
            <div class="form-row">
              <label class="form-label">禁飞区类型</label>
              <select v-model="formData.type" class="form-select">
                <option value="">请选择类型</option>
                <option v-for="type in zoneTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
              <!-- 显示类型对应的默认颜色预览 -->
              <div v-if="formData.type" class="type-color-preview">
                <span class="preview-label">默认颜色：</span>
                <div class="color-preview-box" :style="{ backgroundColor: getColorByType(formData.type) }"></div>
                <span class="color-code">{{ getColorByType(formData.type) }}</span>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">描述信息</label>
              <textarea v-model="formData.description" class="form-textarea" placeholder="请输入禁飞区描述" rows="3"></textarea>
            </div>
          </div>
          <div class="form-section">
            <h4 class="section-title">空间信息</h4>
            <div class="form-row form-row-inline">
              <div class="form-field">
                <label class="form-label">最低高度 (米)</label>
                <input v-model.number="formData.minAltitude" type="number" class="form-input" placeholder="0" min="0" />
              </div>
              <div class="form-field">
                <label class="form-label">最高高度 (米)</label>
                <input v-model.number="formData.maxAltitude" type="number" class="form-input" placeholder="1000" min="0" />
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">缓冲区距离 (米)</label>
              <input v-model.number="formData.bufferMeters" type="number" class="form-input" placeholder="100" min="0" />
            </div>
          </div>
          <div class="form-section">
            <h4 class="section-title">显示设置</h4>
            <div class="form-row">
              <label class="form-label">显示颜色</label>
              <div class="color-input-group">
                <input v-model="formData.color" type="color" class="color-picker" />
                <input v-model="formData.color" type="text" class="form-input color-text" placeholder="#FF0000" @blur="validateColor" />
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
            <button type="submit" class="btn-submit" :disabled="!isFormValid">{{ isEdit ? '更新' : '创建' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { INoFlyZone } from '@/model/noFlyZone'
// 默认禁飞区类型配置
const DEFAULT_ZONE_TYPES = [
    '机场周边',
    '军事禁区与军事管理区',
    '党政机关',
    '重要基础设施',
    '其他敏感区域',
    '国界线、边境线'
] as const

/** 禁飞区类型与颜色的映射关系 */
const ZONE_TYPE_COLOR_MAP: Record<string, string> = {
    '机场周边': '#FF6B6B',           // 红色 - 表示危险区域
    '军事禁区与军事管理区': '#8B0000', // 深红色 - 表示军事禁区
    '党政机关': '#FFD700',           // 金色 - 表示重要政府机构
    '重要基础设施': '#FF8C00',       // 橙色 - 表示基础设施
    '其他敏感区域': '#9370DB',       // 紫色 - 表示其他敏感区域
    '国界线、边境线': '#00CED1'      // 深青色 - 表示国界
}

/**
 * 根据禁飞区类型获取对应的默认颜色
 * @param type 禁飞区类型
 * @returns 对应的颜色值
 */
function getColorByType(type: string): string {
    return ZONE_TYPE_COLOR_MAP[type] || '#FF6B6B'
}

interface Props { model: INoFlyZone | null }
interface Emits { (e: 'submit', data: INoFlyZone): void; (e: 'cancel'): void }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formData = ref<INoFlyZone>({
  name: '', type: '', description: '', geometry: { type: 'Polygon', coordinates: [] },
  minAltitude: 0, maxAltitude: 1000, bufferMeters: 100, color: '#FF0000'
})

const zoneTypes = [...DEFAULT_ZONE_TYPES]

const isEdit = computed(() => !!props.model?.id)
const isFormValid = computed(() => formData.value.name.trim() !== '' && formData.value.geometry.coordinates.length > 0)

// 跟踪鼠标按下时的目标，用于区分点击和拖拽
const mouseDownTarget = ref<EventTarget | null>(null)
onMounted(() => { 
  if (props.model) formData.value = { ...props.model }
  // 添加全局键盘事件监听，防止复制粘贴操作误触发关闭
  document.addEventListener('keydown', handleKeyDown as any)
})
onUnmounted(() => {
  // 移除事件监听器
  document.removeEventListener('keydown', handleKeyDown as any)
})
watch(() => props.model, (n) => { if (n) formData.value = { ...n }; else resetForm() }, { immediate: true })

// 监听类型变化，自动设置对应的默认颜色
watch(() => formData.value.type, (newType) => {
  if (newType && !isEdit.value) {
    // 只有在创建模式下才自动设置颜色，编辑模式下保持用户选择的颜色
    const defaultColor = getColorByType(newType)
    if (defaultColor) {
      formData.value.color = defaultColor
    }
  }
})

function resetForm(): void {
  formData.value = { name:'', type:'', description:'', geometry:{ type:'Polygon', coordinates: [] }, minAltitude:0, maxAltitude:1000, bufferMeters:100, color:'#FF0000' }
}

function validateColor(): void { const color = formData.value.color; if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) { formData.value.color = '#FF0000' } }

// 添加键盘事件监听，支持 ESC 键关闭
// 确保 Ctrl+C, Ctrl+V 等操作不会误触发关闭
function handleKeyDown(event: KeyboardEvent): void {
  // 只响应 ESC 键，忽略复制粘贴等快捷键
  if (event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault()
    handleCancel()
  }
}

function handleSubmit(): void { if (!isFormValid.value) return; emit('submit', { ...formData.value, name: formData.value.name.trim() }) }
function handleCancel(): void { emit('cancel') }

// 处理 overlay 的鼠标按下事件
function handleOverlayMouseDown(event: MouseEvent): void {
  // 记录鼠标按下时的目标
  mouseDownTarget.value = event.target
}

// 处理 overlay 的点击事件
function handleOverlayClick(event: MouseEvent): void {
  // 只有当鼠标按下和释放都在 overlay 上（而不是表单内）时才关闭表单
  // 检查事件目标是否是 overlay 本身，且按下时也在 overlay 上
  if (event.target === event.currentTarget && mouseDownTarget.value === event.currentTarget) {
    handleCancel()
  }
  // 重置鼠标按下目标
  mouseDownTarget.value = null
}
</script>

<style lang="less" scoped>
.zone-form-overlay { 
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%; 
  background: rgba(0, 0, 0, 0.7); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1000; 
  backdrop-filter: blur(5px); 
  pointer-events: auto; /* 确保模态框可以接收点击事件 */
}
.zone-form-modal { 
  background: url("@/assets/images/common/边框.png") center no-repeat; 
  background-size: 100% 100%; 
  border: 0; 
  border-radius: 15px; 
  width: 90%; 
  max-width: 700px; 
  height: auto; 
  max-height: 90vh; 
  overflow: visible;
  box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3); 
  animation: modalSlideIn 0.3s ease-out; 
  display: flex; 
  flex-direction: column; 
  pointer-events: auto; /* 确保模态框内容可以接收点击事件 */
}
@keyframes modalSlideIn { from { opacity: 0; transform: scale(0.8) translateY(-50px);} to { opacity: 1; transform: scale(1) translateY(0);} }
.form-header { background: transparent; color: #cbefff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 255, 255, 0.3); }
.form-header h3 { margin: 0; font-size: 18px; font-weight: bold; }
.close-btn { background: none; border: none; color: #000; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s; }
.close-btn:hover { background-color: rgba(0, 0, 0, 0.1); }
.form-content { 
  padding: 20px; 
  flex: 1; 
  overflow: visible; 
  color: #cbefff; 
  background: rgba(0, 0, 0, 0.35); 
  min-height: 0; 
  display: flex; 
  flex-direction: column; 
}
.form-section { 
  margin-bottom: 20px; 
  flex-shrink: 0; 
}
.section-title { color: #00ffff; font-size: 16px; font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid rgba(0, 255, 255, 0.3); }
.form-row { 
  margin-bottom: 12px; 
  flex-shrink: 0; 
}

/* 左右并排布局 */
.form-row-inline {
  display: flex;
  gap: 15px;
  align-items: flex-end;
}

.form-field {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.form-label { display: block; margin-bottom: 5px; color: #cbefff; font-weight: 500; }
.form-label.required::after { content: ' *'; color: #ff4444; }
.form-input,.form-select,.form-textarea { width: 100%; padding: 10px 12px; background: rgba(0, 28, 56, 0.85); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 6px; color: #cbefff; font-size: 14px; outline: none; transition: all 0.3s ease; }
.form-select, select.form-select { appearance: none; -webkit-appearance: none; -moz-appearance: none; }
select.form-select option, .form-select option { background-color: #0b1a3a; color: #cbefff; }
.form-input:focus,.form-select:focus,.form-textarea:focus { border-color: #00ffff; background: rgba(0, 255, 255, 0.15); box-shadow: 0 0 10px rgba(0, 255, 255, 0.3); }
.form-textarea { 
  resize: vertical; 
  min-height: 60px; 
  max-height: 100px; 
}
.color-input-group { display: flex; gap: 10px; align-items: center; }
.color-picker { width: 50px; height: 40px; border: none; border-radius: 6px; cursor: pointer; }
.color-text { flex: 1; }
.form-actions { 
  display: flex; 
  gap: 15px; 
  justify-content: flex-end; 
  margin-top: 15px; 
  padding-top: 15px; 
  border-top: 1px solid rgba(0, 255, 255, 0.3); 
  flex-shrink: 0; 
}
.btn-cancel,.btn-submit { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s ease; }
.btn-cancel { background: rgba(255, 68, 68, 0.3); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.5); }
.btn-cancel:hover { background: rgba(255, 68, 68, 0.5); transform: translateY(-2px); }
.btn-submit { background: linear-gradient(45deg, #00ffff, #0080ff); color: #000; }
.btn-submit:hover:not(:disabled) { background: linear-gradient(45deg, #00cccc, #0066cc); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4); }
.btn-submit:disabled { background: rgba(128, 128, 128, 0.3); color: rgba(255, 255, 255, 0.5); cursor: not-allowed; }
/* 移除滚动条样式，因为不再需要滚动 */

/* 类型颜色预览样式 */
.type-color-preview { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  margin-top: 8px; 
  padding: 8px 12px; 
  background: rgba(0, 28, 56, 0.6); 
  border: 1px solid rgba(0, 255, 255, 0.2); 
  border-radius: 6px; 
}
.preview-label { 
  font-size: 12px; 
  color: rgba(203, 239, 255, 0.8); 
}
.color-preview-box { 
  width: 20px; 
  height: 20px; 
  border: 1px solid rgba(255, 255, 255, 0.3); 
  border-radius: 4px; 
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); 
}
.color-code { 
  font-size: 12px; 
  color: #00ffff; 
  font-family: monospace; 
  font-weight: 500; 
}
</style>

