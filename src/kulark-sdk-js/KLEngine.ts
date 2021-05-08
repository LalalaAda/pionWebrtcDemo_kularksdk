import log from "loglevel";
import Client from "./client";
import {
  SERVER_IP,
  SERVER_PORT,
  RELAY_SERVER_IP,
  SOCKET_EVENT,
  MEET_JOIN,
  MEET_OK,
  MEET_FAIL,
  MEET_LEAVE,
  MEET_GET_LIST,
  ENGINE_ERROR,
  MEET_NOTIFY,
  MEET_PEER_JOIN,
  MEET_PEER_LEAVE,
  MEET_STREAM_ADD,
  MEET_STREAM_REMOVE,
  NOTIFY_MUTE_ALL,
  NOTIFY_MUTE_ONE,
  NOTIFY_MUTE_HOST,
  NOTIFY_CAMERA_ALL,
  NOTIFY_CAMERA_ONE,
  NOTIFY_CAMERA_HOST,
  NOTIFY_PEER_KICK,
  NOTIFY_SWITCH_HOST,
  NOTIFY_END_MEETING,
  NOTIFY_START_SHARE_SCREEN,
  NOTIFY_RECV_MSG_ALL,
  NOTIFY_RECV_MSG_ONE,
  NOTIFY_AUDIO_LEVEL,
  VIDEO_VP8_INTEL_HW_ENCODER_FIELDTRIAL,
  VIDEO_FLEXFEC_FIELDTRIAL,
  MEET_ERROR
} from "./KLBase";
import { LocalStream, RemoteStream, StreamOptions } from "./stream";
import KLStatsReport from "./stats";

// 信令服务器地址
let SERVER_IP_S = SERVER_IP;
let SERVER_PORT_S = SERVER_PORT;
let RELAY_SERVER_IP_S = RELAY_SERVER_IP;

interface KLEvent {
  onEvent: (
    eid: number,
    estatus: number,
    rid: string,
    uid: string,
    obj?: any
  ) => void;
}

export class KLEngine {
  strUid = ""; // uid
  strNid = ""; // sfu节点地址
  name = "";
  localVideoStream?: LocalStream;
  client!: Client;
  // 当前加入房间的rid
  strCurRid = "";
  // 当前是否音视频会议
  bVideo = false;
  mKLEvent?: KLEvent = undefined;
  infoJson: { [x: string]: any } = {};
  userJson: { [x: string]: any } = {};

  iceServers: RTCIceServer[] = [];

  instance?: KLEngine = undefined;
  statInstance: KLStatsReport | undefined | null = undefined; // 统计类

  debug?: boolean = undefined;

  constructor(debug?: boolean) {
    if (this.instance) {
      return this.instance;
    }
    this.instance = this;
    this.debug = debug;
    log.setLevel(debug ? log.levels.DEBUG : log.levels.SILENT);
    return this;
  }
  getEngineVersion() {
    return "Kulark-websdk-engine-1.0.2";
  }
  setServerIp(strIp: string, nPort: number) {
    SERVER_IP_S = strIp;
    SERVER_PORT_S = nPort;
  }
  setRelayIp(strIp: string) {
    RELAY_SERVER_IP_S = strIp;
    const strStun = "stun:" + RELAY_SERVER_IP_S + ":3478";
    const strturntcp = "turn:" + RELAY_SERVER_IP_S + ":3478?transport=tcp";
    const strturnudp = "turn:" + RELAY_SERVER_IP_S + ":3478?transport=udp";

    const iceServers = [
      { urls: strStun, username: "", credential: "" },
      { urls: strturntcp, username: "demo", credential: "123456" },
      { urls: strturnudp, username: "demo", credential: "123456" }
    ];
    this.iceServers = iceServers;
  }
  setSfuNode(strIp: string) {
    this.strNid = strIp;
  }

