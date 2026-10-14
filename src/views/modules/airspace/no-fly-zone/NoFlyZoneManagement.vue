<template>
  <div class="no-fly-zone-management">
    <!-- 左侧面板 -->
    <div class="side-panel">
      <!-- 实时统计 -->
      <ZoneStats :count="total" />

      <!-- 禁飞区列表 -->
      <ZoneList
        :items="zones"
        :total="total"
        :page="page"
        :pageSize="pageSize"
        @refresh="handleRefresh"
        @search="handleSearch"
        @filter="handleFilter"
        @search-change="handleSearchChange"
        @delete="handleDelete"
        @edit="handleEdit"
        @locate="handleLocate"
        @expand="onExpandExplorer"
        @page-change="handlePageChange"
      />
    </div>

    <!-- 右侧垂直工具舱（替代底部横向工具栏） -->
    <div class="right-dock">
      <RightToolDock
        @create="handleCreateZone"
        @edit="handleEditMode"
        @save="handleSaveEdit"
        @cancel="handleCancelDrawing"
        @create-arc="handleCreateArc"
      />
    </div>

    <!-- 右下角图例 -->
    <div class="legend-container">
      <ZoneLegend
        :zones="zones"
        :visible-types="visibleTypes"
        @toggle-type="handleToggleZoneType"
        @update-visible-types="handleUpdateVisibleTypes"
      />
    </div>

    <!-- 展开查询面板 -->
    <ZoneExplorer
      :visible="showExplorer"
      :items="explorerItems"
      :total="explorerTotal"
      :page="explorerPage"
      :pageSize="explorerPageSize"
      @close="onCloseExplorer"
      @locate="handleLocate"
      @search="handleExplorerSearch"
      @page-change="handleExplorerPageChange"
    />

    <!-- 禁飞区表单 -->
    <ZoneForm
      v-if="showForm"
      :model="editingZone"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    

    <!-- 区域信息弹窗 -->
    <div v-if="showZoneInfo" class="zone-info-overlay" @click="handleCloseZoneInfo">
      <div class="zone-info-modal" @click.stop>
        <div class="zone-info-header">
          <h3>禁飞区详情</h3>
          <button class="close-btn" @click="handleCloseZoneInfo">×</button>
        </div>
        <div class="zone-info-content" v-if="selectedZone">
          <div class="info-item">
            <label>名称：</label>
            <span>{{ selectedZone.name }}</span>
          </div>
          <div class="info-item">
            <label>类型：</label>
            <span>{{ selectedZone.type }}</span>
          </div>
          <div class="info-item">
            <label>描述：</label>
            <span>{{ selectedZone.description || '暂无描述' }}</span>
          </div>
          <div class="info-item">
            <label>颜色：</label>
            <div class="color-preview" :style="{ backgroundColor: selectedZone.color }"></div>
          </div>
          <div class="info-actions">
            <button class="btn-primary" @click="handleEditFromInfo(selectedZone.id)">编辑</button>
            <button class="btn-danger" @click="handleDeleteFromInfo(selectedZone.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { INoFlyZone, INoFlyZoneQueryParams, GeoJsonPolygonType } from '@/model/noFlyZone'
import { $getNoFlyZoneList, $createNoFlyZone, $updateNoFlyZone, $deleteNoFlyZone } from '@/api/no-fly-zone'
import { createNoFlyZoneDrawing } from '@/utils/no-fly-zone-drawing'
import { getViewer } from '@/services/mapService'
import ZoneStats from './components/ZoneStats.vue'
import ZoneList from './components/ZoneList.vue'
import ZoneForm from './components/ZoneForm.vue'
import ZoneExplorer from './components/ZoneExplorer.vue'
import RightToolDock from './components/RightToolDock.vue'
import ZoneLegend from './components/ZoneLegend.vue'

