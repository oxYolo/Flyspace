<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, UploadUserFile } from 'element-plus';
import { 
  Search, 
  Plus, 
  User, 
  Clock, 
  Document, 
  View, 
  Delete, 
  FolderOpened,
  Upload
} from '@element-plus/icons-vue';
import { 
  $getAirspaceList, 
  $deleteAirspace,
  $getAirspaceDetail
} from '@/api/airspace-management';
import type { 
  AirspaceApplicationModel, 
  AirspaceListParams,
  AirspaceApplicationRequestModel,
  FlightType,
  FlightMode,
  AirspaceType
} from '@/model/airspace-management';
import {
  FLIGHT_TYPE_OPTIONS,
  FLIGHT_MODE_OPTIONS,
  AIRSPACE_TYPE_OPTIONS
} from '@/model/airspace-management';
import { useAirspaceStore } from "@/views/modules/airspace-management/airspaceStore.ts";

const airspaceStore = useAirspaceStore();
const router = useRouter();

// 列表相关状态
const loading = ref<boolean>(false);
const airspaceList = ref<AirspaceApplicationModel[]>([]);
const showDetail = ref(false);
const isMounted = ref(false);

// 表单相关
const formRef = ref<FormInstance>();
const fileList = ref<UploadUserFile[]>([]);

// 搜索参数
const searchParams = ref<AirspaceListParams>({
  keyword: '',
  flightType: '',
  type: '',
  status: '',
  pageNum: 1,
  pageSize: 20
});

// 分页参数
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0
});

// 表单数据
const formData = reactive<AirspaceApplicationRequestModel>({
  applicantUnit: '',
  contactPerson: '',
  contactPhone: '',
  flightType: 'UAV' as FlightType,
  subject: '',
  name: '',
  flightMode: 'VLOS' as FlightMode,
  type: 'TEMPORARY' as AirspaceType,
  purpose: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  altitude: { min: 0, max: 120 },
  coordinates: [],
  adep: '',
  ades: '',
  alnap: '',
  memo: '',
  proc: '',
  files: [],
  remarks: ''
});

// 解析日期时间函数
const parseDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) {
    return { date: '', time: '' };
  }
  
  try {
    // 如果已经是 YYYY-MM-DD 格式（只有日期）
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeStr)) {
      return { date: dateTimeStr, time: '' };
    }
    
    // 如果是 HH:mm 格式（只有时间）
    if (/^\d{2}:\d{2}$/.test(dateTimeStr)) {
      return { date: '', time: dateTimeStr };
    }
    
    const date = new Date(dateTimeStr);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return { date: '', time: '' };
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  } catch (error) {
    return { date: '', time: '' };
  }
};

// 获取空域申请列表
const fetchAirspaceList = async (): Promise<void> => {
  loading.value = true;
  try {
    const params = {
      ...searchParams.value,
      pageNum: pagination.value.current,
      pageSize: pagination.value.pageSize
    };
    const response = await $getAirspaceList(params);
    if (response.code === 200) {
      airspaceList.value = response.data.list;
      pagination.value.total = response.data.total;
    } else {
      ElMessage.error(response.message || '获取列表失败');
    }
  } catch (error) {
    console.error('获取空域申请列表失败:', error);
    ElMessage.error('获取列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取申请详情
const fetchAirspaceDetail = async (id: string) => {
  if (!id || !isMounted.value) return;
  
  loading.value = true;
  try {
    const response = await $getAirspaceDetail(id);
    
    if (!isMounted.value) return;
    
    if (response.code === 200) {
      const data = response.data;
      console.log(data)
      
      // 解析日期和时间
      const startDateTime = parseDateTime(data.startTime || '');
      const endDateTime = parseDateTime(data.endTime || '');

      // 在fetchAirspaceDetail函数中，获取数据后添加
      if (data.coordinates && data.coordinates.length > 0) {
        const viewer = airspaceStore.cesiumViewer;
        if (viewer) {
          // 创建或获取高亮数据源
          let highlightDataSource = viewer.dataSources.getByName('airspace-highlight')?.[0];
          if (!highlightDataSource) {
            highlightDataSource = new Cesium.CustomDataSource('airspace-highlight');
            viewer.dataSources.add(highlightDataSource);
          }
          
          // 清除之前的高亮
          highlightDataSource.entities.removeAll();
          
          // 添加新的多边形实体
          highlightDataSource.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(
                data.coordinates.map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]))
              ),
              material: Cesium.Color.YELLOW.withAlpha(0.3),
              outline: true,
              outlineColor: Cesium.Color.YELLOW,
              height: data.altitude?.min || 0,
              extrudedHeight: data.altitude?.max || 120
            }
          });
          
          // 飞到该区域
          viewer.camera.flyTo({
            destination: Cesium.Rectangle.fromCartesianArray(
              data.coordinates.map(coord => Cesium.Cartesian3.fromDegrees(coord[0], coord[1]))
            )
          });
        }
      }

      
      // 填充表单数据
      Object.assign(formData, {
        applicantUnit: data.applicantUnit || '',
        contactPerson: data.contactPerson || '',
        contactPhone: data.contactPhone || '',
        flightType: data.flightType,
        subject: data.subject,
        name: data.name,
        flightMode: data.flightMode,
        type: data.type,
        purpose: data.purpose || '',
        startDate: startDateTime.date || data.startDate || '',
        endDate: endDateTime.date || data.endDate || '',
        startTime: startDateTime.time || '',
        endTime: endDateTime.time || '',
        altitude: data.altitude || { min: 0, max: 120 },
        coordinates: data.coordinates || [],
        adep: data.adep,
        ades: data.ades,
        alnap: data.alnap || '',
        memo: data.memo || '',
        proc: data.proc,
        files: data.files || [],
        remarks: data.remarks || ''
      });
      
      // 填充文件列表
      fileList.value = data.files?.map((url: string, index: number) => ({
        uid: index,
        name: url.split('/').pop() || `文件${index + 1}`,
        status: 'success' as any,
        url: url
      })) || [];
    } else {
      if (isMounted.value) {
        ElMessage.error(response.message || '获取详情失败');
      }
    }
  } catch (error) {
    if (isMounted.value) {
      console.error('获取申请详情失败:', error);
      ElMessage.error('获取详情失败');
    }
  } finally {
    if (isMounted.value) {
      loading.value = false;
    }
  }
};

