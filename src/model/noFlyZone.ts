/**
 * 时间窗口类型定义
 * @interface ITimeWindow
 */
export interface ITimeWindow {
    /** 开始时间 */
    start?: string
    /** 结束时间 */
    end?: string
}

/**
 * GeoJSON多边形几何类型
 * @type GeoJsonPolygonType
 */
export type GeoJsonPolygonType = {
    /** 几何类型 */
    type: 'Polygon' | 'MultiPolygon'
    /** 坐标数组 */
    coordinates: number[][][] | number[][][][]
}

/**
 * 禁飞区数据类型定义
 * @interface INoFlyZone
 */
export interface INoFlyZone {
    /** 禁飞区唯一标识符 */
    id?: string
    /** 禁飞区名称 */
    name: string
    /** 禁飞区描述信息 */
    description?: string
    /** 禁飞区类型 */
    type?: string
    /** 禁飞区几何形状（GeoJSON格式） */
    geometry: GeoJsonPolygonType
    /** 最低高度限制（米） */
    minAltitude?: number
    /** 最高高度限制（米） */
    maxAltitude?: number
    /** 时间窗口限制 */
    timeWindow?: ITimeWindow
    /** 缓冲区距离（米） */
    bufferMeters?: number
    /** 显示颜色（十六进制） */
    color?: string
    /** 创建时间 */
    createdAt?: string
    /** 更新时间 */
    updatedAt?: string
}

/**
 * 禁飞区查询参数
 * @interface INoFlyZoneQueryParams
 */
export interface INoFlyZoneQueryParams {
    /** 页码 */
    page: number
    /** 每页数量 */
    pageSize: number
    /** 搜索关键词 */
    keyword?: string
    /** 禁飞区类型筛选 */
    type?: string
}

/**
 * 禁飞区列表响应
 * @interface INoFlyZoneListResponse
 */
export interface INoFlyZoneListResponse {
    /** 禁飞区列表 */
    items: INoFlyZone[]
    /** 总数量 */
    total: number
}

/**
 * 禁飞区绘制API接口
 * @interface IDrawingApi
 */
export interface IDrawingApi {
    /** 进入绘制模式 */
    enterDraw(): void
    /** 进入编辑模式 */
    enterEdit(entityId: string): void
    /** 取消当前操作 */
    cancel(): void
    /** 保存当前绘制 */
    save(): GeoJsonPolygonType | null
    /** 渲染禁飞区列表 */
    renderZones(zones: INoFlyZone[]): void
    /** 高亮指定禁飞区 */
    highlight(id?: string): void
    /** 移除指定禁飞区 */
    remove(id: string): void
    /** 销毁绘制实例 */
    destroy(): void
    /** 设置交互功能 */
    setupInteraction(): void
}

// 为了向后兼容，保留原有的类型别名
export type TimeWindow = ITimeWindow
export type GeoJsonPolygon = GeoJsonPolygonType
export type NoFlyZone = INoFlyZone
export type NoFlyZoneQueryParams = INoFlyZoneQueryParams
export type NoFlyZoneListResponse = INoFlyZoneListResponse
export type DrawingApi = IDrawingApi
