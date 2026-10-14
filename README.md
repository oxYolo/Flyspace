# 低空云前端脚手架

一个基于 Vue 3 + TypeScript 的现代化前端开发脚手架，专为低空云平台系列项目设计，提供统一的开发规范和可复用组件。

## ✨ 特性

- 🚀 **Vue 3** - 采用最新的 Vue 3 Composition API
- 🔥 **TypeScript** - 完整的 TypeScript 支持
- 📦 **模块化架构** - 清晰的项目结构和模块划分
- 🎨 **统一UI风格** - 蓝白科技风格设计体系
- 🔧 **开箱即用** - 内置常用组件和工具函数
- 📱 **响应式设计** - 完美适配各种屏幕尺寸
- 🛠️ **开发规范** - 完整的开发检查清单和规范

## 🏗️ 项目结构

```
src/
├── api/                    # API接口
├── assets/                 # 静态资源
│   ├── styles/            # 样式文件
│   ├── images/            # 图片资源
│   ├── icons/             # 图标资源
│   └── fonts/             # 字体资源
├── components/            # 公共组件
├── composables/           # 组合式函数
├── directive/             # 自定义指令
├── layouts/               # 布局组件
├── model/                 # 数据类型定义（注意：单数形式）
├── plugins/               # 插件配置
├── router/                # 路由配置
├── stores/                # 状态管理
├── utils/                 # 工具函数
└── views/                 # 页面文件
    └── modules/           # 按模块组织的页面
```

## 🚀 快速开始

### 环境准备

- Node.js >= 16
- npm >= 8 或 yarn >= 1.22

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 📖 开发指南

### 1. 创建新页面

#### 1.1 创建页面目录

页面文件统一放在 `src/views/modules/` 目录下，按模块组织：

```
src/views/modules/device-management/
├── DeviceList.vue          # 设备列表
├── DeviceDetail.vue        # 设备详情
├── DeviceEdit.vue          # 设备编辑
└── components/             # 模块专用组件（可选）
    └── DeviceCard.vue
```

#### 1.2 添加路由配置

在 `src/router/index.ts` 中添加路由：

```typescript
{
  path: '/device-monitoring',
  component: () => import('@/layouts/DefaultLayout.vue'),
  name: 'DeviceMonitoring',
  meta: { title: '设备监控', icon: 'Monitor' },
  children: [
    {
      path: 'list',
      component: () => import('@/views/modules/device-monitoring/DeviceList.vue'),
      name: 'DeviceList',
      meta: { title: '设备列表', keepAlive: true }
    }
  ]
}
```

#### 1.3 页面跳转

```typescript
import { useRouter } from 'vue-router';
const router = useRouter();

// 跳转到列表页
router.push('/device-monitoring/list');

// 跳转到详情页（带参数）
router.push('/device-monitoring/detail?id=123');

// 使用路由名称跳转
router.push({ name: 'DeviceDetail', query: { id: '123' } });
```

### 2. 创建API接口

#### 2.1 API文件位置

API文件放在 `src/api/` 目录下，可按模块组织。

#### 2.2 API文件模板

```typescript
import { fetch } from '@/api/tool/fetch';

const baseUrl = '/api/device';

export function $getDeviceList(params: any) {
  return fetch({
    url: `${baseUrl}/list`,
    method: 'get',
    params
  });
}

export function $getDeviceDetail(id: string) {
  return fetch({
    url: `${baseUrl}/detail/${id}`,
    method: 'get'
  });
}
```

### 3. 数据类型定义

类型文件放在 `src/model/` 目录下（注意使用单数形式）：

```typescript

export interface DeviceListParams {
  keyword?: string;
  status?: string;
  pageNum: number;
  pageSize: number;
}
```

## 🎨 UI组件

### 主要公共组件

- **Panel** - 面板组件（推荐使用 `geoBorderBox` 样式）
- **Dialog** - 弹窗组件（推荐使用 `geoBigDialog` 样式）
- **Table** - 表格组件
- **Echarts** - 图表组件

### 设计规范

#### 整体色系

- **主色调**：蓝白风格
- **背景色**：深蓝渐变背景
- **面板颜色**：半透明白色/浅蓝色
- **边框样式**：科技感边框效果

#### 布局方式

- **面板布局**：从左到右依次铺开
- **层级关系**：重要信息面板居左，次要信息面板向右排列
- **响应式**：保持面板间的合理间距和比例

## ✅ 开发检查清单

### 文件创建检查

- [ ] 在 `src/views/modules/` 创建页面文件
- [ ] 在 `src/api/` 创建API文件（可按模块组织）
- [ ] 在 `src/model/` 创建类型文件（如需要）
- [ ] 在 `src/router/index.ts` 添加路由配置


## 📂 查看可用组件

```bash
# 查看所有公共组件
ls src/components/

# 查看组件具体用法
# 打开对应组件文件查看Props和使用示例
```

## 📝 开发规范

1. **命名规范**：
    - 文件夹使用小写字母加连字符（kebab-case）
    - Vue组件使用大驼峰命名（PascalCase）
    - TypeScript接口使用大驼峰命名并以Model结尾

2. **目录规范**：
    - 页面文件必须放在 `src/views/modules/` 下按模块组织
    - API文件放在 `src/api/` 下，可按模块创建子目录
    - 类型定义放在 `src/model/` 下（注意单数形式）

3. **代码规范**：
    - 使用TypeScript编写，确保类型安全
    - 使用Composition API
    - 统一使用公共组件和样式变量

## 🔧 技术栈

- **前端框架**：Vue 3
- **开发语言**：TypeScript
- **构建工具**：Vite
- **路由管理**：Vue Router 4
- **状态管理**：Pinia
- **图表库**：ECharts
- **样式方案**：CSS Variables + Less