  initSdk(rid?: string, uid?: string, name?: string, head?: string) {
    log.debug("init sdk");
    this.strCurRid = rid || "";
    this.strUid = uid || "";
    this.name = name || "";
    const obj: { [x: string]: any } = {};
    obj.name = name;
    obj.head = head;
  }
  async freeSdk() {
    log.debug("free sdk");
    if (this.client.getConnectStatus()) {
      await this.leaveRoom();
      this.client.close();
    }
  }
  setCallBack(cb: any) {
    this.mKLEvent = cb;
  }
  start() {
    const strUrl = "wss://" + SERVER_IP_S + ":" + SERVER_PORT_S;
    const debug = this.debug ? true : false;
    // const strUrl = "ws://" + "192.168.2.112" + ":" + 10443;
    let uid = this.strUid || "";
    const nid = this.strNid || "";
    const client = new Client({
      url: strUrl,
      uid,
      rtc: {
        iceServers: this.iceServers
      },
      nid,
      debug
    });
    this.client = client;
    uid = this.client.uid;
    this.strUid = uid;
    // 监听client的websocket事件
    this.client.on("transport-open", () => {
      this.mKLEvent &&
        this.mKLEvent.onEvent(SOCKET_EVENT, MEET_OK, "", uid, this.infoJson);
    });
    this.client.on("transport-failed", () => {
      this.mKLEvent &&
        this.mKLEvent.onEvent(SOCKET_EVENT, MEET_ERROR, "", uid, this.infoJson);
    });
    this.client.on("transport-closed", () => {
      this.mKLEvent &&
        this.mKLEvent.onEvent(SOCKET_EVENT, MEET_FAIL, "", uid, this.infoJson);
    });

    this.client.on("stream-add", (mid, uid, info) => {
      this.mKLEvent &&
        this.mKLEvent.onEvent(MEET_NOTIFY, MEET_STREAM_ADD, mid, uid, info);
    });
    this.client.on("stream-remove", (stream: RemoteStream) => {
      this.unSubscribe(stream.mid || "");
      this.mKLEvent &&
        this.mKLEvent.onEvent(
          MEET_NOTIFY,
          MEET_STREAM_REMOVE,
          stream.mid || "",
          uid,
          {}
        );
    });
  }
  async stop() {
    if (this.client.getConnectStatus()) {
      await this.leaveRoom();
      this.client.close();
    }
  }
  getConnect() {
    return this.client.getConnectStatus();
  }
  // 生成本地stream
  async createLocalStream(settings?: StreamOptions): Promise<LocalStream> {
    const localVideoStream = await this.client.createLocalStream(settings);
    this.localVideoStream = localVideoStream;
    return localVideoStream;
  }
  // 生成本地屏幕流
  async createLocalScreenStream(
    settings?: StreamOptions
  ): Promise<LocalStream> {
    return await this.client.createLocalScreenStream(settings);
  }
  // 生成自定义本地流
  async createCustomStream(
    stream: MediaStream,
    settings?: StreamOptions
  ): Promise<LocalStream> {
    return await this.client.createCustomStream(stream, settings);
  }
  // publish stream
  async publishStream(stream: LocalStream) {
    await this.client.publish(stream);
    let type = 0;
    if (stream.info.type === "screen") {
      type = 1;
    }
    this.statInstance?.notifyToCollectStat(stream, type);
  }
  // unpublishStream
  async unpublishStream(stream: LocalStream) {
    const mid = stream.mid || "";
    let type = 0;
    if (stream.info.type === "screen") {
      type = 1;
    }
    await this.client.unpublish(stream);
    this.statInstance?.notifyToDeleteStat(mid, type);
  }
  // subscribe
  async subscribe(mid: string, uid: string, info?: any) {
    const stream = await this.client.subscribe(mid);
    let type = 3; // 2混音  3视频 4屏幕共享
    stream.uid = uid;
    stream.info = info;
    if (info && info.tracks && Object.keys(info.tracks).length > 1) {
      type = 3;
    } else {
      type = 4;
    }
    if (mid.includes("mixffff")) {
      type = 2;
    }
    this.statInstance?.notifyToCollectStat(stream, type);
    return stream;
  }
  async unSubscribe(mid: string) {
    this.statInstance?.notifyToDeleteStat(mid, 2);
  }