const zones = ref<INoFlyZone[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(8)
const keyword = ref('')
const filterType = ref('')
const showForm = ref(false)
const editingZone = ref<INoFlyZone | null>(null)
const showZoneInfo = ref(false)
const selectedZone = ref<any>(null)
const showExplorer = ref(false)
const explorerKeyword = ref('')
const explorerType = ref('')
const explorerPage = ref(1)
const explorerPageSize = ref(8)
const explorerTotal = ref(0)
const explorerItems = ref<INoFlyZone[]>([])

// 图例相关状态
const visibleTypes = ref<string[]>([])

 

// 查询页面的搜索和分页逻辑
async function fetchExplorerData(): Promise<void> {
  try {
    const params: INoFlyZoneQueryParams = {
      page: explorerPage.value,
      pageSize: explorerPageSize.value,
      keyword: explorerKeyword.value,
      type: explorerType.value
    }
    console.debug('[NFZ] fetchExplorerData params:', params)
    const response = await $getNoFlyZoneList(params)
    console.debug('[NFZ] fetchExplorerData -> total=', response.total, 'items length:', response.items.length)
    explorerItems.value = response.items
    explorerTotal.value = response.total
  } catch (error) {
    console.error('[NFZ] fetchExplorerData error:', error)
    ElMessage.error('获取查询数据失败')
  }
}

let viewer: any | null = null
let drawing: any = null

const onEvtDraw = () => { drawing?.enterDraw() }
const onEvtSave = () => { const geo = drawing?.save(); if (!geo) { ElMessage.warning('请先绘制完成，双击结束'); return } handleCreate(geo as GeoJsonPolygonType) }
const onEvtRepaint = () => { drawing?.enterDraw() }
const onEvtFinished = (e: any) => { const geo = e?.detail?.geometry || null; if (geo) { handleCreate(geo) } }
const onEvtCancel = () => { if (drawing) drawing.cancel(); showForm.value = false }
const onZoneClick = (e: any) => { const { id, name, type, description, color } = e.detail || {}; if (id) { selectedZone.value = { id, name, type, description, color }; showZoneInfo.value = true } }
const onEditStarted = (e: any) => { console.debug('[NFZ] Edit started for entity:', e.detail?.entityId); ElMessage.info('编辑模式：拖拽黄色边界点调整形状，右键或ESC取消') }
const onEditCancelled = () => { console.debug('[NFZ] Edit cancelled'); ElMessage.info('已退出编辑模式') }
const onEditSelectionStarted = () => { console.debug('[NFZ] Edit selection started'); ElMessage.info('编辑模式已开启：点击地图上的禁飞区开始编辑边界') }
const onArcDrawStarted = () => { console.debug('[NFZ] Arc draw started'); ElMessage.info('开始绘制圆弧区域：请点击中心点') }
const onArcStep = (e: any) => { console.debug('[NFZ] Arc step:', e.detail?.message); ElMessage.info(e.detail?.message || '') }
const onEditFinished = async (e: any) => {
  console.debug('[NFZ] Edit finished for entity:', e.detail?.entityId);
  
  // 获取编辑的禁飞区ID和新的几何形状
  const entityId = e.detail?.entityId;
  const newGeometry = e.detail?.geometry;
  
  if (!entityId || !newGeometry) {
    console.error('[NFZ] Missing entity ID or geometry in edit finished event');
    ElMessage.error('保存编辑失败：缺少必要数据');
    return;
  }
  
  try {
    // 先从服务器获取完整的禁飞区信息（因为当前页可能不包含这个禁飞区）
    console.debug('[NFZ] Fetching zone details from server for ID:', entityId);
    const existingZone = await $getNoFlyZoneList({ page: 1, pageSize: 1000, keyword: '' });
    const foundZone = existingZone.items.find((z: INoFlyZone) => z.id === entityId);
    
    if (!foundZone) {
      console.error('[NFZ] Cannot find zone with ID:', entityId);
      ElMessage.error('保存编辑失败：找不到禁飞区');
      return;
    }
    
    // 更新几何形状并保存到服务器
    const updatedZone: INoFlyZone = {
      ...foundZone,
      geometry: newGeometry
    };
    
    console.debug('[NFZ] Updating zone with new geometry:', updatedZone);
    const savedZone = await $updateNoFlyZone(entityId, updatedZone);
    console.debug('[NFZ] Zone updated successfully:', savedZone);
    
    ElMessage.success('编辑已保存');
    
    // 刷新数据以反映更改
    await fetchData();
  } catch (error) {
    console.error('[NFZ] Failed to save edit:', error);
    ElMessage.error('保存编辑失败: ' + (error as Error).message);
  }
}

// 调试功能
const debugReinitialize = () => {
  console.log('[NFZ] 重新加载数据')
  fetchData()
  ElMessage.success('数据已重新加载')
}

const debugClearData = () => {
  console.log('[NFZ] 注意：真实API不支持清除所有数据功能')
  ElMessage.warning('真实API不支持清除所有数据功能')
}

// 暴露调试函数到全局，方便在浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugNFZ = {
    reinitialize: debugReinitialize,
    clearData: debugClearData,
    fetchData: fetchData
  }
}
onMounted(async () => {
  console.debug('[NFZ] NoFlyZoneManagement onMounted: fetching list')
  console.debug('[NFZ] 页面容器:', document.querySelector('.no-fly-zone-management'))

  // 初始化可见类型（默认所有类型都可见）
  visibleTypes.value = [
    '机场周边',
    '军事禁区与军事管理区',
    '党政机关',
    '重要基础设施',
    '其他敏感区域',
    '国界线、边境线'
  ]

  // 使用全局Cesium实例
  viewer = getViewer()
  if (!viewer) {
    console.error('[NFZ] 全局Cesium实例未找到，等待初始化...')
    // 等待一段时间后重试
    setTimeout(async () => {
      viewer = getViewer()
      if (viewer) {
        await initializeDrawing()
      } else {
        console.error('[NFZ] 无法获取全局Cesium实例')
      }
    }, 1000)
    return
  }

  console.debug('[NFZ] 使用全局Cesium实例')
  await initializeDrawing()
})

