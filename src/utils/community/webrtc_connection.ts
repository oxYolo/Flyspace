import type { EventListener } from "./event_dispatcher.ts";
import { EventDispatcher } from "./event_dispatcher.ts";

// WebRTC事件类型定义
export interface WebRTCEvents {
  icecandidate: RTCIceCandidate;
  statechange: RTCIceConnectionState;
  stream: RTCTrackEvent;
  message: any;
  datachannelopen: void;
  datachannelclose: void;
  error: Error;
  close: void;
  reoffer: RTCSessionDescriptionInit;
  reconnect_start: void;
  reconnect_failed: void;
}

// WebRTC配置接口
export interface WebRTCConfig extends RTCConfiguration {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  dataChannelLabel?: string;
  enableDataChannel?: boolean;
}

// 连接状态枚举
export enum WebRTCState {
  NEW = 'new',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  CLOSED = 'closed'
}

/**
 * 优化的WebRTC连接类
 * 支持P2P连接、数据通道、自动重连
 */
export class WebRTCConnection extends EventDispatcher<WebRTCEvents> {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private state: WebRTCState = WebRTCState.NEW;

  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;
  private readonly dataChannelLabel: string;
  private readonly enableDataChannel: boolean;
  private isInitiator = false;
  private shouldReconnect = true;

  // 保存媒体轨道状态用于重连
  private savedTracks: Array<{track: MediaStreamTrack, stream: MediaStream}> = [];
  private savedTransceivers: Array<{trackOrKind: MediaStreamTrack | string, init?: RTCRtpTransceiverInit}> = [];

  // 保存初始offer用于比较
  private initialOffer: RTCSessionDescriptionInit | null = null;

  constructor(config: WebRTCConfig = {}) {
    super();

    // 提取自定义配置
    const {
      reconnectAttempts = 3,
      reconnectInterval = 3000,
      dataChannelLabel = 'data',
      enableDataChannel = false,
    } = config;

    this.maxReconnectAttempts = reconnectAttempts;
    this.reconnectInterval = reconnectInterval;
    this.dataChannelLabel = dataChannelLabel;
    this.enableDataChannel = enableDataChannel;
  }

  /**
   * 初始化WebRTC连接
   * @param isInitiator 是否为发起方
   */
  async init(isInitiator = false): Promise<void> {
    try {
      this.isInitiator = isInitiator;
      this.shouldReconnect = true;
      this.setState(WebRTCState.NEW);

      // 清理现有连接
      if (this.pc) {
        this.pc.close();
      }
      this.pc = new RTCPeerConnection(undefined);
      this.setupPeerConnectionHandlers();

      // 发起方创建数据通道（仅在启用时）
      if (this.isInitiator && this.enableDataChannel) {
        this.createDataChannel();
      }

      // 恢复保存的媒体轨道（重连时保持一致性）
      this.restoreSavedTracks();

    } catch (error) {
      this.setState(WebRTCState.FAILED);
      this.dispatchEvent('error', error as Error);
      throw error;
    }
  }

  /**
   * 设置PeerConnection事件处理器
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;

    // ICE候选收集
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.dispatchEvent('icecandidate', event.candidate);
      }
    };

    // 连接状态变化
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc!.iceConnectionState;

      this.dispatchEvent('statechange', state);

      switch (state) {
        case 'connected':
          this.setState(WebRTCState.CONNECTED);
          this.reconnectAttempts = 0;
          break;
        case 'disconnected':
          this.setState(WebRTCState.DISCONNECTED);
          if (this.shouldReconnect) {
            this.handleReconnect();
          }
          break;
        case 'failed':
          this.setState(WebRTCState.FAILED);
          if (this.shouldReconnect) {
            this.handleReconnect();
          }
          break;
        case 'closed':
          this.setState(WebRTCState.CLOSED);
          break;
      }
    };

    // 远程流到达
    this.pc.ontrack = (event) => {
      this.dispatchEvent('stream', event);
    };

    // 数据通道处理（接收方，仅在启用时）
    if (!this.isInitiator && this.enableDataChannel) {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelHandlers(this.dataChannel);
      };
    }
  }

  /**
   * 创建数据通道（发起方）
   */
  private createDataChannel(): void {
    if (!this.pc) return;

    try {
      this.dataChannel = this.pc.createDataChannel(this.dataChannelLabel, {
        ordered: true
      });
      this.setupDataChannelHandlers(this.dataChannel);
    } catch (error) {
      this.dispatchEvent('error', error as Error);
    }
  }

