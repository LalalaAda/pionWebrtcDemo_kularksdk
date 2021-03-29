// import adapter from "webrtc-adapter";
import { KLEngine } from "./KLEngine";
import { LocalStream, StreamOptions } from "./stream";

interface KLEvent {
  onEvent: (
    eid: number,
    estatus: number,
    rid: string,
    uid: string,
    obj?: any
  ) => {};
}

export class KLSdk {
  instance: KLSdk | undefined = undefined;
  engine!: KLEngine;
  // engine: KLEngine | undefined = undefined;

  constructor(debug?: boolean) {
    if (typeof this.instance === "object") {
      return this.instance;
    }
    this.instance = this;
    this.engine = new KLEngine(debug);
    return this;
  }
  //
  getSdkVersion() {
    return this.engine.getEngineVersion();
  }
  // 设置信令服务器地址
  setServerIp(strIp: string, nPort: number) {
    this.engine.setServerIp(strIp, nPort);
  }
  // 设置turn转发服务器地址
  setRelayIp(strIp: string) {
    this.engine.setRelayIp(strIp);
  }
  // 设置sfu节点
  setSfuNode(nid: string) {
    this.engine.setSfuNode(nid);
  }
  // 初始化SDK
  initSdk(uid?: string, name?: string, head?: string) {
    // adapter.browserDetails.browser;
    // adapter.browserDetails.version;
    this.engine.initSdk(uid, name, head);
  }
  // 释放SDK
  freeSdk() {
    this.engine.freeSdk();
  }
  // 设置sdk事件回调
  setCallBack(cb: KLEvent) {
    this.engine.setCallBack(cb);
  }
  // 启动
  start() {
    this.engine.start();
  }
  // 停止
  stop() {
    this.engine.stop();
  }
  // 返回连接状态
  getConnect() {
    return this.engine.getConnect();
  }
  // 创建本地stream
  async createLocalStream(settings?: StreamOptions): Promise<LocalStream> {
    return await this.engine.createLocalStream(settings);
  }
  // 创建本地屏幕共享
  async createLocalScreenStream(
    settings?: StreamOptions
  ): Promise<LocalStream> {
    return await this.engine.createLocalScreenStream(settings);
  }
  // publish stream
  async publishStream(stream: LocalStream) {
    await this.engine.publishStream(stream);
  }
  // unpublish stream
  async unpublishStream(stream: LocalStream) {
    const tracks = stream.getTracks();
    for (let i = 0, len = tracks.length; i < len; i++) {
      await tracks[i].stop();
    }
    this.engine.unpublishStream(stream);
  }
  // subscribe stream
  async subscribeStream(mid: string, uid: string, info?: any) {
    return await this.engine.subscribe(mid, uid, info);
  }

  // 设置摄像头
  setCameraEnable(enable: boolean) {
    this.engine.setCameraEnable(enable);
  }
  // 设置麦克风
  setMicrophoneEnable(enable: boolean) {
    this.engine.setMicrophoneEnable(enable);
  }

  // 创建上行流对象
  createLcalPeer(bScreen: boolean) {
    this.engine.createLocalPeer(bScreen);
  }
  // 创建下行流对象
  createRemotePeer(mid: string, uid: string, info: any) {
    this.engine.createRemotePeer(mid, uid, info);
  }
  // 加入会议阻塞方式
  joinMeetblock(rid: string, bVideo: boolean) {
    this.engine.joinMeetblock(rid, bVideo);
  }
  createRoom(rid: string, bVideo: boolean) {
    this.engine.joinRoom(rid, bVideo);
  }
  // 加入会议
  joinRoom(rid: string, bVideo: boolean) {
    this.engine.joinRoom(rid, bVideo);
  }
  // 离开会议 阻塞
  leaveMeetblock() {
    this.engine.leaveRoom();
  }
  //离开会议
  leaveRoom() {
    this.engine.leaveRoom();
  }
  // 设置麦克风
  setMicrophoneMute(bMute: boolean) {
    this.engine.setMicrophoneMute(bMute);
  }
  // 获取麦克风状态
  getMicrophoneMute() {
    return this.engine.getMicrophoneMute();
  }
  // 设置扬声器
  setSpeakerPhoneOn(bOpen: boolean) {
    this.engine.setSpeakerphoneOn(bOpen);
  }
  // 获取扬声器状态
  getSpeakerphoneOn() {
    return this.engine.getSpeakerphoneOn();
  }
  // 获取成员列表
  getRoomMembers(rid: string) {
    return this.engine.getRoomMembers(rid);
  }
  // --------------------------------------------------------------------------
  // 主持人发送全员禁麦状态
  sendMicMuteAllStatus(bMute: boolean) {
    this.engine.sendMicMuteAllStatus(bMute);
  }
  // 主持人发送设置单人麦克风状态
  sendHostSetMicMute(uid: string, bMute: boolean) {
    this.engine.sendHostSetMicMute(uid, bMute);
  }
  // 单人发送单人禁麦状态
  sendMicMuteStatus(uid: string, bMute: boolean) {
    this.engine.sendMicMuteStatus(uid, bMute);
  }
  // 主持人发送全员摄像头关闭状态
  sendCameraAllStatus(bClose: boolean) {
    this.engine.sendCameraAllStatus(bClose);
  }
  // 主持人发送设置单人摄像头状态
  sendHostSetCamera(uid: string, bClose: boolean) {
    this.engine.sendHostSetCamera(uid, bClose);
  }
  // 单人发送单人摄像头状态
  sendCameraStatus(uid: string, bClose: boolean) {
    this.engine.sendCameraStatus(uid, bClose);
  }
  // 主持人发送切换主持人状态
  sendSwitchHost(uid: string) {
    this.engine.sendSwitchHost(uid);
  }
  // 主持人发送踢人状态
  sendTickPerson(uid: string) {
    this.engine.sendTickPerson(uid);
  }
  // --------------------------------------------------------------------------
  // 发送群聊
  sendMsgAll(msg: string) {
    this.engine.sendMsgAll(msg);
  }
  // 发送单聊
  sendMsg(uid: string, msg: string) {
    this.engine.sendMsg(uid, msg);
  }
  // 发送结束会议
  meetingEnd() {
    this.engine.meetingEnd();
  }
  // --------------------------------------------------------------------------
  // 发送开启屏幕共享
  startScreenShare(uid: string, name: string) {
    this.engine.startScreenShare(uid, name);
  }
  // ---------------------------------------------------------------------------
}
