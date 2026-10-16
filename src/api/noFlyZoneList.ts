/**
 * 禁飞区管理-练习功能：禁飞区列表查询接口
 * POST http://223.75.173.128:19500/data/noFlyZone/list
 * 开发环境通过 vite 代理 /data 转发，避免跨域
 */
import axios from 'axios'
import { getToken } from '@/utils/auth'

/** 查询入参 */
export interface NoFlyZoneListQuery {
    /** 页码（必填） */
    page: number
    /** 每页数量（必填） */
    pageSize: number
    /** 搜索关键词（名称/类型/描述模糊匹配） */
    keyword?: string
    /** 禁飞区类型筛选，如：机场周边、军事禁区、党政机关等 */
    type?: string
}

/** 单条禁飞区记录（字段按接口返回，做容错处理） */
export interface NoFlyZoneRecord {
    id?: string | number
    name?: string
    type?: string
    description?: string
    /** 包围盒，可能为 [west,south,east,north] 数组或 {west,south,east,north} 对象 */
    bbox?: number[] | { west: number; south: number; east: number; north: number } | string
    geometry?: any
    [key: string]: any
}

export interface NoFlyZoneListResult {
    list: NoFlyZoneRecord[]
    total: number
}

const service = axios.create({
    baseURL: '/data',
    timeout: 15000,
})

// 携带登录令牌（后端校验 Authorization: Bearer xxx）
service.interceptors.request.use((config) => {
    const token = getToken?.()
    if (token) {
        config.headers = config.headers || {}
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

/**
 * 分页查询禁飞区列表
 */
export async function $queryNoFlyZoneList(params: NoFlyZoneListQuery): Promise<NoFlyZoneListResult> {
    const body: NoFlyZoneListQuery = {
        page: params.page,
        pageSize: params.pageSize,
    }
    if (params.keyword) body.keyword = params.keyword
    if (params.type) body.type = params.type

    const res = await service.post('/noFlyZone/list', body)
    const payload = res?.data
    // 调试：打印接口原始返回，便于核对字段名
    console.log('[禁飞区列表] 接口原始返回:', payload)
    // 兼容多种返回结构：{code,data:{list,total}} / {data:{records,total}} / 直接 {list,total}
    const data = payload?.data ?? payload ?? {}
    const rawList: any[] =
        data?.list ?? data?.records ?? data?.items ?? data?.rows ?? []
    const total: number = Number(
        data?.total ?? data?.totalCount ?? data?.count ?? rawList.length ?? 0,
    )

    // 字段名归一化：兼容后端可能的命名差异
    const list: NoFlyZoneRecord[] = (Array.isArray(rawList) ? rawList : []).map((item: any) => {
        const zone: NoFlyZoneRecord = { ...item }
        zone.id = item.id ?? item.zoneId ?? item.noFlyZoneId ?? item.uid
        zone.name = item.name ?? item.zoneName ?? item.noFlyZoneName ?? item.title ?? item.zone_name
        zone.type = item.type ?? item.zoneType ?? item.category ?? item.zone_type
        zone.description = item.description ?? item.desc ?? item.remark ?? item.detail ?? item.describe
        zone.bbox = item.bbox ?? item.bounds ?? item.extent ?? item.boundary ?? item.range
        zone.geometry = item.geometry ?? item.geometry_geojson ?? item.geojson ?? item.polygon
        return zone
    })

    return { list, total }
}
