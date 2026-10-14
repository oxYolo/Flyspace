<!--
 * @fileDescription: 空域管理主页
 * @author: Assistant
 * @date: 2024-09-17
 * @version: 1.0
 -->

<script setup lang="ts">
// 移除CesiumMap导入，复用首页的地图实例
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus';
import { $getAirspaceList, $deleteAirspace } from '@/api/airspace-management';
import type { AirspaceApplicationModel, AirspaceListParams } from '@/model/airspace-management';

const router = useRouter();

// 响应式数据
const loading = ref<boolean>(false);
const airspaceList = ref<AirspaceApplicationModel[]>([]);
const total = ref<number>(0);

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
      total.value = response.data.total;
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
  console.log('点击新建申请按钮');
  router.push('/airspace-management/create');
};

// 查看详情
const handleView = (record: AirspaceApplicationModel): void => {
  router.push(`/airspace-management/detail/${record.id}`);
};

// 编辑申请
const handleEdit = (record: AirspaceApplicationModel): void => {
  router.push(`/airspace-management/edit/${record.id}`);
};

// 删除申请
const handleDelete = async (record: AirspaceApplicationModel): Promise<void> => {
  console.log('=== 删除按钮被点击 ===');
  console.log('记录信息:', record);
  console.log('记录状态:', record.status);
  console.log('是否禁用:', record.status === 'APPROVED');
  
  if (record.status === 'APPROVED') {
    ElMessage.warning('已批准的申请不能删除');
    return;
  }
  
  try {
    console.log('显示确认对话框...');
    await ElMessageBox.confirm(
      `确认删除空域申请 "${record.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    console.log('用户确认删除，开始调用API');
    const response = await $deleteAirspace(record.id);
    console.log('删除API响应:', response);
    if (response.code === 200) {
      ElMessage.success('删除成功');
      fetchAirspaceList();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error);
      ElMessage.error('删除失败');
    } else {
      console.log('用户取消删除');
    }
  }
};

// 分页变化
const handlePageChange = (page: number): void => {
  pagination.value.current = page;
  fetchAirspaceList();
};

const handlePageSizeChange = (pageSize: number): void => {
  pagination.value.pageSize = pageSize;
  pagination.value.current = 1;
  fetchAirspaceList();
};

// 获取状态标签类型
const getStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'info',
    'SUBMITTED': 'warning', 
    'APPROVED': 'success',
    'REJECTED': 'danger'
  };
  return statusMap[status] || 'info';
};

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'DRAFT': '草稿',
    'SUBMITTED': '已提交',
    'APPROVED': '已批准',
    'REJECTED': '已拒绝'
  };
  return statusMap[status] || status;
};

// 获取飞行类型文本
const getFlightTypeText = (flightType: string): string => {
  const typeMap: Record<string, string> = {
    'UAV': '无人飞行',
    'MAV': '有人飞行'
  };
  return typeMap[flightType] || flightType;
};

// 获取空域类型文本
const getAirspaceTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'ANNUAL_PRIVATE': '年度私有空域',
    'TEMPORARY': '临时空域'
  };
  return typeMap[type] || type;
};

// 组件挂载时获取数据
onMounted(() => {
  fetchAirspaceList();
});
</script>

<template>
  <div class="airspace-management-page">
    <!-- 复用首页的三维地球背景，不重新创建 -->
    <!-- 列表内容 -->
    <!-- 搜索区域 -->
    <div class="search-panel">
      <el-form :model="searchParams" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchParams.keyword"
            placeholder="请输入空域名称或申请单位"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="飞行类型">
          <el-select v-model="searchParams.flightType" placeholder="请选择" clearable>
            <el-option label="无人飞行" value="UAV" />
            <el-option label="有人飞行" value="MAV" />
          </el-select>
        </el-form-item>
        <el-form-item label="空域类型">
          <el-select v-model="searchParams.type" placeholder="请选择" clearable>
            <el-option label="年度私有空域" value="ANNUAL_PRIVATE" />
            <el-option label="临时空域" value="TEMPORARY" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchParams.status" placeholder="请选择" clearable>
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已提交" value="SUBMITTED" />
            <el-option label="已批准" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作区域 -->
    <div class="action-panel">
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建申请
      </el-button>
    </div>

    <!-- 右侧工具舱：按需求回退移除，保留底部菜单 -->

    <!-- 数据表格 -->
    <div class="table-panel">
      <el-table 
        v-loading="loading" 
        :data="airspaceList"
        stripe
        border
      >
        <el-table-column prop="name" label="空域名称" min-width="220" />
        <el-table-column prop="subject" label="申请单位/个人" min-width="200" />
        <el-table-column prop="flightType" label="飞行类型" width="110">
          <template #default="{ row }">
            {{ getFlightTypeText(row.flightType) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="空域类型" width="130">
          <template #default="{ row }">
            {{ getAirspaceTypeText(row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="开始日期" width="130" />
        <el-table-column prop="endDate" label="结束日期" width="130" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="200" />
        <el-table-column label="操作" width="240">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">
              查看
            </el-button>
            <el-button 
              link 
              type="primary" 
              @click="handleEdit(row)"
              :disabled="row.status === 'APPROVED'"
            >
              编辑
            </el-button>
            <el-button 
              link 
              type="danger" 
              @click="() => handleDelete(row)"
              :disabled="row.status === 'APPROVED'"
              :title="row.status === 'APPROVED' ? '已批准的申请不能删除' : '删除申请'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-panel">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    
    <!-- 底部菜单已由上层容器统一渲染，这里不再重复渲染 -->
  </div>
</template>

<style lang="less" scoped>
.airspace-management-page {
  // 移除全屏容器样式，让背景透明
  position: absolute;
  top: 80px; // 与首页面板一致
  left: 50%;
  transform: translateX(-50%); // 居中
  width: 1600px; // 进一步增加宽度到1600px
  max-width: calc(100vw - 30px); // 减少边距到15px
  height: calc(100vh - 100px); // 与首页面板高度一致
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  display: flex;
  flex-direction: column;
  pointer-events: all;
  z-index: 100;
  padding: 0.24rem;

  .search-panel {
    background: rgba(0, 20, 40, 0.85); // 深色背景增强对比度
    border: 1px solid rgba(0, 200, 255, 0.4); // 更明显的科技蓝边框
    padding: 0.20rem;
    margin-bottom: 0.16rem;
    border-radius: 0.12rem;
    backdrop-filter: blur(20px) saturate(1.3); // 增强毛玻璃效果
    box-shadow: 
      0 4px 20px rgba(0, 150, 255, 0.15), // 外阴影
      inset 0 1px 0 rgba(255, 255, 255, 0.1); // 内阴影增强立体感

    :deep(.el-form-item) {
      margin-bottom: 0.16rem;
    }
    
    :deep(.el-form-item__label) {
      color: #ffffff !important; // 强制白色文字
      font-weight: 600; // 增粗字体
      font-size: 0.14rem;
      text-shadow: 
        0 0 6px rgba(0, 200, 255, 0.8), // 主发光
        0 1px 2px rgba(0, 0, 0, 0.8); // 阴影增强可读性
      margin-right: 0.12rem;
    }
    
    :deep(.el-input) {
      .el-input__wrapper {
        background: rgba(255, 255, 255, 0.15) !important; // 更明显的白色半透明背景
        border: 2px solid rgba(0, 200, 255, 0.5) !important; // 更粗的边框
        border-radius: 0.08rem !important;
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.3), // 外阴影
          inset 0 1px 0 rgba(255, 255, 255, 0.2); // 内阴影
        backdrop-filter: blur(10px);
        
        &:hover {
          border-color: rgba(0, 255, 255, 0.7) !important;
          box-shadow: 
            0 2px 12px rgba(0, 200, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        &.is-focus {
          border-color: rgba(0, 255, 255, 1) !important;
          box-shadow: 
            0 0 0 3px rgba(0, 255, 255, 0.2),
            0 2px 16px rgba(0, 200, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
      }
      
      .el-input__inner {
        background: transparent !important;
        border: none !important;
        color: #ffffff !important; // 强制白色文字
        font-weight: 500;
        font-size: 0.14rem;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); // 文字阴影增强可读性
        
        &::placeholder {
          color: rgba(255, 255, 255, 0.8) !important; // 更明显的占位符
          font-weight: 400;
        }
      }
    }
    
    :deep(.el-select) {
      .el-input .el-input__wrapper {
        background: rgba(255, 255, 255, 0.15) !important;
        border: 2px solid rgba(0, 200, 255, 0.5) !important;
      }
      
      .el-input__suffix {
        color: rgba(255, 255, 255, 0.9) !important;
      }
    }
    
    :deep(.el-button) {
      background: linear-gradient(135deg, rgba(0, 200, 255, 0.3), rgba(0, 150, 255, 0.4)) !important;
      border: 2px solid rgba(0, 200, 255, 0.6) !important;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 0.14rem;
      border-radius: 0.08rem;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      box-shadow: 
        0 2px 8px rgba(0, 200, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      
      &:hover {
        background: linear-gradient(135deg, rgba(0, 220, 255, 0.4), rgba(0, 180, 255, 0.5)) !important;
        border-color: rgba(0, 255, 255, 0.8) !important;
        box-shadow: 
          0 4px 16px rgba(0, 200, 255, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
      
      &.el-button--primary {
        background: linear-gradient(135deg, rgba(0, 200, 255, 0.9), rgba(0, 150, 255, 1)) !important;
        border-color: #00ccff !important;
        box-shadow: 
          0 4px 16px rgba(0, 200, 255, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, rgba(0, 220, 255, 1), rgba(0, 180, 255, 1)) !important;
          box-shadow: 
            0 6px 20px rgba(0, 200, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          transform: translateY(-3px);
        }
      }
    }
  }

  .action-panel {
    margin-bottom: 0.16rem;
    text-align: left;
    
    :deep(.el-button) {
      background: rgba(0, 180, 255, 0.15);
      border: 1px solid rgba(0, 200, 255, 0.4);
      color: #ffffff;
      font-weight: 500;
      border-radius: 0.08rem;
      backdrop-filter: blur(8px);
      text-shadow: 0 0 4px rgba(0, 200, 255, 0.4);
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(0, 200, 255, 0.25);
        border-color: rgba(0, 255, 255, 0.6);
        box-shadow: 0 0 16px rgba(0, 200, 255, 0.4);
        transform: translateY(-2px);
      }
      
      &.el-button--primary {
        background: linear-gradient(135deg, rgba(0, 200, 255, 0.8), rgba(0, 150, 255, 0.9));
        border-color: #00ccff;
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 200, 255, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, rgba(0, 220, 255, 0.9), rgba(0, 180, 255, 1));
          box-shadow: 0 6px 20px rgba(0, 200, 255, 0.4);
          transform: translateY(-3px);
        }
      }
    }
  }

  .table-panel {
    background: rgba(0, 20, 40, 0.9); // 深色背景增强对比度
    border: 1px solid rgba(0, 200, 255, 0.4); // 更明显的科技蓝边框
    padding: 0.16rem;
    border-radius: 0.12rem;
    margin-bottom: 0.16rem;
    overflow-x: auto; // 添加水平滚动条
    backdrop-filter: blur(20px) saturate(1.3); // 增强毛玻璃效果
    box-shadow: 
      0 8px 32px rgba(0, 150, 255, 0.15), // 外阴影
      inset 0 1px 0 rgba(255, 255, 255, 0.1); // 内阴影
    flex: 1; // 占满剩余空间

    :deep(.el-table) {
      background: transparent;
      border-radius: 0.08rem;
      overflow: hidden;
      min-width: 1500px; // 增加表格最小宽度
      
      .el-table__header-wrapper {
        background: rgba(0, 50, 100, 0.8); // 深蓝色表头背景
        backdrop-filter: blur(15px);
        border-radius: 0.08rem 0.08rem 0 0;
      }
      
      .el-table__header {
        background: transparent;
        
        th {
          background: rgba(0, 50, 100, 0.9) !important; // 深蓝色表头单元格背景
          border-bottom: 2px solid rgba(0, 200, 255, 0.6) !important;
          color: #ffffff !important; // 强制白色文字
          font-weight: 700 !important; // 加粗字体
          font-size: 0.14rem !important;
          text-shadow: 
            0 0 8px rgba(0, 200, 255, 0.8), // 主发光
            0 1px 3px rgba(0, 0, 0, 0.8) !important; // 阴影增强可读性
          backdrop-filter: blur(10px);
          position: relative;
          
          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(0, 200, 255, 0.1), rgba(0, 150, 255, 0.05));
            pointer-events: none;
          }
          
          .cell {
            color: #ffffff !important; // 强制白色文字
            font-weight: 700 !important;
            text-shadow: 
              0 0 8px rgba(0, 200, 255, 0.8),
              0 1px 3px rgba(0, 0, 0, 0.8) !important;
          }
        }
      }
      
      .el-table__body {
        tr {
          background: rgba(255, 255, 255, 0.08) !important; // 白色半透明背景
          backdrop-filter: blur(10px);
          
          &:nth-child(even) {
            background: rgba(255, 255, 255, 0.12) !important; // 偶数行稍深一点
          }
          
          td {
            border-bottom: 1px solid rgba(0, 200, 255, 0.2) !important;
            color: #ffffff !important;
            background: transparent !important;
            font-weight: 500;
            
            .cell {
              color: #ffffff !important; // 强制白色文字
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6) !important; // 文字阴影增强可读性
            }
          }
          
          &:hover {
            background: rgba(0, 200, 255, 0.2) !important; // 悬停时更明显的蓝色
            box-shadow: 0 2px 12px rgba(0, 200, 255, 0.3);
            
            td {
              color: #ffffff !important;
              
              .cell {
                color: #ffffff !important;
                text-shadow: 
                  0 0 6px rgba(0, 255, 255, 0.8),
                  0 1px 3px rgba(0, 0, 0, 0.8) !important;
              }
            }
          }
        }
      }
      
      .el-tag {
        backdrop-filter: blur(8px);
        border-radius: 0.06rem;
        font-weight: 600;
        font-size: 0.12rem;
        padding: 0.04rem 0.08rem;
        border-width: 2px;
        
        &.el-tag--success {
          background: linear-gradient(135deg, rgba(0, 255, 150, 0.4), rgba(0, 200, 100, 0.3)) !important;
          border: 2px solid rgba(0, 255, 150, 0.8) !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 12px rgba(0, 255, 150, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        &.el-tag--warning {
          background: linear-gradient(135deg, rgba(255, 200, 0, 0.4), rgba(255, 150, 0, 0.3)) !important;
          border: 2px solid rgba(255, 200, 0, 0.8) !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 12px rgba(255, 200, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        &.el-tag--danger {
          background: linear-gradient(135deg, rgba(255, 100, 100, 0.4), rgba(255, 50, 50, 0.3)) !important;
          border: 2px solid rgba(255, 100, 100, 0.8) !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 12px rgba(255, 100, 100, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        &.el-tag--info {
          background: linear-gradient(135deg, rgba(100, 200, 255, 0.4), rgba(50, 150, 255, 0.3)) !important;
          border: 2px solid rgba(100, 200, 255, 0.8) !important;
          color: #ffffff !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 12px rgba(100, 200, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
      }
      
      .el-button--link {
        color: #00ccff !important;
        font-weight: 600;
        text-shadow: 
          0 0 6px rgba(0, 200, 255, 0.6),
          0 1px 2px rgba(0, 0, 0, 0.6);
        
        &:hover {
          color: #66ddff !important;
          text-shadow: 
            0 0 8px rgba(102, 221, 255, 0.8),
            0 1px 2px rgba(0, 0, 0, 0.8);
        }
        
        &.is-disabled {
          color: rgba(255, 255, 255, 0.4) !important;
          text-shadow: none;
        }
      }
    }
  }

  .pagination-panel {
    text-align: right;
    padding: 0.16rem 0;
    overflow-x: auto; // 分页组件的水平滚动
    flex-shrink: 0; // 不压缩
    
    :deep(.el-pagination) {
      .el-pagination__total,
      .el-pagination__sizes,
      .el-pagination__jump {
        color: #ffffff !important;
        font-weight: 700 !important; // 加粗字体
        font-size: 0.16rem !important; // 增大字体
        text-shadow: 
          0 0 12px rgba(0, 200, 255, 1), // 强烈的蓝色发光
          0 2px 4px rgba(0, 0, 0, 0.9) !important; // 深色阴影增强可读性
      }
      
      .el-pager li {
        background: rgba(0, 20, 40, 0.85) !important; // 深色背景增强对比度
        border: 2px solid rgba(0, 200, 255, 0.6) !important; // 更明显的科技蓝边框
        color: #ffffff !important;
        font-weight: 700 !important; // 加粗字体
        font-size: 0.16rem !important; // 增大字体
        backdrop-filter: blur(12px) saturate(1.3) !important;
        border-radius: 0.08rem !important;
        text-shadow: 
          0 0 12px rgba(0, 200, 255, 1), // 强烈的蓝色发光
          0 2px 4px rgba(0, 0, 0, 0.9) !important; // 深色阴影增强可读性
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.4), // 外阴影
          inset 0 1px 0 rgba(255, 255, 255, 0.1) !important; // 内阴影
        
        &:hover {
          background: rgba(0, 200, 255, 0.4) !important;
          border-color: rgba(0, 200, 255, 1) !important;
          color: #ffffff !important;
          box-shadow: 
            0 0 20px rgba(0, 200, 255, 0.8),
            0 4px 16px rgba(0, 0, 0, 0.5) !important;
          text-shadow: 
            0 0 15px rgba(0, 200, 255, 1),
            0 2px 4px rgba(0, 0, 0, 1) !important;
        }
        
        &.is-active {
          background: rgba(0, 200, 255, 0.7) !important;
          border-color: rgba(0, 200, 255, 1) !important;
          color: #ffffff !important;
          font-weight: 800 !important;
          box-shadow: 
            0 0 25px rgba(0, 200, 255, 1),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            0 4px 16px rgba(0, 0, 0, 0.5) !important;
          text-shadow: 
            0 0 15px rgba(255, 255, 255, 0.8),
            0 2px 4px rgba(0, 0, 0, 1) !important;
        }
      }
      
      .btn-prev,
      .btn-next {
        background: rgba(0, 20, 40, 0.85) !important; // 深色背景增强对比度
        border: 2px solid rgba(0, 200, 255, 0.6) !important; // 更明显的科技蓝边框
        color: #ffffff !important;
        font-weight: 700 !important; // 加粗字体
        font-size: 0.16rem !important; // 增大字体
        backdrop-filter: blur(12px) saturate(1.3) !important;
        border-radius: 0.08rem !important;
        text-shadow: 
          0 0 12px rgba(0, 200, 255, 1), // 强烈的蓝色发光
          0 2px 4px rgba(0, 0, 0, 0.9) !important; // 深色阴影增强可读性
        box-shadow: 
          0 4px 12px rgba(0, 0, 0, 0.4), // 外阴影
          inset 0 1px 0 rgba(255, 255, 255, 0.1) !important; // 内阴影
        
        &:hover {
          background: rgba(0, 200, 255, 0.4) !important;
          border-color: rgba(0, 200, 255, 1) !important;
          color: #ffffff !important;
          box-shadow: 
            0 0 20px rgba(0, 200, 255, 0.8),
            0 4px 16px rgba(0, 0, 0, 0.5) !important;
          text-shadow: 
            0 0 15px rgba(0, 200, 255, 1),
            0 2px 4px rgba(0, 0, 0, 1) !important;
        }
        
        &:disabled {
          background: rgba(100, 100, 100, 0.5) !important;
          border-color: rgba(100, 100, 100, 0.7) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          cursor: not-allowed !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 1700px) {
  .airspace-management-page {
    width: calc(100vw - 30px); // 小屏幕时占满宽度减去边距
    max-width: none;
  }
}

@media (max-width: 1200px) {
  .airspace-management-page {
    width: calc(100vw - 20px); // 更小屏幕时减少边距
    padding: 0.16rem;
    
    .table-panel {
      :deep(.el-table) {
        min-width: 1300px; // 小屏幕时减小最小宽度
      }
    }
  }
}

@media (max-width: 768px) {
  .airspace-management-page {
    width: calc(100vw - 10px); // 移动端最小边距
    padding: 0.12rem;
    top: 60px;
    height: calc(100vh - 80px);
    
    .search-panel {
      :deep(.el-form) {
        .el-form-item {
          margin-bottom: 0.12rem;
          
          .el-form-item__label {
            width: auto !important;
            margin-right: 0.08rem;
          }
        }
      }
    }
    
    .table-panel {
      :deep(.el-table) {
        min-width: 1100px; // 移动端进一步减小最小宽度
      }
    }
    
    .pagination-panel {
      text-align: center;
      
      :deep(.el-pagination) {
        justify-content: center;
      }
    }
  }
}
</style>
