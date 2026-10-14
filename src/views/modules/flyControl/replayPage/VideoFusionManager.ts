/**
 * 视频融合管理器
 * 负责实现视频与地图的融合显示，包括相机视锥渲染和地面视频投影
 */

// Cesium 类型声明
declare const Cesium: any;

/**
 * 轨迹点数据接口
 */
interface TrajectoryPoint {
  index: number;
  position: {
    longitude: number;
    latitude: number;
    elevation: number;  // 海拔高度
    height: number;     // 相对高度
  };
  attitude: {
    heading: number;
    pitch: number;
    roll: number;
  };
  gimbalAttitude: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  flightStatus: {
    horizontalSpeed: number;
    verticalSpeed: number;
    battery: number;
  };
  camera?: {
    zoomFactor: number;
    fov: number;
  };
  timestamp?: string | number;
  rawData?: any;
}

/**
 * 视锥参数接口
 */
interface FrustumParams {
  position: {
    longitude: number;
    latitude: number;
    height: number;
  };
  orientation: any;
  localRotation: any;
  enuToWorld: any;
  fovH: number;
  fovV: number;
  fov: number;
  distance: number;
  aspectRatio: number;
  gimbalPitch: number;
}

/**
 * 视频融合管理器类
 */
export class VideoFusionManager {
  private viewer: any;
  private videoElement: HTMLVideoElement | null = null;
  private isEnabled: boolean = false;
  private currentPoint: TrajectoryPoint | null = null;

  // 视锥相关
  private frustumLines: any[] = [];
  private groundProjectionEntity: any = null;
  private isProjectionEnabled: boolean = true;

  // DJI 相机参数
  private readonly FOV_HORIZONTAL = 82.1;  // 水平视场角
  private readonly FOV_VERTICAL = 53.8;    // 垂直视场角

  // 性能优化：节流相关
  private lastProjectionUpdateTime: number = 0;
  private readonly PROJECTION_UPDATE_INTERVAL = 200; // 投影更新间隔（毫秒）- 增加间隔减少抖动

  // 缓存当前位置和角点，用于动态更新
  private currentApex: any = null;
  private currentCorners: any[] = [];
  private currentGroundPoints: any[] = [];

  // 视频结束标志
  private videoEnded: boolean = false;

  constructor(viewer: any) {
    this.viewer = viewer;
  }

  /**
   * 设置视频元素
   */
  setVideoElement(videoElement: HTMLVideoElement | null) {
    this.videoElement = videoElement;

    // 重置视频结束标志（新视频）
    this.videoEnded = false;

    // 清空之前的投影缓存（避免使用旧视频的投影数据）
    this.currentGroundPoints = [];

    // 确保视频元素设置了 crossOrigin 属性
    if (videoElement && !videoElement.crossOrigin) {
      videoElement.crossOrigin = 'anonymous';
    }
  }