  // 创建上行流对象
  createLocalPeer(bScreen: boolean) {
    return bScreen;
    // web版本暂时不需要
  }
  // 创建下行流对象
  createRemotePeer(mid: string, uid: string, info: any) {
    return { mid, uid, info };
    // web版本暂时不需要
  }
  // 加入会议 阻塞
  async joinMeetblock(rid: string, bVideo: boolean): Promise<boolean> {
    this.strCurRid = rid;
    this.bVideo = bVideo;
    return await this.client.join(rid, { name: this.name });
  }
  // 加入会议
  async joinRoom(rid: string, bVideo: boolean): Promise<void> {
    this.strCurRid = rid;
    this.bVideo = bVideo;
    const res = await this.client.join(rid, { name: this.name });
    if (res) {
      if (this.mKLEvent != null) {
        this.mKLEvent.onEvent(
          MEET_JOIN,
          MEET_OK,
          this.strCurRid,
          this.strUid,
          this.infoJson
        );
      }
      this.statInstance = new KLStatsReport(this.debug);
      this.statInstance.initReport(this.strCurRid, this.strUid);
      this.statInstance?.startSendStat();
    } else {
      if (this.mKLEvent != null) {
        this.mKLEvent.onEvent(
          MEET_JOIN,
          MEET_FAIL,
          this.strCurRid,
          this.strUid,
          this.infoJson
        );
      }
    }
  }
  // 离开会议
  async leaveRoom() {
    const result = await this.client.leave();
    if (this.statInstance) {
      this.statInstance.stopSendStat();
      this.statInstance = null;
    }
    if (result) {
      this.mKLEvent &&
        this.mKLEvent.onEvent(
          MEET_LEAVE,
          MEET_OK,
          this.strCurRid,
          this.strUid,
          this.infoJson
        );
    } else {
      this.mKLEvent &&
        this.mKLEvent.onEvent(
          MEET_LEAVE,
          MEET_FAIL,
          this.strCurRid,
          this.strUid,
          this.infoJson
        );
    }
  }

  // 设置摄像头
  async setCameraEnable(enable: boolean) {
    if (this.localVideoStream && typeof this.localVideoStream === "object") {
      if (enable) {
        await this.localVideoStream.unmute("video");
      } else {
        await this.localVideoStream.mute("video");
      }
    }
  }
  // 设置麦克风
  async setMicrophoneEnable(enable: boolean) {
    if (this.localVideoStream && typeof this.localVideoStream === "object") {
      if (enable) {
        await this.localVideoStream.unmute("audio");
      } else {
        await this.localVideoStream.mute("audio");
      }
    }
  }

  // 设置麦克风Mute
  setMicrophoneMute(bMute: boolean) {
    log.debug(`设置麦克风mute ===> ${bMute}`);
  }
  // 获取麦克风Mute状态
  getMicrophoneMute(): boolean {
    return false;
  }
  // 开关扬声器
  setSpeakerphoneOn(bOpen: boolean) {
    log.debug(`开关扬声器  ===> ${bOpen}`);
  }
  // 获取扬声器状态
  getSpeakerphoneOn(): boolean {
    return false;
  }
  // -----------------------------------------------------------------

