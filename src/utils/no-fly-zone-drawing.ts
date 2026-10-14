import type { INoFlyZone, GeoJsonPolygonType, IDrawingApi } from '@/model/noFlyZone'

/**
 * 禁飞区绘制工具类
 * 负责在Cesium地图上进行禁飞区的绘制、编辑和交互
 */
export class NoFlyZoneDrawing implements IDrawingApi {
    private viewer: any
    private mode: 'idle' | 'draw' | 'edit' = 'idle'
    private handler: any = null
    private tempPositions: any[] = []
    private tempEntity: any = null
    private tempPointEntities: any[] = []
    private idToEntity = new Map<string, any>()
    private editEntityId: string | null = null
    private lastGeoJson: GeoJsonPolygonType | null = null
    private editHandleEntities: any[] = []
    private dynamicLine: any = null
    private mousePosition: any = null
    private curveState: null | { controls: any[]; preview?: any; mode?: 'bezier' | 'spline' } = null

    // 几何计算工具类（基于文档中的 PlotUtils）
    private plotUtils = {
        // 距离计算
        distance: (pnt1: any, pnt2: any): number => {
            const Cesium = (window as any).Cesium
            return Cesium.Cartesian3.distance(pnt1, pnt2)
        },

        // 方位角计算
        getAzimuth: (start: any, end: any): number => {
            const Cesium = (window as any).Cesium
            const cartographic1 = Cesium.Cartographic.fromCartesian(start)
            const cartographic2 = Cesium.Cartographic.fromCartesian(end)
            const lng1 = Cesium.Math.toDegrees(cartographic1.longitude)
            const lat1 = Cesium.Math.toDegrees(cartographic1.latitude)
            const lng2 = Cesium.Math.toDegrees(cartographic2.longitude)
            const lat2 = Cesium.Math.toDegrees(cartographic2.latitude)
            const dLng = (lng2 - lng1) * Math.PI / 180
            const lat1Rad = lat1 * Math.PI / 180
            const lat2Rad = lat2 * Math.PI / 180
            const y = Math.sin(dLng) * Math.cos(lat2Rad)
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
            return Math.atan2(y, x)
        },

        // 中点计算
        mid: (pnt1: any, pnt2: any): any => {
            const Cesium = (window as any).Cesium
            return Cesium.Cartesian3.lerp(pnt1, pnt2, 0.5, new Cesium.Cartesian3())
        },

        // 角平分线法向点
        getBisectorNormals: (t: number, pnt1: any, pnt2: any, pnt3: any): any[] => {
            const normal = this.getNormal(pnt1, pnt2, pnt3)
            const dist = this.plotUtils.distance(pnt1, pnt2) * t
            const Cesium = (window as any).Cesium
            const normal1 = Cesium.Cartesian3.multiplyByScalar(normal, dist, new Cesium.Cartesian3())
            const normal2 = Cesium.Cartesian3.multiplyByScalar(normal, -dist, new Cesium.Cartesian3())
            return [
                Cesium.Cartesian3.add(pnt2, normal1, new Cesium.Cartesian3()),
                Cesium.Cartesian3.add(pnt2, normal2, new Cesium.Cartesian3())
            ]
        },

        // 三次贝塞尔插值
        getCubicValue: (t: number, pnt1: any, pnt2: any, pnt3: any, pnt4: any): any => {
            const Cesium = (window as any).Cesium
            const t2 = t * t
            const t3 = t2 * t
            const mt = 1 - t
            const mt2 = mt * mt
            const mt3 = mt2 * mt

            const result = new Cesium.Cartesian3()
            Cesium.Cartesian3.multiplyByScalar(pnt1, mt3, result)
            Cesium.Cartesian3.add(result, Cesium.Cartesian3.multiplyByScalar(pnt2, 3 * mt2 * t, new Cesium.Cartesian3()), result)
            Cesium.Cartesian3.add(result, Cesium.Cartesian3.multiplyByScalar(pnt3, 3 * mt * t2, new Cesium.Cartesian3()), result)
            Cesium.Cartesian3.add(result, Cesium.Cartesian3.multiplyByScalar(pnt4, t3, new Cesium.Cartesian3()), result)
            return result
        }
    }

    // 获取法向量
    private getNormal(pnt1: any, pnt2: any, pnt3: any): any {
        const Cesium = (window as any).Cesium
        const v1 = Cesium.Cartesian3.subtract(pnt2, pnt1, new Cesium.Cartesian3())
        const v2 = Cesium.Cartesian3.subtract(pnt3, pnt2, new Cesium.Cartesian3())
        const normal = Cesium.Cartesian3.cross(v1, v2, new Cesium.Cartesian3())
        Cesium.Cartesian3.normalize(normal, normal)
        return normal
    }
    private arcState: null | {
        center?: any
        radiusPoint?: any
        startPoint?: any
        endPoint?: any
        tempEntities: any[]
    } = null

