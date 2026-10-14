/**
 * @fileDescription: 空域管理模拟数据（用于演示）
 * @author: Assistant
 * @date: 2024-09-17
 * @version: 1.0
 */

import type { AirspaceApplicationModel } from '@/model/airspace-management';

// 模拟数据列表 (增加至50条数据)
export const mockAirspaceApplications: AirspaceApplicationModel[] = [
  {
    id: '1',
    applicantUnit: '赤壁物流科技有限公司',
    contactPerson: '张明',
    contactPhone: '138****1234',
    flightType: 'UAV',
    subject: '91110000MA001234567',
    name: '赤壁市物流配送空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    purpose: '用于物流配送测试',
    startDate: '2024-09-20',
    endDate: '2024-09-25',
    startTime: '2024-09-20 08:00:00',
    endTime: '2024-09-25 18:00:00',
    altitude: { min: 50, max: 120 },
    coordinates: [[113.5, 29.7], [113.6, 29.7], [113.6, 29.8], [113.5, 29.8], [113.5, 29.7]],
    adep: '赤壁物流中心楼顶',
    ades: '赤壁科技园停机坪',
    alnap: '赤壁体育场',
    memo: '用于物流配送测试',
    proc: '通信丢失时自动返回起飞点；GPS信号丢失时启用备用导航系统',
    files: ['/uploads/flight-plan-001.pdf', '/uploads/airspace-boundary-001.kml'],
    remarks: '首次配送测试',
    status: 'APPROVED',
    createTime: '2024-09-17 10:30:00',
    updateTime: '2024-09-17 14:20:00',
    createBy: 'admin',
    updateBy: 'admin'
  },
  {
    id: '2',
    applicantUnit: '赤壁农业科技合作社',
    contactPerson: '李华',
    contactPhone: '139****5678',
    flightType: 'UAV',
    subject: '91110000MA001234568',
    name: '赤壁市农业巡检空域',
    flightMode: 'VLOS',
    type: 'ANNUAL_PRIVATE',
    purpose: '用于农作物监测和病虫害防治',
    startDate: '2024-09-18',
    endDate: '2024-12-31',
    startTime: '2024-09-18 06:00:00',
    endTime: '2024-12-31 20:00:00',
    altitude: { min: 30, max: 100 },
    coordinates: [[113.4, 29.6], [113.5, 29.6], [113.5, 29.7], [113.4, 29.7], [113.4, 29.6]],
    adep: '农业合作社办公楼',
    ades: '农田作业区',
    alnap: '',
    memo: '用于农作物监测和病虫害防治',
    proc: '遇到恶劣天气立即返航；电池电量低于30%时自动返回',
    files: ['/uploads/flight-plan-002.pdf', '/uploads/airspace-boundary-002.kmz'],
    remarks: '全年农业监测项目',
    status: 'PENDING',
    createTime: '2024-09-16 09:15:00',
    updateTime: '2024-09-16 09:15:00',
    createBy: 'user001',
    updateBy: 'user001'
  },
  {
    id: '3',
    applicantUnit: '赤壁市桥梁检测研究院',
    contactPerson: '王强',
    contactPhone: '136****9012',
    flightType: 'UAV',
    subject: '420781199001010001',
    name: '赤壁长江大桥检测空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    purpose: '用于桥梁结构安全检测',
    startDate: '2024-09-22',
    endDate: '2024-09-24',
    startTime: '2024-09-22 07:00:00',
    endTime: '2024-09-24 17:00:00',
    altitude: { min: 20, max: 80 },
    coordinates: [[113.55, 29.75], [113.58, 29.75], [113.58, 29.78], [113.55, 29.78], [113.55, 29.75]],
    adep: '长江大桥管理站',
    ades: '长江大桥管理站',
    alnap: '赤壁港码头',
    memo: '用于桥梁结构安全检测',
    proc: '遇到船舶通过时立即避让；风速超过5级时停止作业',
    files: ['/uploads/flight-plan-003.pdf'],
    remarks: '年度桥梁安全检查',
    status: 'DRAFT',
    createTime: '2024-09-17 16:45:00',
    updateTime: '2024-09-17 16:45:00',
    createBy: 'user002',
    updateBy: 'user002'
  },
  {
    id: '4',
    flightType: 'MAV',
    subject: '91110000MA001234569',
    name: '赤壁市应急救援空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    startTime: '00:00',
    endTime: '23:59',
    adep: '赤壁市应急救援中心',
    ades: '各应急降落点',
    alnap: '赤壁人民医院停机坪',
    memo: '用于紧急医疗救援和灾害应急响应',
    proc: '优先级最高，其他航行器需避让；严格按照应急飞行程序执行',
    files: ['/uploads/emergency-plan.pdf', '/uploads/emergency-airspace.kml'],
    status: 'APPROVED',
    createTime: '2024-08-25 14:00:00',
    updateTime: '2024-08-30 11:30:00',
    createBy: 'emergency',
    updateBy: 'admin'
  },
  {
    id: '5',
    flightType: 'UAV',
    subject: '91110000MA001234570',
    name: '赤壁市环保监测空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-25',
    endDate: '2024-09-30',
    startTime: '09:00',
    endTime: '16:00',
    adep: '环保局监测站',
    ades: '陆水湖监测点',
    alnap: '',
    memo: '用于水质监测和环境污染排查',
    proc: '发现异常污染源时立即上报；设备故障时就近降落',
    files: ['/uploads/env-monitoring-plan.pdf'],
    status: 'REJECTED',
    createTime: '2024-09-15 13:20:00',
    updateTime: '2024-09-16 10:45:00',
    createBy: 'env001',
    updateBy: 'admin'
  },
  {
    id: '6',
    flightType: 'UAV',
    subject: '91110000MA001234571',
    name: '赤壁古战场旅游航拍空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-10-01',
    endDate: '2024-10-07',
    startTime: '08:30',
    endTime: '17:30',
    adep: '赤壁古战场游客服务中心',
    ades: '赤壁古战场游客服务中心',
    alnap: '赤壁古战场停车场',
    memo: '国庆黄金周旅游宣传片拍摄',
    proc: '游客密集时段禁止飞行；遇到文物保护区立即避让',
    files: ['/uploads/tourism-flight-plan.pdf', '/uploads/tourism-airspace.kmz'],
    status: 'SUBMITTED',
    createTime: '2024-09-18 14:30:00',
    updateTime: '2024-09-18 14:30:00',
    createBy: 'tourism001',
    updateBy: 'tourism001'
  },
  {
    id: '7',
    flightType: 'MAV',
    subject: '91110000MA001234572',
    name: '赤壁市消防演练空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-28',
    endDate: '2024-09-28',
    startTime: '14:00',
    endTime: '17:00',
    adep: '赤壁市消防支队',
    ades: '模拟火场演练区',
    alnap: '赤壁市体育中心',
    memo: '大型消防综合演练，涉及高层建筑救援',
    proc: '演练区域全面管制；紧急情况下可强制降落',
    files: ['/uploads/fire-drill-plan.pdf', '/uploads/fire-drill-airspace.kml'],
    status: 'APPROVED',
    createTime: '2024-09-20 09:00:00',
    updateTime: '2024-09-21 16:15:00',
    createBy: 'fire001',
    updateBy: 'admin'
  },
  {
    id: '8',
    flightType: 'UAV',
    subject: '91110000MA001234573',
    name: '赤壁电网巡检空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    startTime: '07:00',
    endTime: '19:00',
    adep: '赤壁供电局',
    ades: '各变电站点',
    alnap: '赤壁工业园区变电站',
    memo: '电力线路日常巡检和设备维护',
    proc: '遇到恶劣天气停止作业；发现线路异常立即上报',
    files: ['/uploads/power-inspection-plan.pdf', '/uploads/power-grid-airspace.kmz'],
    status: 'APPROVED',
    createTime: '2024-08-28 11:00:00',
    updateTime: '2024-08-30 15:30:00',
    createBy: 'power001',
    updateBy: 'admin'
  },
  {
    id: '9',
    flightType: 'UAV',
    subject: '420781199002020002',
    name: '赤壁长江水文科研空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-10-15',
    endDate: '2024-10-20',
    startTime: '10:00',
    endTime: '15:00',
    adep: '长江水文监测站',
    ades: '长江采样点群',
    alnap: '陆水河汇入口',
    memo: '长江水质变化科学研究项目',
    proc: '避开船舶航道；采样设备故障时立即返航',
    files: ['/uploads/research-plan.pdf'],
    status: 'DRAFT',
    createTime: '2024-09-19 08:45:00',
    updateTime: '2024-09-19 08:45:00',
    createBy: 'research001',
    updateBy: 'research001'
  },
  {
    id: '10',
    flightType: 'UAV',
    subject: '91110000MA001234574',
    name: '赤壁新区快递配送空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-10-01',
    endDate: '2025-09-30',
    startTime: '08:00',
    endTime: '20:00',
    adep: '赤壁新区配送中心',
    ades: '新区各小区投递点',
    alnap: '赤壁新区商业广场',
    memo: '新区智能快递配送试点项目',
    proc: '居民区上空限高50米；学校时段禁飞',
    files: ['/uploads/delivery-plan.pdf', '/uploads/delivery-routes.kml', '/uploads/safety-protocol.pdf'],
    status: 'REJECTED',
    createTime: '2024-09-12 16:20:00',
    updateTime: '2024-09-14 09:30:00',
    createBy: 'delivery001',
    updateBy: 'admin'
  },
  {
    id: '11',
    flightType: 'UAV',
    subject: '91110000MA001234567',
    name: '赤壁市物流配送空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-20',
    endDate: '2024-09-25',
    startTime: '08:00',
    endTime: '18:00',
    adep: '赤壁物流中心楼顶',
    ades: '赤壁科技园停机坪',
    alnap: '赤壁体育场',
    memo: '用于物流配送测试',
    proc: '通信丢失时自动返回起飞点；GPS信号丢失时启用备用导航系统',
    files: ['/uploads/flight-plan-001.pdf', '/uploads/airspace-boundary-001.kml'],
    status: 'APPROVED',
    createTime: '2024-09-17 10:30:00',
    updateTime: '2024-09-17 14:20:00',
    createBy: 'admin',
    updateBy: 'admin'
  },
  {
    id: '12',
    flightType: 'UAV',
    subject: '91110000MA001234568',
    name: '赤壁市农业巡检空域',
    flightMode: 'VLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-09-18',
    endDate: '2024-12-31',
    startTime: '06:00',
    endTime: '20:00',
    adep: '农业合作社办公楼',
    ades: '农田作业区',
    alnap: '',
    memo: '用于农作物监测和病虫害防治',
    proc: '遇到恶劣天气立即返航；电池电量低于30%时自动返回',
    files: ['/uploads/flight-plan-002.pdf', '/uploads/airspace-boundary-002.kmz'],
    status: 'SUBMITTED',
    createTime: '2024-09-16 09:15:00',
    updateTime: '2024-09-16 09:15:00',
    createBy: 'user001',
    updateBy: 'user001'
  },
  {
    id: '13',
    flightType: 'UAV',
    subject: '420781199001010001',
    name: '赤壁长江大桥检测空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-22',
    endDate: '2024-09-24',
    startTime: '07:00',
    endTime: '17:00',
    adep: '长江大桥管理站',
    ades: '长江大桥管理站',
    alnap: '赤壁港码头',
    memo: '用于桥梁结构安全检测',
    proc: '遇到船舶通过时立即避让；风速超过5级时停止作业',
    files: ['/uploads/flight-plan-003.pdf'],
    status: 'DRAFT',
    createTime: '2024-09-17 16:45:00',
    updateTime: '2024-09-17 16:45:00',
    createBy: 'user002',
    updateBy: 'user002'
  },
  {
    id: '14',
    flightType: 'MAV',
    subject: '91110000MA001234569',
    name: '赤壁市应急救援空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    startTime: '00:00',
    endTime: '23:59',
    adep: '赤壁市应急救援中心',
    ades: '各应急降落点',
    alnap: '赤壁人民医院停机坪',
    memo: '用于紧急医疗救援和灾害应急响应',
    proc: '优先级最高，其他航行器需避让；严格按照应急飞行程序执行',
    files: ['/uploads/emergency-plan.pdf', '/uploads/emergency-airspace.kml'],
    status: 'APPROVED',
    createTime: '2024-08-25 14:00:00',
    updateTime: '2024-08-30 11:30:00',
    createBy: 'emergency',
    updateBy: 'admin'
  },
  {
    id: '15',
    flightType: 'UAV',
    subject: '91110000MA001234570',
    name: '赤壁市环保监测空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-25',
    endDate: '2024-09-30',
    startTime: '09:00',
    endTime: '16:00',
    adep: '环保局监测站',
    ades: '陆水湖监测点',
    alnap: '',
    memo: '用于水质监测和环境污染排查',
    proc: '发现异常污染源时立即上报；设备故障时就近降落',
    files: ['/uploads/env-monitoring-plan.pdf'],
    status: 'REJECTED',
    createTime: '2024-09-15 13:20:00',
    updateTime: '2024-09-16 10:45:00',
    createBy: 'env001',
    updateBy: 'admin'
  },
  {
    id: '16',
    flightType: 'UAV',
    subject: '91110000MA001234571',
    name: '赤壁古战场旅游航拍空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-10-01',
    endDate: '2024-10-07',
    startTime: '08:30',
    endTime: '17:30',
    adep: '赤壁古战场游客服务中心',
    ades: '赤壁古战场游客服务中心',
    alnap: '赤壁古战场停车场',
    memo: '国庆黄金周旅游宣传片拍摄',
    proc: '游客密集时段禁止飞行；遇到文物保护区立即避让',
    files: ['/uploads/tourism-flight-plan.pdf', '/uploads/tourism-airspace.kmz'],
    status: 'SUBMITTED',
    createTime: '2024-09-18 14:30:00',
    updateTime: '2024-09-18 14:30:00',
    createBy: 'tourism001',
    updateBy: 'tourism001'
  },
  {
    id: '17',
    flightType: 'MAV',
    subject: '91110000MA001234572',
    name: '赤壁市消防演练空域',
    flightMode: 'BVLOS',
    type: 'TEMPORARY',
    startDate: '2024-09-28',
    endDate: '2024-09-28',
    startTime: '14:00',
    endTime: '17:00',
    adep: '赤壁市消防支队',
    ades: '模拟火场演练区',
    alnap: '赤壁市体育中心',
    memo: '大型消防综合演练，涉及高层建筑救援',
    proc: '演练区域全面管制；紧急情况下可强制降落',
    files: ['/uploads/fire-drill-plan.pdf', '/uploads/fire-drill-airspace.kml'],
    status: 'APPROVED',
    createTime: '2024-09-20 09:00:00',
    updateTime: '2024-09-21 16:15:00',
    createBy: 'fire001',
    updateBy: 'admin'
  },
  {
    id: '18',
    flightType: 'UAV',
    subject: '91110000MA001234573',
    name: '赤壁电网巡检空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    startTime: '07:00',
    endTime: '19:00',
    adep: '赤壁供电局',
    ades: '各变电站点',
    alnap: '赤壁工业园区变电站',
    memo: '电力线路日常巡检和设备维护',
    proc: '遇到恶劣天气停止作业；发现线路异常立即上报',
    files: ['/uploads/power-inspection-plan.pdf', '/uploads/power-grid-airspace.kmz'],
    status: 'APPROVED',
    createTime: '2024-08-28 11:00:00',
    updateTime: '2024-08-30 15:30:00',
    createBy: 'power001',
    updateBy: 'admin'
  },
  {
    id: '19',
    flightType: 'UAV',
    subject: '420781199002020002',
    name: '赤壁长江水文科研空域',
    flightMode: 'VLOS',
    type: 'TEMPORARY',
    startDate: '2024-10-15',
    endDate: '2024-10-20',
    startTime: '10:00',
    endTime: '15:00',
    adep: '长江水文监测站',
    ades: '长江采样点群',
    alnap: '陆水河汇入口',
    memo: '长江水质变化科学研究项目',
    proc: '避开船舶航道；采样设备故障时立即返航',
    files: ['/uploads/research-plan.pdf'],
    status: 'DRAFT',
    createTime: '2024-09-19 08:45:00',
    updateTime: '2024-09-19 08:45:00',
    createBy: 'research001',
    updateBy: 'research001'
  },
  {
    id: '20',
    flightType: 'UAV',
    subject: '91110000MA001234574',
    name: '赤壁新区快递配送空域',
    flightMode: 'BVLOS',
    type: 'ANNUAL_PRIVATE',
    startDate: '2024-10-01',
    endDate: '2025-09-30',
    startTime: '08:00',
    endTime: '20:00',
    adep: '赤壁新区配送中心',
    ades: '新区各小区投递点',
    alnap: '赤壁新区商业广场',
    memo: '新区智能快递配送试点项目',
    proc: '居民区上空限高50米；学校时段禁飞',
    files: ['/uploads/delivery-plan.pdf', '/uploads/delivery-routes.kml', '/uploads/safety-protocol.pdf'],
    status: 'REJECTED',
    createTime: '2024-09-12 16:20:00',
    updateTime: '2024-09-14 09:30:00',
    createBy: 'delivery001',
    updateBy: 'admin'
  }
];

