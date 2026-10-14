import { WebRTCConnection } from "@/utils/community/webrtc_connection.ts";
import {
  $changeIceCandidate,
  deviceLiveSwitchDock,
  deviceLiveSwitchDrone,
  startAirportLive,
  startDroneLive,
  stopLive,
} from "@/api/flyControl/device.ts";
import urlConfig from "@/public-path.ts";


interface LiveStreamOptions {
  deviceId?: number | string;
  subDeviceSn?: number | string;
  isDock?: boolean;
  camerasList?: Array<string>;
  jobId?: string | null;
  first?: boolean,
  videoId?: number | null;
}

export class WebRTCLiveService {
  private webrtcConnection: WebRTCConnection | null = null;
  private videoId: string | number | null = null;
  private originLiveUrl: string | null = null;
  private isDock: boolean | undefined = false;
  private deviceId: string | null = null;
  private subDeviceSn: string | null = null;
  private timer: number | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private abortController: AbortController | null = null; // 用于中断异步操作
  private currentRetryPromise: Promise<any> | null = null; // 当前重试的Promise

  /**
   * 开始直播流
   * @param options 直播配置选项
   * @param videoElement 视频DOM元素
   * @param callbacks 状态回调
   */
  async start(
    options: LiveStreamOptions,
    videoElement: HTMLVideoElement,
    callbacks: {
      onStatusChange: (status: string) => void;
      onError: (error: string) => void;
    }
  ) {
    try {
      // 先停止之前的连接，确保完全清理
      await this.stop(options.first);
      this.videoId = options.videoId || this.videoId;

      // 创建新的 AbortController 用于新的连接
      this.abortController = new AbortController();

      this.isDock = options.isDock;
      this.deviceId = String(options.deviceId)
      this.subDeviceSn = String(options.subDeviceSn)
      if (!videoElement) return null

      if (options.isDock) {
        // 机场模式：first为true时调用开流接口，false时直接使用现有videoId
        if (options.first) {
          const response: any = await startAirportLive(options.deviceId as string | number)
          if (![0, 200].includes(response.code)) {
            throw new Error(response.msg || '启动直播失败');
          }
          // 获取视频ID
          const match = response?.data?.url?.match(/\/([^\/]+)$/);
          if (match?.[1]) {
            this.videoId = match[1]
          }
          this.originLiveUrl = response?.data?.url || this.originLiveUrl;
        }
        // first为false时，videoId应该已经存在，直接使用
        if (!this.videoId) {
          throw new Error('机场视频ID不存在，无法建立连接');
        }
      } else {
        // 无人机模式：first为true时调用开流接口
        if (options.first) {
          try {
            const response: any = await startDroneLive(options.subDeviceSn as string | number);
            if ([0, 200].includes(response?.code)) {
              this.originLiveUrl = response?.data?.url || this.originLiveUrl;
              const match = response?.data?.url?.match(/\/([^\/]+)$/);
              if (match?.[1]) {
                this.videoId = match[1];
              }
              if (!this.videoId && response?.data?.videoId) {
                const videoIdMatch = String(response.data.videoId).match(/\/([^\/]+)$/);
                this.videoId = videoIdMatch?.[1] || response.data.videoId;
              }
            } else {
              throw new Error(response?.msg || "启动直播失败");
            }
          } catch (error) { }
        }
        if (!this.videoId) {
          this.videoId = (options.jobId ?? options.subDeviceSn ?? null) as
            | string
            | number
            | null;
        }
        if (!this.originLiveUrl && this.videoId) {
          this.originLiveUrl = `webrtc://${urlConfig.videoRTMPUrl?.replace(/^rtmp:\/\//, "")}/live/${this.videoId}`;
        }
      }
      if (!urlConfig.websocketAble) {
        callbacks.onStatusChange('connected');
        setTimeout(() => {
          videoElement.src = `${urlConfig.videoUrl}/live/${this.videoId}.live.mp4`
        }, 100)
        return String(this.videoId)
      }

      // 初始化WebRTC连接
      this.webrtcConnection = new WebRTCConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
        ],
        reconnectAttempts: 5,
        reconnectInterval: 2000
      });

      await this.webrtcConnection.init(true);

      // 设置事件监听
      this.webrtcConnection.onStream((e) => {
        if (e.streams && e.streams.length > 0) {
          videoElement.srcObject = e.streams[0];
          videoElement.play().catch(err => {
            callbacks.onError(`视频播放失败: ${err.message}`);
          });
          callbacks.onStatusChange('connected');
        }
      });

      this.webrtcConnection.onError((error) => {
        callbacks.onError(`连接错误: ${error.message}`);
        callbacks.onStatusChange('error');
      });

      this.webrtcConnection.onStateChange((state) => {
        callbacks.onStatusChange(state.toLowerCase());
      });

      // 添加WebRTC断线重连机制
      this.webrtcConnection.onReconnectStart(() => {
        callbacks.onStatusChange('reconnecting');
      });

      this.webrtcConnection.onReconnectFailed(() => {
        callbacks.onError('WebRTC重连失败，已达到最大重试次数');
        callbacks.onStatusChange('failed');
      });

      this.webrtcConnection.onReoffer(async (offer) => {
        try {
          if (!this.videoId) {
            throw new Error('视频ID不存在，无法重连');
          }

          // 使用现有的重试机制处理重连时的SDP交换
          const sdpResponse = await this.changeIceCandidateWithRetry({ id: this.videoId }, offer.sdp);

          if (this.webrtcConnection) {
            await this.webrtcConnection.setRemoteDescription(sdpResponse as RTCSessionDescriptionInit);
            callbacks.onStatusChange('connected');
          }
        } catch (error: any) {
          // 如果是中断错误，不触发错误回调
          if (error.message === 'ABORTED') {
            return;
          }
          callbacks.onError(`WebRTC重连失败: ${error.message}`);
          callbacks.onStatusChange('failed');
        }
      });

      // 添加音频和视频接收器
      this.webrtcConnection.addAudioVideoReceivers();

      // 执行信令交换
      await this.performSignalingExchange(callbacks);

      return String(this.videoId);
    } catch (err: any) {
      // 如果是中断错误，不触发onError回调，静默处理
      if (err.message === 'ABORTED') {
        // 中断错误不应该传播到外部，也不触发错误回调
        return null;
      }

      // 其他错误正常处理
      callbacks.onError(`直播启动失败: ${err.message}`);
      callbacks.onStatusChange('error');
      return null;
    }
  }

  /**
   * 执行信令交换
   */
  private async performSignalingExchange(
    callbacks: {
      onStatusChange: (status: string) => void;
      onError: (error: string) => void;
    }
  ): Promise<void> {
    if (!this.webrtcConnection || !this.videoId) {
      throw new Error('WebRTC连接或视频ID不存在');
    }

    const offer = await this.webrtcConnection.createOffer();
    const sdpResponse = await this.changeIceCandidateWithRetry({ id: this.videoId }, offer.sdp);
    await this.webrtcConnection.setRemoteDescription(sdpResponse as RTCSessionDescriptionInit);
  }

  /**
   * 快速重新建立连接（不调用开流接口）
   */
  async reconnectSignaling(
    videoElement: HTMLVideoElement,
    callbacks: {
      onStatusChange: (status: string) => void;
      onError: (error: string) => void;
    }
  ): Promise<string | null> {
    if (!this.videoId) {
      callbacks.onError('视频ID不存在，无法重新连接');
      return null;
    }

    try {
      callbacks.onStatusChange('connecting');

      if (!urlConfig.websocketAble) {
        callbacks.onStatusChange('connected');
        setTimeout(() => {
          videoElement.src = `${urlConfig.videoUrl}/live/${this.videoId}.live.mp4`
        }, 100)
        return String(this.videoId)
      }

      // 如果WebRTC连接不存在，重新初始化
      if (!this.webrtcConnection) {
        await this.initializeWebRTC(videoElement, callbacks);
      }

      // 执行信令交换
      await this.performSignalingExchange(callbacks);

      return String(this.videoId);
    } catch (err: any) {
      if (err.message === 'ABORTED') {
        return null;
      }
      callbacks.onError(`重新连接失败: ${err.message}`);
      callbacks.onStatusChange('error');
      return null;
    }
  }

  /**
   * 初始化WebRTC连接和事件监听
   */
  private async initializeWebRTC(
    videoElement: HTMLVideoElement,
    callbacks: {
      onStatusChange: (status: string) => void;
      onError: (error: string) => void;
    }
  ): Promise<void> {
    // 初始化WebRTC连接
    this.webrtcConnection = new WebRTCConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
      ],
      reconnectAttempts: 5,
      reconnectInterval: 2000
    });

    await this.webrtcConnection.init(true);

    // 设置事件监听
    this.webrtcConnection.onStream((e) => {
      if (e.streams && e.streams.length > 0) {
        videoElement.srcObject = e.streams[0];
        videoElement.play().catch(err => {
          callbacks.onError(`视频播放失败: ${err.message}`);
        });
        callbacks.onStatusChange('connected');
      }
    });

    this.webrtcConnection.onError((error) => {
      callbacks.onError(`连接错误: ${error.message}`);
      callbacks.onStatusChange('error');
    });

    this.webrtcConnection.onStateChange((state) => {
      callbacks.onStatusChange(state.toLowerCase());
    });

    // 添加WebRTC断线重连机制
    this.webrtcConnection.onReconnectStart(() => {
      callbacks.onStatusChange('reconnecting');
    });

    this.webrtcConnection.onReconnectFailed(() => {
      callbacks.onError('WebRTC重连失败，已达到最大重试次数');
      callbacks.onStatusChange('failed');
    });

    this.webrtcConnection.onReoffer(async (offer) => {
      try {
        if (!this.videoId) {
          throw new Error('视频ID不存在，无法重连');
        }

        // 使用现有的重试机制处理重连时的SDP交换
        const sdpResponse = await this.changeIceCandidateWithRetry({ id: this.videoId }, offer.sdp);

        if (this.webrtcConnection) {
          await this.webrtcConnection.setRemoteDescription(sdpResponse as RTCSessionDescriptionInit);
          callbacks.onStatusChange('connected');
        }
      } catch (error: any) {
        // 如果是中断错误，不触发错误回调
        if (error.message === 'ABORTED') {
          return;
        }
        callbacks.onError(`WebRTC重连失败: ${error.message}`);
        callbacks.onStatusChange('failed');
      }
    });

    // 添加音频和视频接收器
    this.webrtcConnection.addAudioVideoReceivers();
  }

  /**
   * 停止直播流
   */
  async stop(first: boolean = false): Promise<void> {
    try {
      // 中断正在进行的异步操作
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }

      // 等待当前重试Promise完成（如果存在）
      if (this.currentRetryPromise) {
        try {
          await this.currentRetryPromise;
        } catch (error) {
          // 忽略中断导致的错误
        }
        this.currentRetryPromise = null;
      }

      // 清理定时器
      this.clearTimer();

      // 静默处理停止直播的API调用
      if (this.videoId && this.isDock && first) {
        try {
          await stopLive(String(this.videoId));
        } catch (error) {
          // 静默忽略停止直播的错误
        }
      }

      if (this.webrtcConnection) {
        try {
          this.webrtcConnection.close();
        } catch (error) {
          // 静默忽略WebRTC连接关闭的错误
        }
      }

      this.videoId = null;
    } catch (error) {
    }

    // 重置其他状态
    this.webrtcConnection = null;
    this.retryCount = 0;
  }

  getOriginLiveUrl(): string {
    return this.originLiveUrl || "";
  }

  getVideoStreamId(): string {
    return String(this.videoId || "");
  }

  // 切换相机/镜头类型
  async switchCamera(option: any) {
    try {
      if (!this.videoId) return
      const params: any = {};
      let apiMethods: Function | null = null
      if (this.isDock) {
        const cameraPosition = option?.cameraPosition ?? option?.value;
        if (cameraPosition === undefined || cameraPosition === null) return false;
        params.cameraPosition = cameraPosition;
        params.deviceSn = this.deviceId;
        apiMethods = deviceLiveSwitchDock;
      } else {
        const videoType = option?.videoType ?? option?.value;
        if (videoType === undefined || videoType === null) return false;
        params.videoType = videoType;
        params.subDeviceSn = this.subDeviceSn;
        apiMethods = deviceLiveSwitchDrone;
      }
      if (!apiMethods) return;

      const { code, msg } = await apiMethods(params);
      if (code === 200) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false
    }
  };

  /**
   * 带重试机制的 changeIceCandidate 调用
   * @param params 参数
   * @param sdp SDP数据
   * @returns Promise<any>
   */
  private async changeIceCandidateWithRetry(params: any, sdp: any): Promise<any> {
    this.retryCount = 0;

    const attemptCall = async (): Promise<any> => {
      // 检查是否已被中断
      if (!this.abortController || this.abortController.signal.aborted) {
        this.clearTimer();
        throw new Error('ABORTED');
      }

      try {
        const response = await $changeIceCandidate(params, sdp);
        // 再次检查是否已被中断（异步操作后）
        if (!this.abortController || this.abortController.signal.aborted) {
          this.clearTimer();
          throw new Error('ABORTED');
        }

        // 检查响应是否成功
        if (response && typeof response === 'object' && 'code' in response) {
          const responseObj = response as any;
          if (responseObj.code === 0) {
            // 请求成功，清理定时器并返回结果
            this.clearTimer();
            return response;
          } else {
            // 请求失败，需要重试
            if (this.retryCount < this.maxRetries && this.abortController && !this.abortController.signal.aborted) {
              this.retryCount++;

              // 创建可中断的重试Promise
              const retryPromise = new Promise((resolve, reject) => {
                // 监听中断信号
                const abortHandler = () => {
                  this.clearTimer();
                  // 静默拒绝，不抛出错误信息
                  reject(new Error('ABORTED'));
                };

                if (this.abortController) {
                  this.abortController.signal.addEventListener('abort', abortHandler);
                }

                this.timer = window.setTimeout(async () => {
                  try {
                    // 移除中断监听器
                    if (this.abortController) {
                      this.abortController.signal.removeEventListener('abort', abortHandler);
                    }

                    // 在重试前再次检查中断状态
                    if (!this.abortController || this.abortController.signal.aborted) {
                      this.clearTimer();
                      reject(new Error('ABORTED'));
                      return;
                    }
                    const result = await attemptCall();
                    resolve(result);
                  } catch (error) {
                    reject(error);
                  }
                }, 2000);
              });

              // 保存当前重试Promise的引用
              this.currentRetryPromise = retryPromise;
              return retryPromise;
            } else {
              // 超过最大重试次数或已被中断
              this.clearTimer();
              if (!this.abortController || this.abortController.signal.aborted) {
                throw new Error('ABORTED');
              } else {
                throw new Error(`changeIceCandidate 请求失败，已重试 ${this.maxRetries} 次: ${responseObj.msg}`);
              }
            }
          }
        } else {
          // 响应格式不正确
          this.clearTimer();
          throw new Error('changeIceCandidate 响应格式错误');
        }
      } catch (error) {
        this.clearTimer();
        throw error;
      }
    };

    const mainPromise = attemptCall();
    this.currentRetryPromise = mainPromise;
    return mainPromise;
  }

  /**
   * 清理定时器
   */
  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