    private pickCartesian(windowPosition: any): any | null {
        const Cesium = (window as any).Cesium
        if (!windowPosition) return null
        try {
            const scene = this.viewer.scene
            if (scene.pickPositionSupported) {
                const p = scene.pickPosition(windowPosition)
                if (Cesium.defined(p)) return p
            }
            const ray = this.viewer.camera.getPickRay(windowPosition)
            if (ray && scene.globe) {
                const p2 = scene.globe.pick(ray, scene)
                if (Cesium.defined(p2)) return p2
            }
            const p3 = this.viewer.camera.pickEllipsoid(windowPosition)
            if (Cesium.defined(p3)) return p3
        } catch { }
        return null
    }

    private isSameLngLat(a: number[], b: number[]): boolean {
        return Math.abs(a[0] - b[0]) < 1e-8 && Math.abs(a[1] - b[1]) < 1e-8
    }

    private normalizeLngLatRing(ring: number[][]): number[][] {
        let filtered = ring.filter(p => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]))
        const dedup: number[][] = []
        for (const p of filtered) {
            if (dedup.length === 0) { dedup.push(p); continue }
            const last = dedup[dedup.length - 1]
            if (Math.abs(last[0] - p[0]) < 1e-10 && Math.abs(last[1] - p[1]) < 1e-10) continue
            dedup.push(p)
        }
        filtered = dedup
        if (filtered.length > 1 && this.isSameLngLat(filtered[0], filtered[filtered.length - 1])) {
            return filtered.slice(0, -1)
        }
        return filtered
    }

    private sortRingByAngle(ring: number[][]): number[][] {
        if (!ring || ring.length < 3) return ring
        const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length
        const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length
        const sorted = ring.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx))
        const dedup: number[][] = []
        for (const p of sorted) {
            if (dedup.length === 0 || !this.isSameLngLat(dedup[dedup.length - 1], p)) dedup.push(p)
        }
        return dedup
    }

    constructor(cesiumViewer: any) {
        this.viewer = cesiumViewer
    }

    private destroyHandler(): void {
        if (this.handler) {
            this.handler.destroy()
            this.handler = null
        }
    }

    private clearTemp(): void {
        this.tempPointEntities.forEach(ent => this.viewer.entities.remove(ent))
        this.tempPointEntities = []
        if (this.tempEntity) {
            this.viewer.entities.remove(this.tempEntity)
            this.tempEntity = null
        }
        // 同步清空坐标缓存，避免上次绘制残留
        this.tempPositions = []
        if (this.dynamicLine) {
            try { this.viewer.entities.remove(this.dynamicLine) } catch { }
            this.dynamicLine = null
        }
        this.mousePosition = null
    }

    private toLngLatArr(positions: any[]): number[][] {
        return positions.map(p => {
            const carto = (window as any).Cesium.Cartographic.fromCartesian(p)
            return [
                (window as any).Cesium.Math.toDegrees(carto.longitude),
                (window as any).Cesium.Math.toDegrees(carto.latitude)
            ]
        })
    }

    private convertColorFormat(color: string): string {
        if (color && color.length === 9 && color.startsWith('#')) {
            return color.substring(0, 7)
        }
        return color
    }

    private drawConnectingLines(): void {
        const Cesium = (window as any).Cesium
        this.tempPointEntities = this.tempPointEntities.filter(entity => {
            if (entity.polyline) {
                this.viewer.entities.remove(entity)
                return false
            }
            return true
        })
        if (this.tempPositions.length < 2) return
        for (let i = 0; i < this.tempPositions.length - 1; i++) {
            const line = this.viewer.entities.add({
                polyline: {
                    positions: [this.tempPositions[i], this.tempPositions[i + 1]],
                    width: 3,
                    material: Cesium.Color.BLUE.withAlpha(0.9),
                    clampToGround: true
                }
            })
            this.tempPointEntities.push(line)
        }
        if (this.tempPositions.length > 2) {
            const closingLine = this.viewer.entities.add({
                polyline: {
                    positions: [this.tempPositions[this.tempPositions.length - 1], this.tempPositions[0]],
                    width: 2,
                    material: Cesium.Color.BLUE.withAlpha(0.9),
                    clampToGround: true
                }
            })
            this.tempPointEntities.push(closingLine)
        }
    }

    private ensureTempPolygon(): void {
        if (!this.tempEntity) {
            const Cesium = (window as any).Cesium
            this.tempEntity = this.viewer.entities.add({
                polygon: {
                    hierarchy: new Cesium.CallbackProperty(() => {
                        if (this.tempPositions.length < 3) return undefined
                        const coords = this.toLngLatArr(this.tempPositions)
                        let ring = this.normalizeLngLatRing(coords)
                        ring = this.sortRingByAngle(ring)
                        if (!ring || ring.length < 3) return undefined
                        const positions = Cesium.Cartesian3.fromDegreesArray(ring.flat())
                        return new Cesium.PolygonHierarchy(positions)
                    }, false),
                    material: Cesium.Color.TRANSPARENT,
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#80BFFF'),
                    outlineWidth: 2,
                    height: 0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            })
        }
    }

    public enterDraw(): void {
        this.mode = 'draw'
        this.clearTemp()
        this.destroyHandler()

        this.attachDrawHandlers()
    }

    /**
     * 仅绑定绘制事件处理器，不重置现有临时坐标
     */
    private attachDrawHandlers(): void {
        const Cesium = (window as any).Cesium
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

        this.handler.setInputAction((event: any) => {
            const pos = this.pickCartesian(event.position)
            if (!Cesium.defined(pos)) return
            if (this.tempPositions.length === 0) {
                this.tempPositions.push(pos)
                this.ensureTempPolygon()
                // 创建一次性动态虚线：从最后一个固定点到当前鼠标位置
                if (!this.dynamicLine) {
                    const positionsCb = new Cesium.CallbackProperty(() => {
                        const arr: any[] = []
                        const last = this.tempPositions[this.tempPositions.length - 1]
                        if (last) arr.push(last)
                        if (this.mousePosition) arr.push(this.mousePosition)
                        return arr
                    }, false)
                    this.dynamicLine = this.viewer.entities.add({
                        polyline: {
                            positions: positionsCb,
                            width: 2,
                            material: new Cesium.PolylineDashMaterialProperty({
                                color: Cesium.Color.CYAN,
                            }),
                            clampToGround: true
                        }
                    })
                    this.tempPointEntities.push(this.dynamicLine)
                }
            } else if (this.tempPositions.length === 1) {
                this.tempPositions.push(pos)
                // 第二个点确定后，预览依旧通过 CallbackProperty 使用 mousePosition 平滑更新
            } else {
                // 固定一个新点
                this.tempPositions.push(pos)
            }
            // 固定边线仍然绘制为实线段，但不再频繁创建/销毁，改为仅添加一次
            if (this.tempPositions.length >= 2) {
                const last2 = this.tempPositions.slice(-2)
                const line = this.viewer.entities.add({
                    polyline: {
                        positions: last2,
                        width: 3,
                        material: Cesium.Color.BLUE.withAlpha(0.9),
                        clampToGround: true
                    }
                })
                this.tempPointEntities.push(line)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        this.handler.setInputAction((event: any) => {
            const pos = this.pickCartesian(event.endPosition)
            if (!Cesium.defined(pos)) return
            this.mousePosition = pos
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        this.handler.setInputAction(() => {
            if (this.tempPositions.length < 4) return
            const fixed = this.tempPositions.slice(0)
            const Cesium = (window as any).Cesium
            if (fixed.length > 0 && !Cesium.Cartesian3.equals(fixed[0], fixed[fixed.length - 1])) fixed.push(fixed[0])
            const coords = this.toLngLatArr(fixed)
            let norm = this.normalizeLngLatRing(coords)
            norm = this.sortRingByAngle(norm)
            if (norm.length < 3) { return }
            this.lastGeoJson = { type: 'Polygon', coordinates: [norm] }
            try { window.dispatchEvent(new CustomEvent('nfz:draw-finished', { detail: { geometry: this.lastGeoJson } })) } catch { }
            this.destroyHandler()
            this.clearTemp() // 清理临时绘制线条
            this.mode = 'idle'
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    }

    /**
     * 进入圆弧形区域绘制模式（中心点 → 半径点 → 起点 → 终点）
     */
    public enterDrawArc(): void {
        this.mode = 'draw'
        this.clearTemp()
        this.destroyHandler()
        this.arcState = { tempEntities: [] }
        const Cesium = (window as any).Cesium
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)

        // 触发圆弧绘制开始事件
        try {
            window.dispatchEvent(new CustomEvent('nfz:arc-draw-started'))
        } catch { }

        const addTemp = (ent: any) => this.arcState && this.arcState.tempEntities.push(ent)

        // 点击选择：中心、半径点、起点、终点
        this.handler.setInputAction((event: any) => {
            const pos = this.pickCartesian(event.position)
            if (!Cesium.defined(pos) || !this.arcState) return
            const s = this.arcState
            if (!s.center) {
                s.center = pos
                addTemp(this.viewer.entities.add({ position: pos, point: { pixelSize: 10, color: Cesium.Color.CYAN, heightReference: Cesium.HeightReference.CLAMP_TO_GROUND } }))
                // 触发提示事件：请点击半径点
                try {
                    window.dispatchEvent(new CustomEvent('nfz:arc-step', { detail: { step: 2, message: '请点击半径点' } }))
                } catch { }
            } else if (!s.radiusPoint) {
                s.radiusPoint = pos
                addTemp(this.viewer.entities.add({ polyline: { positions: [s.center, pos], width: 2, material: Cesium.Color.CYAN, clampToGround: true } }))
                // 触发提示事件：请点击起点
                try {
                    window.dispatchEvent(new CustomEvent('nfz:arc-step', { detail: { step: 3, message: '请点击起点' } }))
                } catch { }
            } else if (!s.startPoint) {
                s.startPoint = pos
                addTemp(this.viewer.entities.add({ polyline: { positions: [s.center, pos], width: 2, material: Cesium.Color.YELLOW, clampToGround: true } }))
                // 触发提示事件：请点击终点
                try {
                    window.dispatchEvent(new CustomEvent('nfz:arc-step', { detail: { step: 4, message: '请点击终点' } }))
                } catch { }
            } else if (!s.endPoint) {
                s.endPoint = pos
                // 生成圆弧多边形
                try {
                    const geo = this.buildArcPolygonGeo(s.center, s.radiusPoint, s.startPoint, s.endPoint)
                    this.lastGeoJson = geo
                    try { window.dispatchEvent(new CustomEvent('nfz:draw-finished', { detail: { geometry: this.lastGeoJson } })) } catch { }
                } catch { }
                // 清理并结束
                s.tempEntities.forEach(e => this.viewer.entities.remove(e))
                this.arcState = null
                this.destroyHandler()
                this.clearTemp() // 清理临时绘制线条
                this.mode = 'idle'
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        // 移动预览
        this.handler.setInputAction((event: any) => {
            if (!this.arcState) return
            const s = this.arcState
            const pos = this.pickCartesian(event.endPosition)
            if (!Cesium.defined(pos)) return
            try {
                if (s.center && !s.radiusPoint) {
                    // 更新半径线
                    if (s.tempEntities[1]) s.tempEntities[1].polyline.positions = [s.center, pos]
                } else if (s.center && s.radiusPoint && !s.startPoint) {
                    if (s.tempEntities[2]) s.tempEntities[2].polyline.positions = [s.center, pos]
                }
            } catch { }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }

    /** 由中心点、半径点、起止点构建圆弧扇形多边形（返回 GeoJSON Polygon） */
    private buildArcPolygonGeo(center: any, radiusPoint: any, startPoint: any, endPoint: any): GeoJsonPolygonType {
        const Cesium = (window as any).Cesium
        const c = Cesium.Cartographic.fromCartesian(center)
        const r = Cesium.Cartographic.fromCartesian(radiusPoint)
        const s = Cesium.Cartographic.fromCartesian(startPoint)
        const e = Cesium.Cartographic.fromCartesian(endPoint)
        const centerLng = Cesium.Math.toDegrees(c.longitude)
        const centerLat = Cesium.Math.toDegrees(c.latitude)
        const radiusLng = Cesium.Math.toDegrees(r.longitude)
        const radiusLat = Cesium.Math.toDegrees(r.latitude)
        const startLng = Cesium.Math.toDegrees(s.longitude)
        const startLat = Cesium.Math.toDegrees(s.latitude)
        const endLng = Cesium.Math.toDegrees(e.longitude)
        const endLat = Cesium.Math.toDegrees(e.latitude)

        // 近似半径（米），使用经纬差近似（小范围足够）
        const R = 6378137
        const dLat = (radiusLat - centerLat) * Math.PI / 180
        const dLng = (radiusLng - centerLng) * Math.PI / 180
        const radiusMeters = Math.sqrt((dLat * R) ** 2 + (Math.cos(centerLat * Math.PI / 180) * dLng * R) ** 2)

        // 极角计算
        const angleOf = (lng: number, lat: number) => Math.atan2((lat - centerLat), (lng - centerLng))
        let a1 = angleOf(startLng, startLat)
        let a2 = angleOf(endLng, endLat)
        // 统一到 [0, 2π)
        const norm = (a: number) => { while (a < 0) a += Math.PI * 2; while (a >= Math.PI * 2) a -= Math.PI * 2; return a }
        a1 = norm(a1); a2 = norm(a2)
        // 选择较短方向绘制
        let sweep = a2 - a1
        if (Math.abs(sweep) > Math.PI) sweep = sweep - Math.sign(sweep) * Math.PI * 2

        // 采样圆弧点
        const steps = Math.max(16, Math.min(96, Math.floor(Math.abs(sweep) / (Math.PI / 36))))
        const points: number[][] = []
        points.push([centerLng, centerLat])
        for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const ang = a1 + sweep * t
            // 球面近似：按经纬偏移（小范围适用）
            const dx = (radiusMeters * Math.cos(ang)) / (R * Math.cos(centerLat * Math.PI / 180))
            const dy = (radiusMeters * Math.sin(ang)) / R
            const lng = centerLng + (dx * 180 / Math.PI)
            const lat = centerLat + (dy * 180 / Math.PI)
            points.push([lng, lat])
        }
        points.push(points[0])
        return { type: 'Polygon', coordinates: [points] }
    }

    public beginEditSelection(): void {
        console.debug('[NFZ] beginEditSelection: 开始编辑选择模式')
        this.mode = 'edit'
        this.clearTemp()
        this.destroyHandler()

        // 设置点击事件监听器来选择要编辑的禁飞区
        const Cesium = (window as any).Cesium
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)

        this.handler.setInputAction((event: any) => {
            try {
                if (!event.position || typeof event.position.x !== 'number' || typeof event.position.y !== 'number') { return }
                const pickedObject = this.viewer.scene.pick(event.position)
                if (pickedObject && pickedObject.id && pickedObject.id.properties) {
                    const zoneId = pickedObject.id.properties.zoneId?.getValue?.()
                    if (zoneId) {
                        console.debug('[NFZ] 选择了禁飞区进行编辑:', zoneId)
                        this.enterEdit(zoneId)
                        return
                    }
                }
                // 如果没有点击到禁飞区，显示提示
                console.debug('[NFZ] 未点击到禁飞区，请点击地图上的禁飞区开始编辑')
            } catch (error) {
                console.error('[NFZ] 编辑选择错误:', error)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        // 触发编辑选择开始事件
        try {
            window.dispatchEvent(new CustomEvent('nfz:edit-selection-started'))
        } catch (error) {
            console.error('[NFZ] 触发编辑选择开始事件失败:', error)
        }
    }

    public enterEdit(entityId: string): void {
        console.debug('[NFZ] enterEdit: 进入编辑模式，entityId=', entityId)
        this.mode = 'edit'
        this.editEntityId = entityId
        this.clearTemp()
        this.destroyHandler()

        const ent = this.idToEntity.get(entityId)
        if (!ent || !ent.polygon) {
            console.error('[NFZ] 找不到要编辑的实体:', entityId)
            return
        }

        const hier = ent.polygon.hierarchy?.getValue?.() || ent.polygon.hierarchy
        const positions = (hier?.positions || hier) as any[]
        if (!positions || positions.length < 3) return

        const arr = positions.slice()
        const Cesium = (window as any).Cesium
        if (arr.length > 1 && Cesium.Cartesian3.equals(arr[0], arr[arr.length - 1])) arr.pop()
        this.tempPositions = arr

        const colorCss = ent.properties?.zoneColor?.getValue?.() || '#00FFFF'
        const zoneColor = Cesium.Color.fromCssColorString(colorCss)

        // 创建更明显的边界点
        this.tempPositions.forEach((p, i) => {
            const handle = this.viewer.entities.add({
                position: p,
                point: {
                    pixelSize: 20,
                    color: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    show: true,
                    scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 10000, 0.5)
                },
                name: 'nfz_edit_handle',
                properties: { editHandleIndex: i }
            })
            this.tempPointEntities.push(handle)
            this.editHandleEntities[i] = handle
        })

        // 创建边界线预览
        const boundaryLine = this.viewer.entities.add({
            polyline: {
                positions: new Cesium.CallbackProperty(() => {
                    return [...this.tempPositions, this.tempPositions[0]] // 闭合边界线
                }, false),
                width: 4,
                material: Cesium.Color.YELLOW.withAlpha(0.8),
                clampToGround: true,
                show: true
            },
            name: 'nfz_edit_boundary'
        })
        this.tempPointEntities.push(boundaryLine)

        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
        let dragIndex: number | null = null
        let isDragging = false

        // 鼠标按下事件
        this.handler.setInputAction((event: any) => {
            const pickedObject = this.viewer.scene.pick(event.position)
            if (pickedObject && pickedObject.id && pickedObject.id.properties) {
                const idx = pickedObject.id.properties.editHandleIndex?.getValue?.()
                if (typeof idx === 'number') {
                    dragIndex = idx
                    isDragging = true
                    this.viewer.canvas.style.cursor = 'grabbing'
                    // 开始拖拽边界点时禁用相机控制
                    if (this.viewer?.scene?.screenSpaceCameraController) {
                        this.viewer.scene.screenSpaceCameraController.enableInputs = false
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

        // 鼠标移动事件
        this.handler.setInputAction((event: any) => {
            if (isDragging && dragIndex !== null && this.tempPositions[dragIndex]) {
                const pos = this.pickCartesian(event.endPosition)
                if (Cesium.defined(pos)) {
                    this.tempPositions[dragIndex] = pos
                    try {
                        const handleEnt = this.editHandleEntities[dragIndex]
                        if (handleEnt) handleEnt.position = pos
                    } catch { }
                    try {
                        ent.polygon.hierarchy = new Cesium.PolygonHierarchy(this.tempPositions)
                    } catch { }
                }
            } else if (!isDragging) {
                // 悬停效果
                const pickedObject = this.viewer.scene.pick(event.endPosition)
                if (pickedObject && pickedObject.id && pickedObject.id.properties) {
                    const idx = pickedObject.id.properties.editHandleIndex?.getValue?.()
                    if (typeof idx === 'number') {
                        this.viewer.canvas.style.cursor = 'grab'
                    } else {
                        this.viewer.canvas.style.cursor = 'default'
                    }
                } else {
                    this.viewer.canvas.style.cursor = 'default'
                }
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        // 鼠标释放事件
        this.handler.setInputAction(() => {
            if (isDragging) {
                // 结束拖拽边界点时恢复相机控制
                if (this.viewer?.scene?.screenSpaceCameraController) {
                    this.viewer.scene.screenSpaceCameraController.enableInputs = true
                }
            }
            dragIndex = null
            isDragging = false
            this.viewer.canvas.style.cursor = 'default'
        }, Cesium.ScreenSpaceEventType.LEFT_UP)

        // 右键取消编辑
        this.handler.setInputAction(() => {
            this.cancel()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

        // ESC键取消编辑
        this.handler.setInputAction((event: any) => {
            if (event.key === 'Escape' || event.keyCode === 27) {
                this.cancel()
            }
        }, Cesium.ScreenSpaceEventType.KEY_DOWN)

        // 发送编辑开始事件
        try {
            window.dispatchEvent(new CustomEvent('nfz:edit-started', {
                detail: { entityId, positions: this.tempPositions.length }
            }))
        } catch { }
    }

    public cancel(): void {
        this.destroyHandler()
        this.clearTemp()
        this.mode = 'idle'
        this.editEntityId = null

        // 确保相机控制是启用的
        if (this.viewer?.scene?.screenSpaceCameraController) {
            this.viewer.scene.screenSpaceCameraController.enableInputs = true
        }

        // 恢复默认光标
        if (this.viewer?.canvas) {
            this.viewer.canvas.style.cursor = 'default'
        }

        // 发送编辑取消事件
        try {
            window.dispatchEvent(new CustomEvent('nfz:edit-cancelled'))
        } catch { }
    }

    public save(): GeoJsonPolygonType | null {
        let g = this.lastGeoJson
        if (this.mode === 'edit' || (this.editEntityId && this.tempPositions.length >= 3)) {
            const fixed = this.tempPositions.slice();
            fixed.push(this.tempPositions[0])
            const coords = this.toLngLatArr(fixed)
            let norm = this.normalizeLngLatRing(coords)
            norm = this.sortRingByAngle(norm)
            if (norm.length >= 3) {
                g = { type: 'Polygon', coordinates: [norm] }

                // 如果是编辑模式，更新原始实体的几何形状
                if (this.mode === 'edit' && this.editEntityId) {
                    const ent = this.idToEntity.get(this.editEntityId)
                    if (ent && ent.polygon) {
                        try {
                            ent.polygon.hierarchy = new (window as any).Cesium.PolygonHierarchy(this.tempPositions)
                            console.debug('[NFZ] 已更新禁飞区几何形状:', this.editEntityId)
                        } catch (error) {
                            console.error('[NFZ] 更新禁飞区几何形状失败:', error)
                        }
                    }
                }
            }
        }
        // 调用 cancel 并确保临时元素与坐标全部清除
        this.cancel()
        this.clearTemp()
        return g || null
    }

    public saveEdit(): boolean {
        if (this.mode !== 'edit' || !this.editEntityId || this.tempPositions.length < 3) {
            console.warn('[NFZ] 无法保存编辑：模式不是编辑模式或数据不足')
            return false
        }

        try {
            const ent = this.idToEntity.get(this.editEntityId)
            if (ent && ent.polygon) {
                // 先保存实体ID和几何形状（因为在调用this.save()后会清空状态）
                const savedEntityId = this.editEntityId

                // 更新实体的几何形状
                ent.polygon.hierarchy = new (window as any).Cesium.PolygonHierarchy(this.tempPositions)

                // 生成新的几何形状（这会调用cancel清理临时状态）
                const newGeometry = this.generateGeometryFromTempPositions()

                // 触发编辑完成事件
                window.dispatchEvent(new CustomEvent('nfz:edit-finished', {
                    detail: {
                        entityId: savedEntityId,
                        geometry: newGeometry
                    }
                }))

                console.debug('[NFZ] 编辑已保存:', savedEntityId)
                this.cancel()
                return true
            }
        } catch (error) {
            console.error('[NFZ] 保存编辑失败:', error)
        }

        return false
    }

    private generateGeometryFromTempPositions(): GeoJsonPolygonType | null {
        if (this.tempPositions.length < 3) return null

        const fixed = this.tempPositions.slice()
        fixed.push(this.tempPositions[0])
        const coords = this.toLngLatArr(fixed)
        let norm = this.normalizeLngLatRing(coords)
        norm = this.sortRingByAngle(norm)

        if (norm.length >= 3) {
            return { type: 'Polygon', coordinates: [norm] }
        }

        return null
    }

    public renderZones(zones: INoFlyZone[]): void {
        console.debug('[Drawing] renderZones called with', zones.length, 'zones')
        this.idToEntity.forEach(ent => this.viewer.entities.remove(ent))
        this.idToEntity.clear()
        const Cesium = (window as any).Cesium
        zones.forEach((z, index) => {
            console.debug('[Drawing] Rendering zone', index, ':', z.name, 'id:', z.id)
            const coords = z.geometry.coordinates
            const rings = z.geometry.type === 'Polygon' ? (coords as number[][][]) : (coords as number[][][][])[0]
            const ring0 = this.normalizeLngLatRing(rings[0])
            if (!ring0 || ring0.length < 3) { return }
            const plainRing = (ring0 as any[]).map((pt: any) => [Number(pt[0]), Number(pt[1])])
            const positions = Cesium.Cartesian3.fromDegreesArray((plainRing as number[][]).flat())
            const hierarchy = new Cesium.PolygonHierarchy(positions)
            let minAlt = Number((z as any).minAltitude ?? 0)
            if (!isFinite(minAlt)) minAlt = 0
            let maxAltCandidate: any = (z as any).maxAltitude
            let maxAlt = Number(maxAltCandidate ?? (minAlt + 1000))
            if (!isFinite(maxAlt)) maxAlt = minAlt + 300
            if (maxAlt <= minAlt) maxAlt = minAlt + 300
            const ent = this.viewer.entities.add({
                id: z.id,
                polygon: new Cesium.PolygonGraphics({
                    hierarchy,
                    material: Cesium.Color.fromCssColorString(this.convertColorFormat(z.color || '#FF0000')).withAlpha(0.6),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(this.convertColorFormat(z.color || '#FF0000')),
                    outlineWidth: 3,
                    height: minAlt,
                    extrudedHeight: maxAlt,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                    extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                    classificationType: Cesium.ClassificationType.BOTH
                }),
                label: {
                    text: z.name || '禁飞区',
                    font: '12pt sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -30),
                    scale: 0.8,
                    scaleByDistance: new Cesium.NearFarScalar(1000, 0.8, 10000, 0.4),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                properties: {
                    zoneId: z.id,
                    zoneName: z.name,
                    zoneType: z.type,
                    zoneDescription: z.description,
                    zoneColor: z.color
                }
            })
            if (z.id) this.idToEntity.set(z.id, ent)
            console.debug('[Drawing] Zone', z.name, 'rendered successfully, entity id:', ent.id)
        })
        console.debug('[Drawing] renderZones completed, total entities:', this.idToEntity.size)
    }

    public getRenderedZoneIds(): string[] {
        return Array.from(this.idToEntity.keys())
    }

    /**
     * 切换特定类型的禁飞区显示/隐藏
     * @param type 禁飞区类型
     */
    public toggleZoneType(type: string): void {
        console.debug('[Drawing] toggleZoneType:', type)

        // 遍历所有实体，切换指定类型的显示状态
        this.idToEntity.forEach((entity, zoneId) => {
            const zoneType = entity.properties?.zoneType?.getValue?.() || entity.properties?.zoneType
            if (zoneType === type) {
                entity.show = !entity.show
                console.debug('[Drawing] Toggled zone', zoneId, 'visibility to', entity.show)
            }
        })
    }

    /**
     * 更新可见的禁飞区类型
     * @param visibleTypes 可见的类型数组
     */
    public updateVisibleTypes(visibleTypes: string[]): void {
        console.debug('[Drawing] updateVisibleTypes:', visibleTypes)

        // 遍历所有实体，根据类型设置显示状态
        this.idToEntity.forEach((entity, zoneId) => {
            const zoneType = entity.properties?.zoneType?.getValue?.() || entity.properties?.zoneType
            const shouldShow = visibleTypes.includes(zoneType)
            entity.show = shouldShow
            console.debug('[Drawing] Set zone', zoneId, 'type', zoneType, 'visibility to', shouldShow)
        })
    }

    /**
     * 获取指定类型的禁飞区实体
     * @param type 禁飞区类型
     * @returns 该类型的实体数组
     */
    public getZonesByType(type: string): any[] {
        const zones: any[] = []
        this.idToEntity.forEach((entity) => {
            const zoneType = entity.properties?.zoneType?.getValue?.() || entity.properties?.zoneType
            if (zoneType === type) {
                zones.push(entity)
            }
        })
        return zones
    }

    /**
     * 显示所有禁飞区
     */
    public showAllZones(): void {
        console.debug('[Drawing] showAllZones')
        this.idToEntity.forEach((entity) => {
            entity.show = true
        })
    }

    /**
     * 隐藏所有禁飞区
     */
    public hideAllZones(): void {
        console.debug('[Drawing] hideAllZones')
        this.idToEntity.forEach((entity) => {
            entity.show = false
        })
    }
    public highlight(id?: string): void {
        const Cesium = (window as any).Cesium
        this.idToEntity.forEach((ent, entId) => {
            const on = id && entId === id
            if (ent.polygon) {
                const originalColor = ent.properties?.zoneColor?.getValue?.() || '#FF0000'
                ent.polygon.outlineColor = on ? Cesium.Color.YELLOW : Cesium.Color.fromCssColorString(this.convertColorFormat(originalColor))
                ent.polygon.material = on ? Cesium.Color.YELLOW.withAlpha(0.4) : Cesium.Color.fromCssColorString(this.convertColorFormat(originalColor)).withAlpha(0.25)
                ent.polygon.outlineWidth = on ? 3 : 1
            }
        })
        if (id) {
            const ent = this.idToEntity.get(id)
            if (ent && ent.polygon?.hierarchy) {
                try {
                    const hierProp = ent.polygon.hierarchy
                    const value = hierProp?.getValue ? hierProp.getValue((window as any).Cesium.JulianDate.now()) : hierProp
                    const positions = (value && (value.positions || value)) as any[]
                    if (Array.isArray(positions) && positions.length >= 3) {
                        const rect = (window as any).Cesium.Rectangle.fromCartesianArray(positions)
                        this.viewer.camera.flyTo({ destination: rect, duration: 1.0 })
                    }
                } catch { }
            }
        }
    }

    public focus(id: string, paddingRatio: number = 1.1): void {
        const Cesium = (window as any).Cesium
        const ent = this.idToEntity.get(id)
        if (!ent || !ent.polygon?.hierarchy) return
        try {
            const hierProp = ent.polygon.hierarchy
            const value = hierProp?.getValue ? hierProp.getValue(Cesium.JulianDate.now()) : hierProp
            const positions = (value && (value.positions || value)) as any[]
            if (!Array.isArray(positions) || positions.length < 3) return
            let rect = Cesium.Rectangle.fromCartesianArray(positions)
            if (paddingRatio && paddingRatio > 1) {
                const west = rect.west, east = rect.east, south = rect.south, north = rect.north
                const width = (east - west) * paddingRatio
                const height = (north - south) * paddingRatio
                const cx = (east + west) / 2
                const cy = (north + south) / 2
                rect = new Cesium.Rectangle(cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2)
            }
            this.viewer.camera.flyTo({ destination: rect, duration: 0.8 })
        } catch { }
    }

    public remove(id: string): void {
        const ent = this.idToEntity.get(id)
        if (ent) {
            this.viewer.entities.remove(ent)
            this.idToEntity.delete(id)
        }
    }

    public setupInteraction(): void {
        if (!this.viewer) return

        // 确保相机控制是启用的
        if (this.viewer?.scene?.screenSpaceCameraController) {
            this.viewer.scene.screenSpaceCameraController.enableInputs = true
            this.viewer.scene.screenSpaceCameraController.enableRotate = true
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true
            this.viewer.scene.screenSpaceCameraController.enableZoom = true
        }

        // 不设置任何事件监听器，让地图保持默认交互
        // 事件监听器将在需要时通过其他方法设置
        console.debug('[NFZ] setupInteraction: 确保地图交互已启用，不设置额外的事件监听器')
    }

    public destroy(): void {
        this.destroyHandler()
        this.tempPointEntities.forEach(ent => this.viewer.entities.remove(ent))
        this.tempPointEntities = []
        if (this.dynamicLine) { try { this.viewer.entities.remove(this.dynamicLine) } catch { } this.dynamicLine = null }
        this.mousePosition = null
        if (this.curveState?.preview) { try { this.viewer.entities.remove(this.curveState.preview) } catch { } }
        this.curveState = null
        this.idToEntity.forEach(ent => this.viewer.entities.remove(ent))
        this.idToEntity.clear()
        this.mode = 'idle'
        this.editEntityId = null
        this.lastGeoJson = null

        // 确保恢复地图交互
        if (this.viewer?.scene?.screenSpaceCameraController) {
            this.viewer.scene.screenSpaceCameraController.enableInputs = true
            this.viewer.scene.screenSpaceCameraController.enableRotate = true
            this.viewer.scene.screenSpaceCameraController.enableTranslate = true
            this.viewer.scene.screenSpaceCameraController.enableZoom = true
        }
    }
}

export function createNoFlyZoneDrawing(viewer: any): NoFlyZoneDrawing {
    return new NoFlyZoneDrawing(viewer)
}
