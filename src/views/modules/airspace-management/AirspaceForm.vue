<!--
 * @fileDescription: 空域申请表单页面
 * @author: Assistant
 * @date: 2024-09-17
 * @version: 1.0
 -->

<script setup lang="ts">
// 移除CesiumMap导入，复用首页的地图实例
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, UploadUserFile, UploadProps } from 'element-plus';
import dayjs from 'dayjs';
import { 
  $createAirspace, 
  $updateAirspace, 
  $getAirspaceDetail, 
  $saveDraft, 
  $updateDraft,
  $submitAirspace,
  $uploadFile 
} from '@/api/airspace-management';
import type { 
  AirspaceApplicationRequestModel,
  AirspaceApplicationModel,
  AirspaceFormRules,
  FileUploadModel,
  FlightType,
  FlightMode,
  AirspaceType
} from '@/model/airspace-management';
import {
  FLIGHT_TYPE_OPTIONS,
  FLIGHT_MODE_OPTIONS,
  AIRSPACE_TYPE_OPTIONS
} from '@/model/airspace-management';
// 底部菜单由容器组件统一渲染

const router = useRouter();
const route = useRoute();

// （移除本页内的底部菜单逻辑）

// 页面状态
const loading = ref<boolean>(false);
const submitting = ref<boolean>(false);
const isEdit = computed(() => route.name === 'AirspaceEdit');
const isView = computed(() => route.name === 'AirspaceDetail');
const airspaceId = computed(() => route.params.id as string);

// 组件挂载状态
const isMounted = ref<boolean>(false);

// 表单引用
const formRef = ref<FormInstance>();

// 表单数据
const formData = reactive<AirspaceApplicationRequestModel>({
  // 申请单位信息
  applicantUnit: '',
  contactPerson: '',
  contactPhone: '',
  
  // 基本信息
  flightType: 'UAV' as FlightType,
  subject: '',
  name: '',
  flightMode: 'VLOS' as FlightMode,
  
  // 空域与时间
  type: 'TEMPORARY' as AirspaceType,
  purpose: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  altitude: { min: 0, max: 120 },
  coordinates: [],
  
  // 航点信息
  adep: '',
  ades: '',
  alnap: '',
  
  // 补充说明与附件
  memo: '',
  proc: '',
  files: [],
  remarks: ''
});

// 文件列表
const fileList = ref<UploadUserFile[]>([]);

// 表单验证规则
const formRules: AirspaceFormRules = {
  flightType: [
    { required: true, message: '请选择飞行类型', trigger: 'change' }
  ],
  subject: [
    { required: true, message: '请输入申请单位/个人', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入空域名称', trigger: 'blur' }
  ],
  flightMode: [
    { required: true, message: '请选择飞行模式', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择空域类型', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择每日开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择每日结束时间', trigger: 'change' }
  ],
  adep: [
    { required: true, message: '请输入起飞场地名称', trigger: 'blur' }
  ],
  ades: [
    { required: true, message: '请输入降落场地名称', trigger: 'blur' }
  ],
  proc: [
    { required: true, message: '请输入应急处置程序', trigger: 'blur' }
  ],
  files: [
    { required: true, message: '请上传相关附件', trigger: 'change' }
  ]
};

// 日期验证
const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000;
};

// 结束日期验证
const disabledEndDate = (time: Date) => {
  if (!formData.startDate) return false;
  const startTime = new Date(formData.startDate).getTime();
  return time.getTime() < startTime;
};

// 文件上传前检查
const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isValidType = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.google-earth.kml+xml',
    'application/vnd.google-earth.kmz',
    'image/jpeg',
    'image/png'
  ].includes(file.type);
  
  if (!isValidType) {
    ElMessage.error('仅支持上传 PDF、DOCX、KML、KMZ、JPG、PNG 格式的文件');
    return false;
  }
  
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    ElMessage.error('上传文件大小不能超过 10MB');
    return false;
  }
  
  return true;
};