// 搜索
const handleSearch = (): void => {
  pagination.value.current = 1;
  fetchAirspaceList();
};

// 重置搜索
const handleReset = (): void => {
  searchParams.value = {
    keyword: '',
    flightType: '',
    type: '',
    status: '',
    pageNum: 1,
    pageSize: 20
  };
  pagination.value.current = 1;
  fetchAirspaceList();
};

// 新建申请
const handleCreate = (): void => {
  router.push('/airspace-management/application');
};

// 查看详情
const handleView = (record: AirspaceApplicationModel): void => {
  showDetail.value = true;
  fetchAirspaceDetail(record.id);
};

// 删除申请
const handleDelete = async (record: AirspaceApplicationModel): Promise<void> => {
  try {
    await ElMessageBox.confirm('确定要删除该空域申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    
    const response = await $deleteAirspace(record.id);
    if (response.code === 200) {
      ElMessage.success('删除成功');
      fetchAirspaceList();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除空域申请失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

// 返回列表
const handleBack = () => {
  isMounted.value = false;
  loading.value = false;
  showDetail.value = false;
  
  setTimeout(() => {
    isMounted.value = true;
  }, 0);
};

// 分页变化
const handlePageChange = (page: number): void => {
  pagination.value.current = page;
  fetchAirspaceList();
};

// 页面大小变化
const handleSizeChange = (size: number): void => {
  pagination.value.pageSize = size;
  pagination.value.current = 1;
  fetchAirspaceList();
};

// 获取状态标签类型
const getStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'info',
    'PENDING': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger',
    'CANCELLED': 'info'
  };
  return statusMap[status] || 'info';
};

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': '草稿',
    'PENDING': '待审批',
    'APPROVED': '已批准',
    'REJECTED': '已拒绝',
    'CANCELLED': '已取消'
  };
  return statusMap[status] || status;
};

onMounted(() => {
  isMounted.value = true;
  fetchAirspaceList();
  
  // 清除之前的高亮显示（如果有）
  const viewer = airspaceStore.cesiumViewer;
  if (viewer) {
    const highlightDataSource = viewer.dataSources.getByName('airspace-highlight')?.[0];
    if (highlightDataSource) {
      highlightDataSource.entities.removeAll();
    }
  }
});

onBeforeUnmount(() => {
  isMounted.value = false;
  loading.value = false;
  
  // 清除高亮图层
  const viewer = airspaceStore.cesiumViewer;
  if (viewer) {
    const highlightDataSource = viewer.dataSources.getByName('airspace-highlight')?.[0];
    if (highlightDataSource) {
      highlightDataSource.entities.removeAll();
    }
  }
  
  airspaceStore.resetInfo();
});
</script>