  /**
   * 启用/禁用视频融合
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;

    if (!enabled) {
      // 关闭融合时，先设置 videoEnded 标志
      this.videoEnded = true;

      // 清空地面点缓存（确保 CallbackProperty 立即返回空数组）
      this.currentGroundPoints = [];

      // 清除所有视锥和投影实体
      this.clearFrustum();
    } else {
      // 重新开启时，检查视频状态
      if (this.videoElement && this.videoElement.ended) {
        this.isEnabled = false;
        return;
      }

      // 先清除旧的投影（避免残留）
      if (this.groundProjectionEntity) {
        try {
          this.viewer.entities.remove(this.groundProjectionEntity);
        } catch (e) {}
        this.groundProjectionEntity = null;
      }

      // 清除旧的视锥线框
      this.frustumLines.forEach(entity => {
        try {
          this.viewer.entities.remove(entity);
        } catch (e) {}
      });
      this.frustumLines = [];

      // 重置状态
      this.videoEnded = false;
      this.currentGroundPoints = [];
      this.lastProjectionUpdateTime = 0;

      if (this.currentPoint) {
        // 如果已有当前点，重新渲染
        this.updateFrustum(this.currentPoint);
      }
    }
  }

  /**
   * 获取当前启用状态
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 更新相机视锥和地面投影
   */
  updateFrustum(point: TrajectoryPoint) {
    this.currentPoint = point;

    if (!this.isEnabled) {
      return;
    }

    // 优先检查视频结束标志，如果已结束则不再更新
    if (this.videoEnded) {
      return;
    }

    // 检查视频是否已结束，如果结束则设置标志并清除投影
    if (this.videoElement && this.videoElement.ended) {
      this.videoEnded = true;
      this.currentGroundPoints = [];
      this.clearFrustum();
      this.isEnabled = false;
      return;
    }

    // 节流：避免更新过于频繁
    const now = Date.now();
    if (now - this.lastProjectionUpdateTime < this.PROJECTION_UPDATE_INTERVAL) {
      return;
    }
    this.lastProjectionUpdateTime = now;

    // 计算视锥参数
    const frustumParams = this.calculateFrustumParams(point);

    // 更新或创建视锥实体（复用而不是删除重建）
    this.updateOrCreateFrustum(frustumParams);
  }

  /**
   * 计算视锥参数
   */
  private calculateFrustumParams(point: TrajectoryPoint): FrustumParams {
    // 相机位置（使用海拔高度）
    const camPosition = {
      longitude: point.position.longitude,
      latitude: point.position.latitude,
      height: point.position.elevation
    };

    // 飞机姿态和云台姿态
    const droneHeading = point.attitude.heading;
    const gimbalPitch = point.gimbalAttitude.pitch;
    const gimbalRoll = point.gimbalAttitude.roll || 0;

    // 创建相机位置
    const pos = Cesium.Cartesian3.fromDegrees(
      camPosition.longitude,
      camPosition.latitude,
      camPosition.height
    );

    // 手动构建旋转矩阵（ENU坐标系）
    const headingRad = Cesium.Math.toRadians(droneHeading);
    const pitchRad = Cesium.Math.toRadians(gimbalPitch);
    const rollRad = Cesium.Math.toRadians(gimbalRoll);

    // 创建旋转矩阵
    const rotZ = Cesium.Matrix3.fromRotationZ(-headingRad);
    const rotX = Cesium.Matrix3.fromRotationX(pitchRad);
    const rotY = Cesium.Matrix3.fromRotationY(rollRad);

    // 组合旋转
    let rotMatrix = new Cesium.Matrix3();
    Cesium.Matrix3.multiply(rotZ, rotX, rotMatrix);
    Cesium.Matrix3.multiply(rotMatrix, rotY, rotMatrix);

    // 转换到世界坐标系
    const enuToFixed = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
    const enuRotation = Cesium.Matrix4.getMatrix3(enuToFixed, new Cesium.Matrix3());

    const worldRotation = Cesium.Matrix3.multiply(enuRotation, rotMatrix, new Cesium.Matrix3());
    const cameraOrientation = Cesium.Quaternion.fromRotationMatrix(worldRotation);

    // 相机视场角
    const fovHRad = Cesium.Math.toRadians(this.FOV_HORIZONTAL);
    const fovVRad = Cesium.Math.toRadians(this.FOV_VERTICAL);

    // 使用相对起飞点的高度
    const altitude = point.position.height;

    // 地面覆盖范围计算
    let groundWidth: number;
    let groundHeight: number;
    let frustumDistance: number;

    const pitchAbsRad = Math.abs(Cesium.Math.toRadians(gimbalPitch));
    const cosPitch = Math.max(0.01, Math.cos(pitchAbsRad));

    if (Math.abs(gimbalPitch + 90) < 10) {
      // 垂直向下拍摄
      groundWidth = 2 * altitude * Math.tan(fovHRad / 2) / cosPitch;
      groundHeight = 2 * altitude * Math.tan(fovVRad / 2) / cosPitch;

      const diagonal = Math.sqrt(groundWidth * groundWidth + groundHeight * groundHeight);
      frustumDistance = diagonal / 2 * 1.2;
    } else {
      // 斜向拍摄
      groundWidth = 2 * altitude * Math.tan(fovHRad / 2) / cosPitch;
      groundHeight = 2 * altitude * Math.tan(fovVRad / 2) / cosPitch;

      const diagonal = Math.sqrt(groundWidth * groundWidth + groundHeight * groundHeight);
      frustumDistance = diagonal / 2 * 1.5;
    }

    // 确保最小距离
    frustumDistance = Math.max(altitude * 1.5, frustumDistance);

    return {
      position: camPosition,
      orientation: cameraOrientation,
      localRotation: rotMatrix,
      enuToWorld: enuRotation,
      fovH: fovHRad,
      fovV: fovVRad,
      fov: fovHRad,
      distance: frustumDistance,
      aspectRatio: groundWidth / groundHeight,
      gimbalPitch: gimbalPitch
    };
  }