async function initializeDrawing() {
  if (!viewer) return

  console.debug('[NFZ] Creating drawing instance')
  drawing = createNoFlyZoneDrawing(viewer)
  if (drawing?.setupInteraction) drawing.setupInteraction()

  // 确保地图交互正常
  if (viewer?.scene?.screenSpaceCameraController) {
    viewer.scene.screenSpaceCameraController.enableInputs = true
    viewer.scene.screenSpaceCameraController.enableRotate = true
    viewer.scene.screenSpaceCameraController.enableTranslate = true
    viewer.scene.screenSpaceCameraController.enableZoom = true
    console.debug('[NFZ] 地图交互已确保启用')
  }

  window.addEventListener('nfz:draw', onEvtDraw)
  window.addEventListener('nfz:save', onEvtSave)
  window.addEventListener('nfz:repaint', onEvtRepaint)
  window.addEventListener('nfz:draw-finished', onEvtFinished)
  window.addEventListener('nfz:cancel', onEvtCancel)
  window.addEventListener('nfz:zone-click', onZoneClick)
  window.addEventListener('nfz:edit-started', onEditStarted)
  window.addEventListener('nfz:edit-cancelled', onEditCancelled)
  window.addEventListener('nfz:edit-selection-started', onEditSelectionStarted)
  window.addEventListener('nfz:edit-finished', onEditFinished)
  window.addEventListener('nfz:arc-draw-started', onArcDrawStarted)
  window.addEventListener('nfz:arc-step', onArcStep)

  // 获取并渲染所有禁飞区数据（不仅仅是当前页面的）
  try {
    const allZonesParams: INoFlyZoneQueryParams = { page: 1, pageSize: 1000, keyword: '' }
    const allZonesResponse = await $getNoFlyZoneList(allZonesParams)
    console.debug('[NFZ] Initial load: getting all zones for rendering, total:', allZonesResponse.total)

    // 先渲染所有禁飞区
    if (drawing && allZonesResponse.items.length > 0) {
      drawing.renderZones(allZonesResponse.items)
      console.debug('[NFZ] Initial render completed with', allZonesResponse.items.length, 'zones')
    }
  } catch (error) {
    console.error('[NFZ] Initial render error:', error)
  }

  // 然后获取当前页面的数据用于列表显示
  await fetchData()
}