// 文件上传成功
const handleUploadSuccess = (response: any, uploadFile: UploadUserFile) => {
  if (response.code === 200) {
    formData.files.push(response.data.url);
    ElMessage.success('文件上传成功');
  } else {
    ElMessage.error(response.message || '文件上传失败');
    // 移除失败的文件
    const index = fileList.value.findIndex(item => item.uid === uploadFile.uid);
    if (index > -1) {
      fileList.value.splice(index, 1);
    }
  }
};

// 文件上传失败
const handleUploadError = () => {
  ElMessage.error('文件上传失败，请重试');
};

// 移除文件
const handleRemoveFile = (uploadFile: UploadUserFile) => {
  const index = fileList.value.findIndex(item => item.uid === uploadFile.uid);
  if (index > -1) {
    fileList.value.splice(index, 1);
    formData.files.splice(index, 1);
  }
};

// 解析日期时间函数
const parseDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) {
    console.debug('[日期解析] 空字符串');
    return { date: '', time: '' };
  }
  
  try {
    console.debug('[日期解析] 输入:', dateTimeStr);
    
    // 处理 ISO 8601 格式: 2025-10-06T16:00:00.000Z 或 2025-10-06T16:00:00
    let date: Date;
    
    // 如果已经是 YYYY-MM-DD 格式（只有日期）
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeStr)) {
      console.debug('[日期解析] 纯日期格式');
      return { date: dateTimeStr, time: '' };
    }
    
    // 如果是 HH:mm 格式（只有时间）
    if (/^\d{2}:\d{2}$/.test(dateTimeStr)) {
      console.debug('[日期解析] 纯时间格式');
      return { date: '', time: dateTimeStr };
    }
    
    date = new Date(dateTimeStr);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.error('[日期解析] 无效日期:', dateTimeStr);
      return { date: '', time: '' };
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const result = {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
    
    console.debug('[日期解析] 输出:', result);
    return result;
  } catch (error) {
    console.error('[日期解析] 解析失败:', error, '输入:', dateTimeStr);
    return { date: '', time: '' };
  }
};

// 获取申请详情
const fetchAirspaceDetail = async () => {
  if (!airspaceId.value) return;
  if (!isMounted.value) return;
  
  loading.value = true;
  try {
    const response = await $getAirspaceDetail(airspaceId.value);
    
    // 检查组件是否仍然挂载
    if (!isMounted.value) return;
    
    if (response.code === 200) {
      const data = response.data;
      
      // 解析日期和时间
      const startDateTime = parseDateTime(data.startTime || '');
      const endDateTime = parseDateTime(data.endTime || '');
      
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
        router.back();
      }
    }
  } catch (error) {
    if (isMounted.value) {
      console.error('获取申请详情失败:', error);
      ElMessage.error('获取详情失败');
      router.back();
    }
  } finally {
    if (isMounted.value) {
      loading.value = false;
    }
  }
};

