import type { INoFlyZone, INoFlyZoneQueryParams, INoFlyZoneListResponse } from '@/model/noFlyZone'

/** 本地存储键名 */
const STORAGE_KEY = 'nfz_store_v1'

/** 默认禁飞区类型配置 */
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

/** 默认颜色配置（保留作为备用） */
const DEFAULT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
] as const

/** 禁飞区数据存储 */
let db: INoFlyZone[] = load()

// 确保数据初始化
if (db.length === 0) {
    console.debug('[NFZ] Database is empty, initializing with default zones')
    db = createDefaultZones()
    persist()
}

function load(): INoFlyZone[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch (error) {
        console.error('读取本地存储失败:', error)
        return []
    }
}

function persist(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch (error) {
        console.error('保存到本地存储失败:', error)
    }
}

function generateId(): string {
    return `nfz_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * 根据禁飞区类型获取对应的默认颜色
 * @param type 禁飞区类型
 * @returns 对应的颜色值
 */
function getColorByType(type: string): string {
    return ZONE_TYPE_COLOR_MAP[type] || DEFAULT_COLORS[0]
}

function createDefaultZones(): INoFlyZone[] {
    const now = new Date().toISOString()
    return [
        {
            id: 'nfz_0001',
            name: '赤壁市通用机场净空区（模拟）',
            description: '赤壁市周边通用机场核心净空保护区，禁止无人机等低空飞行器飞行，保障机场运行安全',
            type: '机场周边',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.86, 29.70],  // 左上角
                    [113.94, 29.70],  // 右上角
                    [113.94, 29.76],  // 右下角
                    [113.86, 29.76],  // 左下角
                    [113.86, 29.70]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 1200,
            bufferMeters: 200,
            color: getColorByType('机场周边'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0002',
            name: '赤壁市军事管理区（模拟）',
            description: '赤壁市辖区内军事管理核心区域，严禁任何未经授权的飞行活动，涉及国防安全',
            type: '军事禁区与军事管理区',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.78, 29.82],  // 左上角
                    [113.83, 29.82],  // 右上角
                    [113.83, 29.87],  // 右下角
                    [113.78, 29.87],  // 左下角
                    [113.78, 29.82]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 2000,
            bufferMeters: 500,
            color: getColorByType('军事禁区与军事管理区'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0003',
            name: '赤壁市人民政府周边',
            description: '赤壁市党政机关核心办公区域，周边100米范围为禁飞区，保障政务活动安全',
            type: '党政机关',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.898, 29.801],  // 左上角
                    [113.902, 29.801],  // 右上角
                    [113.902, 29.799],  // 右下角
                    [113.898, 29.799],  // 左下角
                    [113.898, 29.801]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 500,
            bufferMeters: 100,
            color: getColorByType('党政机关'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0004',
            name: '陆水水库主坝保护区',
            description: '赤壁市重要水利基础设施（陆水水库主坝）管理核心区，禁止飞行以防安全风险',
            type: '重要基础设施',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.95, 29.68],  // 左上角
                    [114.00, 29.68],  // 右上角
                    [114.00, 29.73],  // 右下角
                    [113.95, 29.73],  // 左下角
                    [113.95, 29.68]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 800,
            bufferMeters: 300,
            color: getColorByType('重要基础设施'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0005',
            name: '赤壁古战场景区核心区（限飞）',
            description: '赤壁市重点文物保护单位及旅游敏感区域，非禁飞但限制飞行高度（需提前报备）',
            type: '其他敏感区域',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.75, 29.72],  // 左上角
                    [113.80, 29.72],  // 右上角
                    [113.80, 29.77],  // 右下角
                    [113.75, 29.77],  // 左下角
                    [113.75, 29.72]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 300,
            bufferMeters: 150,
            color: getColorByType('其他敏感区域'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0006',
            name: '赤壁市烈士塔纪念区',
            description: '赤壁市烈士纪念设施保护区域，禁止飞行以维护庄重氛围及设施安全',
            type: '其他敏感区域',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.92, 29.83],  // 左上角
                    [113.94, 29.83],  // 右上角
                    [113.94, 29.85],  // 右下角
                    [113.92, 29.85],  // 左下角
                    [113.92, 29.83]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 400,
            bufferMeters: 200,
            color: getColorByType('其他敏感区域'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0010',
            name: '赤壁市应急指挥中心周边',
            description: '赤壁市应急管理核心办公区域，小范围禁飞保障应急调度安全',
            type: '党政机关',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.905, 29.808],  // 左上角
                    [113.908, 29.808],  // 右上角
                    [113.908, 29.805],  // 右下角
                    [113.905, 29.805],  // 左下角
                    [113.905, 29.808]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 300,
            bufferMeters: 50,
            color: getColorByType('党政机关'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0011',
            name: '陆水水库取水口保护区',
            description: '赤壁市居民用水核心取水点，小范围禁飞防污染与设备干扰',
            type: '重要基础设施',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.962, 29.702],  // 左上角
                    [113.965, 29.702],  // 右上角
                    [113.965, 29.699],  // 右下角
                    [113.962, 29.699],  // 左下角
                    [113.962, 29.702]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 200,
            bufferMeters: 80,
            color: getColorByType('重要基础设施'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0012',
            name: '赤壁市广播电视台发射塔区域',
            description: '广播电视信号发射核心设施，小范围禁飞防信号干扰',
            type: '重要基础设施',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.883, 29.775],  // 左上角
                    [113.886, 29.775],  // 右上角
                    [113.886, 29.772],  // 右下角
                    [113.883, 29.772],  // 左下角
                    [113.883, 29.775]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 400,
            bufferMeters: 100,
            color: getColorByType('重要基础设施'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0013',
            name: '赤壁市革命烈士陵园纪念碑区',
            description: '烈士纪念核心标识区域，小范围禁飞维护庄重氛围',
            type: '其他敏感区域',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.922, 29.835],  // 左上角
                    [113.925, 29.835],  // 右上角
                    [113.925, 29.832],  // 右下角
                    [113.922, 29.832],  // 左下角
                    [113.922, 29.835]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 200,
            bufferMeters: 50,
            color: getColorByType('其他敏感区域'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0014',
            name: '赤壁市人民医院急救中心楼顶',
            description: '医疗急救直升机起降备用区域，小范围禁飞保障应急救援通道',
            type: '其他敏感区域',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.911, 29.812],  // 左上角
                    [113.914, 29.812],  // 右上角
                    [113.914, 29.809],  // 右下角
                    [113.911, 29.809],  // 左下角
                    [113.911, 29.812]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 300,
            bufferMeters: 60,
            color: getColorByType('其他敏感区域'),
            createdAt: now,
            updatedAt: now
        },
        {
            id: 'nfz_0015',
            name: '赤壁市某军事通信站点',
            description: '军事通信保障小型站点，小范围禁飞防信号泄露与设备干扰',
            type: '军事禁区与军事管理区',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [113.876, 29.788],  // 左上角
                    [113.879, 29.788],  // 右上角
                    [113.879, 29.785],  // 右下角
                    [113.876, 29.785],  // 左下角
                    [113.876, 29.788]   // 闭合点
                ]]
            },
            minAltitude: 0,
            maxAltitude: 500,
            bufferMeters: 100,
            color: getColorByType('军事禁区与军事管理区'),
            createdAt: now,
            updatedAt: now
        }
    ]
}

export function seedIfEmpty(): void {
    if (db.length === 0) {
        console.debug('[NFZ] Seeding empty database with default zones')
        db = createDefaultZones()
        console.debug('[NFZ] Created', db.length, 'default zones with colors:', db.map(z => ({ name: z.name, type: z.type, color: z.color })))
        persist()
    }
}

// 强制重新初始化数据（用于开发调试）
export function forceReinitialize(): void {
    console.debug('[NFZ] Force reinitializing database with default zones')
    db = createDefaultZones()
    console.debug('[NFZ] Force created', db.length, 'default zones with colors:', db.map(z => ({ name: z.name, type: z.type, color: z.color })))
    persist()
}

// 清除所有数据
export function clearAllData(): void {
    console.debug('[NFZ] Clearing all data')
    db = []
    persist()
}

export function $getNoFlyZoneList(params: INoFlyZoneQueryParams): Promise<INoFlyZoneListResponse> {
    try {
        let filtered = [...db]

        // 关键词搜索
        if (params.keyword) {
            const keyword = params.keyword.toLowerCase().trim()
            filtered = filtered.filter(zone =>
                zone.name.toLowerCase().includes(keyword) ||
                (zone.type && zone.type.toLowerCase().includes(keyword)) ||
                (zone.description && zone.description.toLowerCase().includes(keyword))
            )
        }

        // 类型筛选
        if (params.type) {
            filtered = filtered.filter(zone => zone.type === params.type)
        }

        const start = (params.page - 1) * params.pageSize
        const end = start + params.pageSize
        const items = filtered.slice(start, end)
        return Promise.resolve({ items, total: filtered.length })
    } catch (error) {
        console.error('获取禁飞区列表失败:', error)
        return Promise.reject(new Error('获取禁飞区列表失败'))
    }
}

export function $createNoFlyZone(data: Omit<INoFlyZone, 'id' | 'createdAt' | 'updatedAt'>): Promise<INoFlyZone> {
    try {
        if (!data.name?.trim()) return Promise.reject(new Error('禁飞区名称不能为空'))
        if (!data.geometry) return Promise.reject(new Error('禁飞区几何形状不能为空'))
        if (db.some(zone => zone.name === data.name.trim())) return Promise.reject(new Error('禁飞区名称已存在'))

        const now = new Date().toISOString()
        // 如果没有指定颜色，根据类型自动设置默认颜色
        const color = data.color || (data.type ? getColorByType(data.type) : DEFAULT_COLORS[0])

        const newZone: INoFlyZone = {
            ...data,
            color,
            id: generateId(),
            createdAt: now,
            updatedAt: now
        }
        db.push(newZone)
        persist()
        return Promise.resolve(newZone)
    } catch (error) {
        console.error('创建禁飞区失败:', error)
        return Promise.reject(new Error('创建禁飞区失败'))
    }
}

export function $updateNoFlyZone(id: string, data: Partial<INoFlyZone>): Promise<INoFlyZone> {
    try {
        const index = db.findIndex(zone => zone.id === id)
        if (index === -1) return Promise.reject(new Error('禁飞区不存在'))
        if (data.name !== undefined && !data.name?.trim()) return Promise.reject(new Error('禁飞区名称不能为空'))
        if (data.name && db.some(zone => zone.name === data.name?.trim() && zone.id !== id)) return Promise.reject(new Error('禁飞区名称已存在'))
        const updatedZone: INoFlyZone = { ...db[index], ...data, id, updatedAt: new Date().toISOString() }
        db[index] = updatedZone
        persist()
        return Promise.resolve(updatedZone)
    } catch (error) {
        console.error('更新禁飞区失败:', error)
        return Promise.reject(new Error('更新禁飞区失败'))
    }
}

export function $deleteNoFlyZone(id: string): Promise<void> {
    try {
        const index = db.findIndex(zone => zone.id === id)
        if (index === -1) return Promise.reject(new Error('禁飞区不存在'))
        db.splice(index, 1)
        persist()
        return Promise.resolve()
    } catch (error) {
        console.error('删除禁飞区失败:', error)
        return Promise.reject(new Error('删除禁飞区失败'))
    }
}

export function $getNoFlyZoneById(id: string): Promise<INoFlyZone> {
    try {
        const zone = db.find(z => z.id === id)
        if (!zone) return Promise.reject(new Error('禁飞区不存在'))
        return Promise.resolve(zone)
    } catch (error) {
        console.error('获取禁飞区详情失败:', error)
        return Promise.reject(new Error('获取禁飞区详情失败'))
    }
}

export const listNoFlyZones = $getNoFlyZoneList
export const createNoFlyZone = $createNoFlyZone
export const updateNoFlyZone = $updateNoFlyZone
export const deleteNoFlyZone = $deleteNoFlyZone
export const getNoFlyZone = $getNoFlyZoneById

// 导出颜色映射相关函数和常量
export { getColorByType, ZONE_TYPE_COLOR_MAP, DEFAULT_ZONE_TYPES }