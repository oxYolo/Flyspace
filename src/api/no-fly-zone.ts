/**
 * 禁飞区真实 API（替代 mock）
 */
import axios from 'axios'
import urlConfig from '@/public-path'
import { getToken } from '@/utils/auth'

export interface NoFlyZoneQuery {
    page: number
    pageSize: number
    keyword?: string
    type?: string
}

// 创建本地API专用的axios实例
const localApiService = axios.create({
    baseURL: `${urlConfig.baseUrl}/kygl`,
    timeout: 10000,
});

// 为本地 API 客户端附加鉴权头（如后端需要）
localApiService.interceptors.request.use((config) => {
    const token = getToken?.()
    if (token) {
        config.headers = config.headers || {}
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})
const baseUrl = '/api/nfz'

export async function $getNoFlyZoneList(params: NoFlyZoneQuery) {
    const response = await localApiService({ url: baseUrl, method: 'get', params })

    // 转换后端数据格式为前端期望的格式
    const items = response.data.data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.extra_properties?.description || '',
        geometry: item.geometry_geojson,
        minAltitude: item.min_alt_m || 0,
        maxAltitude: item.max_alt_m || 1000,
        timeWindow: {
            start: item.effective_from,
            end: item.effective_to
        },
        bufferMeters: item.extra_properties?.bufferMeters || 100,
        color: item.extra_properties?.color || '#FF0000',
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }))

    return {
        items,
        total: response.data.data.total
    }
}

export async function $getNoFlyZoneById(id: string) {
    const response = await localApiService({ url: `${baseUrl}/${id}`, method: 'get' })
    const item = response.data.data

    // 转换后端数据格式为前端期望的格式
    return {
        id: item.id,
        name: item.name,
        type: item.type,
        description: item.extra_properties?.description || '',
        geometry: item.geometry_geojson,
        minAltitude: item.min_alt_m || 0,
        maxAltitude: item.max_alt_m || 1000,
        timeWindow: {
            start: item.effective_from,
            end: item.effective_to
        },
        bufferMeters: item.extra_properties?.bufferMeters || 100,
        color: item.extra_properties?.color || '#FF0000',
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }
}

export async function $createNoFlyZone(data: any) {
    // 转换前端数据格式为后端期望的格式
    const backendData = {
        name: data.name,
        type: data.type || 'permanent',
        status: 'active',
        // 后端若要求字符串，这里优先传字符串；若是对象也能被 JSON 自动序列化
        geometry_geojson: typeof data.geometry === 'string' ? data.geometry : data.geometry,
        min_alt_m: data.minAltitude || 0,
        max_alt_m: data.maxAltitude || 1000,
        effective_from: data.timeWindow?.start || null,
        effective_to: data.timeWindow?.end || null,
        extra_properties: {
            color: data.color,
            bufferMeters: data.bufferMeters,
            description: data.description,
            frontendId: data.id,
            rawType: data.type,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }
    }

    const response = await localApiService({ url: baseUrl, method: 'post', data: backendData })
    return response.data.data
}

export async function $updateNoFlyZone(id: string, data: any) {
    // 转换前端数据格式为后端期望的格式
    const backendData = {
        name: data.name,
        type: data.type || 'permanent',
        status: 'active',
        geometry_geojson: data.geometry,
        min_alt_m: data.minAltitude || 0,
        max_alt_m: data.maxAltitude || 1000,
        effective_from: data.timeWindow?.start || null,
        effective_to: data.timeWindow?.end || null,
        extra_properties: {
            color: data.color,
            bufferMeters: data.bufferMeters,
            description: data.description,
            frontendId: data.id,
            rawType: data.type,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        }
    }

    const response = await localApiService({ url: `${baseUrl}/${id}`, method: 'put', data: backendData })
    return response.data.data
}

export async function $deleteNoFlyZone(id: string) {
    const response = await localApiService({ url: `${baseUrl}/${id}`, method: 'delete' })
    return response.data
}