onUnmounted(() => {
  console.debug('[NFZ] NoFlyZoneManagement onUnmounted: cleaning up')
  window.removeEventListener('nfz:draw', onEvtDraw)
  window.removeEventListener('nfz:save', onEvtSave)
  window.removeEventListener('nfz:repaint', onEvtRepaint)
  window.removeEventListener('nfz:draw-finished', onEvtFinished)
  window.removeEventListener('nfz:cancel', onEvtCancel)
  window.removeEventListener('nfz:zone-click', onZoneClick)
  window.removeEventListener('nfz:edit-started', onEditStarted)
  window.removeEventListener('nfz:edit-cancelled', onEditCancelled)
  window.removeEventListener('nfz:edit-selection-started', onEditSelectionStarted)
  window.removeEventListener('nfz:edit-finished', onEditFinished)
  window.removeEventListener('nfz:arc-draw-started', onArcDrawStarted)
  window.removeEventListener('nfz:arc-step', onArcStep)
  if (drawing) { try { drawing.destroy() } catch {} drawing = null }
  // 注意：不销毁全局viewer，只清理禁飞区相关的实体
  if (viewer && !viewer.isDestroyed()) {
    try {
      // 只移除禁飞区相关的实体，保留其他地图内容
      const entitiesToRemove: any[] = []
      viewer.entities.values.forEach((entity: any) => {
        if (entity.id && entity.id.startsWith('nfz_')) {
          entitiesToRemove.push(entity)
        }
      })
      entitiesToRemove.forEach((entity: any) => {
        viewer.entities.remove(entity)
      })
      console.debug('[NFZ] 清理了禁飞区相关实体')
    } catch (error) {
      console.warn('[NFZ] 清理实体时出错:', error)
    }
  }
  viewer = null
})

async function fetchData(): Promise<void> {
  try {
    const params: INoFlyZoneQueryParams = { page: page.value, pageSize: pageSize.value, keyword: keyword.value, type: filterType.value }
    console.debug('[NFZ] fetchData params:', params)
    const response = await $getNoFlyZoneList(params)
    console.debug('[NFZ] fetchData -> total=', response.total, 'items length:', response.items.length)

    // 保存当前已渲染的禁飞区ID，避免被分页数据覆盖
    const currentlyRenderedIds = new Set(drawing?.getRenderedZoneIds?.() || [])
    console.debug('[NFZ] Currently rendered zone IDs:', Array.from(currentlyRenderedIds))

    zones.value = response.items
    total.value = response.total
    console.debug('[NFZ] fetchData updated zones.value:', zones.value.length, 'items, total:', total.value)

    if (drawing) {
      try {
        // 获取所有禁飞区数据用于渲染（不仅仅是当前页面的）
        const allZonesParams: INoFlyZoneQueryParams = { page: 1, pageSize: 1000, keyword: keyword.value }
        const allZonesResponse = await $getNoFlyZoneList(allZonesParams)
        console.debug('[NFZ] fetchData getting all zones for rendering, total:', allZonesResponse.total)

        // 渲染所有禁飞区，确保新创建的禁飞区也能显示
        drawing.renderZones(allZonesResponse.items)
        console.debug('[NFZ] fetchData renderZones completed with', allZonesResponse.items.length, 'zones')
      } catch (e) {
        console.error('[NFZ] fetchData renderZones error:', e)
        // 如果获取所有数据失败，至少渲染当前页面的数据
        try {
          drawing.renderZones(zones.value)
        } catch (e2) {
          console.error('[NFZ] Fallback renderZones error:', e2)
        }
      }
    } else {
      console.warn('[NFZ] fetchData: drawing instance is null, cannot render zones')
    }
  } catch (error) {
    ElMessage.error('获取禁飞区数据失败')
  }
}