// 保存草稿
const handleSaveDraft = async () => {
  submitting.value = true;
  try {
    let response;
    if (isEdit.value && airspaceId.value) {
      response = await $updateDraft(airspaceId.value, formData);
    } else {
      response = await $saveDraft(formData);
    }
    
      if (response.code === 200) {
        ElMessage.success('草稿保存成功');
        router.push('/airspace-management/list');
      } else {
      ElMessage.error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存草稿失败:', error);
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
};

// 提交申请
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
  } catch (error) {
    ElMessage.error('请填写完整的表单信息');
    return;
  }
  
  // 时间验证
  if (formData.startTime >= formData.endTime) {
    ElMessage.error('每日结束时间必须晚于开始时间');
    return;
  }
  
  submitting.value = true;
  try {
    let response;
    if (isEdit.value && airspaceId.value) {
      // 更新现有申请
      response = await $updateAirspace(airspaceId.value, formData);
      if (response.code === 200) {
        // 如果更新成功，再提交
        await $submitAirspace(airspaceId.value);
      }
    } else {
      // 创建新申请
      response = await $createAirspace(formData);
      if (response.code === 200) {
        // 如果创建成功，再提交
        await $submitAirspace(response.data.id);
      }
    }
    
      if (response.code === 200) {
        ElMessageBox.alert('空域申请已提交至湖北省一张网审核', '提交成功', {
          confirmButtonText: '确认',
          type: 'success'
        });
        router.push('/airspace-management/list');
      } else {
      ElMessage.error(response.message || '提交失败');
    }
  } catch (error) {
    console.error('提交申请失败:', error);
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

// 返回列表
const handleBack = () => {
  console.log('执行返回操作');
  
  // 先标记组件正在卸载，阻止所有异步操作更新状态
  isMounted.value = false;
  loading.value = false;
  submitting.value = false;
  
  // 延迟一下再跳转，确保状态已清理
  setTimeout(() => {
    router.push('/airspace-management/list').catch(() => {
      // 忽略路由错误
    });
  }, 0);
};

// 确认返回
const handleConfirmBack = async () => {
  console.log('点击返回按钮');
  
  // 如果组件已经在卸载中，直接返回
  if (!isMounted.value) return;
  
  try {
    await ElMessageBox.confirm(
      '确认返回吗？未保存的数据将会丢失。',
      '确认返回',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 再次检查组件状态
    if (isMounted.value) {
      handleBack();
    }
  } catch (error) {
    console.log('用户取消返回');
    // 用户取消
  }
};

// 组件挂载时初始化数据
onMounted(() => {
  isMounted.value = true;
  if (isEdit.value || isView.value) {
    fetchAirspaceDetail();
  }
});

// 组件卸载前清理
onBeforeUnmount(() => {
  isMounted.value = false;
  // 清理 any pending operations
  loading.value = false;
  submitting.value = false;
});
</script>

<template>
  <div class="airspace-form-page">
    <!-- 复用首页的三维地球背景，不重新创建 -->
    <!-- 表单内容 -->
    <div class="form-overlay" v-loading="loading">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>
        {{ isView ? '查看空域申请' : isEdit ? '编辑空域申请' : '新建空域申请' }}
      </h2>
      <div class="header-actions">
        <el-button type="button" @click="handleBack">返回</el-button>
        <el-button 
          v-if="!isView" 
          type="default" 
          @click="handleSaveDraft"
          :loading="submitting"
        >
          保存草稿
        </el-button>
        <el-button 
          v-if="!isView" 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
        >
          提交申请
        </el-button>
      </div>
    </div>

    <!-- 表单内容 -->
    <div class="form-container">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        :disabled="isView"
        @submit.prevent
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          <div class="section-content">
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="飞行类型" prop="flightType">
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
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="飞行模式" prop="flightMode">
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
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="申请单位/个人" prop="subject">
                  <el-input 
                    v-model="formData.subject" 
                    placeholder="请输入运营商统一社会信用代码或个人证件号码"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="空域名称" prop="name">
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
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="空域类型" prop="type">
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
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="开始日期" prop="startDate">
                  <el-date-picker
                    v-model="formData.startDate"
                    type="date"
                    placeholder="请选择开始日期"
                    :disabled-date="disabledDate"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="结束日期" prop="endDate">
                  <el-date-picker
                    v-model="formData.endDate"
                    type="date"
                    placeholder="请选择结束日期"
                    :disabled-date="disabledEndDate"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="每日开始时间" prop="startTime">
                  <el-time-picker
                    v-model="formData.startTime"
                    placeholder="请选择开始时间"
                    format="HH:mm"
                    value-format="HH:mm"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="每日结束时间" prop="endTime">
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
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="起飞场地名称" prop="adep">
                  <el-input 
                    v-model="formData.adep" 
                    placeholder="如'XX物流中心楼顶'，详细坐标请在附件中说明"
                  />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="降落场地名称" prop="ades">
                  <el-input 
                    v-model="formData.ades" 
                    placeholder="如'XX科技园停机坪'，详细坐标请在附件中说明"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
                <el-form-item label="备降场地名称" prop="alnap">
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
                <el-form-item label="应急处置程序" prop="proc">
                  <el-input 
                    v-model="formData.proc" 
                    type="textarea" 
                    :rows="6"
                    :autosize="{ minRows: 4, maxRows: 8 }"
                    placeholder="简要说明通信丢失、GPS信号丢失等情况的处置流程"
                    style="width: 100%;"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="24">
                <el-form-item label="备注信息" prop="memo">
                  <el-input 
                    v-model="formData.memo" 
                    type="textarea" 
                    :rows="4"
                    :autosize="{ minRows: 3, maxRows: 6 }"
                    placeholder="可填写其他需要说明的事项"
                    style="width: 100%;"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="24">
                <el-form-item label="上传附件" prop="files">
                  <div class="upload-container">
                    <el-upload
                      v-model:file-list="fileList"
                      :action="`/api/airspace/upload`"
                      :before-upload="beforeUpload"
                      :on-success="handleUploadSuccess"
                      :on-error="handleUploadError"
                      :on-remove="handleRemoveFile"
                      multiple
                      :limit="10"
                      :disabled="isView"
                    >
                      <el-button type="primary" :disabled="isView">
                        <el-icon><Upload /></el-icon>
                        点击上传
                      </el-button>
                    </el-upload>
                    <div class="upload-tips">
                      <h4>必须上传以下文件：</h4>
                      <ul>
                        <li>
                          <strong>详细飞行计划</strong> (.pdf, .docx)：
                          <br>• 必须包含本次申请的任务性质 (如：测绘、物流、巡检等)
                          <br>• 必须包含所用航空器清单 (型号、序列号SN、实名登记号)
                          <br>• 必须包含操作员/机组信息
                        </li>
                        <li>
                          <strong>空域范围文件</strong> (.kml, .kmz, .pdf)：
                          <br>• 必须清晰定义申请空域的精确边界（多边形顶点坐标、圆形半径等）
                          <br>• 必须标明申请空域的高度范围（底部高、顶部高）
                          <br>• 推荐使用.kml或.kmz格式文件
                        </li>
                        <li>
                          <strong>相关资质证明</strong> (图片或.pdf)：
                          <br>• 操作员执照、航空器国籍登记证等
                        </li>
                      </ul>
                      <p class="file-limit">支持多文件上传，单个文件不超过10MB</p>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-form>
    </div>
    </div>

    <!-- 底部菜单由容器统一渲染，避免重复 -->
  </div>
</template>

<style lang="less" scoped>
.airspace-form-page {
  // 移除全屏容器样式，让背景透明
  position: absolute;
  top: 80px; // 与首页面板一致
  left: 50%;
  transform: translateX(-50%); // 居中
  width: 1000px; // 比首页面板稍宽
  max-width: calc(100vw - 60px); // 两侧留30px边距
  height: calc(100vh - 100px); // 与首页面板高度一致
  background: url("@/assets/images/common/边框.png") center no-repeat;
  background-size: 100% 100%;
  display: flex;
  flex-direction: column;
  pointer-events: all;
  z-index: 100;
  
  .form-overlay {
    // 表单覆盖层不再需要定位，直接填充父容器
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; // 关键：允许flex子项缩小
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0.16rem 0.24rem 0.16rem 0.24rem;
    padding: 0.16rem 0.2rem;
    background: rgba(0, 150, 255, 0.12); // 浅蓝色半透明背景
    border: 1px solid rgba(0, 200, 255, 0.3); // 科技蓝边框
    border-radius: 0.12rem;
    flex-shrink: 0;
    backdrop-filter: blur(15px) saturate(1.2); // 增强毛玻璃效果
    box-shadow: 0 4px 20px rgba(0, 150, 255, 0.15); // 科技蓝阴影

    h2 {
      margin: 0;
      color: #ffffff;
      font-size: 0.18rem;
      font-weight: 600;
      text-shadow: 0 0 8px rgba(0, 200, 255, 0.6); // 科技蓝发光
    }

    .header-actions {
      display: flex;
      gap: 0.12rem;
    }
  }

  .form-container {
    background: rgba(0, 150, 255, 0.08); // 浅蓝色半透明背景
    border: 1px solid rgba(0, 200, 255, 0.25); // 科技蓝边框
    margin: 0 0.24rem 0.24rem 0.24rem;
    padding: 0.24rem;
    border-radius: 0.12rem;
    flex: 1; // 占满剩余空间
    min-height: 0; // 关键：允许flex子项缩小
    overflow-y: auto; // 垂直滚动条
    overflow-x: hidden; // 隐藏水平滚动条
    backdrop-filter: blur(15px) saturate(1.2); // 增强毛玻璃效果
    box-shadow: 0 8px 32px rgba(0, 150, 255, 0.1); // 科技蓝阴影

    .form-section {
      margin-bottom: 0.32rem;

      &:last-child {
        margin-bottom: 0;
      }
      
      // 确保长内容区域有足够空间
      &:last-child {
        padding-bottom: 0.5rem; // 增加底部间距，确保滚动到底部有足够空间
      }

      .section-title {
        margin: 0 0 0.16rem 0;
        color: #ffffff;
        font-size: 0.16rem;
        font-weight: 600;
        padding-bottom: 0.08rem;
        border-bottom: 1px solid rgba(0, 200, 255, 0.4); // 科技蓝边框
        text-shadow: 0 0 6px rgba(0, 200, 255, 0.6); // 科技蓝发光
        background: linear-gradient(90deg, rgba(0, 200, 255, 0.1), transparent);
        padding: 0.08rem 0.12rem;
        border-radius: 0.04rem;
        margin-bottom: 0.2rem;
      }

      .section-content {
        padding-top: 0.16rem;
      }
    }

    .upload-container {
      .upload-tips {
        margin-top: 0.16rem;
        padding: 0.16rem;
        background: rgba(0, 150, 255, 0.1); // 科技蓝半透明背景
        border-radius: 0.08rem;
        border: 1px solid rgba(0, 200, 255, 0.3); // 科技蓝边框
        backdrop-filter: blur(10px); // 背景模糊

        h4 {
          margin: 0 0 0.12rem 0;
          color: #ffffff;
          font-size: 0.14rem;
          font-weight: 600;
          text-shadow: 0 0 6px rgba(0, 200, 255, 0.5);
        }

        ul {
          margin: 0;
          padding-left: 0.16rem;
          
          li {
            margin-bottom: 0.12rem;
            color: rgba(255, 255, 255, 0.95);
            font-size: 0.13rem;
            line-height: 1.5;

            strong {
              color: #ffffff;
              font-weight: 600;
              text-shadow: 0 0 4px rgba(0, 200, 255, 0.4);
            }
          }
        }

        .file-limit {
          margin: 0.12rem 0 0 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.12rem;
          font-style: italic;
        }
      }
    }

    :deep(.el-form-item__label) {
      color: #ffffff !important; // 强制白色文字
      font-weight: 600 !important; // 加粗字体
      font-size: 0.14rem !important;
      text-shadow: 
        0 0 8px rgba(0, 200, 255, 0.8), // 主发光
        0 1px 3px rgba(0, 0, 0, 0.8) !important; // 阴影增强可读性
      margin-right: 0.12rem;
    }

    :deep(.el-input) {
      .el-input__wrapper {
        background: rgba(255, 255, 255, 0.15) !important; // 白色半透明背景
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

    :deep(.el-textarea) {
      .el-textarea__inner {
        background: rgba(255, 255, 255, 0.15) !important; // 白色半透明背景
        border: 2px solid rgba(0, 200, 255, 0.5) !important; // 更粗的边框
        color: #ffffff !important; // 强制白色文字
        min-height: 80px;
        resize: vertical;
        backdrop-filter: blur(10px);
        border-radius: 0.08rem;
        font-weight: 500;
        font-size: 0.14rem;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5); // 文字阴影增强可读性
        box-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);

        &::placeholder {
          color: rgba(255, 255, 255, 0.8) !important; // 更明显的占位符
          font-weight: 400;
        }
        
        &:focus {
          border-color: rgba(0, 255, 255, 1) !important;
          box-shadow: 
            0 0 0 3px rgba(0, 255, 255, 0.2),
            0 2px 16px rgba(0, 200, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        &:hover {
          border-color: rgba(0, 255, 255, 0.7) !important;
          box-shadow: 
            0 2px 12px rgba(0, 200, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
      }
    }

    :deep(.el-select) {
      .el-input .el-input__wrapper {
        background: rgba(255, 255, 255, 0.15) !important;
        border: 2px solid rgba(0, 200, 255, 0.5) !important;
      }
      
      .el-input__inner {
        color: #ffffff !important;
        font-weight: 500;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
      
      .el-input__suffix {
        color: rgba(255, 255, 255, 0.9) !important;
      }
    }

    :deep(.el-radio-group) {
      .el-radio__label {
        color: #ffffff;
        font-weight: 500;
      }

      .el-radio__input.is-checked + .el-radio__label {
        color: #00ccff; // 科技蓝高亮
        text-shadow: 0 0 4px rgba(0, 200, 255, 0.5);
      }
      
      .el-radio__inner {
        background: rgba(0, 180, 255, 0.12);
        border: 1px solid rgba(0, 200, 255, 0.3);
        backdrop-filter: blur(5px);
      }
      
      .el-radio__input.is-checked .el-radio__inner {
        background: linear-gradient(135deg, rgba(0, 200, 255, 0.8), rgba(0, 150, 255, 0.9));
        border-color: #00ccff;
        box-shadow: 0 0 8px rgba(0, 200, 255, 0.4);
      }
    }
    
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
        transform: translateY(-1px);
      }
      
      &.el-button--primary {
        background: linear-gradient(135deg, rgba(0, 200, 255, 0.8), rgba(0, 150, 255, 0.9));
        border-color: #00ccff;
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(0, 200, 255, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, rgba(0, 220, 255, 0.9), rgba(0, 180, 255, 1));
          box-shadow: 0 6px 20px rgba(0, 200, 255, 0.4);
          transform: translateY(-2px);
        }
      }
    }
    
    :deep(.el-upload) {
      .el-button {
        background: rgba(0, 180, 255, 0.15);
        border: 1px solid rgba(0, 200, 255, 0.4);
        color: #ffffff;
        backdrop-filter: blur(8px);
        
        &:hover {
          background: rgba(0, 200, 255, 0.25);
          box-shadow: 0 0 12px rgba(0, 200, 255, 0.4);
        }
      }
    }
    
    :deep(.el-date-editor) {
      background: rgba(0, 180, 255, 0.12);
      border-radius: 0.06rem;
      
      .el-input__inner {
        background: transparent;
        color: #ffffff;
      }
    }
    
    :deep(.el-time-picker) {
      .el-input__inner {
        background: rgba(0, 180, 255, 0.12);
        border: 1px solid rgba(0, 200, 255, 0.3);
        color: #ffffff;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .airspace-form-page {
    width: calc(100vw - 60px); // 小屏幕时减少宽度但保持边距
  }
}

@media (max-width: 768px) {
  .airspace-form-page {
    width: calc(100vw - 20px); // 移动端更窄边距
    top: 60px; // 移动端减少顶部间距
    height: calc(100vh - 80px);
    
    .page-header {
      flex-direction: column;
      gap: 0.12rem;
      margin: 0.1rem 0.16rem;
      
      .header-actions {
        width: 100%;
        justify-content: center;
      }
    }
    
    .form-container {
      margin: 0 0.16rem 0.16rem 0.16rem;
      padding: 0.16rem;
      
      :deep(.el-form-item__label) {
        width: 100% !important;
        text-align: left !important;
        margin-bottom: 0.08rem;
      }
      
      :deep(.el-form-item__content) {
        margin-left: 0 !important;
      }
    }
  }
}
</style>