  /**
   * 更新或创建视锥实体（复用实体，避免闪烁）
   */
  private updateOrCreateFrustum(params: FrustumParams) {
    const position = Cesium.Cartesian3.fromDegrees(
      params.position.longitude,
      params.position.latitude,
      params.position.height
    );

    // 计算视锥的四个角点
    const corners = this.calculateFrustumCorners(params);

    // 更新缓存的位置和角点
    this.currentApex = position;
    this.currentCorners = corners;

    // 更新或创建视锥线框
    this.updateOrCreateFrustumLines();

    // 更新或创建地面视频投影
    if (this.isProjectionEnabled && this.videoElement) {
      // 计算地面交点
      const groundPoints = this.calculateGroundIntersection(params);
      this.currentGroundPoints = groundPoints;
      this.updateOrCreateGroundProjection(params.gimbalPitch);
    }
  }

  /**
   * 计算视锥四个角点
   */
  private calculateFrustumCorners(params: FrustumParams): any[] {
    const position = Cesium.Cartesian3.fromDegrees(
      params.position.longitude,
      params.position.latitude,
      params.position.height
    );

    const halfFovH = params.fovH / 2;
    const halfFovV = params.fovV / 2;
    const distance = params.distance;

    const tanHalfFovH = Math.tan(halfFovH);
    const tanHalfFovV = Math.tan(halfFovV);

    // 在ENU坐标系中定义视锥角点
    const corners = [
      new Cesium.Cartesian3(tanHalfFovH, 1, tanHalfFovV),      // 右上
      new Cesium.Cartesian3(-tanHalfFovH, 1, tanHalfFovV),     // 左上
      new Cesium.Cartesian3(-tanHalfFovH, 1, -tanHalfFovV),    // 左下
      new Cesium.Cartesian3(tanHalfFovH, 1, -tanHalfFovV)      // 右下
    ];

    const localRotation = params.localRotation;
    const enuToWorld = params.enuToWorld;

    // 将角点从局部坐标系转换到世界坐标系
    const worldCorners = corners.map((corner) => {
      const dir = Cesium.Cartesian3.clone(corner);
      Cesium.Cartesian3.normalize(dir, dir);
      Cesium.Cartesian3.multiplyByScalar(dir, distance, dir);

      const rotatedLocalDir = Cesium.Matrix3.multiplyByVector(localRotation, dir, new Cesium.Cartesian3());
      const worldDir = Cesium.Matrix3.multiplyByVector(enuToWorld, rotatedLocalDir, new Cesium.Cartesian3());
      const worldPos = Cesium.Cartesian3.add(position, worldDir, new Cesium.Cartesian3());

      return worldPos;
    });

    return worldCorners;
  }