function handleCreateZone(): void { console.debug('[NFZ] handleCreateZone'); drawing?.enterDraw() }
function handleCreateArc(): void { console.debug('[NFZ] handleCreateArc'); (drawing as any)?.enterDrawArc?.() }

// 功能未实现处理函数（已移除曲线面/自由面相关）
// 保存按钮已移除
function handleCancelDrawing(): void { console.debug('[NFZ] handleCancelDrawing'); if (drawing) drawing.cancel(); showForm.value = false }
function handleCreate(geometry: GeoJsonPolygonType): void {
  console.debug('[NFZ] handleCreate geometry=', geometry)

  // 确保清理所有临时绘制线条
  if (drawing) {
    drawing.cancel() // 这会调用 clearTemp() 清理临时线条
  }

  editingZone.value = {
    name: '',
    type: '',
    description: '',
    geometry,
    minAltitude: 0,
    maxAltitude: 1000,
    bufferMeters: 100,
    color: '#FF0000'
  }
  showForm.value = true
}
function handleEdit(row: INoFlyZone, geometry?: GeoJsonPolygonType): void { console.debug('[NFZ] handleEdit row=', row); editingZone.value = { ...row, geometry: geometry ?? row.geometry }; showForm.value = true; drawing?.enterEdit((row.id || '') as string) }
async function handleSubmit(data: INoFlyZone): Promise<void> {
  try {
    const minAltNum = Number((data as any).minAltitude ?? 0)
    let minAltitude = isFinite(minAltNum) ? minAltNum : 0
    const maxAltNum = Number((data as any).maxAltitude ?? (minAltitude + 1000))
    let maxAltitude = isFinite(maxAltNum) ? maxAltNum : (minAltitude + 1000)
    if (maxAltitude <= minAltitude) maxAltitude = minAltitude + 300
    const normalizedColor = (data.color || '#FF0000').toString()
    const color6 = /^#[0-9A-Fa-f]{8}$/.test(normalizedColor) ? `#${normalizedColor.slice(1, 7)}` : normalizedColor
    const payload: INoFlyZone = { ...data, minAltitude, maxAltitude, color: color6 }
    let affectedId: string | undefined
    let affectedZone: INoFlyZone | undefined
    if (payload.id) { const updated = await $updateNoFlyZone(payload.id, payload); affectedId = updated.id; affectedZone = updated }
    else { const created = await $createNoFlyZone(payload); affectedId = created.id; affectedZone = created }
    showForm.value = false
    if (affectedZone) {
      console.debug('[NFZ] handleSubmit affectedZone=', affectedZone)
      const idx = zones.value.findIndex(z => z.id === affectedZone!.id)
      if (idx >= 0) zones.value.splice(idx, 1, affectedZone)
      else zones.value.unshift(affectedZone)
      console.debug('[NFZ] Updated zones.value length:', zones.value.length)
      if (drawing) {
        try {
          console.debug('[NFZ] Calling renderZones with', zones.value.length, 'zones')
          drawing.renderZones(zones.value)
          console.debug('[NFZ] renderZones completed')
        } catch (e) {
          console.error('[NFZ] renderZones error:', e)
        }
      } else {
        console.warn('[NFZ] drawing instance is null, cannot render zones')
      }
    }
    console.debug('[NFZ] About to call fetchData, current zones length:', zones.value.length)
    // 确保获取第一页数据，因为新创建的禁飞区通常在第一页
    page.value = 1

    // 立即渲染新创建的禁飞区，确保它立即可见
    if (drawing && affectedZone) {
      try {
        console.debug('[NFZ] Immediately rendering new zone:', affectedZone.id)
        // 获取当前已渲染的所有禁飞区
        const currentRenderedIds = drawing.getRenderedZoneIds()
        const allZonesForRendering = [...zones.value]

        // 如果新禁飞区不在当前渲染列表中，确保它被包含
        if (!currentRenderedIds.includes(affectedZone.id)) {
          console.debug('[NFZ] New zone not in current render list, adding it')
          // 检查是否已存在，避免重复
          const existingIndex = allZonesForRendering.findIndex(z => z.id === affectedZone.id)
          if (existingIndex >= 0) {
            allZonesForRendering[existingIndex] = affectedZone
          } else {
            allZonesForRendering.unshift(affectedZone)
          }
        }

        drawing.renderZones(allZonesForRendering)
        console.debug('[NFZ] Immediate render completed with', allZonesForRendering.length, 'zones')
      } catch (e) {
        console.error('[NFZ] Immediate render error:', e)
      }
    }

    // 然后刷新数据列表（这会重新获取分页数据，但不会影响已渲染的禁飞区）
    fetchData()
    ElMessage.success(payload.id ? '更新成功' : '创建成功')
  } catch (error) {
    ElMessage.error('提交失败: ' + (error as Error).message)
  }
}
async function handleDelete(id: string): Promise<void> { try { await $deleteNoFlyZone(id); await fetchData(); ElMessage.success('删除成功') } catch (e) { ElMessage.error('删除失败: ' + (e as Error).message) } }
function handleLocate(id: string): void { console.debug('[NFZ] handleLocate id=', id); try { drawing?.focus(id, 1.5) } catch {} }
function handleRefresh(): void { console.debug('[NFZ] handleRefresh'); fetchData() }
function handleSearch(searchKeyword: string): void { console.debug('[NFZ] handleSearch keyword=', searchKeyword); keyword.value = searchKeyword; fetchData() }
function handleFilter(type: string): void { console.debug('[NFZ] handleFilter type=', type); filterType.value = type; fetchData() }
function handleSearchChange(params: { keyword: string; type: string }): void {
  console.debug('[NFZ] handleSearchChange params=', params);
  keyword.value = params.keyword;
  filterType.value = params.type;
  fetchData()
}
// 已移除左侧类型筛选
function handleExplorerSearch(p: { keyword: string; type: string; page: number; pageSize: number }): void {
  console.debug('[NFZ] handleExplorerSearch received:', p)
  explorerKeyword.value = p.keyword
  explorerType.value = p.type
  explorerPage.value = p.page
  explorerPageSize.value = p.pageSize
  fetchExplorerData()
}
function handleExplorerPageChange(page: number): void {
  explorerPage.value = page
  fetchExplorerData()
}
function onExpandExplorer(): void {
  showExplorer.value = true
  // 打开时重置并获取第一页数据
  explorerPage.value = 1
  explorerKeyword.value = ''
  explorerType.value = ''
  fetchExplorerData()
}
function onCloseExplorer(): void { showExplorer.value = false }
function handleEditMode(): void { console.debug('[NFZ] handleEditMode'); try { drawing?.beginEditSelection() } catch { ElMessage.info('请点击地图上的禁飞区开始编辑') } }
function handleSaveEdit(): void {
  console.debug('[NFZ] handleSaveEdit');
  if (drawing?.saveEdit()) {
    // The save operation is asynchronous and will trigger the 'nfz:edit-finished' event
    // which will show success/error messages
    console.debug('[NFZ] Edit save initiated');
  } else {
    ElMessage.warning('没有正在编辑的禁飞区')
  }
}
function handleCancel(): void {
  console.debug('[NFZ] handleCancel');
  // 确保清理所有临时绘制线条
  if (drawing) {
    drawing.cancel() // 这会调用 clearTemp() 清理临时线条
  }
  showForm.value = false
}
function handleCloseZoneInfo(): void { console.debug('[NFZ] handleCloseZoneInfo'); showZoneInfo.value = false; selectedZone.value = null }
function handleEditFromInfo(id: string): void { console.debug('[NFZ] handleEditFromInfo id=', id); const zone = zones.value.find(z => z.id === id); if (zone) { handleEdit(zone); showZoneInfo.value = false } }
async function handleDeleteFromInfo(id: string): Promise<void> { console.debug('[NFZ] handleDeleteFromInfo id=', id); if (confirm('确定要删除这个禁飞区吗？')) { await handleDelete(id); showZoneInfo.value = false } }
function handlePageChange(newPage: number): void {
  console.debug('[NFZ] handlePageChange to page:', newPage)
  page.value = newPage
  fetchData()
}