  /**
   * 设置数据通道事件处理器
   */
  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.dispatchEvent('datachannelopen', undefined);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.dispatchEvent('message', data);
      } catch (error) {
        // 如果不是JSON，直接传递原始数据
        this.dispatchEvent('message', event.data);
      }
    };

    channel.onclose = () => {
      this.dispatchEvent('datachannelclose', undefined);
    };

    channel.onerror = (error) => {
      this.dispatchEvent('error', new Error('Data channel error'));
    };
  }

  /**
   * 恢复保存的媒体轨道和收发器
   */
  private restoreSavedTracks(): void {
    if (!this.pc) return;

    try {
      // 恢复保存的轨道
      for (const {track, stream} of this.savedTracks) {
        this.pc.addTrack(track, stream);
      }

      // 恢复保存的收发器
      for (const {trackOrKind, init} of this.savedTransceivers) {
        this.pc.addTransceiver(trackOrKind, init);
      }
    } catch (error) {
      this.dispatchEvent('error', error as Error);
    }
  }

  /**
   * 等待ICE收集完成
   */
  private waitForIceGatheringComplete(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.pc) {
        reject(new Error('PeerConnection not initialized'));
        return;
      }

      if (this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.pc!.removeEventListener('icegatheringstatechange', onStateChange);
        resolve(); // 超时后也继续，避免无限等待
      }, 5000); // 5秒超时

      const onStateChange = () => {
        if (this.pc!.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          this.pc!.removeEventListener('icegatheringstatechange', onStateChange);
          resolve();
        }
      };

      this.pc.addEventListener('icegatheringstatechange', onStateChange);
    });
  }

  /**
   * 创建Offer
   * @param waitForIce 是否等待ICE收集完成
   */
  async createOffer(waitForIce = false): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }
    try {
      this.setState(WebRTCState.CONNECTING);
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      let finalOffer: RTCSessionDescriptionInit;

      if (waitForIce) {
        // 等待ICE收集完成，确保offer包含完整的ICE候选
        await this.waitForIceGatheringComplete();
        // 返回包含ICE候选的完整offer
        finalOffer = this.pc.localDescription!;
      } else {
        finalOffer = offer;
      }

      // 保存初始offer或与初始offer进行比较
      if (!this.initialOffer) {
        this.initialOffer = finalOffer;
      }
      return finalOffer;
    } catch (error) {
      this.setState(WebRTCState.FAILED);
      this.dispatchEvent('error', error as Error);
      throw error;
    }
  }

  /**
   * 创建Answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      this.setState(WebRTCState.CONNECTING);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      return answer;
    } catch (error) {
      this.setState(WebRTCState.FAILED);
      this.dispatchEvent('error', error as Error);
      throw error;
    }
  }

  /**
   * 设置远程描述
   */
  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
    } catch (error) {
      this.dispatchEvent('error', error as Error);
      throw error;
    }
  }

  /**
   * 添加ICE候选
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      this.dispatchEvent('error', error as Error);
      throw error;
    }
  }

  /**
   * 添加本地媒体轨道
   */
  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender | null {
    if (!this.pc) {
      return null;
    }

    try {
      // 检查是否已经保存过这个轨道，避免重复
      const existingIndex = this.savedTracks.findIndex(saved => saved.track === track);
      if (existingIndex === -1) {
        this.savedTracks.push({track, stream});
      }
      return this.pc.addTrack(track, stream);
    } catch (error) {
      this.dispatchEvent('error', error as Error);
      return null;
    }
  }

  /**
   * 添加音频和视频收发器
   */
  addTransceiver(trackOrKind: MediaStreamTrack | string, init?: RTCRtpTransceiverInit): RTCRtpTransceiver | undefined {
    if (!this.pc) {
      return
    }

    try {
      // 保存transceiver状态用于重连
      this.savedTransceivers.push({trackOrKind, init});
      return this.pc.addTransceiver(trackOrKind, init);
    } catch (error) {
      this.dispatchEvent('error', error as Error);
    }
  }

  /**
   * 添加音频接收器
   */
  addAudioReceiver(): RTCRtpTransceiver | undefined {
    const audioTransceiverInit: RTCRtpTransceiverInit = {
      direction: 'recvonly',
      sendEncodings: []
    };
    return this.addTransceiver('audio', audioTransceiverInit);
  }

  /**
   * 添加视频接收器
   */
  addVideoReceiver(): RTCRtpTransceiver | undefined {
    const videoTransceiverInit: RTCRtpTransceiverInit = {
      direction: 'recvonly',
      sendEncodings: []
    };
    return this.addTransceiver('video', videoTransceiverInit);
  }

  /**
   * 同时添加音频和视频接收器
   */
  addAudioVideoReceivers(): { audio?: RTCRtpTransceiver, video?: RTCRtpTransceiver } {
    return {
      video: this.addVideoReceiver(),
      audio: this.addAudioReceiver()
    };
  }

  /**
   * 移除媒体轨道
   */
  removeTrack(sender: RTCRtpSender): void {
    if (!this.pc) {
      return;
    }

    try {
      this.pc.removeTrack(sender);
      // 从保存的轨道中移除对应的轨道
      if (sender.track) {
        this.savedTracks = this.savedTracks.filter(saved => saved.track !== sender.track);
      }
    } catch (error) {
      this.dispatchEvent('error', error as Error);
    }
  }

  /**
   * 发送数据
   */
  send(data: any): void {
    if (!this.enableDataChannel) {
      console.warn('Data channel is disabled. Enable it in WebRTCConfig to send data.');
      return;
    }

    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.dataChannel.send(message);
    } catch (error) {
      this.dispatchEvent('error', error as Error);
    }
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectTimer ||
        this.reconnectAttempts >= this.maxReconnectAttempts ||
        !this.shouldReconnect) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.dispatchEvent('reconnect_failed', undefined);
      }
      return;
    }

    this.reconnectAttempts++;
    this.dispatchEvent('reconnect_start', undefined);

    this.reconnectTimer = setTimeout(async () => {
      this.clearReconnectTimer();

      try {
        await this.init(this.isInitiator);

        if (this.isInitiator) {
          // 重连时等待ICE收集完成，确保offer的一致性
          const offer = await this.createOffer(true);
          this.dispatchEvent('reoffer', offer);
        }
      } catch (error) {
        this.handleReconnect(); // 递归重试
      }
    }, this.reconnectInterval);
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // 清理保存的状态
    this.savedTracks = [];
    this.savedTransceivers = [];
    this.initialOffer = null;

    this.setState(WebRTCState.CLOSED);
    this.dispatchEvent('close', undefined);
  }

  // 状态和信息获取方法
  getState(): WebRTCState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === WebRTCState.CONNECTED &&
           this.pc?.iceConnectionState === 'connected';
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getDataChannelState(): RTCDataChannelState | null {
    if (!this.enableDataChannel) {
      return null;
    }
    return this.dataChannel?.readyState ?? null;
  }

  // 便捷的事件监听方法
  onIceCandidate(callback: EventListener<RTCIceCandidate>): () => void {
    return this.addEventListener('icecandidate', callback);
  }

  onStream(callback: EventListener<RTCTrackEvent>): () => void {
    return this.addEventListener('stream', callback);
  }

  onMessage(callback: EventListener<any>): () => void {
    return this.addEventListener('message', callback);
  }

  onDataChannelOpen(callback: EventListener<void>): () => void {
    return this.addEventListener('datachannelopen', callback);
  }

  onStateChange(callback: EventListener<RTCIceConnectionState>): () => void {
    return this.addEventListener('statechange', callback);
  }

  onError(callback: EventListener<Error>): () => void {
    return this.addEventListener('error', callback);
  }

  onReconnectStart(callback: EventListener<void>): () => void {
    return this.addEventListener('reconnect_start', callback);
  }

  onReconnectFailed(callback: EventListener<void>): () => void {
    return this.addEventListener('reconnect_failed', callback);
  }

  onReoffer(callback: EventListener<RTCSessionDescriptionInit>): () => void {
    return this.addEventListener('reoffer', callback);
  }

  // 私有方法
  private setState(newState: WebRTCState): void {
    if (this.state !== newState) {
      this.state = newState;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// 使用示例
/*
// 创建WebRTC连接实例
const webrtc = new WebRTCConnection({
  reconnectAttempts: 5,
  reconnectInterval: 2000
});

// 初始化连接（作为发起方）
await webrtc.init(true);

// 添加音频和视频接收器
webrtc.addAudioVideoReceivers();
// 或者单独添加
// webrtc.addVideoReceiver();
// webrtc.addAudioReceiver();

// 监听重连事件
webrtc.onReoffer((offer) => {
  console.log('🔄 Reconnection offer created');
  // 通过信令服务器发送重连offer
  signalingChannel.send({ type: 'reoffer', sdp: offer });
});

webrtc.onReconnectStart(() => {
  console.log('🔄 Starting reconnection...');
});

webrtc.onReconnectFailed(() => {
  console.log('❌ Reconnection failed after max attempts');
});

// 监听其他事件
webrtc.onIceCandidate((candidate) => {
  signalingChannel.send({ type: 'ice-candidate', candidate });
});

webrtc.onStream((event) => {
  const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
  remoteVideo.srcObject = event.streams[0];
});

webrtc.onMessage((data) => {
  console.log('Received data:', data);
});

// 创建并发送初始offer
const offer = await webrtc.createOffer();
signalingChannel.send({ type: 'offer', sdp: offer });

// 添加媒体轨道（会自动保存用于重连）
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach(track => {
  webrtc.addTrack(track, stream);
});
*/