<template>
  <div
    class="common-left animate__animated"
    :class="[
      {
        animate__fadeInLeft: airspaceStore.showLeftPanel,
        animate__fadeOutLeft: !airspaceStore.showLeftPanel,
      },
    ]">
    <!-- 列表视图 -->
    <div v-show="!showDetail" class="list-view">
      <!-- 顶部标题和操作区 -->
      <div class="panel-header">
        <div class="header-title">空域管理</div>
        <el-button 
          type="success" 
          size="small" 
          @click="handleCreate"
          style="background-color: #67C23A; border-color: #67C23A;">
          <el-icon><Plus /></el-icon>
          新建
        </el-button>
      </div>

      <!-- 搜索区域 -->
      <div class="search-section">
        <el-input
          v-model="searchParams.keyword"
          placeholder="请输入关键词搜索"
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="searchParams.flightType"
          placeholder="飞行类型"
          class="search-select"
          clearable
        >
          <el-option
            v-for="item in FLIGHT_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <el-select
          v-model="searchParams.type"
          placeholder="空域类型"
          class="search-select"
          clearable
        >
          <el-option
            v-for="item in AIRSPACE_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <el-select
          v-model="searchParams.status"
          placeholder="申请状态"
          class="search-select"
          clearable
        >
          <el-option label="草稿" value="DRAFT" />
          <el-option label="待审批" value="PENDING" />
          <el-option label="已批准" value="APPROVED" />
          <el-option label="已拒绝" value="REJECTED" />
          <el-option label="已取消" value="CANCELLED" />
        </el-select>

        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>

      <!-- 统计栏 -->
      <div class="stats-bar">
        <span class="stats-text">
          共找到 <span class="stats-number">{{ pagination.total }}</span> 条申请记录
        </span>
      </div>

      <!-- 卡片列表 -->
      <div class="card-list-container">
        <template v-if="airspaceList.length">
          <div
            v-for="item in airspaceList"
            :key="item.id"
            class="airspace-card"
            @click="handleView(item)"
          >
            <div class="card-header">
              <div class="card-title">{{ item.name }}</div>
              <el-tag :type="getStatusType(item.status)" size="small">
                {{ getStatusText(item.status) }}
              </el-tag>
            </div>
            <div class="card-body">
              <div class="card-info-row">
                <el-icon class="info-icon"><User /></el-icon>
                <span class="info-label">申请人：</span>
                <span class="info-value text-ellipsis">{{ item.subject }}</span>
              </div>
              <div class="card-info-row">
                <el-icon class="info-icon"><Clock /></el-icon>
                <span class="info-label">时间：</span>
                <span class="info-value">{{ item.startDate }} 至 {{ item.endDate }}</span>
              </div>
              <div class="card-info-row">
                <el-icon class="info-icon"><Document /></el-icon>
                <span class="info-label">类型：</span>
                <span class="info-value">{{ item.type }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button type="primary" size="small" @click.stop="handleView(item)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button type="danger" size="small" @click.stop="handleDelete(item)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
        </template>
        <div v-else class="empty-state">
          <el-icon class="empty-icon"><FolderOpened /></el-icon>
          <div class="empty-text">暂无申请记录</div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 详情视图 -->
    <div v-show="showDetail" class="airspace-form-page">
      <div class="form-overlay" v-loading="loading">
        <!-- 页面标题 -->
        <div class="page-header">
          <h2>查看空域申请</h2>
          <div class="header-actions">
            <el-button type="button" @click="handleBack">返回</el-button>
          </div>
        </div>

        <!-- 表单内容 -->
        <div class="form-container">
          <el-form
            ref="formRef"
            :model="formData"
            label-width="140px"
            disabled
          >
            <!-- 基本信息 -->
            <div class="form-section">
              <h3 class="section-title">基本信息</h3>
              <div class="section-content">
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                    <el-form-item label="飞行类型">
                      <el-radio-group v-model="formData.flightType">
                        <el-radio 
                          v-for="option in FLIGHT_TYPE_OPTIONS" 
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </el-radio>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="飞行模式">
                      <el-select v-model="formData.flightMode" placeholder="请选择飞行模式">
                        <el-option 
                          v-for="option in FLIGHT_MODE_OPTIONS" 
                          :key="option.value"
                          :label="option.label" 
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="申请单位/个人">
                      <el-input 
                        v-model="formData.subject" 
                        placeholder="请输入运营商统一社会信用代码或个人证件号码"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="空域名称">
                      <el-input 
                        v-model="formData.name" 
                        placeholder="请为本次空域申请命名，如'XX区物流配送空域'"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </div>

            <!-- 空域与时间 -->
            <div class="form-section">
              <h3 class="section-title">空域与时间</h3>
              <div class="section-content">
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="空域类型">
                      <el-select v-model="formData.type" placeholder="请选择空域类型">
                        <el-option 
                          v-for="option in AIRSPACE_TYPE_OPTIONS" 
                          :key="option.value"
                          :label="option.label" 
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="开始日期">
                      <el-date-picker
                        v-model="formData.startDate"
                        type="date"
                        placeholder="请选择开始日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="结束日期">
                      <el-date-picker
                        v-model="formData.endDate"
                        type="date"
                        placeholder="请选择结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="每日开始时间">
                      <el-time-picker
                        v-model="formData.startTime"
                        placeholder="请选择开始时间"
                        format="HH:mm"
                        value-format="HH:mm"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="每日结束时间">
                      <el-time-picker
                        v-model="formData.endTime"
                        placeholder="请选择结束时间"
                        format="HH:mm"
                        value-format="HH:mm"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </div>

            <!-- 航点信息 -->
            <div class="form-section">
              <h3 class="section-title">航点信息</h3>
              <div class="section-content">
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="起飞场地名称">
                      <el-input 
                        v-model="formData.adep" 
                        placeholder="如'XX物流中心楼顶'，详细坐标请在附件中说明"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="降落场地名称">
                      <el-input 
                        v-model="formData.ades" 
                        placeholder="如'XX科技园停机坪'，详细坐标请在附件中说明"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
                    <el-form-item label="备降场地名称">
                      <el-input 
                        v-model="formData.alnap" 
                        placeholder="详细坐标请在附件中说明"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </div>

            <!-- 补充说明与附件 -->
            <div class="form-section">
              <h3 class="section-title">补充说明与附件</h3>
              <div class="section-content">
                <el-row :gutter="20">
                  <el-col :span="24">
                    <el-form-item label="应急处置程序">
                      <el-input 
                        v-model="formData.proc" 
                        type="textarea" 
                        :rows="6"
                        placeholder="简要说明通信丢失、GPS信号丢失等情况的处置流程"
                        style="width: 100%;"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="24">
                    <el-form-item label="备注信息">
                      <el-input 
                        v-model="formData.memo" 
                        type="textarea" 
                        :rows="4"
                        placeholder="可填写其他需要说明的事项"
                        style="width: 100%;"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="24">
                    <el-form-item label="上传附件">
                      <div class="upload-container">
                        <el-upload
                          v-model:file-list="fileList"
                          :action="`/api/airspace/upload`"
                          disabled
                        >
                          <el-button type="primary" disabled>
                            <el-icon><Upload /></el-icon>
                            点击上传
                          </el-button>
                        </el-upload>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped lang="less">
// 列表视图
.list-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  overflow: hidden;
}