// 图例相关处理函数
function handleToggleZoneType(type: string): void {
  console.debug('[NFZ] handleToggleZoneType:', type)

  // 更新可见类型数组
  const newVisibleTypes = visibleTypes.value.includes(type)
    ? visibleTypes.value.filter(t => t !== type)
    : [...visibleTypes.value, type]

  visibleTypes.value = newVisibleTypes

  // 调用绘制工具的方法来控制特定类型的禁飞区显示
  if (drawing && drawing.toggleZoneType) {
    drawing.toggleZoneType(type)
  }
}

function handleUpdateVisibleTypes(types: string[]): void {
  console.debug('[NFZ] handleUpdateVisibleTypes:', types)
  visibleTypes.value = types

  // 调用绘制工具的方法来更新地图显示
  if (drawing && drawing.updateVisibleTypes) {
    drawing.updateVisibleTypes(types)
  }
}
</script>

<style lang="less" scoped>
.no-fly-zone-management {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none; /* 允许点击穿透到地图 */
}
.side-panel {
  position: absolute;
  left: 12px;
  top: 90px;
  width: 360px;
  height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 10px;
  z-index: 2000;
  pointer-events: auto; /* 恢复子元素的点击事件 */
}
.right-dock {
  position: absolute;
  top: 90px;
  right: 20px;
  height: calc(100vh - 200px);
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
  z-index: 2000;
}