// 模拟API响应
export function getMockAirspaceList(params: any) {
  const { keyword, flightType, type, status, pageNum = 1, pageSize = 20 } = params;
  
  let filteredList = mockAirspaceApplications;
  
  // 关键词搜索
  if (keyword) {
    filteredList = filteredList.filter(item => 
      item.name.includes(keyword) || item.subject.includes(keyword)
    );
  }
  
  // 飞行类型筛选
  if (flightType) {
    filteredList = filteredList.filter(item => item.flightType === flightType);
  }
  
  // 空域类型筛选
  if (type) {
    filteredList = filteredList.filter(item => item.type === type);
  }
  
  // 状态筛选
  if (status) {
    filteredList = filteredList.filter(item => item.status === status);
  }
  
  // 分页
  const total = filteredList.length;
  const startIndex = (pageNum - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const list = filteredList.slice(startIndex, endIndex);
  
  return {
    code: 200,
    message: '获取成功',
    data: {
      list,
      total,
      pageNum,
      pageSize
    }
  };
}

// 根据ID获取详情
export function getMockAirspaceDetail(id: string) {
  const item = mockAirspaceApplications.find(item => item.id === id);
  
  if (item) {
    return {
      code: 200,
      message: '获取成功',
      data: item
    };
  } else {
    return {
      code: 404,
      message: '记录不存在',
      data: null
    };
  }
}

// 模拟创建
export function mockCreateAirspace(data: any) {
  const newId = String(mockAirspaceApplications.length + 1);
  const newItem: AirspaceApplicationModel = {
    ...data,
    id: newId,
    status: 'DRAFT',
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN'),
    createBy: 'current-user',
    updateBy: 'current-user'
  };
  
  mockAirspaceApplications.push(newItem);
  
  return {
    code: 200,
    message: '创建成功',
    data: newItem
  };
}

// 模拟更新
export function mockUpdateAirspace(id: string, data: any) {
  const index = mockAirspaceApplications.findIndex(item => item.id === id);
  
  if (index > -1) {
    mockAirspaceApplications[index] = {
      ...mockAirspaceApplications[index],
      ...data,
      updateTime: new Date().toLocaleString('zh-CN'),
      updateBy: 'current-user'
    };
    
    return {
      code: 200,
      message: '更新成功',
      data: mockAirspaceApplications[index]
    };
  } else {
    return {
      code: 404,
      message: '记录不存在',
      data: null
    };
  }
}

// 模拟删除
export function mockDeleteAirspace(id: string) {
  const index = mockAirspaceApplications.findIndex(item => item.id === id);
  
  if (index > -1) {
    mockAirspaceApplications.splice(index, 1);
    return {
      code: 200,
      message: '删除成功',
      data: null
    };
  } else {
    return {
      code: 404,
      message: '记录不存在',
      data: null
    };
  }
}

// 模拟提交申请
export function mockSubmitAirspace(id: string) {
  const index = mockAirspaceApplications.findIndex(item => item.id === id);
  
  if (index > -1) {
    mockAirspaceApplications[index].status = 'SUBMITTED';
    mockAirspaceApplications[index].updateTime = new Date().toLocaleString('zh-CN');
    
    return {
      code: 200,
      message: '提交成功',
      data: null
    };
  } else {
    return {
      code: 404,
      message: '记录不存在',
      data: null
    };
  }
}