// 面板头部
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .header-title {
    color: #fff;
    font-size: 18px;
    font-weight: bold;
  }
}

// 搜索区域
.search-section {
  width: 100%;
  margin-bottom: 15px;
  
  .search-input {
    margin-bottom: 10px;
    
    :deep(.el-input__wrapper) {
      background-color: #2a2a2a;
      box-shadow: 0 0 0 1px #444 inset;
      
      .el-input__inner {
        color: #fff;
        
        &::placeholder {
          color: #999;
        }
      }
    }
  }
  
  .search-select {
    width: 100%;
    margin-bottom: 10px;
    
    :deep(.el-input__wrapper) {
      background-color: #2a2a2a;
      box-shadow: 0 0 0 1px #444 inset;
      
      .el-input__inner {
        color: #fff;
      }
    }
  }
  
  .search-actions {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    
    .el-button {
      flex: 1;
    }
  }
}

// 统计栏
.stats-bar {
  width: 100%;
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(45, 140, 240, 0.15), transparent);
  border-left: 3px solid #2d8cf0;
  margin-bottom: 15px;
  border-radius: 2px;
  
  .stats-text {
    color: #ccc;
    font-size: 13px;
  }
  
  .stats-number {
    color: #2d8cf0;
    font-weight: bold;
    font-size: 16px;
    padding: 0 4px;
  }
}