.legend-container {
  position: absolute;
  bottom: 20px;
  right: 20px;
  pointer-events: auto;
  z-index: 2000;
}
.bottom-toolbar {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20px;
  width: 70%;
  display: flex;
  justify-content: center;
  z-index: 2000;
  pointer-events: auto; /* 恢复子元素的点击事件 */
}
.zone-info-overlay {
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
  pointer-events: auto; /* 恢复子元素的点击事件 */
}
.zone-info-modal {
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  border: 0;
  border-radius: 15px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
  animation: modalSlideIn 0.3s ease-out;
  pointer-events: auto; /* 恢复子元素的点击事件 */
}
@keyframes modalSlideIn { from { opacity: 0; transform: scale(0.8) translateY(-50px);} to { opacity: 1; transform: scale(1) translateY(0);} }
.zone-info-header { background: transparent; color: #cbefff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 255, 255, 0.3); }
.zone-info-header h3 { margin: 0; font-size: 18px; font-weight: bold; }
.close-btn { background: none; border: none; color: #000; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s; }
.close-btn:hover { background-color: rgba(0, 0, 0, 0.1); }
.zone-info-content { padding: 20px; color: #cbefff; background: rgba(0, 0, 0, 0.35); }
.info-item { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(0, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #00ffff; }
.info-item label { font-weight: bold; color: #00ffff; min-width: 80px; margin-right: 10px; }
.info-item span { flex: 1; color: #cbefff; }
.color-preview { width: 30px; height: 20px; border-radius: 4px; border: 1px solid #00ffff; display: inline-block; }
.info-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
.btn-primary, .btn-danger { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.2s; }
.btn-primary { background: linear-gradient(45deg, #00ffff, #0080ff); color: #000; }
.btn-primary:hover { background: linear-gradient(45deg, #00cccc, #0066cc); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4); }
.btn-danger { background: linear-gradient(45deg, #ff4444, #cc0000); color: white; }
.btn-danger:hover { background: linear-gradient(45deg, #cc3333, #aa0000); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255, 68, 68, 0.4); }
</style>