  /**
   * 更新或创建视锥线框（使用 CallbackProperty 避免闪烁）
   */
  private updateOrCreateFrustumLines() {
    // 如果已经有线框，位置会通过 CallbackProperty 自动更新，无需手动更新
    if (this.frustumLines.length === 8) {
      return; // 已创建，CallbackProperty 会自动更新
    }

    // 首次创建线框，使用 CallbackProperty 动态获取位置
    this.frustumLines = [];

    // 从相机到四个角的线
    for (let i = 0; i < 4; i++) {
      const lineIndex = i;
      const line = this.viewer.entities.add({
        name: `视锥边 ${i + 1}`,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            if (this.currentApex && this.currentCorners[lineIndex]) {
              return [this.currentApex, this.currentCorners[lineIndex]];
            }
            return [];
          }, false),
          width: 2,
          material: Cesium.Color.YELLOW.withAlpha(0.8)
        }
      });
      this.frustumLines.push(line);
    }

    // 远平面的四条边
    for (let i = 0; i < 4; i++) {
      const lineIndex = i;
      const nextI = (i + 1) % 4;
      const line = this.viewer.entities.add({
        name: `视锥远平面边 ${i + 1}`,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            if (this.currentCorners[lineIndex] && this.currentCorners[nextI]) {
              return [this.currentCorners[lineIndex], this.currentCorners[nextI]];
            }
            return [];
          }, false),
          width: 2,
          material: Cesium.Color.YELLOW.withAlpha(0.8)
        }
      });
      this.frustumLines.push(line);
    }
  }

  /**
   * 计算视锥与地面的交点
   */
  private calculateGroundIntersection(params: FrustumParams): any[] {
    const cameraPos = Cesium.Cartesian3.fromDegrees(
      params.position.longitude,
      params.position.latitude,
      params.position.height
    );

    const corners = this.calculateFrustumCorners(params);
    const groundPoints: any[] = [];
    const ellipsoid = this.viewer.scene.globe.ellipsoid;

    // 对每个角点进行射线与地球椭球面求交
    corners.forEach((corner) => {
      const direction = Cesium.Cartesian3.subtract(corner, cameraPos, new Cesium.Cartesian3());
      Cesium.Cartesian3.normalize(direction, direction);

      const ray = new Cesium.Ray(cameraPos, direction);
      const intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);

      if (intersection) {
        const intersectionPoint = Cesium.Ray.getPoint(ray, intersection.start);
        groundPoints.push(intersectionPoint);
      }
    });

    return groundPoints;
  }

  /**
   * 更新或创建地面视频投影（使用 CallbackProperty 避免闪烁）
   */
  private updateOrCreateGroundProjection(gimbalPitch: number) {
    // 首先检查视频结束标志
    if (this.videoEnded) {
      // 如果视频已结束，清除投影实体
      if (this.groundProjectionEntity) {
        this.viewer.entities.remove(this.groundProjectionEntity);
        this.groundProjectionEntity = null;
      }
      // 清空地面点缓存
      this.currentGroundPoints = [];
      return;
    }

    const isVerticalDown = Math.abs(gimbalPitch + 90) < 10;
    const minPoints = isVerticalDown ? 4 : 2;

    if (this.currentGroundPoints.length < minPoints) {
      return;
    }

    if (!this.videoElement) {
      return;
    }
    // 检查视频是否准备好且未结束
    if (this.videoElement.readyState < 2 || this.videoElement.ended) {
      // 视频已结束，设置标志并清除投影
      if (this.videoElement.ended && !this.videoEnded) {
        this.videoEnded = true;
        // 清空地面点缓存
        this.currentGroundPoints = [];
      }

      if (this.groundProjectionEntity) {
        this.viewer.entities.remove(this.groundProjectionEntity);
        this.groundProjectionEntity = null;
      }
      return;
    }

    try {
      // 如果投影实体已存在，检查视频状态后再决定是否继续
      if (this.groundProjectionEntity) {
        // 即使实体存在，也要检查视频状态
        if (this.videoElement.ended) {
          this.videoEnded = true;
          this.viewer.entities.remove(this.groundProjectionEntity);
          this.groundProjectionEntity = null;
          this.currentGroundPoints = [];
        }
        return; // 已创建，CallbackProperty 会自动更新
      }

      // 首次创建：创建视频纹理材质
      const videoMaterial = new Cesium.ImageMaterialProperty({
        image: this.videoElement,
        transparent: true
      });

      // 创建地面投影多边形，使用 CallbackProperty 动态获取顶点
      this.groundProjectionEntity = this.viewer.entities.add({
        name: '视频地面投影',
        polygon: {
          hierarchy: new Cesium.CallbackProperty(() => {
            // 动态检查视频状态和结束标志
            // 如果视频已结束或标记为结束，立即返回空（这样投影会自动消失）
            if (this.videoEnded ||
                !this.videoElement ||
                this.videoElement.ended ||
                this.currentGroundPoints.length === 0) {
              return new Cesium.PolygonHierarchy([]); // 返回空，投影消失
            }

            // 视频正常播放时，返回地面点
            return new Cesium.PolygonHierarchy(this.currentGroundPoints);
          }, false),
          material: videoMaterial,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          outline: true,
          outlineColor: Cesium.Color.CYAN,
          outlineWidth: 2,
          shadows: Cesium.ShadowMode.DISABLED
        }
      });
    } catch (error) {
      if (!this.groundProjectionEntity) {
        console.error('创建视频投影失败:', error);
        if (error instanceof DOMException && error.name === 'SecurityError') {
          console.error('⚠️ 跨域安全错误: 请确保视频服务器支持 CORS');
        }
      }
    }
  }

  /**
   * 清除视锥和投影
   */
  private clearFrustum() {
    // 清除视锥线框
    this.frustumLines.forEach(entity => {
      try {
        this.viewer.entities.remove(entity);
      } catch (e) {}
    });
    this.frustumLines = [];

    // 清除地面投影
    if (this.groundProjectionEntity) {
      try {
        this.viewer.entities.remove(this.groundProjectionEntity);
      } catch (e) {}
      this.groundProjectionEntity = null;
    }

    // 清空缓存
    this.currentGroundPoints = [];
    this.currentCorners = [];
    this.currentApex = null;
  }

  /**
   * 从飞行记录数据转换为轨迹点数据
   */
  static convertFromFlightRecord(record: any, index: number): TrajectoryPoint {
    return {
      index,
      position: {
        longitude: record.positionInfo?.longitude || 0,
        latitude: record.positionInfo?.latitude || 0,
        elevation: record.positionInfo?.height || 0,
        height: record.positionInfo?.elevation || 0
      },
      attitude: {
        heading: record.attitudeInfo?.attitudeHead || 0,
        pitch: record.attitudeInfo?.attitudePitch || 0,
        roll: record.attitudeInfo?.attitudeRoll || 0
      },
      gimbalAttitude: {
        pitch: record.deviceInfo?.dockPayloads?.[0]?.gimbalPitch || 0,
        roll: record.deviceInfo?.dockPayloads?.[0]?.gimbalRoll || 0,
        yaw: record.deviceInfo?.dockPayloads?.[0]?.gimbalYaw || 0
      },
      flightStatus: {
        horizontalSpeed: record.flightStatusInfo?.horizontalSpeed || 0,
        verticalSpeed: record.flightStatusInfo?.verticalSpeed || 0,
        battery: record.flightStatusInfo?.battery?.capacityPercent || 0
      },
      camera: {
        zoomFactor: record.deviceInfo?.cameras?.[0]?.zoomFactor || 1.0,
        fov: 60 / (record.deviceInfo?.cameras?.[0]?.zoomFactor || 1.0)
      },
      timestamp: record.time || record.createTime,
      rawData: record
    };
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.clearFrustum();
    this.videoElement = null;
    this.currentPoint = null;
  }
}