// 卡片列表容器
.card-list-container {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding-right: 5px;
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

// 空域卡片
.airspace-card {
  background: linear-gradient(135deg, rgba(40, 40, 40, 0.9), rgba(30, 30, 30, 0.9));
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, #2d8cf0, #409eff);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: #2d8cf0;
    box-shadow: 0 4px 12px rgba(45, 140, 240, 0.2);
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    .card-title {
      font-size: 15px;
      font-weight: bold;
      color: #fff;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 10px;
    }
    
    .status-tag {
      flex-shrink: 0;
    }
  }
  
  .card-body {
    margin-bottom: 10px;
    
    .card-info-row {
      display: flex;
      align-items: center;
      font-size: 13px;
      color: #bbb;
      margin-bottom: 6px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .info-icon {
        color: #2d8cf0;
        margin-right: 6px;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .info-label {
        color: #999;
        margin-right: 4px;
        flex-shrink: 0;
      }
      
      .info-value {
        color: #ccc;
        flex: 1;
        
        &.text-ellipsis {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
  
  .card-footer {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 15px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    
    .el-button {
      font-size: 12px;
      
      .el-icon {
        margin-right: 3px;
      }
    }
  }
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  
  .empty-icon {
    font-size: 64px;
    color: #444;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 14px;
    color: #999;
    margin-bottom: 20px;
  }
}

// 分页容器
.pagination-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 15px;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

// 详情视图

.airspace-form-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(0, 150, 255, 0.08);
  
  .form-overlay {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.16rem 0.24rem;
    padding: 0.16rem 0.2rem;
    background: rgba(0, 150, 255, 0.12);
    border: 1px solid rgba(0, 200, 255, 0.3);
    border-radius: 0.12rem;
    flex-shrink: 0;

    h2 {
      margin: 0;
      color: #ffffff;
      font-size: 0.18rem;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 0.12rem;
    }
  }

  .form-container {
    flex: 1;
    margin: 0 0.24rem 0.24rem;
    padding: 0.24rem;
    background: rgba(0, 150, 255, 0.08);
    border: 1px solid rgba(0, 200, 255, 0.25);
    border-radius: 0.12rem;
    overflow-y: auto;

    .form-section {
      margin-bottom: 0.32rem;

      .section-title {
        margin: 0 0 0.16rem;
        color: #ffffff;
        font-size: 0.16rem;
        font-weight: 600;
        padding-bottom: 0.08rem;
        border-bottom: 1px solid rgba(0, 200, 255, 0.4);
      }

      .section-content {
        padding-top: 0.16rem;
      }
    }

    :deep(.el-form) {
      .el-row {
        display: flex;
        flex-direction: column;
        gap: 0.16rem;
      }

      .el-col {
        width: 100%;
      }

      .el-form-item {
        margin-bottom: 0.24rem;
        display: flex;
        flex-direction: column;

        &__label {
          color: #ffffff;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 0.08rem;
          width: 100% !important;
          text-align: left;
          padding: 0 !important; // 移除默认padding
          justify-content: flex-start;  // 添加这行
        }

        &__content {
          width: 100%;
          flex: 1;
        }
      }

      // 输入框样式
      .el-input,
      .el-select,
      .el-date-editor {
        width: 100% !important;
      }

      .el-input__wrapper {
        background-color: #2a2a2a;
        box-shadow: 0 0 0 1px #444 inset;
        
        .el-input__inner {
          color: #fff;
        }
      }

      .el-textarea__inner {
        background-color: #2a2a2a;
        border-color: #444;
        color: #fff;
        width: 100% !important;
      }

      .el-select {
        width: 100%;
      }

      .el-select .el-input__wrapper {
        background-color: #2a2a2a;
      }

      .el-date-editor {
               width: 100%;
        background-color: #2a2a2a;
      }

      .el-radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.12rem;
      }

      .el-radio {
        margin-right: 0;
        margin-bottom: 0.12rem;
      }
    }
  }
}



// Element Plus 组件样式覆盖
:deep(.el-pagination) {
  --el-pagination-bg-color: #2a2a2a;
  --el-pagination-text-color: #ccc;
  --el-pagination-hover-color: #2d8cf0;
  
  .btn-prev, .btn-next, .el-pager li {
    background-color: #2a2a2a;
    color: #ccc;
    border: 1px solid #444;
    
    &:hover {
      color: #2d8cf0;
      border-color: #2d8cf0;
    }
    
    &.is-active {
      background-color: #2d8cf0;
      color: #fff;
      border-color: #2d8cf0;
    }
    
    &:disabled {
      background-color: #1a1a1a;
      color: #555;
      border-color: #333;
    }
  }
  
  .el-pagination__total {
    color: #999;
  }
}

:deep(.el-select-dropdown) {
  background-color: #2a2a2a;
  border-color: #444;
  
  .el-select-dropdown__item {
    color: #ccc;
    
    &:hover {
      background-color: rgba(45, 140, 240, 0.2);
    }
    
    &.is-selected {
      color: #2d8cf0;
      font-weight: bold;
    }
  }
}

:deep(.el-loading-mask) {
  background-color: rgba(0, 0, 0, 0.7);
}
</style>