  // 获取成员列表
  // {"request":true,"id":1000051,"method":"listusers","data":{"rid":"room16"}}
  // {"response":true,"id":1000051,"ok":true,"data":{"rid":"room16","users":[{"info":{"name":"zhouwq"},"uid":"5ee00835-9a38-4ccb-9367-cc809b70af2b"},{"info":{"name":"redmi8"},"uid":"d480d70c-965f-4180-a02e-50d44761546b"}]}}
  // 获取成员列表
  async getRoomMembers(rid: string) {
    try {
      const data = await this.client.sendInfo("listusers", { rid: rid });
      this.userJson = data.data;
      this.mKLEvent &&
        this.mKLEvent.onEvent(
          MEET_GET_LIST,
          MEET_OK,
          this.strCurRid,
          this.strUid,
          this.userJson
        );
    } catch (error) {
      this.mKLEvent &&
        this.mKLEvent.onEvent(
          MEET_GET_LIST,
          MEET_FAIL,
          this.strCurRid,
          this.strUid,
          this.userJson
        );
    }
  }
  // 主持人发送全员禁麦状态
  async sendMicMuteAllStatus(bMute: boolean) {
    const info = {
      type: 0,
      state: bMute
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送全员禁止/许可麦克风成功");
    } catch (error) {
      log.error(error);
      log.debug("全员禁止/许可麦克风失败");
    }
  }
  // 发送单人禁麦状态
  async sendMicMuteStatus(uid: string, bMute: boolean) {
    const info = {
      type: 1,
      targetUserId: uid,
      state: bMute
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送单人禁止/许可麦克风成功");
    } catch (error) {
      log.error(error);
      log.debug("单人禁止/许可麦克风失败");
    }
  }
  // 发送全员摄像头 权限
  async sendCameraAllStatus(bClose: boolean) {
    const info = {
      type: 2,
      state: bClose
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送全员 摄像头 权限成功");
    } catch (error) {
      log.error(error);
      log.debug("发送全员 摄像头 权限失败");
    }
  }
  // 发送单人摄像头 权限
  async sendCameraStatus(uid: string, bClose: boolean) {
    const info = {
      type: 3,
      targetUserId: uid,
      state: bClose
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送单人摄像头权限成功");
    } catch (error) {
      log.error(error);
      log.debug("发送单人摄像头权限失败");
    }
  }
  // 切换主持人
  async sendSwitchHost(uid: string) {
    const info = {
      type: 4,
      targetUserId: uid
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送切换主持人成功");
    } catch (error) {
      log.error(error);
      log.debug("发送切换主持人失败");
    }
  }
  // 主持人发送踢人
  async sendTickPerson(uid: string) {
    const info = {
      type: 5,
      targetUserId: uid
    };
    try {
      await this.client.broadcast(info);
      log.debug("发送踢人成功");
    } catch (error) {
      log.error(error);
      log.debug("发送踢人失败");
    }
  }
  // 主持人发送设置单人麦克风状态
  async sendHostSetMicMute(uid: string, bMute: boolean) {
    const info = {
      type: 6,
      targetUserId: uid,
      state: bMute
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }
  // 主持人发送设置单人摄像头状态
  async sendHostSetCamera(uid: string, bClose: boolean) {
    const info = {
      type: 7,
      targetUserId: uid,
      state: bClose
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }

  // 发送群聊
  async sendMsgAll(msg: string) {
    const info = {
      type: 20,
      msg: msg
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }
  // 发送单聊
  async sendMsg(uid: string, msg: string) {
    const info = {
      type: 21,
      targetUserId: uid,
      msg: msg
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }
  // 结束会议
  async meetingEnd() {
    const info = {
      type: 8
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }
  // 发送开始共享屏幕
  async startScreenShare(uid: string, name: string) {
    const info = {
      type: 9,
      targetUserId: uid,
      name: name
    };
    try {
      await this.client.broadcast(info);
    } catch (error) {
      log.error(error);
    }
  }

  // 处理引擎出错
  onEngineError(strDescription: string) {
    log.error("KCEngine onEngineError = " + strDescription);
    if (this.mKLEvent != null) {
      this.mKLEvent.onEvent(
        ENGINE_ERROR,
        MEET_OK,
        strDescription,
        this.strUid,
        this.infoJson
      );
    }
  }

  // 初始化连接工厂对象
  initPeerConnectionFactory() {
    // TODO web版本暂时不需要
    let fieldTrials = "";
    fieldTrials += VIDEO_VP8_INTEL_HW_ENCODER_FIELDTRIAL;
    fieldTrials += VIDEO_FLEXFEC_FIELDTRIAL;
    const enableInternalTracer = false;
    return { enableInternalTracer, fieldTrials };
  }
  // 释放连接工厂对象
  freePeerConnectFactory() {
    // TODO web版本暂时不需要
  }

  // 处理有人加入的通知
  respPeerJoin(json: any) {
    let rid = "";
    let uid = "";
    let jsonInfo = null;
    jsonInfo = json.info ? json.info : null;
    rid = json.rid ? json.rid : "";
    uid = json.uid ? json.uid : "";
    if (this.mKLEvent) {
      this.mKLEvent.onEvent(MEET_NOTIFY, MEET_PEER_JOIN, rid, uid, jsonInfo);
    }
  }
  // 处理有人离开的通知
  respPeerLeave(json: any) {
    let rid = "";
    let uid = "";
    let jsonInfo = {};
    jsonInfo = json ? json : {};
    rid = json.rid ? json.rid : "";
    uid = json.uid ? json.uid : "";
    if (this.mKLEvent) {
      this.mKLEvent.onEvent(MEET_NOTIFY, MEET_PEER_LEAVE, rid, uid, jsonInfo);
    }
  }
  // 处理有流加入的通知
  respStreamAdd(json: any) {
    const { mid = "", uid = "", info = {}, tracks = null } = json;
    let _tracks, type;
    if (tracks && tracks["ARDAMS ARDAMSv0"]) {
      _tracks = tracks["ARDAMS ARDAMSv0"][0];
      type = _tracks["type"];
    }
    info.type = type;
    this.mKLEvent &&
      this.mKLEvent.onEvent(MEET_NOTIFY, MEET_STREAM_ADD, mid, uid, info);
  }
  // 处理有流移除的通知
  respStreamRemove(json: any) {
    const { mid = "", uid = "" } = json;
    this.mKLEvent &&
      this.mKLEvent.onEvent(MEET_NOTIFY, MEET_STREAM_REMOVE, mid, uid, json);
  }
  // 处理会管消息
  respNotify(json: any) {
    const { rid = "", uid = "", info = {} } = json;
    let type;
    if (info.type) {
      type = parseInt(info.type, 10);
      if (!this.mKLEvent) {
        return;
      }
      switch (type) {
        case 0:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_MUTE_ALL, rid, uid, info);
          break;
        case 1:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_MUTE_ONE, rid, uid, info);
          break;
        case 2:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_CAMERA_ALL, rid, uid, info);
          break;
        case 3:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_CAMERA_ONE, rid, uid, info);
          break;
        case 4:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_SWITCH_HOST,
            rid,
            uid,
            info
          );
          break;
        case 5:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_PEER_KICK, rid, uid, info);
          break;
        case 6:
          this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_MUTE_HOST, rid, uid, info);
          break;
        case 7:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_CAMERA_HOST,
            rid,
            uid,
            info
          );
          break;
        case 8:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_END_MEETING,
            rid,
            uid,
            info
          );
          break;
        case 9:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_START_SHARE_SCREEN,
            rid,
            uid,
            info
          );
          break;
        case 20:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_RECV_MSG_ALL,
            rid,
            uid,
            info
          );
          break;
        case 21:
          this.mKLEvent.onEvent(
            MEET_NOTIFY,
            NOTIFY_RECV_MSG_ONE,
            rid,
            uid,
            info
          );
          break;
        default:
          break;
      }
    }
  }

  // 处理音量消息
  respAudioNotify(json: any) {
    let uid = "";
    uid = json.activeuid || "";
    this.mKLEvent &&
      this.mKLEvent.onEvent(MEET_NOTIFY, NOTIFY_AUDIO_LEVEL, uid, json);
  }

  // ----
  onAudioManagerDevicesChanged() {
    log.debug("onAudioManagerDevicesChanged.");
  }
  createAudioDevice() {
    log.debug("");
  }
  initAudioManager() {
    log.debug("");
  }
  freeAudioManager() {
    log.debug("");
  }
  // --------------------------------------------------------------------------
  // 暴露给用户获取 rtcstats报告的回调接口
  setRtcStatsReportCallback(cb) {
    if (this.statInstance) {
      this.statInstance.setRtcStatsReportCallback(cb);
    }
  }
}
